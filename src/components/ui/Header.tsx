import { LoginArea } from "@/components/auth/LoginArea";
import { Separator } from "@/components/ui/separator";
import type React from "react";
import { Link } from "react-router-dom";

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => (
  <>
    <div className={`flex justify-between items-center mb-6 ${className || ''}`}>
      <Link to="/" className="contents">
        <h1 className="text-3xl font-bold flex flex-row gap-0 items-baseline">
          <span className="text-red-500 font-extrabold text-4xl">+</span>
          Chorus
        </h1>
      </Link>
      <div className="flex items-center gap-2">
        <LoginArea />
      </div>
    </div>
    <Separator className="my-6" />
  </>
);

export default Header;
