import { useEffect, useState } from "react";
import { Scissors, Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { photoPublicUrl, type BarberPhoto } from "@/lib/shopData";
import { cn } from "@/lib/utils";

/**
 * Marketplace-style product gallery for a barber's portfolio: big main image with
 * prev/next, a thumbnail strip, and click-to-zoom in a lightbox. Photos arrive
 * featured-first, then by sort_order.
 */
export function PhotoCarousel({
  photos,
  barberName,
}: {
  photos: BarberPhoto[];
  barberName: string;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState<BarberPhoto | null>(null);

  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-border bg-secondary text-muted-foreground">
        <div className="text-center">
          <Scissors className="mx-auto size-10" aria-hidden />
          <p className="mt-2 text-sm">No portfolio photos yet</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Carousel setApi={setApi} opts={{ loop: photos.length > 1 }} className="w-full">
        <CarouselContent>
          {photos.map((photo, i) => (
            <CarouselItem key={photo.id}>
              <button
                type="button"
                onClick={() => setZoomed(photo)}
                className="relative block aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Enlarge photo ${i + 1} of ${photos.length}`}
              >
                <img
                  src={photoPublicUrl(photo.storage_path)}
                  alt={photo.caption || `${barberName} — work ${i + 1}`}
                  className="size-full cursor-zoom-in object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
                {photo.is_featured && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-3 py-1 text-xs font-medium shadow-card backdrop-blur">
                    <Star className="size-3 fill-gold text-gold" aria-hidden /> Featured
                  </span>
                )}
                {photo.caption && (
                  <span className="absolute right-3 bottom-3 left-3 truncate rounded-full bg-card/90 px-3 py-1 text-left text-xs shadow-card backdrop-blur">
                    {photo.caption}
                  </span>
                )}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {photos.length > 1 && (
          <>
            <CarouselPrevious className="left-3 bg-card/90" />
            <CarouselNext className="right-3 bg-card/90" />
          </>
        )}
      </Carousel>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose photo">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => api?.scrollTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={current === i}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-opacity",
                current === i
                  ? "border-foreground"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <img
                src={photoPublicUrl(photo.storage_path)}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={zoomed !== null} onOpenChange={(open) => !open && setZoomed(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">
            {zoomed?.caption || `${barberName} — photo`}
          </DialogTitle>
          {zoomed && (
            <img
              src={photoPublicUrl(zoomed.storage_path)}
              alt={zoomed.caption || `${barberName} — photo`}
              className="max-h-[85vh] w-full rounded-2xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
