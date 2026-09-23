const PARTNERS = ["Maison Coupe", "The Fade Room", "Atelier Hair", "Barber & Co.", "Studio Nord", "Salon Vela"];

export function LogoStrip() {
  return (
    <section className="border-y border-border/70 bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="eyebrow text-center">Trusted by salons across the city</p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {PARTNERS.map((name) => (
            <li
              key={name}
              className="font-display text-xl font-semibold tracking-tight text-muted-foreground/80 sm:text-2xl"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
