export type ListingStatus = "pending" | "approved" | "rejected";

export type HostSpacesListingsCount = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type HostSpaceListing = {
  id: string;
  title: string;
  address: string;
  city: string;
  listingStatus: ListingStatus;
  rejectionReason?: string | null;
  createdAt: string;
  imageUrl?: string | null;
};

export type ReapplySpace = {
  id: string;
  title: string;
  address: string;
  stateName: string;
  cityName: string;
  pricePerHour: number;
  pricePerDay: number | null;
  carSlots: number;
  bikeSlots: number;
  features: string[];
  description: string | null;
  imageUrls: string[];
  lat: number | null;
  lng: number | null;
};
