import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  Mail,
  MessageCircle,
  FileText,
  HelpCircle,
  Book,
  Users,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";

interface SupportFormData {
  message: string;
  category: string;
}

const WAVLAKE_PUBKEY =
  "2250f69694c2a43929e77e5de0f6a61ae5e37a1ee6d6a3baef1706ed9901248b";
const FAQ_ITEMS = [
  {
    id: "upload-music",
    question: "How do I upload my music?",
    answer:
      "You can upload your music by navigating to the 'Music' section in your dashboard and clicking on the 'Upload New Music' button. Make sure your audio files are in supported formats (MP3, WAV, FLAC) and have proper metadata.",
  },
  {
    id: "community-management",
    question: "How do I manage my artist community?",
    answer:
      "Use the 'Community' section in your dashboard to manage members, approve posts, set community guidelines, and moderate content. You can also create announcements and interact with your fans directly.",
  },
  {
    id: "earnings-wallet",
    question: "How do I track my earnings and manage my wallet?",
    answer:
      "Visit the 'Wallet' section to view your current balance, transaction history, and earnings from music streams and fan support. You can also set up payment preferences and withdraw funds.",
  },
  {
    id: "nostr-integration",
    question: "What is Nostr and how does it work with Wavlake?",
    answer:
      "Nostr is a decentralized protocol that enables censorship-resistant social networking. Wavlake uses Nostr to ensure your content and community remain under your control, without relying on centralized platforms.",
  },
  {
    id: "fan-engagement",
    question: "How can I better engage with my fans?",
    answer:
      "Use the community features to post updates, share behind-the-scenes content, and respond to fan messages. You can also create exclusive content for community members and use the announcement feature for important updates.",
  },
  {
    id: "content-moderation",
    question: "How do I moderate my community content?",
    answer:
      "Access the 'Moderation' section to review reported content, manage member permissions, and enforce community guidelines. You can approve or remove posts and manage banned users.",
  },
];

const SUPPORT_CATEGORIES = [
  { value: "technical", label: "Technical Issue" },
  { value: "account", label: "Account & Login" },
  { value: "music", label: "Music Upload & Management" },
  { value: "community", label: "Community Management" },
  { value: "payments", label: "Payments & Wallet" },
  { value: "other", label: "Other" },
];

const QUICK_LINKS = [
  {
    title: "Documentation",
    description: "Complete guides and tutorials",
    icon: Book,
    href: "/about",
    external: false,
  },
  {
    title: "FAQ",
    description: "Frequently asked questions",
    icon: HelpCircle,
    href: "/faq",
    external: false,
  },
  {
    title: "Community",
    description: "Connect with other artists",
    icon: Users,
    href: "/groups",
    external: false,
  },
  {
    title: "Nostr Protocol",
    description: "Learn about the underlying technology",
    icon: ExternalLink,
    href: "https://nostr.com",
    external: true,
  },
];

export function SupportTab() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const [formData, setFormData] = useState<SupportFormData>({
    message: "",
    category: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: keyof SupportFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitSupport = async () => {
    if (!user) {
      toast.error("Please log in to submit a support request");
      return;
    }

    if (!formData.message.trim() || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if user's signer supports NIP-04 encryption
    if (!user.signer.nip04) {
      toast.error(
        "Your signer doesn't support encrypted messages. Please update your Nostr extension."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Create structured message content for the DM
      const supportContent = `Support Request - ${formData.category.toUpperCase()}

${formData.message}

---
Category: ${
        SUPPORT_CATEGORIES.find((c) => c.value === formData.category)?.label
      }
Submitted via Wavlake Artist Dashboard`;

      // Encrypt the message content using NIP-04
      const encryptedContent = await user.signer.nip04.encrypt(
        WAVLAKE_PUBKEY,
        supportContent
      );

      // Send encrypted DM (kind 4) to Wavlake support
      await publishEvent({
        kind: 4, // Encrypted Direct Message
        content: encryptedContent,
        tags: [
          ["p", WAVLAKE_PUBKEY], // Recipient pubkey
        ],
      });

      toast.success(
        "Support request sent securely! We'll get back to you soon."
      );
      setIsSubmitted(true);

      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          message: "",
          category: "",
        });
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast.error("Failed to submit support request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Support & Help</h2>
        <p className="text-muted-foreground">Get help and contact support</p>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Find resources and get help quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {QUICK_LINKS.map((link) => {
              const IconComponent = link.icon;
              return (
                <Button
                  key={link.title}
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  onClick={() => {
                    if (link.external) {
                      openExternalLink(link.href);
                    } else {
                      // For internal links, we'll use window.location for now
                      // In a real app, you'd use react-router navigation
                      window.location.href = link.href;
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{link.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {link.description}
                      </div>
                    </div>
                  </div>
                  {link.external && (
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Find answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>Get in touch with our support team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user && (
            <div className="p-4 border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 rounded-md">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Please log in to submit a support request
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category *
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange("category", value)}
              disabled={!user}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Message *
            </Label>
            <Textarea
              id="message"
              placeholder="Describe your issue or question in detail..."
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              rows={6}
              disabled={!user}
            />
          </div>

          {isSubmitted ? (
            <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                Support request sent securely via encrypted message!
              </span>
            </div>
          ) : (
            <Button
              onClick={handleSubmitSupport}
              disabled={
                !user ||
                isSubmitting ||
                !formData.message.trim() ||
                !formData.category
              }
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <MessageCircle className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          )}

          {user && (
            <p className="text-xs text-muted-foreground">
              Your message will be sent securely using end-to-end encryption.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
