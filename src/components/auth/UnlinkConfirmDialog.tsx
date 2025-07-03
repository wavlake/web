import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Loader2,
  Unlink,
} from "lucide-react";

interface UnlinkConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  email?: string;
  linkedFirebaseUid?: string;
  currentFirebaseUid?: string;
}

export function UnlinkConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  email,
  linkedFirebaseUid,
  currentFirebaseUid,
}: UnlinkConfirmDialogProps) {
  const isWrongAccount = linkedFirebaseUid && currentFirebaseUid && linkedFirebaseUid !== currentFirebaseUid;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[400px]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2">
            <Unlink className="h-5 w-5 text-orange-500" />
            Confirm Account Unlinking
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to unlink your email account?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isWrongAccount ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Authentication Mismatch!</strong>
                <p className="mt-2">Your Nostr account is linked to a different Firebase account than the one you're currently signed in with.</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p><strong>Linked to Firebase UID:</strong> <code className="bg-red-100 px-1 rounded">{linkedFirebaseUid?.slice(0, 12)}...</code></p>
                  <p><strong>Currently signed in as:</strong> <code className="bg-red-100 px-1 rounded">{currentFirebaseUid?.slice(0, 12)}...</code></p>
                </div>
                <p className="mt-3 text-sm">You need to sign in with the correct Firebase account to unlink this Nostr identity.</p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Warning:</strong> Unlinking your account will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove backup access to your Wavlake account</li>
                  <li>Disable music upload and content creation features</li>
                  <li>Remove access to legacy features and historical data</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {email && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Email to unlink:</strong> {email}
              </p>
              {linkedFirebaseUid && (
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Firebase UID:</strong> {linkedFirebaseUid.slice(0, 8)}...
                </p>
              )}
            </div>
          )}

          {!isWrongAccount && (
            <p className="text-sm text-muted-foreground">
              You can re-link your account later by going through the account linking process again.
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {isWrongAccount ? (
            <Button
              onClick={onClose}
              disabled={isLoading}
            >
              Sign In with Correct Account
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink Account
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}