import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock, Send, DollarSign, ImageIcon, Globe, Twitter, Instagram, Youtube, Facebook } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useAuthor } from "@/hooks/useAuthor";
import { toast } from "sonner";
import { nip19 } from "nostr-tools";
import { NostrEvent } from "@nostrify/nostrify";

interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    facebook?: string;
  };
}

interface ContactSectionProps {
  group: NostrEvent;
  contactInfo?: ContactInfo;
}

export function ContactSection({ group, contactInfo }: ContactSectionProps) {
  const { user, metadata: userMetadata } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { data: groupOwner } = useAuthor(group.pubkey);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract contact info from group event tags
  const getTagValue = (tagName: string) => {
    const tag = group.tags.find(tag => tag[0] === tagName);
    return tag ? tag[1] : "";
  };

  // Get group name from tags
  const groupName = getTagValue("name") || 
                   getTagValue("d") || 
                   "this group";

  // Extract contact info from group tags (prioritize tags over contactInfo prop)
  const contact: ContactInfo = {
    email: getTagValue("email") || contactInfo?.email || "",
    phone: getTagValue("phone") || contactInfo?.phone || "",
    address: getTagValue("address") || contactInfo?.address || "",
    businessHours: getTagValue("business_hours") || contactInfo?.businessHours || "Usually responds within 24-48 hours",
    website: getTagValue("website") || contactInfo?.website || "",
    socialLinks: {
      twitter: getTagValue("twitter") || contactInfo?.socialLinks?.twitter || "",
      instagram: getTagValue("instagram") || contactInfo?.socialLinks?.instagram || "",
      youtube: getTagValue("youtube") || contactInfo?.socialLinks?.youtube || "",
      facebook: getTagValue("facebook") || contactInfo?.socialLinks?.facebook || "",
    }
  };

  const handleSendDM = async () => {
    if (!user) {
      toast.error("Please log in to send a message");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Check if user's signer supports NIP-04 encryption
    if (!user.signer.nip04) {
      toast.error("Your signer doesn't support encrypted messages. Please update your Nostr extension.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create message content with context
      const dmContent = `Message regarding ${groupName}:

${message}

---
Sent from Wavlake Group Contact Form`;

      // Encrypt the message content using NIP-04
      const encryptedContent = await user.signer.nip04.encrypt(
        group.pubkey,
        dmContent
      );

      // Send encrypted DM (kind 4) to group owner
      await publishEvent({
        kind: 4, // Encrypted Direct Message
        content: encryptedContent,
        tags: [
          ["p", group.pubkey], // Recipient pubkey (group owner)
          ["subject", `Contact from ${groupName}`],
        ],
      });

      toast.success("Message sent successfully!");
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openExternalLink = (url: string) => {
    if (url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.open(`https://${url}`, "_blank", "noopener,noreferrer");
    }
  };

  const ownerNpub = nip19.npubEncode(group.pubkey);
  const ownerDisplayName = groupOwner?.metadata?.name || 
                           groupOwner?.metadata?.display_name || 
                           `${ownerNpub.slice(0, 8)}...${ownerNpub.slice(-4)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contact</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Get in Touch</h3>
            <div className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground">{contact.email}</p>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-muted-foreground">{contact.phone}</p>
                  </div>
                </div>
              )}

              {contact.address && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">{contact.address}</p>
                  </div>
                </div>
              )}

              {contact.businessHours && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Response Time</p>
                    <p className="text-muted-foreground">{contact.businessHours}</p>
                  </div>
                </div>
              )}

              {contact.website && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Website</p>
                    <a 
                      href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {contact.website}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links */}
            {contact.socialLinks && Object.values(contact.socialLinks).some(link => link) && (
              <>
                <div className="border-t mt-6 pt-6">
                  <h4 className="font-medium mb-3">Social Media</h4>
                  <div className="flex gap-2">
                    {contact.socialLinks.twitter && (
                      <a
                        href={contact.socialLinks.twitter.startsWith("http") ? contact.socialLinks.twitter : `https://${contact.socialLinks.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Follow us on Twitter"
                      >
                        <Button 
                          variant="outline" 
                          size="icon"
                        >
                          <Twitter className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {contact.socialLinks.instagram && (
                      <a
                        href={contact.socialLinks.instagram.startsWith("http") ? contact.socialLinks.instagram : `https://${contact.socialLinks.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Follow us on Instagram"
                      >
                        <Button 
                          variant="outline" 
                          size="icon"
                        >
                          <Instagram className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {contact.socialLinks.youtube && (
                      <a
                        href={contact.socialLinks.youtube.startsWith("http") ? contact.socialLinks.youtube : `https://${contact.socialLinks.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Subscribe to our YouTube channel"
                      >
                        <Button 
                          variant="outline" 
                          size="icon"
                        >
                          <Youtube className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {contact.socialLinks.facebook && (
                      <a
                        href={contact.socialLinks.facebook.startsWith("http") ? contact.socialLinks.facebook : `https://${contact.socialLinks.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Like us on Facebook"
                      >
                        <Button 
                          variant="outline" 
                          size="icon"
                        >
                          <Facebook className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Send Direct Message</h3>
            {user ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userMetadata?.picture} alt="Your Avatar" />
                    <AvatarFallback>
                      {userMetadata?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{userMetadata?.name || "You"}</p>
                    <p className="text-xs text-muted-foreground">
                      {nip19.npubEncode(user.pubkey).slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSendDM(); }} className="space-y-4">
                  <div>
                    <Label htmlFor="message">
                      Message to {ownerDisplayName}
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Type your direct message here..."
                      className="min-h-[150px] mt-2"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Messages are encrypted end-to-end
                    </p>
                    <Button 
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmitting ? "Sending..." : "Send DM"}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Please log in to send a message to the group owner
                </p>
                <Button variant="outline" disabled>
                  <Mail className="h-4 w-4 mr-2" />
                  Log in to Send Message
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Contact Options */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Other Ways to Connect</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                if (contact.email) {
                  window.location.href = `mailto:${contact.email}?subject=Booking Inquiry - ${groupName}`;
                }
              }}
              disabled={!contact.email}
            >
              <Mail className="h-4 w-4" />
              Booking Inquiries
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                if (contact.email) {
                  window.location.href = `mailto:${contact.email}?subject=Press & Media - ${groupName}`;
                }
              }}
              disabled={!contact.email}
            >
              <Phone className="h-4 w-4" />
              Press & Media
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                if (contact.email) {
                  window.location.href = `mailto:${contact.email}?subject=Collaboration - ${groupName}`;
                }
              }}
              disabled={!contact.email}
            >
              <Send className="h-4 w-4" />
              Collaboration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}