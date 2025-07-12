import { HeadphonesIcon, MicIcon, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditProfileForm } from "@/components/EditProfileForm";
import { FirebaseAuthForm } from "./FirebaseAuthForm";
import { GenericStep } from "./GenericStep";

type STATES = "sign-up" | "artist" | "profile" | "artist-type" | "firebase";
export const SignUp = ({ handleBack }: { handleBack: () => void }) => {
  const [STATE, SET_STATE] = useState<STATES>("sign-up");
  const [isIndividual, setIsIndividual] = useState(true);
  const [isArtist, setIsArtist] = useState(true);
  const handleSignup = () => {
    console.log("Signing up with Nostr...");
  };

  switch (STATE) {
    case "sign-up":
      return (
        <TooltipProvider>
          <GenericStep
            handleBack={handleBack}
            title="Sign Up"
            description="Select whether you want to sign up as an artist or a listener. This helps us tailor your experience."
          >
            <div>
              <div className="px-6 py-8 space-y-6">
                <div className="flex items-center gap-2">
                  <p className="text-base">
                    What would you like to sign up as?
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This can be changed later in settings</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant={isArtist ? "default" : "outline"}
                    className="w-full rounded-full py-6"
                    onClick={() => setIsArtist(true)}
                  >
                    <MicIcon className="mr-2" />
                    Artist
                  </Button>
                  <Button
                    variant={!isArtist ? "default" : "outline"}
                    className="w-full rounded-full py-6"
                    onClick={() => setIsArtist(false)}
                  >
                    <HeadphonesIcon className="mr-2" />
                    Listener
                  </Button>
                </div>
              </div>
              <div className="px-6">
                <Button
                  className="w-full rounded-full py-6"
                  onClick={() =>
                    SET_STATE(isArtist ? "artist-type" : "profile")
                  }
                >
                  Continue
                </Button>
              </div>
            </div>
          </GenericStep>
        </TooltipProvider>
      );
    case "profile":
      return (
        <GenericStep
          handleBack={() => SET_STATE("sign-up")}
          title="Create User Profile"
          description="This is your public user profile that will be visible to others."
        >
          <EditProfileForm />
        </GenericStep>
      );
    case "artist-type":
      return (
        <GenericStep
          handleBack={() => SET_STATE("artist")}
          title="Select Artist Type"
          description="Choose the type of artist you are. This helps us tailor your experience."
        >
          <div className="flex items-center gap-4">
            <Button
              variant={isIndividual ? "default" : "outline"}
              className="w-full rounded-full py-6"
              onClick={() => setIsIndividual(true)}
            >
              Individual Artist
            </Button>
            <Button
              variant={!isIndividual ? "default" : "outline"}
              className="w-full rounded-full py-6"
              onClick={() => setIsIndividual(false)}
            >
              Band/Group
            </Button>
          </div>
        </GenericStep>
      );
    case "firebase":
      return (
        <GenericStep
          handleBack={() => SET_STATE(isArtist ? "artist-type" : "profile")}
          title="Add Backup Email"
          description="This email will be used for account recovery and notifications."
        >
          <FirebaseAuthForm />
        </GenericStep>
      );
    default:
      return null;
  }
};
