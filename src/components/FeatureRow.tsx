import { BadgeCheck, CalendarCheck, ShieldCheck, Star } from "lucide-react";

const FEATURES = [
  { icon: BadgeCheck, label: "Verified Barbers", text: "Every profile is reviewed before it goes live." },
  { icon: CalendarCheck, label: "Instant Booking", text: "See live availability and lock in a slot." },
  { icon: ShieldCheck, label: "Secure Payment", text: "Pay safely online, no cash surprises." },
  { icon: Star, label: "Top-Rated Styles", text: "Browse real reviews from real clients." },
];

export function FeatureRow() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-4xl font-medium sm:text-5xl">Best booking experience</h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, label, text }) => (
          <div
            key={label}
            className="rounded-3xl border border-border bg-card p-6 text-center shadow-card"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-sage text-leaf">
              <Icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-sans text-base font-semibold tracking-normal">{label}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
