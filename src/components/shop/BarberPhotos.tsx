import { useRef, useState, type ChangeEvent } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PHOTO_BUCKET,
  photoPublicUrl,
  shopKeys,
  useBarberPhotos,
  type BarberPhoto,
} from "@/lib/shopData";
import { cn } from "@/lib/utils";
import { secondaryButtonClass } from "@/components/shop/ui";

const MAX_BYTES = 8 * 1024 * 1024;

function extensionOf(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const fromType = file.type.split("/")[1];
  return (fromName || fromType || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

/** Sample hairstyle photos (portfolio) for one barber — public-read, shop-write. */
export function BarberPhotos({ barberId }: { barberId: string }) {
  const queryClient = useQueryClient();
  const { data: photos, isPending } = useBarberPhotos(barberId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: shopKeys.photos(barberId) });

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    let nextOrder = (photos ?? []).reduce((max, p) => Math.max(max, p.sort_order), -1) + 1;
    let ok = 0;
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} isn't an image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 8 MB.`);
        continue;
      }
      // Path must start with the barber id — the Storage policy checks ownership on it.
      const path = `${barberId}/${crypto.randomUUID()}.${extensionOf(file)}`;
      const upload = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) {
        toast.error(`Upload failed for ${file.name}: ${upload.error.message}`);
        continue;
      }
      const { error } = await supabase
        .from("barber_photos")
        .insert({ barber_id: barberId, storage_path: path, sort_order: nextOrder });
      if (error) {
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
        toast.error(`Couldn't save ${file.name}: ${error.message}`);
        continue;
      }
      nextOrder += 1;
      ok += 1;
    }
    setUploading(false);
    await refresh();
    if (ok > 0) toast.success(`${ok} photo${ok === 1 ? "" : "s"} uploaded.`);
  }

  async function update(
    photo: BarberPhoto,
    patch: { is_featured?: boolean; caption?: string | null },
  ) {
    setBusyId(photo.id);
    const { error } = await supabase.from("barber_photos").update(patch).eq("id", photo.id);
    setBusyId(null);
    if (error) toast.error(`Couldn't update photo: ${error.message}`);
    await refresh();
  }

  async function move(index: number, delta: -1 | 1) {
    const list = photos ?? [];
    const a = list[index];
    const b = list[index + delta];
    if (!a || !b) return;
    setBusyId(a.id);
    // Normalise ordering to the current list position, then swap the two neighbours.
    const updates = list.map((p, i) => {
      let order = i;
      if (i === index) order = index + delta;
      if (i === index + delta) order = index;
      return { id: p.id, order, changed: p.sort_order !== order };
    });
    for (const u of updates.filter((x) => x.changed)) {
      const { error } = await supabase
        .from("barber_photos")
        .update({ sort_order: u.order })
        .eq("id", u.id);
      if (error) {
        toast.error(`Couldn't reorder: ${error.message}`);
        break;
      }
    }
    setBusyId(null);
    await refresh();
  }

  async function remove(photo: BarberPhoto) {
    setBusyId(photo.id);
    // Delete BOTH the Storage object and the metadata row.
    const storage = await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    if (storage.error) {
      setBusyId(null);
      toast.error(`Couldn't delete the file: ${storage.error.message}`);
      return;
    }
    const { error } = await supabase.from("barber_photos").delete().eq("id", photo.id);
    setBusyId(null);
    if (error) toast.error(`Couldn't delete photo: ${error.message}`);
    await refresh();
  }

  const list = photos ?? [];

  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium">作品照 / Sample hairstyle photos</h4>
          <p className="text-xs text-muted-foreground">
            Everyone can see these. Star your best work as Featured.
          </p>
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus className="size-4" aria-hidden />
          {uploading ? "Uploading…" : "Upload photos"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFiles}
        />
      </div>

      {isPending ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading photos…</p>
      ) : list.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No photos yet.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((photo, i) => (
            <li
              key={photo.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card",
                photo.is_featured ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <div className="relative aspect-square bg-muted">
                <img
                  src={photoPublicUrl(photo.storage_path)}
                  alt={photo.caption ?? "Sample hairstyle"}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  disabled={busyId === photo.id}
                  onClick={() => update(photo, { is_featured: !photo.is_featured })}
                  aria-pressed={photo.is_featured}
                  className={cn(
                    "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shadow-card",
                    photo.is_featured
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/90 text-foreground",
                  )}
                >
                  <Star
                    className={cn("size-3.5", photo.is_featured && "fill-current")}
                    aria-hidden
                  />
                  {photo.is_featured ? "精選 Featured" : "Feature"}
                </button>
              </div>
              <div className="space-y-2 p-2">
                <input
                  aria-label="Caption"
                  defaultValue={photo.caption ?? ""}
                  placeholder="Caption (optional)"
                  onBlur={(e) => {
                    const next = e.target.value.trim() || null;
                    if (next !== (photo.caption ?? null)) void update(photo, { caption: next });
                  }}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Move earlier"
                      disabled={i === 0 || busyId !== null}
                      onClick={() => move(i, -1)}
                      className="rounded-full p-1 hover:bg-secondary disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Move later"
                      disabled={i === list.length - 1 || busyId !== null}
                      onClick={() => move(i, 1)}
                      className="rounded-full p-1 hover:bg-secondary disabled:opacity-40"
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete photo"
                    disabled={busyId === photo.id}
                    onClick={() => remove(photo)}
                    className="rounded-full p-1 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
