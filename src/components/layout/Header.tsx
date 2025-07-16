import { ClaimOnboardingTokenButton } from "@/components/ClaimOnboardingTokenButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCashuStore } from "@/stores/cashuStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type React from "react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import { calculateBalance } from "@/lib/cashu";
import { UserDropdownMenu } from "../UserDropdownMenu";

interface HeaderProps {
  className?: string;
  title?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ className, title }) => {
  const cashuStore = useCashuStore();
  const onboardingStore = useOnboardingStore();
  const { user } = useCurrentUser();
  const location = useLocation();
  const [currencyMode, setCurrencyMode] = useState<"USD" | "SATS" | "BOTH">(
    "USD"
  );
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if we should show the claim button
  const pendingToken = cashuStore.getPendingOnboardingToken();
  const hasClaimedToken = onboardingStore.isTokenClaimed();
  const showClaimButton = user && pendingToken && !hasClaimedToken;

  // Calculate total balance across all mints
  const balances = calculateBalance(cashuStore.proofs);
  const walletBalance = Object.values(balances).reduce(
    (sum, balance) => sum + balance,
    0
  );

  const handleCurrencyToggle = () => {
    setCurrencyMode((prev) => {
      if (prev === "USD") return "SATS";
      if (prev === "SATS") return "BOTH";
      return "USD";
    });
  };

  const formatCurrency = (sats: number) => {
    if (currencyMode === "USD") {
      return `$${(sats / 2000).toFixed(2)}`;
    }
    if (currencyMode === "SATS") {
      return `${sats.toLocaleString()} sats`;
    }
    // BOTH mode
    return `$${(sats / 2000).toFixed(2)} | ${sats.toLocaleString()} sats`;
  };

  const isLoggedIn = !!user;

  return (
    <header
      className={`relative bg-background shadow-sm border-b transition-all duration-200 ${
        title && isLoggedIn ? "h-28 sm:h-16" : "h-16"
      } ${className || ""}`}
    >
      {/* Center title area - responsive positioning */}
      {title && (
        <>
          {/* Single row title (hidden on small screens when logged in, always shown when logged out) */}
          <div
            className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none ${
              isLoggedIn ? "hidden sm:flex" : "flex"
            }`}
          >
            <div className="pointer-events-auto">{title}</div>
          </div>

          {/* Two row title (only shown on small screens when logged in) */}
          {isLoggedIn && (
            <div className="flex sm:hidden absolute bottom-0 left-0 right-0 h-12 items-center justify-center z-10 pointer-events-none bg-background border-t border-border px-4">
              <div className="pointer-events-auto text-center">{title}</div>
            </div>
          )}
        </>
      )}

      <div className="relative h-16 flex items-center justify-between px-4 z-20">
        {/* Left side - Wavlake Logo */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="bg-black/80 backdrop-blur-sm rounded-lg w-10 h-10 flex items-center justify-center hover:bg-black/90 transition-colors overflow-hidden"
          >
            <img
              src="/web-app-manifest-192x192.png"
              alt="Wavlake"
              width={40}
              height={40}
              className="object-contain w-full h-full"
            />
          </Link>

          {/* Wallet Balance - Only show when logged in */}
          {isLoggedIn && (
            <div className="bg-black/80 backdrop-blur-sm rounded-lg h-10 px-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-white" />
              <button
                onClick={handleCurrencyToggle}
                className="text-white text-sm font-medium hover:text-gray-200 transition-colors"
              >
                {formatCurrency(walletBalance)}
              </button>
            </div>
          )}
        </div>

        {/* Right side - Account Switcher */}
        <div className="flex items-center gap-3">
          {showClaimButton && <ClaimOnboardingTokenButton />}
          <ThemeToggle />
          <UserDropdownMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
