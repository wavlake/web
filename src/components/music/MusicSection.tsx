import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Share2,
  DollarSign,
  Headphones,
  Lock,
  Star,
  ListPlus,
  Download,
  Music,
  Disc,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface Track {
  id: string;
  title: string;
  duration: string;
  plays: number;
  ecash: number;
  streamCost: number;
  isExclusive: boolean;
}

export interface Album {
  id: string;
  title: string;
  coverArt: string;
  releaseYear: string;
  fundingGoal?: number;
  fundingRaised?: number;
  tracks: Track[];
}

interface MusicSectionProps {
  albums: Album[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export function MusicSection({ albums }: MusicSectionProps) {
  const [currentAlbumId, setCurrentAlbumId] = useState(albums[0]?.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState(
    albums[0]?.tracks[0]?.id
  );

  const currentAlbum =
    albums.find((album) => album.id === currentAlbumId) || albums[0];
  const currentTrack = currentTrackId
    ? currentAlbum?.tracks.find((track) => track.id === currentTrackId)
    : currentAlbum?.tracks[0];

  // Get all tracks from all albums
  const allTracks = albums.flatMap((album) =>
    album.tracks.map((track) => ({
      ...track,
      albumId: album.id,
      albumTitle: album.title,
      albumCover: album.coverArt,
      releaseYear: album.releaseYear,
    }))
  );

  const handlePlayTrack = (trackId: string, albumId: string) => {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;

    const track = album.tracks.find((t) => t.id === trackId);
    if (!track) return;

    setCurrentAlbumId(albumId);

    if (currentTrackId === trackId) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrackId(trackId);
      setIsPlaying(true);
    }
  };

  if (!albums.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No music available yet
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Now Playing */}
      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row items-start">
          <div className="relative w-full md:w-48 h-48 flex-shrink-0 bg-muted">
            {currentAlbum?.coverArt ? (
              <img
                src={currentAlbum.coverArt}
                alt={currentAlbum.title}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Music className="w-12 h-12" />
              </div>
            )}
          </div>
          <div className="flex-1 p-4 flex flex-col h-full md:h-48">
            <div className="flex flex-col flex-1 justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Now Playing</span>
                  {currentTrack && currentTrack.streamCost > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>
                          min. {formatCurrency(currentTrack.streamCost)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <h3 className="text-xl font-bold">
                  {currentTrack?.title || "Select a track"}
                </h3>
                <p className="text-muted-foreground">
                  {currentAlbum?.title} • {currentAlbum?.releaseYear}
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <div className="space-y-2">
                  <Progress value={33} className="h-1" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1:15</span>
                    <span>{currentTrack?.duration || "0:00"}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon">
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon">
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <ListPlus className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      title="Send additional eCash to support the artist"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs">Support</span>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Music Content Tabs */}
      <Tabs defaultValue="albums" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="albums" className="flex items-center gap-2">
            <Disc className="h-4 w-4" />
            Albums
          </TabsTrigger>
          <TabsTrigger value="tracks" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            All Tracks
          </TabsTrigger>
        </TabsList>

        {/* Albums Tab */}
        <TabsContent value="albums" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {albums.map((album) => (
              <Card
                key={album.id}
                className={cn(
                  "overflow-hidden cursor-pointer transition-all hover:shadow-md",
                  currentAlbumId === album.id ? "ring-2 ring-primary" : ""
                )}
                onClick={() => setCurrentAlbumId(album.id)}
              >
                <div className="relative aspect-square bg-muted">
                  {album.coverArt ? (
                    <img
                      src={album.coverArt}
                      alt={album.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Disc className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium truncate">{album.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {album.releaseYear}
                  </p>
                  {album.fundingGoal && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Funding</span>
                        <span>
                          {Math.round(
                            (album.fundingRaised! / album.fundingGoal) * 100
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={(album.fundingRaised! / album.fundingGoal) * 100}
                        className="h-1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Album Tracks */}
          {currentAlbum && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {currentAlbum.title} • Tracks
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {currentAlbum.releaseYear}
                  </span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {currentAlbum.tracks.length} tracks
                  </span>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {currentAlbum.tracks.map((track) => (
                      <div
                        key={track.id}
                        className={cn(
                          "flex items-center justify-between p-3 hover:bg-muted/50 transition-colors",
                          currentTrackId === track.id ? "bg-muted" : "",
                          track.isExclusive ? "opacity-60" : ""
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-full",
                              currentTrackId === track.id ? "bg-background" : ""
                            )}
                            onClick={() =>
                              handlePlayTrack(track.id, currentAlbum.id)
                            }
                          >
                            {track.isExclusive ? (
                              <Lock className="h-4 w-4" />
                            ) : currentTrackId === track.id && isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {track.title}
                              </p>
                              {track.isExclusive && (
                                <Star className="w-3 h-3" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Headphones className="w-3 h-3" />
                                <span>{track.plays.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                <span>{formatCurrency(track.ecash)}</span>
                              </div>
                              {track.streamCost > 0 && (
                                <div className="flex items-center gap-1">
                                  <span>
                                    min. {formatCurrency(track.streamCost)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {track.duration}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Heart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <ListPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* All Tracks Tab */}
        <TabsContent value="tracks" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">All Tracks</h3>
            <span className="text-sm text-muted-foreground">
              {allTracks.length} tracks
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {allTracks.map((track) => (
                  <div
                    key={track.id}
                    className={cn(
                      "flex items-center justify-between p-3 hover:bg-muted/50 transition-colors",
                      currentTrackId === track.id ? "bg-muted" : "",
                      track.isExclusive ? "opacity-60" : ""
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative h-10 w-10 flex-shrink-0 bg-muted">
                        {track.albumCover ? (
                          <img
                            src={track.albumCover}
                            alt={track.albumTitle}
                            className="object-cover w-full h-full rounded"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground rounded">
                            <Disc className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-full",
                          currentTrackId === track.id ? "bg-background" : ""
                        )}
                        onClick={() => handlePlayTrack(track.id, track.albumId)}
                      >
                        {track.isExclusive ? (
                          <Lock className="h-4 w-4" />
                        ) : currentTrackId === track.id && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{track.title}</p>
                          {track.isExclusive && <Star className="w-3 h-3" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{track.albumTitle}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Headphones className="w-3 h-3" />
                            <span>{track.plays.toLocaleString()}</span>
                          </div>
                          {track.streamCost > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>{formatCurrency(track.streamCost)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {track.duration}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ListPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
