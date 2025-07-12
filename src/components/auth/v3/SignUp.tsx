import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export const SignUp = ({ handleBack }: { handleBack: () => void }) => {
  const handleSignup = () => {
    console.log("Signing up with Nostr...");
  };
  return (
    <div>
      <div className="px-6 py-8 space-y-6">
        Sign up chose artrist or listener
      </div>
      <Button className="w-full rounded-full py-6 mt-4" onClick={handleSignup}>
        Sign up
      </Button>
    </div>
  );
};
