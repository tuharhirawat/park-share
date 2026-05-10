import { motion } from "framer-motion";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-8 -mt-6">
      <div className="absolute inset-0">
        <img src={heroBg} alt="Aerial city parking" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-foreground/60" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground text-sm font-medium mb-6 backdrop-blur-sm border border-primary/30">
            🚗 India's #1 Peer-to-Peer Parking Platform
          </span>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-6 leading-tight">
            Park Anywhere.<br />
            <span className="text-accent">Earn Everywhere.</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
            Find safe, affordable parking in seconds - or turn your unused space into passive income. Park Mitra connects travelers with local hosts.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-background rounded-2xl p-2 card-shadow flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-muted">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <input
                type="text"
                placeholder="Where do you need parking?"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
            </div>
            <Button
              size="lg"
              className="rounded-xl gap-2 px-8"
              onClick={() => navigate("/search")}
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-8 mt-10 text-primary-foreground/70 text-sm"
        >
          <span>✓ 10,000+ Spaces</span>
          <span>✓ 50+ Cities</span>
          <span>✓ Verified Hosts</span>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
