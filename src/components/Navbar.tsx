import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HostOnboardingModal from "@/components/HostOnboardingModal";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setIsHost(false); return; }
    supabase
      .from("profiles")
      .select("is_host")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsHost(data.is_host);
      });
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleHostAction = () => {
    if (isHost) {
      navigate("/host");
    } else {
      setHostModalOpen(true);
    }
  };

  return (
    <>
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
            {user && (
              <>
                <button onClick={handleHostAction} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  List Your Space
                </button>
                {isHost && (
                  <Link to="/host/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Host Dashboard
                  </Link>
                )}
                <Link to="/my-bookings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  My Bookings
                </Link>
              </>
            )}
            <ThemeToggle />
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <User className="w-4 h-4" />
                      <span className="max-w-[100px] truncate">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>My Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/vehicles")}>My Vehicles</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-bookings")}>My Bookings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login"><Button variant="outline" size="sm">Log In</Button></Link>
                  <Link to="/signup"><Button size="sm">Sign Up</Button></Link>
                </>
              )
            )}
          </div>

          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-3">
            <Link to="/search" className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setIsOpen(false)}>Find Parking</Link>
            {user && (
              <>
                <button onClick={() => { setIsOpen(false); handleHostAction(); }} className="block text-sm font-medium text-muted-foreground py-2 w-full text-left">
                  List Your Space
                </button>
                {isHost && (
                  <Link to="/host/dashboard" className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setIsOpen(false)}>Host Dashboard</Link>
                )}
                <Link to="/my-bookings" className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setIsOpen(false)}>My Bookings</Link>
                <Link to="/profile" className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setIsOpen(false)}>My Profile</Link>
                <Link to="/vehicles" className="block text-sm font-medium text-muted-foreground py-2" onClick={() => setIsOpen(false)}>My Vehicles</Link>
              </>
            )}
            <div className="flex gap-2 pt-2 items-center">
              <ThemeToggle />
              {!loading && (
                user ? (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setIsOpen(false); handleLogout(); }}>
                    <LogOut className="w-4 h-4 mr-1" /> Log Out
                  </Button>
                ) : (
                  <>
                    <Link to="/login" className="flex-1" onClick={() => setIsOpen(false)}><Button variant="outline" size="sm" className="w-full">Log In</Button></Link>
                    <Link to="/signup" className="flex-1" onClick={() => setIsOpen(false)}><Button size="sm" className="w-full">Sign Up</Button></Link>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </nav>

      <HostOnboardingModal open={hostModalOpen} onOpenChange={setHostModalOpen} />
    </>
  );
};

export default Navbar;
