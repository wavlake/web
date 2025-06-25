import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Upload, X, Music, Image as ImageIcon } from "lucide-react";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useUploadAudio } from "@/hooks/useUploadAudio";
import { useMusicPublish } from "@/hooks/useMusicPublish";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCanUpload } from "@/hooks/useAccountLinkingStatus";
import { MUSIC_GENRES, MUSIC_SUBGENRES } from "@/constants/music";
import { NostrTrack } from "@/hooks/useArtistTracks";
import { DraftTrack } from "@/types/drafts";
import { useDraftPublish } from "@/hooks/useDraftPublish";
import { AlertCircle } from "lucide-react";
import { UploadRestrictionBanner } from "./UploadRestrictionBanner";

const trackFormSchema = z.object({
  title: z.string().min(1, "Track title is required"),
  description: z.string().optional(),
  genre: z.string().min(1, "Genre is required"),
  subgenre: z.string().optional(),
  explicit: z.boolean().default(false),
  price: z.number().min(0).optional(),
  tags: z.string().optional(),
});

type TrackFormData = z.infer<typeof trackFormSchema>;

interface TrackFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  artistId?: string;
  track?: NostrTrack; // For editing existing tracks
  draft?: DraftTrack; // For editing existing drafts
  isEditing?: boolean;
  isDraftMode?: boolean; // For creating new drafts
}

