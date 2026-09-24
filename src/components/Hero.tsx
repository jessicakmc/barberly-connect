import { useState } from "react";
import { Search } from "lucide-react";
import heroLeft from "@/assets/hero-left.jpg";
import heroRight from "@/assets/hero-right.jpg";

const FILTERS = ["All", "Cut", "Color", "Perm", "Beard"] as const;

export function Hero() {
  const [active, setActive] = useState<(typeof FILTERS)[number]>("All");

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
        <div className="fade-up hidden md:block" style={{ animationDelay: "0.1s" }}>
          <img
            src={heroLeft}
            alt="Woman with a glossy bob haircut"
            width={768}
            height={1024}
            className="aspect-[3/4] w-full max-w-xs rounded-3xl object-cover shadow-glow"
          />
        </div>

        <div className="fade-up mx-auto max-w-xl text-center">
          <p className="eyebrow">New Look</p>
          <h1 className="mt-4 text-5xl leading-[1.02] font-medium sm:text-6xl lg:text-7xl">
            Style with
            <br />
            <em className="text-gloss pr-1 italic">Confident</em> Hair
          </h1>
          <p className="mt-5 text-base text-muted-foreground">
            Discover trusted barbers and stylists near you, and book a slot in a few taps.
          </p>
        </div>

        <div className="fade-up hidden md:block" style={{ animationDelay: "0.2s" }}>
          <img
            src={heroRight}
            alt="Man with a textured fade and groomed beard"
            width={768}
            height={1024}
            className="ml-auto aspect-[3/4] w-full max-w-xs rounded-3xl object-cover shadow-glow"
          />
        </div>
      </div>

      <div className="fade-up mt-8 grid grid-cols-2 gap-3 md:hidden" style={{ animationDelay: "0.15s" }}>
        <img
          src={heroLeft}
          alt="Woman with a glossy bob haircut"
          width={768}
          height={1024}
          className="aspect-[3/4] w-full rounded-2xl object-cover shadow-glow"
        />
        <img
          src={heroRight}
          alt="Man with a textured fade and groomed beard"
          width={768}
          height={1024}
          className="aspect-[3/4] w-full rounded-2xl object-cover shadow-glow"
        />
      </div>

      <div className="fade-up mx-auto mt-10 max-w-2xl" style={{ animationDelay: "0.3s" }}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-card"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Find your stylist or search a style"
            className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
          />
          <button type="submit" className="btn-pill shrink-0">
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActive(f)}
              className={`chip ${active === f ? "chip-active" : ""}`}
              aria-pressed={active === f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
