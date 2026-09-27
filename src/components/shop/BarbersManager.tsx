import { useState, type FormEvent } from "react";
import { Plus, Scissors } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { shopKeys, useMyBarbers, type Barber } from "@/lib/shopData";
import { BarberPhotos } from "@/components/shop/BarberPhotos";
import {
  ConfirmDeleteButton,
  Field,
  SectionCard,
  inputClass,
  secondaryButtonClass,
} from "@/components/shop/ui";

type BarberDraft = { name: string; intro: string; address: string };
const EMPTY: BarberDraft = { name: "", intro: "", address: "" };

function toRow(draft: BarberDraft) {
  return {
    name: draft.name.trim(),
    intro: draft.intro.trim() || null,
    address: draft.address.trim() || null,
  };
}

function BarberFields({
  idPrefix,
  draft,
  onChange,
}: {
  idPrefix: string;
  draft: BarberDraft;
  onChange: (next: BarberDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${idPrefix}-name`} label="名稱 / Name" required>
        <input
          id={`${idPrefix}-name`}
          required
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id={`${idPrefix}-address`} label="地址 / Address">
        <input
          id={`${idPrefix}-address`}
          value={draft.address}
          onChange={(e) => onChange({ ...draft, address: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field id={`${idPrefix}-intro`} label="簡介 / Intro">
          <textarea
            id={`${idPrefix}-intro`}
            rows={3}
            value={draft.intro}
            onChange={(e) => onChange({ ...draft, intro: e.target.value })}
            placeholder="簡短介紹一下這位理髮師 / a short bio"
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}

function BarberItem({ barber, shopId }: { barber: Barber; shopId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BarberDraft>({
    name: barber.name,
    intro: barber.intro ?? "",
    address: barber.address ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: shopKeys.barbers(shopId) });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("barbers").update(toRow(draft)).eq("id", barber.id);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't save barber: ${error.message}`);
      return;
    }
    await refresh();
    setEditing(false);
    toast.success("Barber updated.");
  }

  async function remove() {
    setBusy(true);
    // Remove the barber's photo files first (the DB rows cascade with the barber).
    const { data: files } = await supabase.storage.from("barber-photos").list(barber.id);
    if (files && files.length > 0) {
      await supabase.storage
        .from("barber-photos")
        .remove(files.map((f) => `${barber.id}/${f.name}`));
    }
    const { error } = await supabase.from("barbers").delete().eq("id", barber.id);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't delete barber: ${error.message}`);
      return;
    }
    await refresh();
    toast.success(`${barber.name} removed.`);
  }

  return (
    <li className="rounded-2xl border border-border bg-background/60 p-5">
      {editing ? (
        <form onSubmit={save} className="space-y-4">
          <BarberFields idPrefix={`barber-${barber.id}`} draft={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <button type="submit" className="btn-pill" disabled={busy || !draft.name.trim()}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setDraft({
                  name: barber.name,
                  intro: barber.intro ?? "",
                  address: barber.address ?? "",
                });
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-medium">{barber.name}</h3>
            {barber.address && <p className="text-sm text-muted-foreground">{barber.address}</p>}
            {barber.intro && (
              <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{barber.intro}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)}>
              Edit
            </button>
            <ConfirmDeleteButton
              armed={armed}
              onArm={setArmed}
              disabled={busy}
              onConfirm={remove}
            />
          </div>
        </div>
      )}
      <BarberPhotos barberId={barber.id} />
    </li>
  );
}

/** CRUD for the shop's barbers — one shop can list MANY barbers. */
export function BarbersManager({ shopId }: { shopId: string }) {
  const queryClient = useQueryClient();
  const { data: barbers, isPending, error } = useMyBarbers(shopId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<BarberDraft>(EMPTY);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("barbers").insert({ ...toRow(draft), shop_id: shopId });
    setBusy(false);
    if (error) {
      toast.error(`Couldn't add barber: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: shopKeys.barbers(shopId) });
    setDraft(EMPTY);
    setAdding(false);
    toast.success("Barber added.");
  }

  const count = barbers?.length ?? 0;

  return (
    <SectionCard
      eyebrow="Step 2 · 我的理髮師"
      title="My barbers"
      description="Add everyone who takes bookings at your shop, then upload sample hairstyle photos for each."
      aside={
        !adding && (
          <button type="button" className="btn-pill" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            {count === 0 ? "Add a barber" : "Add another barber"}
          </button>
        )
      }
    >
      {adding && (
        <form
          onSubmit={add}
          className="mb-6 space-y-4 rounded-2xl border border-dashed border-border p-5"
        >
          <BarberFields idPrefix="new-barber" draft={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <button type="submit" className="btn-pill" disabled={busy || !draft.name.trim()}>
              {busy ? "Adding…" : "Add barber"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setDraft(EMPTY);
                setAdding(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading barbers…</p>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn't load barbers: {error.message}</p>
      ) : count === 0 ? (
        !adding && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
            <Scissors className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">No barbers yet — add your first one.</p>
          </div>
        )
      ) : (
        <ul className="space-y-4">
          {barbers?.map((b) => (
            <BarberItem key={b.id} barber={b} shopId={shopId} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
