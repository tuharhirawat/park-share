export interface ParkingSpace {
  id: string;
  title: string;
  address: string;
  city: string;
  pricePerHour: number;
  pricePerDay: number;
  vehicleTypes: ("bike" | "car" | "suv")[];
  features: string[];
  rating: number;
  reviewCount: number;
  hostName: string;
  image: string;
  lat: number;
  lng: number;
  available: boolean;
}

export const mockSpaces: ParkingSpace[] = [
  {
    id: "1", title: "Covered Garage near MG Road", address: "12, Brigade Road", city: "Bangalore",
    pricePerHour: 40, pricePerDay: 300, vehicleTypes: ["car", "bike"],
    features: ["CCTV", "Covered", "24/7 Access"], rating: 4.8, reviewCount: 124,
    hostName: "Rajesh K.", image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&h=400&fit=crop", lat: 12.9716, lng: 77.5946, available: true,
  },
  {
    id: "2", title: "Open Plot near Railway Station", address: "Station Road, Andheri", city: "Mumbai",
    pricePerHour: 30, pricePerDay: 200, vehicleTypes: ["car", "bike", "suv"],
    features: ["Gated", "Guard"], rating: 4.5, reviewCount: 87,
    hostName: "Priya S.", image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&h=400&fit=crop", lat: 19.1136, lng: 72.8697, available: true,
  },
  {
    id: "3", title: "Secure Basement Parking", address: "Connaught Place", city: "Delhi",
    pricePerHour: 50, pricePerDay: 400, vehicleTypes: ["car"],
    features: ["CCTV", "Covered", "EV Charging"], rating: 4.9, reviewCount: 203,
    hostName: "Amit V.", image: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=600&h=400&fit=crop", lat: 28.6315, lng: 77.2167, available: true,
  },
  {
    id: "4", title: "Driveway Spot in Koregaon Park", address: "Lane 5, Koregaon Park", city: "Pune",
    pricePerHour: 25, pricePerDay: 180, vehicleTypes: ["bike", "car"],
    features: ["Gated", "Residential Area"], rating: 4.6, reviewCount: 56,
    hostName: "Sneha M.", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop", lat: 18.5362, lng: 73.8935, available: true,
  },
  {
    id: "5", title: "Multi-Level Car Park", address: "T Nagar", city: "Chennai",
    pricePerHour: 35, pricePerDay: 250, vehicleTypes: ["car", "suv"],
    features: ["CCTV", "Covered", "Lift Access"], rating: 4.7, reviewCount: 142,
    hostName: "Karthik R.", image: "https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=600&h=400&fit=crop", lat: 13.0418, lng: 80.2341, available: true,
  },
  {
    id: "6", title: "Garage near Lake", address: "Hussain Sagar Road", city: "Hyderabad",
    pricePerHour: 30, pricePerDay: 220, vehicleTypes: ["car", "bike"],
    features: ["Covered", "Well-Lit"], rating: 4.4, reviewCount: 38,
    hostName: "Ravi T.", image: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=600&h=400&fit=crop", lat: 17.4239, lng: 78.4738, available: false,
  },
];
