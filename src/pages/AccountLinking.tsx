import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Link as LinkIcon,
  Unlink,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Database,
  Mail,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthor } from "@/hooks/useAuthor";
import { useAccountLinkingStatus } from "@/hooks/useAccountLinkingStatus";
import {
  useUnlinkFirebaseAccount,
  useLinkFirebaseAccount,
} from "@/hooks/useAccountLinking";
import { LoginButton } from "@/components/auth/LoginButton";
import { FirebaseAuthDialog } from "@/components/auth/FirebaseAuthDialog";
import { UnlinkConfirmDialog } from "@/components/auth/UnlinkConfirmDialog";
import {
  initializeFirebaseAuth,
  isFirebaseAuthConfigured,
} from "@/lib/firebaseAuth";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";

export default function AccountLinking() {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey);
  const metadata = author.data?.metadata;
  const displayName =
    metadata?.name ||
    metadata?.display_name ||
    user?.pubkey.slice(0, 8) ||
    "Unnamed";
  const {
    isLinked,
    firebaseUid,
    email,
    isLoading: isCheckingStatus,
  } = useAccountLinkingStatus();
  const unlinkAccount = useUnlinkFirebaseAccount();
  const linkAccount = useLinkFirebaseAccount();

  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [showFirebaseAuthFirst, setShowFirebaseAuthFirst] = useState(false);
  const [isLinkingInProgress, setIsLinkingInProgress] = useState(false);

  // Initialize Firebase when component mounts
  useEffect(() => {
    if (isFirebaseAuthConfigured()) {
      try {
        const { auth } = initializeFirebaseAuth();

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setFirebaseUser(user);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        toast.error("Failed to initialize Firebase authentication");
      }
    }
  }, []);

  const handleUnlinkClick = async () => {
    // Check if user is authenticated with Firebase
    if (!firebaseUser) {
      // Show Firebase auth dialog first
      setShowFirebaseAuthFirst(true);
      return;
    }

    // Check if the current Firebase user matches the linked Firebase UID
    const currentFirebaseUid = firebaseUser.uid;
    if (firebaseUid && currentFirebaseUid !== firebaseUid) {
      // There's a mismatch - show this in the confirmation dialog
      toast.warning(
        "You're signed in with a different Firebase account than the one linked to this Nostr identity."
      );
    }

    // Show confirmation dialog (it will handle the mismatch display)
    setShowUnlinkConfirm(true);
  };

  const handleUnlinkConfirm = async () => {
    try {
      const result = await unlinkAccount.mutateAsync();
      toast.success(result.message || "Account unlinked successfully!");
      setShowUnlinkConfirm(false);
    } catch (error: any) {
      console.error("Unlink account error:", error);

      // Check for specific authentication mismatch error
      if (
        error.message?.includes("pubkey does not belong to this user") ||
        error.message?.includes("not authorized") ||
        error.message?.includes("Authentication mismatch")
      ) {
        toast.error(
          "Authentication mismatch: You're signed in with the wrong Firebase account. Please sign in with the correct account and try again."
        );
        // Keep the dialog open so user can see the mismatch information
        return;
      }

      toast.error(error.message || "Failed to unlink account");
    }
  };

  const handleFirebaseAuthSuccess = () => {
    setShowFirebaseAuthFirst(false);
    // If this was triggered by unlink, show the confirmation dialog
    setShowUnlinkConfirm(true);
  };

  const handleLinkSuccess = async () => {
    setIsLinkingInProgress(true);
    try {
      // Link the Nostr pubkey to the Firebase account
      await linkAccount.mutateAsync();
      toast.success("Account linked successfully!");
      // The linking status will update automatically via React Query
      // No need for hard refresh - the UI will react to the state change
      setShowLinkDialog(false);
    } catch (error) {
      console.error("Account linking error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to link account"
      );
    } finally {
      setIsLinkingInProgress(false);
    }
  };

  if (!user) {
    return (
      <div className="my-6 space-y-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Account Linking</CardTitle>
            <CardDescription>
              Please log in with Nostr to manage your account linking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="my-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Account Linking Management
            </CardTitle>
            <CardDescription>
              Link your Nostr identity with an email to access legacy features
              and data backup
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Nostr Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Nostr Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-medium">Nostr Identity</h3>
                  <p className="text-sm text-muted-foreground">
                    {displayName} • {user.pubkey.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Account Linking Status */}
        {isCheckingStatus ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Checking account linking status...</span>
              </div>
            </CardContent>
          </Card>
        ) : isLinked ? (
          /* Linked Account Display */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linked Email Account</CardTitle>
              <CardDescription>
                Your Nostr account is backed up and linked to an email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <Mail className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-800">
                      Email Account
                    </h3>
                    <p className="text-sm text-green-700">
                      {email || "Email address available"}
                    </p>
                    <p className="text-xs text-green-600">
                      Firebase UID: {firebaseUid?.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Linked
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUnlinkClick}
                    disabled={unlinkAccount.isPending}
                  >
                    {unlinkAccount.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Unlinking...
                      </>
                    ) : (
                      <>
                        <Unlink className="h-4 w-4 mr-2" />
                        Unlink
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Your account is backed up!</strong> You can access
                  your Wavlake account and upload music. Your data is securely
                  linked to your email address.
                </AlertDescription>
              </Alert>

              {/* Show current Firebase session info if there's a mismatch */}
              {firebaseUser && firebaseUser.uid !== firebaseUid && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Note:</strong> You're currently signed in with a
                    different Firebase account.
                    <div className="mt-2 text-sm">
                      <p>
                        <strong>Currently signed in as:</strong>{" "}
                        {firebaseUser.email} ({firebaseUser.uid.slice(0, 8)}...)
                      </p>
                      <p>
                        <strong>This Nostr identity is linked to:</strong>{" "}
                        {email} ({firebaseUid?.slice(0, 8)}...)
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <p className="text-sm">
                        To unlink this account, you'll need to sign in with the
                        correct Firebase account first.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowFirebaseAuthFirst(true)}
                        className="shrink-0"
                      >
                        Switch Account
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Not Linked - Show Warning and Link Button */
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Account Not Backed Up
              </CardTitle>
              <CardDescription>
                Your Nostr account is not linked to an email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Important:</strong> Without email linking, you cannot:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Upload music or create content</li>
                    <li>Access legacy features and historical data</li>
                    <li>Recover your account if you lose access</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 border rounded-lg border-orange-200">
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-orange-500" />
                  <div>
                    <h3 className="font-medium">Email Backup</h3>
                    <p className="text-sm text-muted-foreground">
                      Link an email address to backup your account
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowLinkDialog(true)}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Email
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  Why link an email address?
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    • <strong>Account Recovery:</strong> Regain access if you
                    lose your Nostr keys
                  </li>
                  <li>
                    • <strong>Music Uploads:</strong> Create and publish music
                    content
                  </li>
                  <li>
                    • <strong>Legacy Features:</strong> Access historical data
                    and advanced tools
                  </li>
                  <li>
                    • <strong>Payment Processing:</strong> Receive payments and
                    royalties
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About Account Linking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Account linking</strong> connects your Nostr identity with
              an email-based Wavlake account for enhanced functionality and data
              backup.
            </p>
            <Separator />
            <div className="space-y-2">
              <p>
                <strong>When linked:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Upload and publish music tracks</li>
                <li>Access legacy artist pages and historical data</li>
                <li>Receive payments and manage royalties</li>
                <li>Recover account access through email</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p>
                <strong>When not linked:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Limited to Nostr social features only</li>
                <li>Cannot upload music or create content</li>
                <li>No access to payment features</li>
                <li>Risk of losing access without key backup</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <FirebaseAuthDialog
        isOpen={showLinkDialog && !isLinkingInProgress}
        onClose={() => setShowLinkDialog(false)}
        onSuccess={handleLinkSuccess}
        title="Link Email Account"
        description="Sign in or create an account to link your email address"
      />

      {/* Loading overlay during linking */}
      {isLinkingInProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Linking your account...</span>
            </div>
          </Card>
        </div>
      )}

      <FirebaseAuthDialog
        isOpen={showFirebaseAuthFirst}
        onClose={() => setShowFirebaseAuthFirst(false)}
        onSuccess={handleFirebaseAuthSuccess}
        title={
          firebaseUser && firebaseUser.uid !== firebaseUid
            ? "Switch Firebase Account"
            : "Sign in to Firebase"
        }
        description={
          firebaseUser && firebaseUser.uid !== firebaseUid
            ? "Sign out and sign in with the correct Firebase account to unlink this Nostr identity"
            : "Sign in with your Firebase account to proceed with unlinking"
        }
        requiredFirebaseUid={firebaseUid || undefined}
        currentEmail={email || undefined}
        showSignOutFirst={firebaseUser && firebaseUser.uid !== firebaseUid}
      />

      <UnlinkConfirmDialog
        isOpen={showUnlinkConfirm}
        onClose={() => setShowUnlinkConfirm(false)}
        onConfirm={handleUnlinkConfirm}
        isLoading={unlinkAccount.isPending}
        email={email || undefined}
        linkedFirebaseUid={firebaseUid || undefined}
        currentFirebaseUid={firebaseUser?.uid}
      />
    </>
  );
}
