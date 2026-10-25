// ============================================================
// API TYPES
// These match the backend API response/request structures.
// ============================================================

export type ComputedStatus = "Upcoming" | "Active" | "Completed" | "Cancelled";

export type FieldCooldown = {
  isActive: boolean;
  daysRemaining: number;
};

export type SpaceReviewSummary = {
  spaceId: string;
  title: string;
  reviewCount: number;
  avgRating: number | string;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
  latestReviewAt: string;
};

export type Space = {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  pricePerHour: number;
  pricePerDay: number | null;
  vehicleTypes?: string[];
  features?: string[];
  description?: string | null;
  lat?: number;
  lng?: number;
  available: boolean;
  rating: number;
  reviewCount: number;
  imageUrls: string[];
  listingStatus: string;
  totalBookings: number;
  earnings: number;
  activeNow: number;
  upcomingCount: number;
  pricePerHourCooldown: FieldCooldown;
  pricePerDayCooldown: FieldCooldown;
  titleCooldown: FieldCooldown;
  addressCooldown: FieldCooldown;
  featuresCooldown: FieldCooldown;
};

export type ParkingSlot = {
  id: string;
  spaceId: string;
  label: string;
  vehicleType: string;
  isActive: boolean;
};

export type Booking = {
  id: string;
  spaceId: string;
  spaceTitle: string;
  totalPrice: number;
  status: string;
  bookingDate: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  vehicleType: string;
};

export type HostBooking = {
  id: string;
  bookingDate: string | null;
  startTime: string | null;
  endTime: string | null;
  vehicleType: string | null;
  totalPrice: number;
  computedStatus: ComputedStatus;
  createdAt: string;
  slotLabel: string | null;
}

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type StatusCounts = {
  upcoming: number;
  active: number;
  completed: number;
  cancelled: number;
}

// ============================================================
// FRONTEND-ONLY TYPES
// These exist only because the React UI needs them.
// ============================================================

export interface LiveSpace extends Space {
  activeCount: number;
  upcomingCount: number;
  totalBookings: number;
}

export interface SpaceCardData {
  id: string;
  title: string;
  address: string;
  city: string;
  pricePerHour: number;
  available: boolean;
  rating: number;
  reviewCount: number;
  listingStatus: string;
  imageUrls: string[];
  activeCount: number;
  upcomingCount: number;
  totalBookings: number;
  earnings: number;
}