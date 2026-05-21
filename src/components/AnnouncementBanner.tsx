import { X, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AnimatePresence, motion } from "framer-motion";

const announcement = {
  enabled: true,
  message:
    "We will undergo scheduled maintenance Sunday 2:00-3:00 AM IST. During this period bookings and payments may be temporarily unavailable.",
};

const AnnouncementBanner = () => {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!announcement.enabled) return;

    const key = user
      ? `banner-dismissed-${user.id}`
      : "banner-dismissed-guest";

    const dismissed = sessionStorage.getItem(key);

    setHidden(!!dismissed);
  }, [user]);

  const handleClose = () => {
    const key = user
      ? `banner-dismissed-${user.id}`
      : "banner-dismissed-guest";

    sessionStorage.setItem(key, "true");
    setHidden(true);
  };

  return (
    <AnimatePresence>
      {!hidden && announcement.enabled && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[92%] sm:max-w-[90%] md:max-w-3xl lg:max-w-5xl"
        >
          <div className="relative rounded-[28px] border border-white/20 bg-white/10
              backdrop-blur-xl shadow-2xl px-4 sm:px-6 py-4"
            >
            <div className="flex items-start gap-4 pr-10">

              <div className="hidden sm:flex p-3 rounded-2xl bg-amber-400/10 shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-300" />
              </div>

              <div className="flex-1 text-left">
                <p className="text-sm sm:text-base text-primary-foreground/90 leading-relaxed">
                  {announcement.message}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;