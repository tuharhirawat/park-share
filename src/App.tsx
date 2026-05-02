import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import MainLayout from "@/layouts/MainLayout.tsx";
import Index from "./pages/Index.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import SpaceDetail from "./pages/SpaceDetail.tsx";
import HostListingPage from "./pages/HostListingPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import MyBookingsPage from "./pages/MyBookingsPage.tsx";
import HostDashboard from "./pages/HostDashboard.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import VehiclesPage from "./pages/VehiclesPage.tsx";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";

const queryClient = new QueryClient();

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
                <Route
                  path="/space/:id"
                  element={
                    <ProtectedRoute>
                      <SpaceDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/host"
                  element={
                    <ProtectedRoute>
                      <HostListingPage />
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
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicles"
                  element={
                    <ProtectedRoute>
                      <VehiclesPage />
                    </ProtectedRoute>
                  }
                />
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
