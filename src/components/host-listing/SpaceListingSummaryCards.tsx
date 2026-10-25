import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { HostSpaceListing, ListingStatus } from "@/types/hostSpaceListings";
import NoImagePlaceholder from "@/components/NoImagePlaceholder";

interface SpaceListingSummaryCardsProps {
  space: HostSpaceListing;
  status: ListingStatus;
  onReapply?: (space: HostSpaceListing) => void;
  onCancel?: (space: HostSpaceListing) => void;
}

const SpaceListingSummaryCards = ({
  space,
  status,
  onReapply,
  onCancel,
}: SpaceListingSummaryCardsProps) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-28 md:w-32 h-40 sm:h-24 md:h-28 rounded-md overflow-hidden border border-border bg-muted shrink-0">
            {space.imageUrl ? (
              <img
                src={space.imageUrl}
                alt={space.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" >
                <NoImagePlaceholder />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg mb-2 break-words">{space.title}</h3>

            <p className="text-muted-foreground text-sm break-words">
              {space.address}
              {space.city ? `, ${space.city}` : ""}
            </p>

            {status === "rejected" && space.rejectionReason && (
              <div className="mt-4">
                <div className="text-sm mb-4 break-words">
                  <span className="font-medium">Reason:</span>{" "}
                  {space.rejectionReason}
                </div>

                {onReapply && (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => onReapply(space)}
                  >
                    Reapply
                  </Button>
                )}
              </div>
            )}

            {status === "pending" && onCancel && (
              <div className="mt-5 pt-4 border-t border-border flex justify-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onCancel(space)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel Listing
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpaceListingSummaryCards;