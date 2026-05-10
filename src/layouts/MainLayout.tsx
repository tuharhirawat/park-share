import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MainLayout = () => (
  <div className="min-h-screen flex flex-col bg-background">

    <Navbar />

    <main className="flex-1 pt-[88px] pb-10">
      <Outlet />
    </main>

    <Footer />
  </div>
);

export default MainLayout;