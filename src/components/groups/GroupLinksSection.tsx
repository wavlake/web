import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Music, Video, Camera, Twitter, ExternalLink } from "lucide-react";
import { NostrEvent } from "@nostrify/nostrify";

interface Link {
  id: string;
  title: string;
  url: string;
  description: string;
  icon: string;
}

interface GroupLinksSectionProps {
  group: NostrEvent;
}

export function GroupLinksSection({ group }: GroupLinksSectionProps) {
  // Extract links from group event tags
  const extractLinksFromTags = (): Link[] => {
    const links: Link[] = [];
    
    // Helper to find tag value
    const getTagValue = (tagName: string) => {
      const tag = group.tags.find(tag => tag[0] === tagName);
      return tag ? tag[1] : "";
    };

    // Add website if available
    const website = getTagValue("website");
    if (website) {
      links.push({
        id: "website",
        title: "Official Website",
        url: website,
        description: "Visit our official website",
        icon: "globe"
      });
    }

    // Add social media links
    const twitter = getTagValue("twitter");
    if (twitter) {
      links.push({
        id: "twitter",
        title: "Twitter",
        url: twitter,
        description: "Follow us on Twitter",
        icon: "twitter"
      });
    }

    const instagram = getTagValue("instagram");
    if (instagram) {
      links.push({
        id: "instagram",
        title: "Instagram",
        url: instagram,
        description: "Follow us on Instagram",
        icon: "camera"
      });
    }

    const youtube = getTagValue("youtube");
    if (youtube) {
      links.push({
        id: "youtube",
        title: "YouTube",
        url: youtube,
        description: "Subscribe to our YouTube channel",
        icon: "video"
      });
    }

    const facebook = getTagValue("facebook");
    if (facebook) {
      links.push({
        id: "facebook",
        title: "Facebook",
        url: facebook,
        description: "Like us on Facebook",
        icon: "globe"
      });
    }

    // Extract custom links from "link" tags ["link", title, url, description, icon]
    const customLinks = group.tags
      .filter(tag => tag[0] === "link" && tag.length >= 3)
      .map((tag, index) => ({
        id: `custom-${index}`,
        title: tag[1] || "Link",
        url: tag[2] || "",
        description: tag[3] || "",
        icon: tag[4] || "globe",
      }))
      .filter(link => link.url); // Only include links with URLs

    return [...links, ...customLinks];
  };

  const links = extractLinksFromTags();

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "globe":
        return <Globe className="h-5 w-5" />;
      case "music":
        return <Music className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "camera":
        return <Camera className="h-5 w-5" />;
      case "twitter":
        return <Twitter className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-5 w-5" />;
    }
  };

  // Show message if no links are available
  if (links.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Links</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No links have been added yet.</p>
            <p className="text-sm mt-1">
              The group owner can add links and contact information in the dashboard settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Links</h2>
      </div>

      <div className="grid gap-4">
        {links.map((link) => (
          <Card key={link.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full no-underline text-inherit hover:text-inherit"
                aria-label={`${link.title} - ${link.description}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    {getIcon(link.icon)}
                  </div>
                  <div>
                    <h3 className="font-medium">{link.title}</h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}