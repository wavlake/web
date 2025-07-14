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
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useV3CreateAccount } from "./useV3CreateAccount";
import { useAutoLinkPubkey } from "@/hooks/useAutoLinkPubkey";
import { User } from "firebase/auth";

type STATES =
  | "sign-up"
  | "artist"
  | "profile"
  | "artist-type"
  | "firebase"
  | "welcome";
export const SignUp = ({ handleBack }: { handleBack: () => void }) => {
  const { autoLink } = useAutoLinkPubkey();
  const { createAccount, isCreating } = useV3CreateAccount();
  const { user, metadata } = useCurrentUser();

  const navigate = useNavigate();
  const [STATE, SET_STATE] = useState<STATES>("sign-up");
  const [isSoloArtist, setIsSoloArtist] = useState(true);
  const [isArtist, setIsArtist] = useState(true);

  const getProfileStepDescription = () => {
    if (isArtist) {
      return isSoloArtist
        ? "This is your public solo artist profile that will be visible to others."
        : "This is your public band/group profile that will be visible to others. You'll be able to make individual member profiles later.";
    }

    return "This is your public user profile that will be visible to others.";
  };

  const getProfileTitle = () => {
    if (isArtist) {
      return isSoloArtist
        ? "Create Solo Artist Profile"
        : "Create Band/Group Profile";
    }
    return "Create User Profile";
  };

  const handleProfileCreation = async () => {
    if (isCreating) return;

    await createAccount();
  };

  switch (STATE) {
    case "sign-up":
      return (
        <TooltipProvider>
          <GenericStep
            handleBack={handleBack}
            title="Sign Up"
            description="Select whether you want to sign up as an artist or a
                    listener. This helps us tailor your experience."
          >
            {/* <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This can be changed later in settings</p>
                    </TooltipContent>
                  </Tooltip> */}
            <div className="flex items-center gap-4 py-4">
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
            <Button
              className="w-full rounded-full py-6"
              onClick={async () => {
                if (isArtist) {
                  // choose artist type
                  SET_STATE("artist-type");
                } else {
                  // if no user create user profile for listener
                  !user && (await handleProfileCreation());
                  SET_STATE("profile");
                }
              }}
            >
              Continue
            </Button>
          </GenericStep>
        </TooltipProvider>
      );

    case "artist-type":
      return (
        <GenericStep
          handleBack={() => SET_STATE("sign-up")}
          title="Select Artist Type"
          description="Choose the type of artist you are. This helps us tailor your experience."
        >
          <div className="flex items-center gap-4 py-4">
            <Button
              variant={isSoloArtist ? "default" : "outline"}
              className="w-full rounded-full py-6"
              onClick={() => setIsSoloArtist(true)}
            >
              Solo Artist
            </Button>
            <Button
              variant={!isSoloArtist ? "default" : "outline"}
              className="w-full rounded-full py-6"
              onClick={() => setIsSoloArtist(false)}
            >
              Band/Group
            </Button>
          </div>
          <Button
            className="w-full rounded-full py-6"
            onClick={async () => {
              // if no user create user profile for artist
              !user && (await handleProfileCreation());
              SET_STATE("profile");
            }}
          >
            Continue
          </Button>
        </GenericStep>
      );

    case "profile":
      return (
        <GenericStep
          handleBack={() => SET_STATE(isArtist ? "artist-type" : "sign-up")}
          title={getProfileTitle()}
          description={getProfileStepDescription()}
        >
          {metadata ? (
            <EditProfileForm
              // namePlaceholder={getNamePlaceholder()}
              onComplete={() => SET_STATE(isArtist ? "firebase" : "welcome")}
              showSkipLink={isArtist ? false : true}
            />
          ) : (
            <div>Loading...</div>
          )}
        </GenericStep>
      );

    case "firebase":
      return (
        <GenericStep
          handleBack={() => SET_STATE("profile")}
          title="Add a Backup Email"
          description="This email will be used for account recovery and notifications."
        >
          <FirebaseAuthForm
            mode="signup"
            onComplete={async (firebaseUser: User) => {
              const linkResult = await autoLink(
                firebaseUser,
                user?.pubkey,
                user?.signer
              );
              if (linkResult) {
                console.log(
                  "Successfully linked Firebase user to Nostr account"
                );
              } else {
                console.error("Failed to link Firebase user to Nostr account");
              }
              SET_STATE("welcome");
            }}
          />
        </GenericStep>
      );

    case "welcome":
      // TODO - save a NIP-78 settings event for the user, with their artist vs listener preference
      return (
        <GenericStep
          title="Welcome to Wavlake!"
          description={
            isArtist
              ? "You're all set up as an artist! Next we'll walk you through creating your artist page."
              : "You're all set up! Next, you can explore artist pages and discover new music."
          }
        >
          <Button
            className="w-full rounded-full py-6"
            onClick={() => navigate(isArtist ? "/dashboard" : "/groups")}
          >
            {isArtist ? "Create your artist page" : "Explore artist pages"}
          </Button>
        </GenericStep>
      );
    default:
      return null;
  }
};
