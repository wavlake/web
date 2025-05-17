import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUploadFile } from "@/hooks/useUploadFile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";

export default function CreateGroup() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  
  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    description: "",
    imageUrl: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">You must be logged in to create a community</h1>
        <Button asChild>
          <Link to="/groups">Back to Communities</Link>
        </Button>
      </div>
    );
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.identifier || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Upload image if selected
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        const [[_, uploadedUrl]] = await uploadFile(imageFile);
        imageUrl = uploadedUrl;
      }
      
      // Create community event (kind 34550)
      const tags = [
        ["d", formData.identifier],
        ["name", formData.name],
        ["description", formData.description],
      ];
      
      // Add image tag if available
      if (imageUrl) {
        tags.push(["image", imageUrl]);
      }
      
      // Add current user as moderator
      tags.push(["p", user.pubkey, "", "moderator"]);
      
      // Publish the community event
      await publishEvent({
        kind: 34550,
        tags,
        content: "",
      });
      
      toast.success("Community created successfully!");
      navigate("/groups");
    } catch (error) {
      console.error("Error creating community:", error);
      toast.error("Failed to create community. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <Link to="/groups" className="text-sm text-muted-foreground hover:underline mb-2 inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Communities
        </Link>
        <h1 className="text-3xl font-bold">Create a New Community</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Community Details</CardTitle>
          <CardDescription>
            Fill in the information below to create your Nostr community.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Community Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="My Awesome Community"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="identifier">
                Community Identifier *
                <span className="text-xs text-muted-foreground ml-2">
                  (unique identifier for your community)
                </span>
              </Label>
              <Input
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                placeholder="my-awesome-community"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell people what your community is about..."
                rows={4}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Community Image</Label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">or</span>
                    <Input
                      id="imageUrl"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleInputChange}
                      placeholder="Image URL"
                      className="flex-1"
                      disabled={!!imageFile}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload an image or provide a URL for your community banner
                  </p>
                </div>
                
                {previewUrl && (
                  <div className="w-24 h-24 rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/groups")}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isUploading || !formData.name || !formData.identifier || !formData.description}
            >
              {isSubmitting || isUploading ? "Creating..." : "Create Community"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}