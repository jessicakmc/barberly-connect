import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, settingsOrDefault, usePlatformSettings } from "@/lib/platform";
import {
  CATEGORY_LABEL,
  SERVICE_CATEGORIES,
  shopKeys,
  useBarberServices,
  type Service,
  type ServiceCategory,
} from "@/lib/shopData";
import {
  ConfirmDeleteButton,
  Field,
  SectionCard,
  inputClass,
  secondaryButtonClass,
} from "@/components/shop/ui";

type Draft = { name: string; category: ServiceCategory; price: string; requiredSlots: string };
const EMPTY: Draft = { name: "", category: "cut", price: "", requiredSlots: "1" };

function isCategory(value: string): value is ServiceCategory {
  return (SERVICE_CATEGORIES as readonly string[]).includes(value);
}

/** Validates a draft into a DB row. Price is a WHOLE-unit integer (e.g. 300 = NT$300) — never ×100. */
function parseDraft(draft: Draft) {
  const price = Number(draft.price);
  const requiredSlots = Number(draft.requiredSlots);
  if (!draft.name.trim()) return { error: "Name is required." } as const;
  if (!Number.isInteger(price) || price < 0)
    return { error: "Price must be a whole number (0 or more)." } as const;
  if (!Number.isInteger(requiredSlots) || requiredSlots < 1)
    return { error: "Required slots must be a whole number of 1 or more." } as const;
  return {
    row: {
      name: draft.name.trim(),
      category: draft.category,
      price,
      required_slots: requiredSlots,
    },
  } as const;
}

function ServiceFields({
  idPrefix,
  draft,
  onChange,
  slotMinutes,
  currency,
}: {
  idPrefix: string;
  draft: Draft;
  onChange: (next: Draft) => void;
  slotMinutes: number;
  currency: string;
}) {
  const slots = Number(draft.requiredSlots);
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <Field id={`${idPrefix}-name`} label="名稱 / Name" required>
          <input
            id={`${idPrefix}-name`}
            required
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="e.g. Classic cut"
            className={inputClass}
          />
        </Field>
      </div>
      <Field id={`${idPrefix}-category`} label="分類 / Category" required>
        <select
          id={`${idPrefix}-category`}
          value={draft.category}
          onChange={(e) => {
            const value = e.target.value;
            if (isCategory(value)) onChange({ ...draft, category: value });
          }}
          className={inputClass}
        >
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id={`${idPrefix}-price`}
        label={`價格 / Price (${currency.toUpperCase()})`}
        hint="Whole amount, e.g. 300"
        required
      >
        <input
          id={`${idPrefix}-price`}
          type="number"
          min={0}
          step={1}
          required
          value={draft.price}
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field
        id={`${idPrefix}-slots`}
        label="所需時段數 / Slots needed"
        hint={
          Number.isInteger(slots) && slots >= 1
            ? `= ${slots * slotMinutes} min (${slotMinutes}-min slots)`
            : `${slotMinutes}-min slots`
        }
        required
      >
        <input
          id={`${idPrefix}-slots`}
          type="number"
          min={1}
          step={1}
          required
          value={draft.requiredSlots}
          onChange={(e) => onChange({ ...draft, requiredSlots: e.target.value })}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function ServiceRow({ service, barberId }: { service: Service; barberId: string }) {
  const queryClient = useQueryClient();
  const { data: settingsData } = usePlatformSettings();
  const settings = settingsOrDefault(settingsData);
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const initial: Draft = {
    name: service.name,
    category: isCategory(service.category) ? service.category : "cut",
    price: String(service.price),
    requiredSlots: String(service.required_slots),
  };
  const [draft, setDraft] = useState<Draft>(initial);

  const refresh = () => queryClient.invalidateQueries({ queryKey: shopKeys.services(barberId) });

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = parseDraft(draft);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("services").update(parsed.row).eq("id", service.id);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't save service: ${error.message}`);
      return;
    }
    await refresh();
    setEditing(false);
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("services").delete().eq("id", service.id);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't delete service: ${error.message}`);
      return;
    }
    await refresh();
  }

  if (editing) {
    return (
      <li className="rounded-2xl border border-border bg-background/60 p-4">
        <form onSubmit={save} className="space-y-4">
          <ServiceFields
            idPrefix={`svc-${service.id}`}
            draft={draft}
            onChange={setDraft}
            slotMinutes={settings.slot_minutes}
            currency={settings.currency}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-pill" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setDraft(initial);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  const category = isCategory(service.category)
    ? CATEGORY_LABEL[service.category]
    : service.category;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{service.name}</p>
        <p className="text-sm text-muted-foreground">
          <span className="chip mr-2 px-2 py-0.5 text-xs">{category}</span>
          {formatMoney(service.price, settings)} · {service.required_slots} slot
          {service.required_slots === 1 ? "" : "s"} (
          {service.required_slots * settings.slot_minutes} min)
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)}>
          Edit
        </button>
        <ConfirmDeleteButton armed={armed} onArm={setArmed} disabled={busy} onConfirm={remove} />
      </div>
    </li>
  );
}

/** A. Services & price editor for one barber. */
export function ServicesEditor({ barberId }: { barberId: string }) {
  const queryClient = useQueryClient();
  const { data: services, isPending, error } = useBarberServices(barberId);
  const { data: settingsData } = usePlatformSettings();
  const settings = settingsOrDefault(settingsData);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const parsed = parseDraft(draft);
    if ("error" in parsed) {
      toast.error(parsed.error);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("services")
      .insert({ ...parsed.row, barber_id: barberId });
    setBusy(false);
    if (error) {
      toast.error(`Couldn't add service: ${error.message}`);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: shopKeys.services(barberId) });
    setDraft(EMPTY);
    setAdding(false);
    toast.success("Service added.");
  }

  return (
    <SectionCard
      eyebrow="A · 服務與價格"
      title="Services & prices"
      description="What customers can book with this barber."
      aside={
        !adding && (
          <button type="button" className="btn-pill" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Add service
          </button>
        )
      }
    >
      {adding && (
        <form
          onSubmit={add}
          className="mb-5 space-y-4 rounded-2xl border border-dashed border-border p-4"
        >
          <ServiceFields
            idPrefix="new-svc"
            draft={draft}
            onChange={setDraft}
            slotMinutes={settings.slot_minutes}
            currency={settings.currency}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-pill" disabled={busy}>
              {busy ? "Adding…" : "Add service"}
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
        <p className="text-sm text-muted-foreground">Loading services…</p>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn't load services: {error.message}</p>
      ) : (services?.length ?? 0) === 0 ? (
        !adding && <p className="text-sm text-muted-foreground">No services yet.</p>
      ) : (
        <ul className="space-y-3">
          {services?.map((s) => (
            <ServiceRow key={s.id} service={s} barberId={barberId} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
