import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LogoStrip } from "@/components/LogoStrip";
import { FeatureRow } from "@/components/FeatureRow";
import { PopularGrid } from "@/components/PopularGrid";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barberly — Find a barber, book in a few taps" },
      {
        name: "description",
        content: "Discover verified barbers and hair stylists near you and book an appointment online.",
      },
      { property: "og:title", content: "Barberly — Find a barber, book in a few taps" },
      {
        property: "og:description",
        content: "Discover verified barbers and hair stylists near you and book an appointment online.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <FeatureRow />
        <PopularGrid />
      </main>
      <Footer />
    </div>
  );
}
