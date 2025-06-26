import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Upload,
  X,
  Album,
  Plus,
  Trash2,
  Image as ImageIcon,
  GripVertical,
} from "lucide-react";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useMusicPublish } from "@/hooks/useMusicPublish";
import { MUSIC_GENRES } from "@/constants/music";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NostrAlbum } from "@/hooks/useArtistAlbums";
import { DraftAlbum } from "@/types/drafts";
import { useDraftPublish } from "@/hooks/useDraftPublish";

// Base schema for drafts (all fields optional)
const baseDraftAlbumSchema = z.object({
  title: z.string().optional(),
  artist: z.string().optional(),
  description: z.string().optional(),
  genre: z.string().optional(),
  releaseDate: z.string().optional(),
  price: z.number().min(0).optional(),
  tags: z.string().optional(),
  upc: z.string().optional(),
  label: z.string().optional(),
  explicit: z.boolean().default(false),
  tracks: z.array(
    z.object({
      eventId: z.string().optional(),
      title: z.string().optional(),
    })
  ).optional(),
});

// Full schema for publishing (required fields)
const publishAlbumSchema = z.object({
  title: z.string().min(1, "Album title is required"),
  artist: z.string().min(1, "Artist name is required"),
  description: z.string().optional(),
  genre: z.string().min(1, "Genre is required"),
  releaseDate: z.string().optional(),
  price: z.number().min(0).optional(),
  tags: z.string().optional(),
  upc: z.string().optional(),
  label: z.string().optional(),
  explicit: z.boolean().default(false),
  tracks: z
    .array(
      z.object({
        eventId: z.string().min(1, "Track event ID is required"),
        title: z.string().min(1, "Track title is required"),
      })
    )
    .min(1, "At least one track is required"),
});

type AlbumFormData = z.infer<typeof baseDraftAlbumSchema>;

interface AlbumFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  artistId?: string;
  album?: NostrAlbum; // For editing existing albums
  draft?: DraftAlbum; // For editing existing drafts
  isEditing?: boolean;
  isDraftMode?: boolean; // For creating new drafts
  communityId?: string; // For posting to community (NIP-72)
}

export function AlbumForm({ 
  onCancel, 
  onSuccess, 
  artistId, 
  album, 
  draft, 
  isEditing = false, 
  isDraftMode = false,
  communityId
}: AlbumFormProps) {
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    album?.coverUrl || draft?.metadata.coverUrl || null
  );
  const [saveAsDraft, setSaveAsDraft] = useState(isDraftMode || !!draft);

  const { user } = useCurrentUser();
  const { data: availableTracks = [], isLoading: tracksLoading } =
    useArtistTracks(user?.pubkey || "");
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutate: publishAlbum, isPending: isPublishing } = useMusicPublish();
  const { saveDraftAlbum, publishDraftAlbum, isLoading: isDraftLoading } = useDraftPublish();

  const form = useForm<AlbumFormData>({
    resolver: zodResolver(saveAsDraft ? baseDraftAlbumSchema : publishAlbumSchema),
    defaultValues: (isEditing && album) || draft ? {
      title: album?.title || draft?.metadata.title || "",
      artist: album?.artist || draft?.metadata.artist || "",
      description: album?.description || draft?.metadata.description || "",
      genre: album?.genre || draft?.metadata.genre || "",
      releaseDate: album?.releaseDate || draft?.metadata.releaseDate || "",
      price: album?.price || draft?.metadata.price || 0,
      tags: album?.tags?.join(", ") || draft?.metadata.tags?.join(", ") || "",
      upc: album?.upc || draft?.metadata.upc || "",
      label: album?.label || draft?.metadata.label || "",
      explicit: album?.explicit || draft?.metadata.explicit || false,
      tracks: album?.tracks.map(track => ({
        eventId: track.id,
        title: track.title,
      })) || draft?.metadata.tracks.map(track => ({
        eventId: track.eventId,
        title: track.title,
      })) || [],
    } : {
      explicit: false,
      price: 0,
      tracks: [{ eventId: "", title: "" }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "tracks",
  });

  // Clear validation errors when switching between draft and publish modes
  useEffect(() => {
    form.clearErrors(); // Clear any existing validation errors when mode changes
  }, [saveAsDraft, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const onSubmit = async (data: AlbumFormData) => {
    // Validate based on action type
    if (!saveAsDraft) {
      // Validate required fields for publishing
      const publishValidation = publishAlbumSchema.safeParse(data);
      if (!publishValidation.success) {
        // Set field-specific errors
        publishValidation.error.errors.forEach((error) => {
          if (error.path.length > 0) {
            form.setError(error.path[0] as keyof AlbumFormData, {
              message: error.message,
            });
          }
        });
        return;
      }
    }

    try {
      // Upload cover image if provided, otherwise use existing URL
      let coverUrl = (isEditing && album?.coverUrl) || draft?.metadata.coverUrl || "";
      if (coverImage) {
        const imageTags = await uploadFile(coverImage);
        coverUrl = imageTags[0][1];
      }

      if (saveAsDraft) {
        // Save as draft - handle optional fields gracefully
        const draftData = {
          title: data.title || "Untitled Album",
          artist: data.artist || "",
          description: data.description || "",
          genre: data.genre || "",
          releaseDate: data.releaseDate,
          price: data.price || 0,
          coverUrl,
          tags: data.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) || [],
          upc: data.upc || "",
          label: data.label || "",
          explicit: data.explicit || false,
          tracks: (data.tracks || []).map((track, index) => ({
            eventId: track.eventId || "",
            title: track.title || "",
            trackNumber: index + 1,
          })),
          artistId,
          draftId: draft?.draftId, // Include draft ID for updates
        };

        await saveDraftAlbum.mutateAsync(draftData);
        onSuccess();
      } else if (draft && !saveAsDraft) {
        // Publish existing draft
        await publishDraftAlbum.mutateAsync({ draft, communityId });
        onSuccess();
      } else {
        // Normal publish flow - ensure required fields are not undefined
        const albumEvent = {
          title: data.title || "Untitled Album",
          artist: data.artist || "",
          description: data.description || "",
          genre: data.genre || "",
          releaseDate: data.releaseDate,
          price: data.price || 0,
          coverUrl,
          tags: data.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) || [],
          upc: data.upc || "",
          label: data.label || "",
          explicit: data.explicit || false,
          tracks: (data.tracks || []).map((track, index) => ({
            eventId: track.eventId || "",
            title: track.title || "",
            trackNumber: index + 1,
          })),
          artistId,
          // Add community ID for posting to community (NIP-72)
          communityId,
          // Add existing album info for editing
          ...(isEditing && album ? {
            existingAlbumId: album.id,
            existingEvent: album.event,
          } : {}),
        };

        publishAlbum(albumEvent, {
          onSuccess: () => {
            onSuccess();
          },
          onError: (error) => {
            console.error("Failed to publish album:", error);
            form.setError("root", {
              message: "Failed to publish album. Please try again.",
            });
          },
        });
      }
    } catch (error) {
      console.error("Operation failed:", error);
      form.setError("root", {
        message: "Failed to save/publish album. Please try again.",
      });
    }
  };

  const addTrack = () => {
    append({
      eventId: "",
      title: "",
    });
  };

  const isLoading = isUploading || isPublishing || isDraftLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Album className="w-5 h-5" />
          {draft 
            ? (saveAsDraft ? "Edit Draft Album" : "Publish Draft Album")
            : isEditing 
              ? "Edit Album" 
              : (saveAsDraft ? "Create Draft Album" : "Create New Album")
          }
        </CardTitle>
        <CardDescription>
          {draft 
            ? (saveAsDraft 
                ? "Update your draft album (encrypted, private)" 
                : "Publish your draft as a public album (Kind 31338)")
            : isEditing
              ? "Update your album collection and track references (Kind 31338)"
              : (saveAsDraft 
                  ? "Create an encrypted draft album (private)" 
                  : "Create an album collection that references your published tracks (Kind 31338)")
          }
        </CardDescription>
        
        {/* Draft/Publish Toggle - only show for new albums and drafts */}
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="cover">Album Cover Art</Label>
              <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                {coverImage || imagePreview ? (
                  <div className="space-y-3">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Cover preview"
                        className="w-32 h-32 mx-auto rounded object-cover"
                      />
                    )}
                    <p className="text-sm font-medium">
                      {coverImage ? coverImage.name : (isEditing ? "Current album cover" : "Cover image")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCoverImage(null);
                        setImagePreview(isEditing && album?.coverUrl ? album.coverUrl : null);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {coverImage ? "Remove" : (isEditing ? "Reset to original" : "Remove")}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload album cover
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, or GIF (recommended: 1000x1000px)
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

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Album Title{!saveAsDraft ? " *" : ""}</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter album title" {...field} />
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
                    <FormLabel>Artist Name{!saveAsDraft ? " *" : ""}</FormLabel>
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
                      placeholder="Describe your album..."
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
                    <FormLabel>Genre{!saveAsDraft ? " *" : ""}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
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
                    <FormDescription>Set to 0 for free album</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        placeholder="rock, indie, album (comma separated)"
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
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter record label" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="upc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPC</FormLabel>
                    <FormControl>
                      <Input placeholder="Universal Product Code" {...field} />
                    </FormControl>
                    <FormDescription>12-digit barcode number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="explicit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Explicit Content</FormLabel>
                      <FormDescription>
                        Mark if album contains explicit content
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
            </div>

            {/* Track List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Track List</h3>
                  <p className="text-sm text-muted-foreground">
                    Select from your published tracks or paste event IDs
                  </p>
                </div>
                <Button type="button" onClick={addTrack} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Track
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {/* <div className="cursor-move">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div> */}

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-1 flex items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground bg-muted rounded-full w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>

                      <div className="md:col-span-10">
                        <FormField
                          control={form.control}
                          name={`tracks.${index}.eventId`}
                          render={({ field: eventIdField }) => (
                            <FormItem>
                              <Select
                                onValueChange={(value) => {
                                  eventIdField.onChange(value);
                                  const selectedTrack = availableTracks.find(
                                    (t) => t.id === value
                                  );
                                  if (selectedTrack) {
                                    form.setValue(
                                      `tracks.${index}.title`,
                                      selectedTrack.title
                                    );
                                  }
                                }}
                                defaultValue={eventIdField.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a track or enter event ID">
                                      {(() => {
                                        const track = availableTracks.find(
                                          (t) => t.id === eventIdField.value
                                        );
                                        if (track) {
                                          return `${track.title} (${track.artist})`;
                                        } else if (eventIdField.value) {
                                          return `Custom Track (${eventIdField.value.slice(0, 8)}...)`;
                                        }
                                        return "Select a track or enter event ID";
                                      })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {/* Only show manual input if the current value is not in available tracks */}
                                  {!availableTracks.find(t => t.id === eventIdField.value) && eventIdField.value && (
                                    <div className="p-2 border-b">
                                      <div className="text-xs text-muted-foreground mb-1">Custom Event ID:</div>
                                      <Input
                                        placeholder="Event ID"
                                        value={eventIdField.value}
                                        onChange={(e) =>
                                          eventIdField.onChange(e.target.value)
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs"
                                      />
                                    </div>
                                  )}
                                  <div className="p-2">
                                    <Input
                                      placeholder="Or paste custom event ID here..."
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          eventIdField.onChange(e.target.value);
                                          // Clear the title when manually entering ID
                                          form.setValue(`tracks.${index}.title`, "");
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="border-t border-border mx-2"></div>
                                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
                                    Available Tracks:
                                  </div>
                                  {tracksLoading ? (
                                    <SelectItem value="_loading" disabled>
                                      Loading tracks...
                                    </SelectItem>
                                  ) : availableTracks.length > 0 ? (
                                    availableTracks.map((track) => (
                                      <SelectItem
                                        key={track.id}
                                        value={track.id}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {track.title}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {track.artist} •{" "}
                                            {track.albumTitle || "Single"} •{" "}
                                            {track.duration
                                              ? `${Math.floor(
                                                  track.duration / 60
                                                )}:${(track.duration % 60)
                                                  .toString()
                                                  .padStart(2, "0")}`
                                              : ""}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="_empty" disabled>
                                      No tracks found
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Hidden field for title */}
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.title`}
                        render={({ field }) => (
                          <FormItem className="hidden">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {form.formState.errors.tracks && (
                <div className="text-sm text-destructive">
                  {form.formState.errors.tracks.message}
                </div>
              )}
            </div>

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
                        ? "Update Album"
                        : "Publish Album"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
