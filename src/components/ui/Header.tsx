import { LoginArea } from "@/components/auth/LoginArea";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import type React from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => (
  <div className={`flex justify-between items-center ${className || ''}`}>
    <Link to="/" className="contents">
      <h1 className="text-2xl font-bold flex flex-row items-center leading-none">
        <span className="text-red-500 font-extrabold text-3xl">+</span>
        chorus
      </h1>
    </Link>
    <div className="flex items-center gap-2">
      <PWAInstallButton variant="ghost" size="sm" className="hidden sm:flex" />
      <LoginArea />
    </div>
  </div>
);

export default Header;