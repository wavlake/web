import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus } from "lucide-react";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { toast } from "sonner";
import { NostrEvent } from "@nostrify/nostrify";

// Define schema for group metadata
const groupLinksContactSchema = z.object({
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  businessHours: z.string().optional(),
  links: z.array(z.object({
    id: z.string(),
    title: z.string().min(1, "Title is required"),
    url: z.string().url("Must be a valid URL"),
    description: z.string().optional(),
    icon: z.string().optional(),
  })),
  socialLinks: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    facebook: z.string().optional(),
  }),
});

type GroupLinksContactFormData = z.infer<typeof groupLinksContactSchema>;

interface GroupLinksContactFormProps {
  group: NostrEvent;
  communityId: string;
}

export function GroupLinksContactForm({ group, communityId }: GroupLinksContactFormProps) {
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract current metadata from group event tags
  const extractCurrentMetadata = (): GroupLinksContactFormData => {
    const tags = group.tags;
    
    // Helper to find tag value
    const getTagValue = (tagName: string) => {
      const tag = tags.find(tag => tag[0] === tagName);
      return tag ? tag[1] : "";
    };

    // Extract links from custom link tags ["link", title, url, description, icon]
    const links = tags
      .filter(tag => tag[0] === "link" && tag.length >= 3)
      .map((tag, index) => ({
        id: `link-${index}`,
        title: tag[1] || "",
        url: tag[2] || "",
        description: tag[3] || "",
        icon: tag[4] || "globe",
      }));

    return {
      description: getTagValue("description"),
      website: getTagValue("website"),
      email: getTagValue("email"),
      phone: getTagValue("phone"),
      address: getTagValue("address"),
      businessHours: getTagValue("business_hours"),
      links,
      socialLinks: {
        twitter: getTagValue("twitter"),
        instagram: getTagValue("instagram"),
        youtube: getTagValue("youtube"),
        facebook: getTagValue("facebook"),
      },
    };
  };

  const form = useForm<GroupLinksContactFormData>({
    resolver: zodResolver(groupLinksContactSchema),
    defaultValues: extractCurrentMetadata(),
  });

  // Reset form when group changes
  useEffect(() => {
    const metadata = extractCurrentMetadata();
    form.reset(metadata);
  }, [group.id, form]);

  const addLink = () => {
    const currentLinks = form.getValues("links");
    const newLink = {
      id: `link-${Date.now()}`,
      title: "",
      url: "",
      description: "",
      icon: "globe",
    };
    form.setValue("links", [...currentLinks, newLink]);
  };

  const removeLink = (index: number) => {
    const currentLinks = form.getValues("links");
    form.setValue("links", currentLinks.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: GroupLinksContactFormData) => {
    try {
      setIsSubmitting(true);

      // Parse the existing group identifier from d tag
      const dTag = group.tags.find(tag => tag[0] === "d");
      if (!dTag) {
        throw new Error("Group identifier not found");
      }

      // Preserve all existing tags except the ones we're updating
      const existingTags = group.tags.filter(tag => 
        !["description", "website", "email", "phone", "address", "business_hours",
          "twitter", "instagram", "youtube", "facebook", "link"].includes(tag[0])
      );

      // Build new tags array
      const newTags = [...existingTags];

      // Add metadata tags
      if (data.description) newTags.push(["description", data.description]);
      if (data.website) newTags.push(["website", data.website]);
      if (data.email) newTags.push(["email", data.email]);
      if (data.phone) newTags.push(["phone", data.phone]);
      if (data.address) newTags.push(["address", data.address]);
      if (data.businessHours) newTags.push(["business_hours", data.businessHours]);

      // Add social media tags
      if (data.socialLinks.twitter) newTags.push(["twitter", data.socialLinks.twitter]);
      if (data.socialLinks.instagram) newTags.push(["instagram", data.socialLinks.instagram]);
      if (data.socialLinks.youtube) newTags.push(["youtube", data.socialLinks.youtube]);
      if (data.socialLinks.facebook) newTags.push(["facebook", data.socialLinks.facebook]);

      // Add link tags
      data.links.forEach(link => {
        if (link.title && link.url) {
          newTags.push([
            "link",
            link.title,
            link.url,
            link.description || "",
            link.icon || "globe"
          ]);
        }
      });

      // Publish updated group event (kind 34550 - replaceable event)
      await publishEvent({
        kind: 34550,
        content: group.content, // Preserve existing content
        tags: newTags,
      });

      toast.success("Group information updated successfully!");
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group information");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group Links & Contact Information</CardTitle>
          <CardDescription>
            Update your group's contact information and external links. This information will be displayed on your group's Contact and Links tabs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell people about your group..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Hours</FormLabel>
                        <FormControl>
                          <Input placeholder="Mon-Fri 9am-5pm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, City, Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Social Media Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Social Media</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter</FormLabel>
                        <FormControl>
                          <Input placeholder="https://twitter.com/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.youtube"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube</FormLabel>
                        <FormControl>
                          <Input placeholder="https://youtube.com/@username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook</FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Custom Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Additional Links</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addLink}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>

                {form.watch("links").map((link, index) => (
                  <Card key={link.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Link {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLink(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`links.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Link title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`links.${index}.url`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`links.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of this link" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isPending}
                  className="min-w-[120px]"
                >
                  {isSubmitting || isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}