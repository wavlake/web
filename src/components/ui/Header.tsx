import { LoginArea } from "@/components/auth/LoginArea";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import type React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCashuStore } from "@/stores/cashuStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { getTokenAmount } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DollarSign } from "lucide-react";
import { Bitcoin } from "lucide-react";

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const navigate = useNavigate();
  const cashuStore = useCashuStore();
  const onboardingStore = useOnboardingStore();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();
  const { user } = useCurrentUser();

  // Check for pending onboarding token
  const pendingToken = cashuStore.getPendingOnboardingToken();
  const hasClaimedToken = onboardingStore.isTokenClaimed();
  const showClaimButton = user && pendingToken && !hasClaimedToken;

  // Calculate the amount to display on the button
  let claimButtonText = "Claim eCash";
  if (showClaimButton && pendingToken) {
    try {
      const amount = getTokenAmount(pendingToken);
      if (showSats) {
        claimButtonText = `${amount.toLocaleString()} sats`;
      } else if (btcPrice?.USD) {
        const usd = satsToUSD(amount, btcPrice.USD);
        if (usd !== null) {
          claimButtonText = `${formatUSD(usd)}`;
        }
      }
      claimButtonText = `Free ${claimButtonText}`;
    } catch (error) {
      console.error("Error calculating token amount:", error);
    }
  }

  const handleClaimClick = () => {
    navigate("/wallet");
  };

  return (
    <div className={`flex justify-between items-center ${className || ""}`}>
      <Link to="/" className="contents">
        <h1 className="text-2xl font-bold flex flex-row items-center leading-none">
          <span className="text-red-500 font-extrabold text-3xl">+</span>
          chorus
        </h1>
      </Link>
      <div className="flex items-center gap-2">
        {!showClaimButton && <BalanceDisplay />}
        {showClaimButton && (
          <Button
            onClick={handleClaimClick}
            size="sm"
            variant="ghost"
            className="animate-pulse font-medium hover:bg-green-50 dark:hover:bg-green-950"
          >
            {showSats ? (
              <Bitcoin className="w-3.5 h-3.5 text-orange-500" />
            ) : (
              <DollarSign className="w-3.5 h-3.5 text-green-600" />
            )}
            {claimButtonText}
          </Button>
        )}
        <LoginArea />
      </div>
    </div>
  );
};

export default Header;
