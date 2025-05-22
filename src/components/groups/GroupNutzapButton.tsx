import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, DollarSign } from "lucide-react";
import { useSendNutzap, useFetchNutzapInfo } from "@/hooks/useSendNutzap";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { useCashuStore } from "@/stores/cashuStore";
import { useCashuToken } from "@/hooks/useCashuToken";
import { Proof } from "@cashu/cashu-ts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface GroupNutzapButtonProps {
  groupId: string;
  ownerPubkey: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function GroupNutzapButton({ 
  groupId, 
  ownerPubkey, 
  variant = "default", 
  size = "default",
  className = ""
}: GroupNutzapButtonProps) {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { sendToken } = useCashuToken();
  const { sendNutzap, isSending } = useSendNutzap();
  const { fetchNutzapInfo, isFetching } = useFetchNutzapInfo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenDialog = () => {
    if (!user) {
      toast.error("You must be logged in to send eCash");
      return;
    }
    
    if (!wallet) {
      toast.error("You need to set up a Cashu wallet first");
      return;
    }
    
    if (!cashuStore.activeMintUrl) {
      toast.error("No active mint selected. Please select a mint in your wallet settings.");
      return;
    }
    
    setIsDialogOpen(true);
  };

  const handleSendNutzap = async () => {
    if (!user || !wallet || !cashuStore.activeMintUrl) {
      return;
    }

    if (!amount || isNaN(parseInt(amount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsProcessing(true);

      // Fetch recipient's nutzap info (group owner)
      const recipientInfo = await fetchNutzapInfo(ownerPubkey);

      // Generate token with the specified amount and get proofs for the nutzap
      const amountValue = parseInt(amount);

      // Send token using p2pk pubkey from recipient info
      const proofs = (await sendToken(
        cashuStore.activeMintUrl,
        amountValue,
        recipientInfo.p2pkPubkey
      )) as Proof[];

      // Send nutzap using recipient info, but with the group's a-tag instead of an e-tag
      await sendNutzap({
        recipientInfo,
        comment,
        proofs,
        mintUrl: cashuStore.activeMintUrl,
        // Instead of eventId, we'll add the a-tag in the tags array
        // We're using the groupId which is in the format "34550:pubkey:identifier"
        tags: [["a", groupId]] // Add the group identifier as an a-tag
      });

      toast.success(`Successfully sent ${amountValue} sats to group owner`);
      setAmount("");
      setComment("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error sending nutzap to group:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`flex items-center ${className}`}
        onClick={handleOpenDialog}
      >
        <DollarSign className="h-4 w-4 mr-2" />
        <span>eCash Group</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Support this Group</DialogTitle>
            <DialogDescription>
              Send eCash to the group owner to show your support.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount (sats)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="comment" className="text-right">
                Comment
              </Label>
              <Input
                id="comment"
                placeholder="Thanks for creating this group!"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              onClick={handleSendNutzap}
              disabled={isProcessing || isSending || isFetching || !amount}
            >
              {isProcessing ? "Sending..." : "Send eCash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}