import Header from "@/components/ui/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Hash } from "lucide-react";
import { useTrendingHashtags } from "@/hooks/useTrendingHashtags";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function Trending() {
  const [timeFilter, setTimeFilter] = useState("24h");
  const { data: allHashtags } = useTrendingHashtags(100);

  // Filter hashtags by time period
  const getFilteredHashtags = () => {
    if (!allHashtags) return [];
    
    switch (timeFilter) {
      case "10m":
        return allHashtags.filter(h => h.recentPosts >= 5);
      case "1h": 
        return allHashtags.filter(h => h.recentPosts >= 3);
      case "24h":
        return allHashtags.filter(h => h.recentPosts >= 1);
      case "week":
        return allHashtags.filter(h => h.count >= 3);
      case "month":
        return allHashtags.filter(h => h.count >= 1);
      default:
        return allHashtags;
    }
  };

  const filteredHashtags = getFilteredHashtags();

  const getTimeLabel = () => {
    switch (timeFilter) {
      case "10m": return "last 10 minutes";
      case "1h": return "last hour";
      case "24h": return "last day";
      case "week": return "last week";
      case "month": return "last month";
      default: return "all time";
    }
  };

  return (
    <div className="container mx-auto py-1 px-3 sm:px-4">
      <Header />

      <div className="max-w-3xl mx-auto mt-6">
        {/* Mobile-optimized header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Trending</h1>
          </div>
          
          {/* Mobile-friendly time filter */}
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10m">Last 10 min</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last day</SelectItem>
              <SelectItem value="week">Last week</SelectItem>
              <SelectItem value="month">Last month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count - mobile friendly */}
        {filteredHashtags.length > 0 && (
          <div className="mb-4 text-sm text-muted-foreground">
            {filteredHashtags.length} trending hashtag{filteredHashtags.length !== 1 ? 's' : ''} from {getTimeLabel()}
          </div>
        )}

        {/* Mobile-optimized hashtag list */}
        <div className="space-y-2">
          {filteredHashtags.slice(0, 25).map((item, index) => {
            return (
              <Link key={item.hashtag} to={`/t/${item.hashtag}`}>
                <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left side - hashtag info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Hash className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          {/* Hashtag name with badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-base truncate">
                              {item.hashtag}
                            </span>
                            {item.recentPosts > 0 && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                +{item.recentPosts}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side - post count */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="font-medium">{item.count}</span>
                        <span className="hidden xs:inline">posts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredHashtags.length === 0 && (
          <div className="text-center py-12">
            <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-2">No trending hashtags</h3>
            <p className="text-muted-foreground mb-4">
              No hashtags found for {getTimeLabel()}. Try a different time period.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-xs text-muted-foreground border-t mt-8">
          Updates every 10 minutes • Trending across the nostr network
        </div>
      </div>
    </div>
  );
}