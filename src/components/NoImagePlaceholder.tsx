import { ImageOff } from "lucide-react";

const NoImagePlaceholder = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
      <ImageOff className="w-7 h-7 sm:w-8 sm:h-8 mb-1.5" />

      <span className="text-xs sm:text-sm font-medium text-center">
        No Image Available
      </span>
    </div>
  );
};

export default NoImagePlaceholder;