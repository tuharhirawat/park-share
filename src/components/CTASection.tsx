import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-16 pb-6 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="hero-gradient rounded-3xl p-12 md:p-16 text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Got an Empty Parking Space?
          </h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8 text-lg">
            Turn your unused driveway, garage, or plot into a steady income stream. Join thousands of hosts earning with Park Mitra.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-xl text-base px-8"
              onClick={() => navigate("/host")}
            >
              List Your Space - It's Free
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-xl text-base px-8"
              onClick={() => navigate("/search")}
            >
              Find Parking Now
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
