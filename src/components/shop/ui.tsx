import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60";

export function SectionCard({
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-medium sm:text-3xl">{title}</h2>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Two-click delete: first click arms, second click confirms. */
export function ConfirmDeleteButton({
  onConfirm,
  label = "Delete",
  disabled,
  armed,
  onArm,
}: {
  onConfirm: () => void;
  label?: string;
  disabled?: boolean;
  armed: boolean;
  onArm: (armed: boolean) => void;
}) {
  if (!armed) {
    return (
      <button
        type="button"
        className={dangerButtonClass}
        disabled={disabled}
        onClick={() => onArm(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className={dangerButtonClass} disabled={disabled} onClick={onConfirm}>
        Confirm
      </button>
      <button type="button" className={secondaryButtonClass} onClick={() => onArm(false)}>
        Cancel
      </button>
    </span>
  );
}
