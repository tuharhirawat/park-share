import { Car, BarChart3, IndianRupee, Star } from "lucide-react";

interface SummaryCardsProps {
  listingsCount: number;
  totalBookings: number;
  totalEarnings: number;
  avgRating: string;
}

const SummaryCards = ({ listingsCount, totalBookings, totalEarnings, avgRating }: SummaryCardsProps) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
    <div className="bg-card rounded-2xl p-5 card-shadow">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        <Car className="w-4 h-4" /> My Spaces
      </div>
      <p className="text-2xl font-bold text-foreground">{listingsCount}</p>
    </div>
    <div className="bg-card rounded-2xl p-5 card-shadow">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        <BarChart3 className="w-4 h-4" /> Total Bookings
      </div>
      <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
    </div>
    <div className="bg-card rounded-2xl p-5 card-shadow">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        <IndianRupee className="w-4 h-4" /> Earnings
      </div>
      <p className="text-2xl font-bold text-foreground">₹{totalEarnings.toLocaleString()}</p>
    </div>
    <div className="bg-card rounded-2xl p-5 card-shadow">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        <Star className="w-4 h-4" /> Avg Rating
      </div>
      <p className="text-2xl font-bold text-foreground">{avgRating}</p>
    </div>
  </div>
);

export default SummaryCards;