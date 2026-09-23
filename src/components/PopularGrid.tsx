import { BarberCard, type Barber } from "./BarberCard";
import barber1 from "@/assets/barber-1.jpg";
import barber2 from "@/assets/barber-2.jpg";
import barber3 from "@/assets/barber-3.jpg";
import barber4 from "@/assets/barber-4.jpg";
import barber5 from "@/assets/barber-5.jpg";
import barber6 from "@/assets/barber-6.jpg";

const BARBERS: Barber[] = [
  { id: "1", name: "Marco Bellini", shop: "The Fade Room", location: "Soho", services: ["Cut", "Beard"], rating: 4.9, reviews: 212, from: 35, image: barber1 },
  { id: "2", name: "Sofia Reyes", shop: "Atelier Hair", location: "Chelsea", services: ["Cut", "Color", "Perm"], rating: 4.8, reviews: 174, from: 55, image: barber2 },
  { id: "3", name: "Kenji Tanaka", shop: "Studio Nord", location: "Brooklyn", services: ["Cut", "Beard"], rating: 4.9, reviews: 301, from: 40, image: barber3 },
  { id: "4", name: "Emma Lindqvist", shop: "Salon Vela", location: "Tribeca", services: ["Color", "Cut"], rating: 4.7, reviews: 98, from: 70, image: barber4 },
  { id: "5", name: "Walter Grimes", shop: "Barber & Co.", location: "Midtown", services: ["Cut", "Beard"], rating: 5.0, reviews: 456, from: 45, image: barber5 },
  { id: "6", name: "Amara Osei", shop: "Maison Coupe", location: "Harlem", services: ["Cut", "Perm", "Color"], rating: 4.8, reviews: 143, from: 60, image: barber6 },
];

export function PopularGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="flex items-end justify-between">
        <h2 className="text-4xl font-medium sm:text-5xl">Popular</h2>
        <p className="text-sm text-muted-foreground">Featured barbers this week</p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BARBERS.map((b) => (
          <BarberCard key={b.id} barber={b} />
        ))}
      </div>
    </section>
  );
}
