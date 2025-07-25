import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCashuStore } from "@/stores/cashuStore";
import { useCashuToken } from "@/hooks/useCashuToken";
import {
  useReceivedNutzaps,
  ReceivedNutzap,
  useRedeemNutzap,
} from "@/hooks/useReceivedNutzaps";
import {
  useSendNutzap,
  useFetchNutzapInfo,
  useVerifyMintCompatibility,
} from "@/hooks/useSendNutzap";
import { nip19 } from "nostr-tools";
import { Proof } from "@cashu/cashu-ts";
import { useNutzapInfo } from "@/hooks/useNutzaps";
import { useWalletUiStore } from "@/stores/walletUiStore";
import { formatBalance } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";

export function NutzapCard() {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { sendToken } = useCashuToken();
  const { sendNutzap, isSending, error: sendError } = useSendNutzap();
  const { fetchNutzapInfo, isFetching } = useFetchNutzapInfo();
  const {
    data: fetchedNutzaps,
    isLoading: isLoadingNutzaps,
    refetch: refetchNutzaps,
  } = useReceivedNutzaps();
  const { mutateAsync: redeemNutzap, isPending: isRedeemingNutzap } =
    useRedeemNutzap();
  const nutzapInfoQuery = useNutzapInfo(user?.pubkey);
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.nutzap;
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  const [activeTab, setActiveTab] = useState("receive");
  const [recipientNpub, setRecipientNpub] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redeemingNutzapId, setRedeemingNutzapId] = useState<string | null>(
    null
  );
  const [copying, setCopying] = useState(false);
  const [receivedNutzaps, setReceivedNutzaps] = useState<ReceivedNutzap[]>([]);

  // Get user's npub
  const userNpub = user ? nip19.npubEncode(user.pubkey) : "";

  // Format amount based on user preference
  const formatAmount = useCallback((sats: number) => {
    if (showSats) {
      return formatBalance(sats);
    } else if (btcPrice) {
      return formatUSD(satsToUSD(sats, btcPrice.USD));
    }
    return formatBalance(sats);
  }, [showSats, btcPrice]);

  // Initialize with fetched nutzaps when available
  useEffect(() => {
    if (fetchedNutzaps) {
      setReceivedNutzaps(fetchedNutzaps);
    }
  }, [fetchedNutzaps]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
      setSuccess("Copied to clipboard!");
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  const handleSendNutzap = async () => {
    if (!cashuStore.activeMintUrl) {
      setError(
        "No active mint selected. Please select a mint in your wallet settings."
      );
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      setError("Please enter a valid amount");
      return;
    }

    if (!recipientNpub) {
      setError("Please enter a recipient's Nostr ID (npub)");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Decode the npub to get the pubkey
      let recipientPubkey: string;
      try {
        const decoded = nip19.decode(recipientNpub);
        if (decoded.type !== "npub") {
          throw new Error("Invalid npub format");
        }
        recipientPubkey = decoded.data;
      } catch (e) {
        setError("Invalid npub format. Please enter a valid Nostr ID (npub).");
        return;
      }

      // First fetch the recipient's nutzap info
      const recipientInfo = await fetchNutzapInfo(recipientPubkey);


      // Convert amount based on currency preference
      let amountValue: number;
      
      if (showSats) {
        amountValue = parseInt(amount);
      } else {
        // Convert USD to sats
        if (!btcPrice) {
          setError("Bitcoin price not available");
          return;
        }
        const usdAmount = parseFloat(amount);
        amountValue = Math.round(usdAmount / btcPrice.USD * 100000000); // Convert USD to sats
      }

      if (amountValue < 1) {
        setError("Amount must be at least 1 sat");
        return;
      }

      // Verify mint compatibility and get a compatible mint URL
      const compatibleMintUrl = verifyMintCompatibility(recipientInfo);

      // Send token using p2pk pubkey from recipient info
      const proofs = (await sendToken(
        compatibleMintUrl,
        amountValue,
        recipientInfo.p2pkPubkey
      )) as Proof[];

      // Send nutzap using recipient info
      await sendNutzap({
        recipientInfo,
        comment,
        proofs,
        mintUrl: compatibleMintUrl,
      });

      setSuccess(`Successfully sent ${formatAmount(amountValue)}`);
      setAmount("");
      setComment("");
      setRecipientNpub("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error sending nutzap:", error);
      setError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRedeemNutzap = async (nutzap: ReceivedNutzap) => {
    if (nutzap.redeemed) {
      return; // Already redeemed
    }

    try {
      setRedeemingNutzapId(nutzap.id);
      setError(null);

      await redeemNutzap(nutzap);

      // Mark nutzap as redeemed in state
      setReceivedNutzaps((nutzaps) =>
        nutzaps.map((n) => (n.id === nutzap.id ? { ...n, redeemed: true } : n))
      );

      setSuccess(
        `Successfully redeemed ${formatAmount(nutzap.proofs.reduce(
          (sum, p) => sum + p.amount,
          0
        ))}`
      );
    } catch (error) {
      console.error("Error redeeming nutzap:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setRedeemingNutzapId(null);
    }
  };

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>eCash</CardTitle>
          <CardDescription>Create a wallet first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>eCash</CardTitle>
          <CardDescription>Send and receive Cash via Nostr</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => walletUiStore.toggleCardExpansion("nutzap")}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="receive">
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                Receive
              </TabsTrigger>
              <TabsTrigger value="send">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Send
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient (npub)</Label>
                <Input
                  id="recipient"
                  placeholder="npub1..."
                  value={recipientNpub}
                  onChange={(e) => setRecipientNpub(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount {showSats ? "(sats)" : "(USD)"}</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={showSats ? "100" : "0.10"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment (optional)</Label>
                <Input
                  id="comment"
                  placeholder="Thanks for the content!"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSendNutzap}
                disabled={
                  !cashuStore.activeMintUrl ||
                  !amount ||
                  !recipientNpub ||
                  !user ||
                  isSending
                }
              >
                {isSending ? "Sending..." : "Send eCash"}
                <DollarSign className="h-4 w-4 ml-2" />
              </Button>
            </TabsContent>

            <TabsContent value="receive" className="space-y-4 mt-4">
              {user && (
                <div className="border rounded-md p-3 mb-4">
                  <Label className="text-sm text-muted-foreground mb-1 block">
                    Your Nostr ID (npub)
                  </Label>
                  <div className="flex items-center">
                    <div className="text-sm font-mono truncate flex-1 bg-muted p-2 rounded-l-md">
                      {userNpub}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(userNpub)}
                      disabled={copying}
                    >
                      {copying ? "Copied!" : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {isLoadingNutzaps && receivedNutzaps.length === 0 ? (
                <div className="text-center py-4">Loading incoming eCash...</div>
              ) : receivedNutzaps.length > 0 ? (
                <div className="space-y-4">
                  {receivedNutzaps.map((nutzap) => (
                    <div
                      key={nutzap.id}
                      className={`border rounded-md p-3 ${
                        nutzap.redeemed ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            From: {nutzap.pubkey.slice(0, 8)}...
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(nutzap.createdAt * 1000).toLocaleString()}
                          </div>
                          {nutzap.content && (
                            <div className="mt-1 text-sm">{nutzap.content}</div>
                          )}
                          <div className="mt-1 font-semibold">
                            {formatAmount(nutzap.proofs.reduce(
                              (sum, p) => sum + p.amount,
                              0
                            ))}
                          </div>
                        </div>
                        <div>
                          {nutzap.redeemed ? (
                            <div className="text-xs flex items-center text-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Redeemed
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleRedeemNutzap(nutzap)}
                              disabled={
                                isRedeemingNutzap ||
                                redeemingNutzapId === nutzap.id
                              }
                            >
                              {redeemingNutzapId === nutzap.id
                                ? "Redeeming..."
                                : "Redeem"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No incoming eCash received yet
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => refetchNutzaps()}
                disabled={isLoadingNutzaps}
              >
                Refresh
              </Button>
            </TabsContent>
          </Tabs>

          {(error || sendError) && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || String(sendError)}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
}