export function TrackForm({
  onCancel,
  onSuccess,
  artistId,
  track,
  draft,
  isEditing = false,
  isDraftMode = false,
}: TrackFormProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(
    track?.audioUrl || draft?.metadata.audioUrl || null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    track?.coverUrl || draft?.metadata.coverUrl || null
  );
  const [saveAsDraft, setSaveAsDraft] = useState(isDraftMode || !!draft);
  const { user } = useCurrentUser();
  const canUpload = useCanUpload();

  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: UploadAudio, isPending: isUploadingAudio } =
    useUploadAudio();
  const { mutate: publishTrack, isPending: isPublishing } = useMusicPublish();
  const { saveDraftTrack, publishDraftTrack, isLoading: isDraftLoading } = useDraftPublish();

  const form = useForm<TrackFormData>({
    resolver: zodResolver(trackFormSchema),
    defaultValues:
      (isEditing && track) || draft
        ? {
            title: track?.title || draft?.metadata.title || "",
            description: track?.description || draft?.metadata.description || "",
            genre: track?.genre || draft?.metadata.genre || "",
            subgenre: "", // subgenre isn't stored in NostrTrack currently
            explicit: track?.explicit || draft?.metadata.explicit || false,
            price: track?.price || draft?.metadata.price || 0,
            tags: track?.tags?.join(", ") || draft?.metadata.tags?.join(", ") || "",
          }
        : {
            explicit: false,
            price: 0,
            title: "",
            description: "",
            genre: "",
            subgenre: "",
            tags: "",
          },
  });

  // Reset form when track or draft changes (for edit mode)
  useEffect(() => {
    if ((isEditing && track) || draft) {
      const data = track || draft?.metadata;
      if (data) {
        form.reset({
          title: data.title || "",
          description: data.description || "",
          genre: data.genre || "",
          subgenre: "", // subgenre isn't stored in NostrTrack currently
          explicit: data.explicit || false,
          price: data.price || 0,
          tags: data.tags?.join(", ") || "",
        });
        // Also reset the preview states
        setAudioPreview(data.audioUrl || null);
        setImagePreview(data.coverUrl || null);
        setAudioFile(null);
        setCoverImage(null);
      }
    }
  }, [isEditing, track, draft, form]);

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioPreview(url);

    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const onSubmit = async (data: TrackFormData) => {
    // For editing or drafts, audio file is optional (keep existing if not provided)
    if (!isEditing && !draft && !audioFile) {
      form.setError("root", { message: "Audio file is required" });
      return;
    }

    try {
      // Upload audio file using Nostr catalog API if provided, otherwise use existing URL
      let audioUrl = (isEditing && track?.audioUrl) || draft?.metadata.audioUrl || "";
      if (audioFile) {
        const uploadResult = await UploadAudio({
          audioFile,
        });
        audioUrl = uploadResult.compressed_url || uploadResult.original_url;
      }

      // Upload cover image using Blossom if provided, otherwise use existing URL
      let coverUrl = (isEditing && track?.coverUrl) || draft?.metadata.coverUrl || "";
      if (coverImage) {
        const imageTags = await uploadFile(coverImage);
        coverUrl = imageTags[0][1];
      }

      if (saveAsDraft) {
        // Save as draft
        const draftData = {
          title: data.title,
          description: data.description || "",
          genre: data.genre,
          explicit: data.explicit,
          price: data.price,
          audioUrl,
          coverUrl,
          tags: data.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) || [],
          artistId,
          draftId: draft?.draftId, // Include draft ID for updates
        };

        await saveDraftTrack.mutateAsync(draftData);
        onSuccess();
      } else if (draft && !saveAsDraft) {
        // Publish existing draft
        await publishDraftTrack.mutateAsync(draft);
        onSuccess();
      } else {
        // Normal publish flow
        const trackEvent = {
          title: data.title,
          description: data.description || "",
          genre: data.genre,
          subgenre: data.subgenre,
          explicit: data.explicit,
          price: data.price,
          audioUrl,
          coverUrl,
          tags: data.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) || [],
          artistId,
          // Add existing track info for editing
          ...(isEditing && track
            ? {
                existingTrackId: track.id,
                existingEvent: track.event,
              }
            : {}),
        };

        publishTrack(trackEvent, {
          onSuccess: () => {
            onSuccess();
          },
          onError: (error) => {
            console.error("Failed to publish track:", error);
            form.setError("root", {
              message: "Failed to publish track. Please try again.",
            });
          },
        });
      }
    } catch (error) {
      console.error("Operation failed:", error);
      form.setError("root", {
        message: "Failed to save/publish track. Please try again.",
      });
    }
  };

  const isLoading = isUploading || isUploadingAudio || isPublishing || isDraftLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          {draft 
            ? (saveAsDraft ? "Edit Draft Track" : "Publish Draft Track")
            : isEditing 
              ? "Edit Track" 
              : (saveAsDraft ? "Create Draft Track" : "Publish New Track")
          }
        </CardTitle>
        <CardDescription>
          {draft 
            ? (saveAsDraft 
                ? "Update your draft track (encrypted, private)" 
                : "Publish your draft as a public track (Kind 31337)")
            : isEditing
              ? "Update your track metadata and files (Kind 31337)"
              : (saveAsDraft 
                  ? "Create an encrypted draft track (private)" 
                  : "Upload and publish a music track to Nostr (Kind 31337)")
          }
        </CardDescription>
        
        {/* Draft/Publish Toggle - only show for new tracks and drafts */}
        {(!isEditing || draft) && (
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              checked={saveAsDraft}
              onCheckedChange={setSaveAsDraft}
              disabled={isLoading}
            />
            <Label htmlFor="draft-mode" className="text-sm">
              {saveAsDraft ? "Save as private draft" : "Publish publicly"}
            </Label>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Show error if user has no upload options */}
        {!isEditing && !user && (
          <div className="mb-6 p-4 border rounded-lg bg-red-50 border-red-200">
            <div className="font-medium text-red-900">
              Authentication Required
            </div>
            <div className="text-sm text-red-700 mt-1">
              Please log in with Nostr to upload tracks.
            </div>
          </div>
        )}
        
        {/* Show upload restriction banner for users who need to link accounts */}
        {!isEditing && <UploadRestrictionBanner className="mb-6" />}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Audio Upload */}
              <div className="space-y-2">
                <Label htmlFor="audio">Audio File *</Label>
                <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  {audioFile ? (
                    <div className="space-y-3">
                      <Music className="w-8 h-8 mx-auto text-primary" />
                      <p className="text-sm font-medium">{audioFile.name}</p>
                      {audioPreview && (
                        <audio controls className="w-full">
                          <source src={audioPreview} type={audioFile.type} />
                        </audio>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAudioFile(null);
                          setAudioPreview(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload audio file
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MP3, WAV, FLAC, or M4A
                      </p>
                    </div>
                  )}
                  <input
                    id="audio"
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Cover Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="cover">Cover Art</Label>
                <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  {coverImage ? (
                    <div className="space-y-3">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Cover preview"
                          className="w-20 h-20 mx-auto rounded object-cover"
                        />
                      )}
                      <p className="text-sm font-medium">{coverImage.name}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCoverImage(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload cover art
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, or GIF
                      </p>
                    </div>
                  )}
                  <input
                    id="cover"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Track Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter track title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your track..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset subgenre when genre changes
                        form.setValue("subgenre", "");
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MUSIC_GENRES.map((genre) => (
                          <SelectItem key={genre} value={genre}>
                            {genre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (sats)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0 for free"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>Set to 0 for free tracks</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sub-genre selector - only shows when a genre with subgenres is selected */}
            {form.watch("genre") && MUSIC_SUBGENRES[form.watch("genre")] && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="subgenre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-genre</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-genre (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MUSIC_SUBGENRES[form.watch("genre")].map(
                            (subgenre) => (
                              <SelectItem key={subgenre} value={subgenre}>
                                {subgenre}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Additional Fields */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="rock, indie, guitar (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated tags</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Fields */}
            <FormField
              control={form.control}
              name="explicit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Explicit Content</FormLabel>
                    <FormDescription>
                      Mark if track contains explicit content
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || (!user && !isEditing) || (!canUpload && !isEditing)}
              >
                {isLoading
                  ? draft && !saveAsDraft
                    ? "Publishing..."
                    : saveAsDraft
                      ? "Saving Draft..."
                      : isEditing
                        ? "Updating..."
                        : "Publishing..."
                  : draft && !saveAsDraft
                    ? "Publish Draft"
                    : saveAsDraft
                      ? draft
                        ? "Update Draft"
                        : "Save Draft"
                      : isEditing
                        ? "Update Track"
                        : "Publish Track"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
