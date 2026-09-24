import { MapPin, Star } from "lucide-react";

export type Service = "Cut" | "Color" | "Perm" | "Beard";

export interface Barber {
  id: string;
  name: string;
  shop: string;
  location: string;
  services: Service[];
  rating: number;
  reviews: number;
  from: number;
  image: string;
}

export function BarberCard({ barber }: { barber: Barber }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-label={`${barber.name} at ${barber.shop}`}
      className="card-lift group block overflow-hidden rounded-3xl border border-border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={barber.image}
          alt={barber.name}
          loading="lazy"
          width={768}
          height={768}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-rose shadow-card backdrop-blur">
          Popular
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-sans text-lg font-semibold tracking-normal">{barber.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              {barber.shop} · {barber.location}
            </p>
          </div>
          <p className="shrink-0 text-right text-sm">
            <span className="text-muted-foreground">from</span>{" "}
            <span className="font-semibold">${barber.from}</span>
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {barber.services.map((s) => (
            <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
              {s}
            </span>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-sm">
          <Star className="size-4 fill-gold text-gold" aria-hidden />
          <span className="font-medium">{barber.rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({barber.reviews} reviews)</span>
        </p>
      </div>
    </a>
  );
}
