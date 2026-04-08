import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg hero-gradient flex items-center justify-center">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Travel <span className="text-primary">Saathi</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Find Parking
          </Link>
          <Link to="/host" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            List Your Space
          </Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </Link>
          <ThemeToggle />
          <Link to="/login"><Button variant="outline" size="sm">Log In</Button></Link>
          <Link to="/signup"><Button size="sm">Sign Up</Button></Link>
        </div>

        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-3">
          <Link to="/search" className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setIsOpen(false)}>Find Parking</Link>
          <Link to="/host" className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setIsOpen(false)}>List Your Space</Link>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">Log In</Button>
            <Button size="sm" className="flex-1">Sign Up</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
