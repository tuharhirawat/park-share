import {
  Car,
  Instagram,
  TwitterIcon,
  Linkedin,
  // Github,
} from "lucide-react";
import { Link } from "react-router-dom";

const companyLinks = [
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
  { name: "Terms", path: "/terms" },
  { name: "Privacy", path: "/privacy" },
];

const socialLinks = [
  {
    icon: Instagram,
    href: "#",
  },
  {
    icon: TwitterIcon,
    href: "#",
  },
  {
    icon: Linkedin,
    href: "#",
  },
  // {
  //   icon: Github,
  //   href: "#",
  // },
];

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center py-8 text-center">
          <Link
            to="/"
            className="flex items-center gap-4"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/20">
              <Car className="h-7 w-7 text-black h-5 w-5 transition-transform duration-200 hover:scale-110" />
            </div>

            <span className="text-4xl font-bold tracking-tight text-white">
              ParkMitra
            </span>
          </Link>

          <p className="mt-6 max-w-xl text-base leading-8 text-gray-400">
            Peer-to-peer parking marketplace helping travelers
            find trusted parking spaces from local hosts.
          </p>

          <div className="mt-8 flex items-center gap-4">

            {socialLinks.map((social, index) => {
              const Icon = social.icon;

              return (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-400 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-400"
                >
                  <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                </a>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {companyLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm font-medium tracking-wide text-gray-400 transition-colors duration-300 hover:text-white"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-sm text-gray-500 md:flex-row">
          <p>© {new Date().getFullYear()} ParkMitra. All rights reserved.</p>
          <p>Built for community-driven parking.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;