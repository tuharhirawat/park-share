import { motion } from "framer-motion";
import { Shield, Clock, Wallet, MapPin, Car, Star } from "lucide-react";

const features = [
  { icon: MapPin, title: "Location-Based Search", desc: "Find the closest parking spaces with real-time map integration." },
  { icon: Shield, title: "Verified & Safe", desc: "Every host is verified. CCTV, gated, and covered options available." },
  { icon: Clock, title: "Flexible Booking", desc: "Book hourly or daily. Cancel anytime with clear refund policies." },
  { icon: Wallet, title: "Secure Payments", desc: "Pay via UPI, cards, or wallets with complete transaction security." },
  { icon: Car, title: "Vehicle Filters", desc: "Filter by vehicle type - bike, car. Find the perfect fit." },
  { icon: Star, title: "Ratings & Reviews", desc: "Community-driven trust with transparent host and user ratings." },
];

const FeaturesSection = () => (
  <section className="py-24 bg-secondary">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Why Travel Saathi?</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">Everything you need for stress-free parking, all in one place.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
