import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Upload,
  Edit,
  Eye,
  MoreHorizontal,
  Filter,
  Star,
} from "lucide-react";
import { TrackForm } from "./TrackForm";
import { AlbumForm } from "./AlbumForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useArtistAlbums } from "@/hooks/useArtistAlbums";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useTrackNutzapTotals } from "@/hooks/useTrackNutzapTotals";
import { useUploadHistory } from "@/hooks/useUploadHistory";
import { NostrAlbum } from "@/hooks/useArtistAlbums";

interface MusicPublisherProps {
  artistId?: string;
}

export function MusicPublisher({ artistId }: MusicPublisherProps) {
  const { user } = useCurrentUser();
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<NostrAlbum | null>(null);

  const { data: albums = [], isLoading: albumsLoading } = useArtistAlbums(
    user?.pubkey || ""
  );

  const { data: tracks = [], isLoading: tracksLoading } = useArtistTracks(
    user?.pubkey || ""
  );
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (showSats) {
      return `${amount.toLocaleString()} sats`;
    }
    return btcPrice
      ? formatUSD(satsToUSD(amount, btcPrice.USD))
      : `${amount.toLocaleString()} sats`;
  };

  // Get all tracks from albums plus standalone tracks
  const allTracks = [
    ...albums.flatMap((album) =>
      album.tracks.map((track) => ({
        ...track,
        albumTitle: album.title,
        albumImage: album.coverUrl,
        price: track.price || 0,
        exclusive: track.explicit || false,
      }))
    ),
    ...tracks
      .filter(
        (track) =>
          !albums.some((album) =>
            album.tracks.some((albumTrack) => albumTrack.id === track.id)
          )
      )
      .map((track) => ({
        ...track,
        albumTitle: track.albumTitle || "Single",
        albumImage: track.coverUrl,
        price: track.price || 0,
        exclusive: track.explicit || false,
      })),
  ];

  // Get all track IDs for nutzap totals query
  const trackIds = allTracks.map((track) => track.id);
  const { data: nutzapTotals = [], isLoading: nutzapsLoading } =
    useTrackNutzapTotals(trackIds);

  // Create a map for quick lookup of nutzap totals
  const nutzapTotalMap = new Map(
    nutzapTotals.map((total) => [total.trackId, total.totalAmount])
  );

  // Get real upload history
  const { data: uploadHistory = [], isLoading: uploadHistoryLoading } =
    useUploadHistory();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Music Management</CardTitle>
          <CardDescription>
            You need to be logged in to manage your music.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please log in to start managing your music catalog.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Music Management
          </h2>
          <p className="text-muted-foreground">
            Manage your albums, tracks, and uploads
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => setShowTrackForm(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload New Music
        </Button>
      </div>

      {/* Show forms when active */}
      {showTrackForm && (
        <TrackForm
          onCancel={() => setShowTrackForm(false)}
          onSuccess={() => setShowTrackForm(false)}
          artistId={artistId}
        />
      )}

      {showAlbumForm && (
        <AlbumForm
          onCancel={() => setShowAlbumForm(false)}
          onSuccess={() => setShowAlbumForm(false)}
          artistId={artistId}
        />
      )}

      {editingAlbum && (
        <AlbumForm
          onCancel={() => setEditingAlbum(null)}
          onSuccess={() => setEditingAlbum(null)}
          artistId={artistId}
          album={editingAlbum}
          isEditing={true}
        />
      )}

      <Tabs defaultValue="albums" className="space-y-6">
        <TabsList>
          <TabsTrigger value="albums">Albums</TabsTrigger>
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="uploads">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="albums" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums?.map((album, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="relative aspect-square">
                  <img
                    src={album.coverUrl || "/placeholder.svg"}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold">{album.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {album.releaseDate
                      ? new Date(album.releaseDate).getFullYear()
                      : "Unknown"}{" "}
                    • {album.tracks.length} tracks
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAlbum(album)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Add Tracks</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setEditingAlbum(album)}
                        >
                          Edit Album
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Album
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Album Card */}
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-6 h-full min-h-[300px]">
              <Plus className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="font-medium text-muted-foreground">
                Create New Album
              </h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Upload multiple tracks as an album
              </p>
              <Button className="mt-4" onClick={() => setShowAlbumForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Album
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tracks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>All Tracks</CardTitle>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search tracks..." className="w-[200px]" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Most Played</DropdownMenuItem>
                      <DropdownMenuItem>Most Revenue</DropdownMenuItem>
                      <DropdownMenuItem>Recently Added</DropdownMenuItem>
                      <DropdownMenuItem>Exclusive Only</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Track</TableHead>
                      <TableHead>Album</TableHead>
                      <TableHead className="text-center">Exclusive</TableHead>
                      <TableHead className="text-right">Stream Cost</TableHead>
                      <TableHead className="text-right">Plays</TableHead>
                      <TableHead className="text-right">
                        Revenue (Nutzaps)
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTracks.map((track, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {track.title}
                        </TableCell>
                        <TableCell>{track.albumTitle}</TableCell>
                        <TableCell className="text-center">
                          {track.exclusive ? (
                            <Star className="h-4 w-4 text-amber-500 inline" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(track.price)}
                        </TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">
                          {nutzapsLoading ? (
                            <span className="text-muted-foreground">
                              Loading...
                            </span>
                          ) : (
                            <span
                              className={
                                nutzapTotalMap.get(track.id)
                                  ? "text-green-600 font-medium"
                                  : ""
                              }
                            >
                              {formatCurrency(
                                nutzapTotalMap.get(track.id) || 0
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>Edit Track</DropdownMenuItem>
                                <DropdownMenuItem>
                                  {track.exclusive
                                    ? "Remove Exclusive"
                                    : "Make Exclusive"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  Delete Track
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>
                Recent music uploads and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadHistoryLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          Loading upload history...
                        </TableCell>
                      </TableRow>
                    ) : uploadHistory.length > 0 ? (
                      uploadHistory.map((upload) => (
                        <TableRow key={upload.id}>
                          <TableCell>{upload.date}</TableCell>
                          <TableCell className="font-medium">
                            {upload.title}
                          </TableCell>
                          <TableCell>
                            {upload.type === "album"
                              ? `Album${
                                  upload.trackCount
                                    ? ` (${upload.trackCount} tracks)`
                                    : ""
                                }`
                              : "Single Track"}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              {upload.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No upload history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
