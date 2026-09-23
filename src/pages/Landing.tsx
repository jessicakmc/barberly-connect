import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LogoStrip } from "@/components/LogoStrip";
import { FeatureRow } from "@/components/FeatureRow";
import { PopularGrid } from "@/components/PopularGrid";
import { Footer } from "@/components/Footer";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

export function Landing() {
  useDocumentMeta(
    "Barberly — Find a barber, book in a few taps",
    "Discover verified barbers and hair stylists near you and book an appointment online.",
  );

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
