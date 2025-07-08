import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Database,
  Music,
  User,
  Album,
  FileAudio
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { 
  useLegacyMetadata,
  useLegacyTracks,
  useLegacyArtists,
  useLegacyAlbums,
  useLegacyArtistTracks,
  useLegacyAlbumTracks
} from "@/hooks/useLegacyApi";

export function LegacyApiTest() {
  const { user } = useCurrentUser();
  const [testArtistId, setTestArtistId] = useState("");
  const [testAlbumId, setTestAlbumId] = useState("");

  // All the legacy API hooks
  const metadataQuery = useLegacyMetadata();
  const tracksQuery = useLegacyTracks();
  const artistsQuery = useLegacyArtists();
  const albumsQuery = useLegacyAlbums();
  const artistTracksQuery = useLegacyArtistTracks(testArtistId || undefined);
  const albumTracksQuery = useLegacyAlbumTracks(testAlbumId || undefined);

  const getStatusIcon = (isLoading: boolean, error: Error | null, data: unknown) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (data) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  };

  const getStatusText = (isLoading: boolean, error: Error | null, data: unknown) => {
    if (isLoading) return "Loading...";
    if (error) return `Error: ${error.message}`;
    if (data) return "Success";
    return "Ready";
  };

  const refetchAll = () => {
    metadataQuery.refetch();
    tracksQuery.refetch();
    artistsQuery.refetch();
    albumsQuery.refetch();
    if (testArtistId) artistTracksQuery.refetch();
    if (testAlbumId) albumTracksQuery.refetch();
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Legacy API Test</CardTitle>
          <CardDescription>
            Please log in with Nostr to test the legacy API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              You must be logged in with a Nostr account to test these endpoints.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Legacy API Test Dashboard
          </CardTitle>
          <CardDescription>
            Testing legacy API endpoints against local server (http://localhost:8082)
          </CardDescription>
          <div className="flex items-center gap-4">
            <Badge variant="outline">User: {user.pubkey.slice(0, 8)}...</Badge>
            <Button size="sm" variant="outline" onClick={refetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refetch All
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                console.log("🚀 Manual API test - check Network tab!");
                metadataQuery.refetch();
              }}
            >
              <Database className="h-4 w-4 mr-2" />
              Test Single Call
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="data">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          {/* Basic Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(metadataQuery.isLoading, metadataQuery.error, metadataQuery.data)}
                    <div>
                      <code className="text-sm">GET /v1/legacy/metadata</code>
                      <p className="text-xs text-muted-foreground">Complete user metadata</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{getStatusText(metadataQuery.isLoading, metadataQuery.error, metadataQuery.data)}</div>
                    {metadataQuery.data && (
                      <div className="text-xs text-muted-foreground">
                        {metadataQuery.data.artists?.length || 0} artists, {metadataQuery.data.albums?.length || 0} albums, {metadataQuery.data.tracks?.length || 0} tracks
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(tracksQuery.isLoading, tracksQuery.error, tracksQuery.data)}
                    <div>
                      <code className="text-sm">GET /v1/legacy/tracks</code>
                      <p className="text-xs text-muted-foreground">All user tracks</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{getStatusText(tracksQuery.isLoading, tracksQuery.error, tracksQuery.data)}</div>
                    {tracksQuery.data && (
                      <div className="text-xs text-muted-foreground">
                        {tracksQuery.data.tracks?.length || 0} tracks
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(artistsQuery.isLoading, artistsQuery.error, artistsQuery.data)}
                    <div>
                      <code className="text-sm">GET /v1/legacy/artists</code>
                      <p className="text-xs text-muted-foreground">All user artists</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{getStatusText(artistsQuery.isLoading, artistsQuery.error, artistsQuery.data)}</div>
                    {artistsQuery.data && (
                      <div className="text-xs text-muted-foreground">
                        {artistsQuery.data.artists?.length || 0} artists
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(albumsQuery.isLoading, albumsQuery.error, albumsQuery.data)}
                    <div>
                      <code className="text-sm">GET /v1/legacy/albums</code>
                      <p className="text-xs text-muted-foreground">All user albums</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{getStatusText(albumsQuery.isLoading, albumsQuery.error, albumsQuery.data)}</div>
                    {albumsQuery.data && (
                      <div className="text-xs text-muted-foreground">
                        {albumsQuery.data.albums?.length || 0} albums
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parameterized Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parameterized Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="artistId">Artist ID for testing</Label>
                  <Input 
                    id="artistId"
                    placeholder="Enter artist ID..."
                    value={testArtistId}
                    onChange={(e) => setTestArtistId(e.target.value)}
                  />
                  {artistsQuery.data?.artists && artistsQuery.data.artists.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Available: {artistsQuery.data.artists.map(a => a.id).join(", ")}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="albumId">Album ID for testing</Label>
                  <Input 
                    id="albumId"
                    placeholder="Enter album ID..."
                    value={testAlbumId}
                    onChange={(e) => setTestAlbumId(e.target.value)}
                  />
                  {albumsQuery.data?.albums && albumsQuery.data.albums.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Available: {albumsQuery.data.albums.map(a => a.id).join(", ")}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(artistTracksQuery.isLoading, artistTracksQuery.error, artistTracksQuery.data)}
                    <div>
                      <code className="text-sm">GET /v1/legacy/artists/{testArtistId || "{artist_id}"}/tracks</code>
                      <p className="text-xs text-muted-foreground">Tracks for specific artist</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{getStatusText(artistTracksQuery.isLoading, artistTracksQuery.error, artistTracksQuery.data)}</div>
                    {artistTracksQuery.data && (
                      <div className="text-xs text-muted-foreground">
                        {artistTracksQuery.data.tracks?.length || 0} tracks
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(albumTracksQuery.isLoading, albumTracksQuery.error, albumTracksQuery.data)}
                    <div>
                      <code className="text-sm">GET /v1/legacy/albums/{testAlbumId || "{album_id}"}/tracks</code>
                      <p className="text-xs text-muted-foreground">Tracks for specific album</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{getStatusText(albumTracksQuery.isLoading, albumTracksQuery.error, albumTracksQuery.data)}</div>
                    {albumTracksQuery.data && (
                      <div className="text-xs text-muted-foreground">
                        {albumTracksQuery.data.tracks?.length || 0} tracks
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          {metadataQuery.data && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-4 w-4" />
                    User Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {metadataQuery.data.user?.name || "N/A"}</div>
                    <div><strong>ID:</strong> {metadataQuery.data.user?.id || "N/A"}</div>
                    <div><strong>Lightning:</strong> {metadataQuery.data.user?.lightning_address || "N/A"}</div>
                    <div><strong>Balance:</strong> {metadataQuery.data.user?.msat_balance || 0} msats</div>
                    <div><strong>Locked:</strong> {metadataQuery.data.user?.is_locked ? "Yes" : "No"}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Music className="h-4 w-4" />
                    Artists ({metadataQuery.data.artists?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(metadataQuery.data.artists || []).map((artist) => (
                      <div key={artist.id} className="text-sm p-2 border rounded">
                        <div><strong>{artist.name || "Unnamed Artist"}</strong></div>
                        <div className="text-muted-foreground text-xs">
                          {artist.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                          {(artist.msat_total || 0) > 0 && <span> • {artist.msat_total} msats</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Album className="h-4 w-4" />
                    Albums ({metadataQuery.data.albums?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(metadataQuery.data.albums || []).map((album) => (
                      <div key={album.id} className="text-sm p-2 border rounded">
                        <div><strong>{album.title || "Untitled Album"}</strong></div>
                        <div className="text-muted-foreground text-xs">
                          {album.is_single && <Badge variant="outline" className="text-xs">Single</Badge>}
                          {album.is_draft && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                          {(album.msat_total || 0) > 0 && <span> • {album.msat_total} msats</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <div className="grid gap-4">
            {[
              { title: "Metadata", data: metadataQuery.data, loading: metadataQuery.isLoading },
              { title: "Tracks", data: tracksQuery.data, loading: tracksQuery.isLoading },
              { title: "Artists", data: artistsQuery.data, loading: artistsQuery.isLoading },
              { title: "Albums", data: albumsQuery.data, loading: albumsQuery.isLoading },
              { title: "Artist Tracks", data: artistTracksQuery.data, loading: artistTracksQuery.isLoading },
              { title: "Album Tracks", data: albumTracksQuery.data, loading: albumTracksQuery.isLoading },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle>{item.title} Response</CardTitle>
                </CardHeader>
                <CardContent>
                  {item.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : item.data ? (
                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-muted-foreground">No data</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}