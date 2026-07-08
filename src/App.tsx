import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { hasEmailAuth, validateAuthConfig } from "./config/authConfig.ts";
import MainLayout from "@/layouts/MainLayout.tsx";
import Index from "./pages/Index.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import SpaceDetail from "./pages/SpaceDetail.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import MyBookingsPage from "./pages/MyBookingsPage.tsx";
import HostDashboard from "./pages/HostDashboard.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import VehiclesPage from "./pages/VehiclesPage.tsx";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import About from "@/pages/About.jsx";
import Contact from "@/pages/Contact.jsx";
import Terms from "@/pages/Terms.tsx";
import Privacy from "@/pages/Privacy.jsx";
import HostListingHub from "./pages/HostListingHub.tsx";
import AuthCallback from "./components/AuthCallback.tsx";

const queryClient = new QueryClient();
validateAuthConfig();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/space/:id" element={<SpaceDetail />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                  path="/host/host-listing"
                  element={
                    <ProtectedRoute>
                      <HostListingHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-bookings"
                  element={
                    <ProtectedRoute>
                      <MyBookingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/host/dashboard"
                  element={
                    <ProtectedRoute>
                      <HostDashboard />
                    </ProtectedRoute>
                  }
                />
                {hasEmailAuth() && (
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                )}
                <Route
                  path="/vehicles"
                  element={
                    <ProtectedRoute>
                      <VehiclesPage />
                    </ProtectedRoute>
                  }
                />
                {hasEmailAuth() && (
                  <>
                    <Route
                      path="/login"
                      element={
                        <PublicRoute>
                          <LoginPage />
                        </PublicRoute>
                      }
                    />

                    <Route
                      path="/signup"
                      element={
                        <PublicRoute>
                          <SignupPage />
                        </PublicRoute>
                      }
                    />
                  </>
                )}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
