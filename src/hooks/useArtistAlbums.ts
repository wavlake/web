import { useQuery } from "@tanstack/react-query";
import { Album } from "@/components/music/MusicSection";

export function useArtistAlbums(artistId: string) {
  return useQuery({
    queryKey: ["artist-albums", artistId],
    queryFn: async () => {
      // In a real implementation, this would fetch from Nostr events
      // For now, return mock data
      const mockAlbums: Album[] = [
        {
          id: "album-1",
          title: "Electric Dreams",
          coverArt: "https://picsum.photos/seed/album1/300/300",
          releaseYear: "2024",
          fundingGoal: 1000000,
          fundingRaised: 750000,
          tracks: [
            {
              id: "track-1",
              title: "Opening Act",
              duration: "3:45",
              plays: 1234,
              ecash: 5000,
              streamCost: 0,
              isExclusive: false,
            },
            {
              id: "track-2",
              title: "Digital Sunrise",
              duration: "4:20",
              plays: 892,
              ecash: 8500,
              streamCost: 100,
              isExclusive: false,
            },
            {
              id: "track-3",
              title: "Exclusive Mix",
              duration: "5:15",
              plays: 456,
              ecash: 15000,
              streamCost: 500,
              isExclusive: true,
            },
            {
              id: "track-4",
              title: "Midnight Pulse",
              duration: "3:58",
              plays: 2345,
              ecash: 7200,
              streamCost: 0,
              isExclusive: false,
            },
          ],
        },
        {
          id: "album-2",
          title: "Acoustic Sessions",
          coverArt: "https://picsum.photos/seed/album2/300/300",
          releaseYear: "2023",
          tracks: [
            {
              id: "track-5",
              title: "Unplugged",
              duration: "3:30",
              plays: 2100,
              ecash: 3000,
              streamCost: 0,
              isExclusive: false,
            },
            {
              id: "track-6",
              title: "Raw & Real",
              duration: "4:00",
              plays: 1800,
              ecash: 4500,
              streamCost: 0,
              isExclusive: false,
            },
            {
              id: "track-7",
              title: "Strings Attached",
              duration: "5:45",
              plays: 950,
              ecash: 6000,
              streamCost: 200,
              isExclusive: false,
            },
          ],
        },
        {
          id: "album-3",
          title: "Summer Vibes EP",
          coverArt: "https://picsum.photos/seed/album3/300/300",
          releaseYear: "2023",
          fundingGoal: 500000,
          fundingRaised: 520000,
          tracks: [
            {
              id: "track-8",
              title: "Beach Days",
              duration: "3:15",
              plays: 3200,
              ecash: 4800,
              streamCost: 0,
              isExclusive: false,
            },
            {
              id: "track-9",
              title: "Sunset Drive",
              duration: "4:30",
              plays: 2800,
              ecash: 5500,
              streamCost: 0,
              isExclusive: false,
            },
            {
              id: "track-10",
              title: "VIP Lounge Mix",
              duration: "6:00",
              plays: 580,
              ecash: 12000,
              streamCost: 1000,
              isExclusive: true,
            },
          ],
        },
      ];

      return mockAlbums;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
