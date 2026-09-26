import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BookingPagination = ({
  page,
  totalPages,
  onPageChange,
}: BookingPaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      <Button
        variant="outline"
        size="icon"
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="icon"
        disabled={page === totalPages}
        onClick={() =>
          onPageChange(Math.min(totalPages, page + 1))
        }
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default BookingPagination;