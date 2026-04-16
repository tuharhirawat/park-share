import { motion } from "framer-motion";
import { Search, CalendarCheck, Navigation, Star } from "lucide-react";

const steps = [
  { icon: Search, title: "Search", desc: "Find parking spaces near your destination with smart filters." },
  { icon: CalendarCheck, title: "Book & Pay", desc: "Reserve your spot instantly with secure online payment." },
  { icon: Navigation, title: "Navigate", desc: "Get turn-by-turn directions to your parking space." },
  { icon: Star, title: "Rate", desc: "Share your experience and help build a trusted community." },
];

const HowItWorks = () => (
  <section className="py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">Park in 4 simple steps - no hassle, no stress.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-2xl hero-gradient flex items-center justify-center mx-auto mb-4">
              <s.icon className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-xs font-bold text-primary mb-1">STEP {i + 1}</div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
