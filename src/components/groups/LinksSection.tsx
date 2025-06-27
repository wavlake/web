import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Globe,
  Music,
  Video,
  Camera,
  Twitter,
  ExternalLink,
} from "lucide-react";

interface Link {
  id: string;
  title: string;
  url: string;
  description: string;
  icon: string;
}

interface LinksSectionProps {
  links: Link[];
}

export function LinksSection({ links }: LinksSectionProps) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Links</h2>
      </div>

      <div className="grid gap-4">
        {links.map((link) => (
          <Card key={link.id} className="hover:shadow-md transition-shadow">
            <CardContent
              className="p-4 cursor-pointer"
              onClick={() => window.open(link.url, "_blank")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    {getIcon(link.icon)}
                  </div>
                  <div>
                    <h3 className="font-medium">{link.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(link.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
