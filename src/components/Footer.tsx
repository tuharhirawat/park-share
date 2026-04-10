import { Car } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-card border-t border-border py-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Travel Saathi</span>
          </div>
          <p className="text-sm text-muted-foreground">Peer-to-peer parking marketplace connecting travelers with local space owners.</p>
        </div>
        {[
          { title: "For Travelers", links: ["Find Parking", "How It Works", "Safety"] },
          { title: "For Hosts", links: ["List Your Space", "Pricing", "Host Guide"] },
          { title: "Company", links: ["About", "Contact", "Terms", "Privacy"] },
        ].map(col => (
          <div key={col.title}>
            <h4 className="font-display font-semibold text-foreground mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(l => (
                <li key={l}><Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-12 pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Travel Saathi. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
