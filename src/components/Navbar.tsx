import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuthButtons from "@/components/AuthButtons";
import HostOnboardingModal from "@/components/HostOnboardingModal";
import { getLoginRoute, hasEmailAuth } from "@/config/authConfig";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsHost(user?.isHost ?? false);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/", { replace: true });
  };

  const handleHostAction = () => {
    if (!user) {
      navigate(getLoginRoute());
      return;
    }

    isHost ? navigate("/host/host-listing") : setHostModalOpen(true);
  };

  const desktopNavClass = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors";
  const desktopActiveClass = "text-primary";
  const mobileNavClass = "block text-sm font-medium text-muted-foreground py-2 rounded-md";
  const mobileActiveClass = "text-primary bg-muted px-2";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg hero-gradient flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Park <span className="text-primary">Mitra</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/search" className={desktopNavClass} activeClassName={desktopActiveClass}>
              Find Parking
            </NavLink>
            {user && (
              <>
                <button
                  onClick={handleHostAction}
                  className={cn(
                    desktopNavClass,
                    location.pathname === "/host/host-listing" && desktopActiveClass,
                  )}
                >
                  List Your Space
                </button>
                <NavLink to="/host/dashboard" className={desktopNavClass} activeClassName={desktopActiveClass}>
                  Host Dashboard
                </NavLink>
                <NavLink to="/my-bookings" className={desktopNavClass} activeClassName={desktopActiveClass}>
                  My Bookings
                </NavLink>
              </>
            )}
            <ThemeToggle />
            {!loading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <User className="w-4 h-4" />
                      <span className="max-w-[100px] truncate">{user?.fullName || user?.email?.split("@")[0]}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {hasEmailAuth() && (
                      <DropdownMenuItem onClick={() => navigate("/profile")}>My Profile</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/vehicles")}>My Vehicles</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <AuthButtons />
              )
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">

            <ThemeToggle />

            <button onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

          </div>
        </div>

        {isOpen && (
          <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-3">
            <NavLink
              to="/search"
              className={mobileNavClass}
              activeClassName={mobileActiveClass}
              onClick={() => setIsOpen(false)}
            >
              Find Parking
            </NavLink>
            {user && (
              <>
                <button
                  onClick={() => { setIsOpen(false); handleHostAction(); }}
                  className={cn(
                    "block text-sm font-medium py-2 w-full text-left rounded-md",
                    location.pathname === "/host/host-listing" ? mobileActiveClass : "text-muted-foreground",
                  )}
                >
                  List Your Space
                </button>
                <NavLink
                  to="/host/dashboard"
                  className={mobileNavClass}
                  activeClassName={mobileActiveClass}
                  onClick={() => setIsOpen(false)}
                >
                  Host Dashboard
                </NavLink>
                <NavLink
                  to="/my-bookings"
                  className={mobileNavClass}
                  activeClassName={mobileActiveClass}
                  onClick={() => setIsOpen(false)}
                >
                  My Bookings
                </NavLink>
                {hasEmailAuth() && (
                  <NavLink
                    to="/profile"
                    className={mobileNavClass}
                    activeClassName={mobileActiveClass}
                    onClick={() => setIsOpen(false)}
                  >
                    My Profile
                  </NavLink>
                )}
                <NavLink
                  to="/vehicles"
                  className={mobileNavClass}
                  activeClassName={mobileActiveClass}
                  onClick={() => setIsOpen(false)}
                >
                  My Vehicles
                </NavLink>
              </>
            )}
            <div className="flex gap-2 pt-2 items-center">
              {!loading && (
                user ? (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setIsOpen(false); handleLogout(); }}>
                    <LogOut className="w-4 h-4 mr-1" /> Log Out
                  </Button>
                ) : (
                  <div onClick={() => setIsOpen(false)}>
                    <AuthButtons />
                  </div>
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
