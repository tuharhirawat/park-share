import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  readonly?: boolean;
  onChange?: (value: number) => void;
}

export default function StarRating({
  rating,
  readonly = false,
  onChange,
}: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-5 h-5 transition-colors ${
            i <= rating
              ? "text-yellow-500 fill-yellow-500"
              : "text-muted-foreground/30"
          } ${
            !readonly
              ? "cursor-pointer hover:text-yellow-400"
              : ""
          }`}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}