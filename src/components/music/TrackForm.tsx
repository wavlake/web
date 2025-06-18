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
import { useUploadWavlakeAudio } from "@/hooks/useUploadWavlakeAudio";
import { useMusicPublish } from "@/hooks/useMusicPublish";
import { MUSIC_GENRES, MUSIC_SUBGENRES } from "@/constants/music";
import { NostrTrack } from "@/hooks/useArtistTracks";

const trackFormSchema = z.object({
  title: z.string().min(1, "Track title is required"),
  artist: z.string().min(1, "Artist name is required"),
  description: z.string().optional(),
  genre: z.string().min(1, "Genre is required"),
  subgenre: z.string().optional(),
  duration: z.number().optional(),
  explicit: z.boolean().default(false),
  price: z.number().min(0).optional(),
  tags: z.string().optional(),
  releaseDate: z.string().optional(),
  albumTitle: z.string().optional(),
  trackNumber: z.number().optional(),
});

type TrackFormData = z.infer<typeof trackFormSchema>;

interface TrackFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  artistId?: string;
  track?: NostrTrack; // For editing existing tracks
  isEditing?: boolean;
}

export function TrackForm({
  onCancel,
  onSuccess,
  artistId,
  track,
  isEditing = false,
}: TrackFormProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(
    isEditing && track?.audioUrl ? track.audioUrl : null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    isEditing && track?.coverUrl ? track.coverUrl : null
  );

  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: uploadWavlakeAudio, isPending: isUploadingAudio } =
    useUploadWavlakeAudio();
  const { mutate: publishTrack, isPending: isPublishing } = useMusicPublish();

  const form = useForm<TrackFormData>({
    resolver: zodResolver(trackFormSchema),
    defaultValues:
      isEditing && track
        ? {
            title: track.title,
            artist: track.artist,
            description: track.description || "",
            genre: track.genre || "",
            subgenre: "", // subgenre isn't stored in NostrTrack currently
            duration: track.duration || 0,
            explicit: track.explicit || false,
            price: track.price || 0,
            tags: track.tags?.join(", ") || "",
            releaseDate: track.releaseDate || "",
            albumTitle: track.albumTitle || "",
            trackNumber: track.trackNumber || 1,
          }
        : {
            explicit: false,
            price: 0,
            duration: 0,
            trackNumber: 1,
            title: "",
            artist: "",
            description: "",
            genre: "",
            subgenre: "",
            tags: "",
            releaseDate: "",
            albumTitle: "",
          },
  });

  // Reset form when track changes (for edit mode)
  useEffect(() => {
    if (isEditing && track) {
      form.reset({
        title: track.title,
        artist: track.artist,
        description: track.description || "",
        genre: track.genre || "",
        subgenre: "", // subgenre isn't stored in NostrTrack currently
        duration: track.duration || 0,
        explicit: track.explicit || false,
        price: track.price || 0,
        tags: track.tags?.join(", ") || "",
        releaseDate: track.releaseDate || "",
        albumTitle: track.albumTitle || "",
        trackNumber: track.trackNumber || 1,
      });
      // Also reset the preview states
      setAudioPreview(track.audioUrl || null);
      setImagePreview(track.coverUrl || null);
      setAudioFile(null);
      setCoverImage(null);
    }
  }, [isEditing, track, form]);

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioPreview(url);

      // Try to extract duration from audio file
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        form.setValue("duration", Math.round(audio.duration));
      });
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
    // For editing, audio file is optional (keep existing if not provided)
    if (!isEditing && !audioFile) {
      form.setError("root", { message: "Audio file is required" });
      return;
    }

    try {
      // Upload audio file using Wavlake catalog API if provided, otherwise use existing URL
      let audioUrl = isEditing && track?.audioUrl ? track.audioUrl : "";
      if (audioFile) {
        const uploadResult = await uploadWavlakeAudio({
          audioFile,
          options: {
            title: data.title,
            artist: data.artist,
            order: data.trackNumber || 1,
            lyrics: data.description,
            isExplicit: data.explicit,
          },
        });
        audioUrl = uploadResult.liveUrl;
      }

      // Upload cover image using Blossom if provided, otherwise use existing URL
      let coverUrl = isEditing && track?.coverUrl ? track.coverUrl : "";
      if (coverImage) {
        const imageTags = await uploadFile(coverImage);
        coverUrl = imageTags[0][1];
      }

      // Prepare track metadata
      const trackEvent = {
        title: data.title,
        artist: data.artist,
        description: data.description || "",
        genre: data.genre,
        subgenre: data.subgenre,
        duration: data.duration,
        explicit: data.explicit,
        price: data.price,
        audioUrl,
        coverUrl,
        tags:
          data.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) || [],
        releaseDate: data.releaseDate,
        albumTitle: data.albumTitle,
        trackNumber: data.trackNumber,
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
    } catch (error) {
      console.error("Upload failed:", error);
      form.setError("root", {
        message: "Failed to upload files. Please try again.",
      });
    }
  };

  const isLoading = isUploading || isUploadingAudio || isPublishing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          {isEditing ? "Edit Track" : "Publish New Track"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Update your track metadata and files (Kind 31337)"
            : "Upload and publish a music track to Nostr (Kind 31337)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter artist name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Auto-detected"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || undefined)
                        }
                      />
                    </FormControl>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="releaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Album Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="albumTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Album Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter album title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trackNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Track Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? "Updating..."
                    : "Publishing..."
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
