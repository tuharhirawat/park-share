import { useState } from "react";

interface Props {
  title: string;
  images?: string[];
  image?: string;
}

const SpaceImageCarousel = ({ title, images, image }: Props) => {

  const galleryImages = images?.length ? images : image ? [image] : [];
  const [activeImage, setActiveImage] = useState(0);

  const prevImage = () => {
    setActiveImage(prev => prev === 0 ? galleryImages.length - 1 : prev - 1);
  };
  const nextImage = () => {
    setActiveImage(prev => prev === galleryImages.length - 1 ? 0 : prev + 1);
  };

  if (!galleryImages.length) return null;

  return (
    <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-2xl">
      <div className="relative h-[280px] sm:h-[380px] md:h-[500px] group bg-black">
        <img
          src={galleryImages[activeImage]}
          alt={title}
          className="w-full h-full object-cover transition-all duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {galleryImages.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12
                        rounded-full bg-black/50 text-white text-3xl backdrop-blur hover:scale-110
                        transition"
            >
              ‹
            </button>

            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12
                        rounded-full bg-black/50 text-white text-3xl backdrop-blur
                        hover:scale-110 transition"
            >
              ›
            </button>
          </>
        )}

        <div className="absolute bottom-5 right-5 px-4 py-2 rounded-full bg-black/50
                    text-white text-sm backdrop-blur "
        >
          {activeImage + 1} / {galleryImages.length}
        </div>
      </div>

      {galleryImages.length > 1 && (
        <div className="p-4 flex gap-3 overflow-x-auto scrollbar-hide">
          {galleryImages.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveImage(index)}
              className={`shrink-0 w-24 sm:w-28 h-16 sm:h-20 rounded-xl overflow-hidden border-2 transition
                    ${activeImage === index ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <img
                src={img}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpaceImageCarousel;