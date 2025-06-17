import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload, X, Album, Plus, Trash2, Image as ImageIcon, GripVertical } from "lucide-react";
import { useUploadFile } from "@/hooks/useUploadFile";
import { useMusicPublish } from "@/hooks/useMusicPublish";
import { MUSIC_GENRES } from "@/constants/music";

const albumFormSchema = z.object({
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
  tracks: z.array(z.object({
    eventId: z.string().min(1, "Track event ID is required"),
    title: z.string().min(1, "Track title is required"),
    trackNumber: z.number().min(1, "Track number is required"),
  })).min(1, "At least one track is required"),
});

type AlbumFormData = z.infer<typeof albumFormSchema>;

interface AlbumFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  artistId?: string;
}


export function AlbumForm({ onCancel, onSuccess, artistId }: AlbumFormProps) {
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutate: publishAlbum, isPending: isPublishing } = useMusicPublish();

  const form = useForm<AlbumFormData>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: {
      explicit: false,
      price: 0,
      tracks: [{ eventId: "", title: "", trackNumber: 1 }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "tracks",
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const onSubmit = async (data: AlbumFormData) => {
    try {
      // Upload cover image if provided
      let coverUrl = '';
      if (coverImage) {
        const imageTags = await uploadFile(coverImage);
        coverUrl = imageTags[0][1];
      }

      // Prepare album metadata
      const albumEvent = {
        title: data.title,
        artist: data.artist,
        description: data.description || '',
        genre: data.genre,
        releaseDate: data.releaseDate,
        price: data.price,
        coverUrl,
        tags: data.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        upc: data.upc,
        label: data.label,
        explicit: data.explicit,
        tracks: data.tracks.map(track => ({
          eventId: track.eventId,
          title: track.title,
          trackNumber: track.trackNumber,
        })),
        artistId,
      };

      publishAlbum(albumEvent, {
        onSuccess: () => {
          onSuccess();
        },
        onError: (error) => {
          console.error('Failed to publish album:', error);
          form.setError('root', { message: 'Failed to publish album. Please try again.' });
        },
      });
    } catch (error) {
      console.error('Upload failed:', error);
      form.setError('root', { message: 'Failed to upload cover image. Please try again.' });
    }
  };

  const addTrack = () => {
    append({
      eventId: "",
      title: "",
      trackNumber: fields.length + 1,
    });
  };

  const isLoading = isUploading || isPublishing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Album className="w-5 h-5" />
          Create New Album
        </CardTitle>
        <CardDescription>
          Create an album collection that references your published tracks (Kind 31338)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="cover">Album Cover Art</Label>
              <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                {coverImage ? (
                  <div className="space-y-3">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Cover preview"
                        className="w-32 h-32 mx-auto rounded object-cover"
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
                    <FormLabel>Album Title *</FormLabel>
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
                    <FormLabel>Genre *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                      <Input placeholder="rock, indie, album (comma separated)" {...field} />
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
                    Add tracks by referencing their Nostr event IDs
                  </p>
                </div>
                <Button type="button" onClick={addTrack} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Track
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="cursor-move">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.trackNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="#"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`tracks.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Track title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`tracks.${index}.eventId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Nostr event ID (note1... or hex)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

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
                {isLoading ? "Publishing..." : "Publish Album"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}