import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useAccountLinkingStatus } from "@/hooks/useAccountLinkingStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface UploadRestrictionBannerProps {
  className?: string;
}

/**
 * Banner component that shows when a user needs to link their Firebase account
 * to their Nostr identity before they can upload tracks.
 */
export function UploadRestrictionBanner({
  className,
}: UploadRestrictionBannerProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { isLinked, isLoading, error } = useAccountLinkingStatus();
  const [showDetails, setShowDetails] = useState(false);

  // Don't show banner if:
  // - User is not logged in
  // - Still loading linking status
  // - Account is already linked
  if (!user || isLoading || isLinked) {
    return null;
  }

  // Check if there's an API error vs account not linked
  const hasApiError = !!error;

  const handleLinkAccounts = () => {
    navigate("/account-linking");
  };

  return (
    <>
      <Alert
        className={`${
          hasApiError
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
        } ${className || ""}`}
      >
        <AlertCircle
          className={`h-4 w-4 ${
            hasApiError ? "text-red-600" : "text-amber-600"
          }`}
        />
        <AlertTitle
          className={`${
            hasApiError ? "text-red-800" : "text-amber-800"
          } font-medium`}
        >
          {hasApiError
            ? "Upload Verification Failed"
            : "Account Linking Required"}
        </AlertTitle>
        <AlertDescription
          className={hasApiError ? "text-red-700" : "text-amber-700"}
        >
          <div className="space-y-3">
            {hasApiError ? (
              <p>
                Unable to verify your account linking status. Please check your
                connection and try again, or contact support if the issue
                persists.
              </p>
            ) : (
              <p>
                You must link your Wavlake account to your Nostr identity to
                upload tracks, create albums, and publish content.
              </p>
            )}

            {!hasApiError && showDetails && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">Why is this required?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensures content ownership and prevents spam</li>
                  <li>Enables payment processing and royalty distribution</li>
                  <li>Provides backup access to your content</li>
                  <li>Supports legacy user migration</li>
                </ul>
              </div>
            )}

            {hasApiError && error && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">Error Details:</p>
                <p className="text-red-600 bg-red-100 p-2 rounded text-xs font-mono">
                  {error.message}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {!hasApiError && (
                <Button
                  onClick={handleLinkAccounts}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Link Account Now
                </Button>
              )}

              {hasApiError && (
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 text-white hover:bg-red-700"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}

              {!hasApiError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-amber-800 hover:text-amber-900 hover:bg-amber-100"
                >
                  {showDetails ? "Show Less" : "Why is this required?"}
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </>
  );
}

/**
 * Compact version of the upload restriction banner for smaller spaces
 */
export function UploadRestrictionBannerCompact({
  className,
}: UploadRestrictionBannerProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { isLinked, isLoading, error } = useAccountLinkingStatus();

  if (!user || isLoading || isLinked) {
    return null;
  }

  const hasApiError = !!error;

  const handleLinkAccounts = () => {
    navigate("/account-linking");
  };

  return (
    <>
      <div
        className={`${
          hasApiError
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
        } border rounded-lg p-3 ${className || ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`h-4 w-4 ${
                hasApiError ? "text-red-600" : "text-amber-600"
              } flex-shrink-0`}
            />
            <span
              className={`text-sm ${
                hasApiError ? "text-red-800" : "text-amber-800"
              } font-medium`}
            >
              {hasApiError
                ? "Upload verification failed"
                : "Account linking required to upload"}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={
              hasApiError
                ? "border-red-300 text-red-800 hover:bg-red-100"
                : "border-amber-300 text-amber-800 hover:bg-amber-100"
            }
            onClick={() =>
              hasApiError ? window.location.reload() : handleLinkAccounts()
            }
          >
            {hasApiError ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </>
            ) : (
              "Link Now"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
