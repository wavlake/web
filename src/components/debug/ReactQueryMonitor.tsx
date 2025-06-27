import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

interface QueryInfo {
  queryKey: string;
  queryHash: string;
  state: string;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  fetchStatus: string;
  isFetching: boolean;
  isStale: boolean;
  refetchCount: number;
}

export function ReactQueryMonitor() {
  const queryClient = useQueryClient();
  const [queries, setQueries] = useState<QueryInfo[]>([]);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const refreshQueries = useCallback(() => {
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    
    const queryInfos: QueryInfo[] = allQueries.map(query => ({
      queryKey: JSON.stringify(query.queryKey),
      queryHash: query.queryHash,
      state: query.state.status,
      dataUpdatedAt: query.state.dataUpdatedAt,
      errorUpdatedAt: query.state.errorUpdatedAt,
      fetchStatus: query.state.fetchStatus,
      isFetching: query.state.fetchStatus === 'fetching',
      isStale: query.isStale(),
      refetchCount: query.state.fetchFailureCount + query.state.dataUpdateCount,
    }));

    // Sort by most recently updated
    queryInfos.sort((a, b) => Math.max(b.dataUpdatedAt, b.errorUpdatedAt) - Math.max(a.dataUpdatedAt, a.errorUpdatedAt));
    
    setQueries(queryInfos);
  }, [queryClient]);

  const logToConsole = () => {
    const activeQueries = queries.filter(q => q.isFetching);
    const staleQueries = queries.filter(q => q.isStale);
    const nostrQueries = queries.filter(q => 
      q.queryKey.includes('community-content') ||
      q.queryKey.includes('user-groups') ||
      q.queryKey.includes('open-reports-count') ||
      q.queryKey.includes('notifications') ||
      q.queryKey.includes('pending-join-requests')
    );

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalQueries: queries.length,
        activeQueries: activeQueries.length,
        staleQueries: staleQueries.length,
        nostrQueries: nostrQueries.length
      },
      activeQueries: activeQueries.map(q => ({
        queryKey: q.queryKey,
        state: q.state,
        refetchCount: q.refetchCount,
        lastUpdated: new Date(Math.max(q.dataUpdatedAt, q.errorUpdatedAt)).toISOString()
      })),
      nostrQueries: nostrQueries.map(q => ({
        queryKey: q.queryKey,
        isFetching: q.isFetching,
        isStale: q.isStale,
        refetchCount: q.refetchCount,
        lastUpdated: new Date(Math.max(q.dataUpdatedAt, q.errorUpdatedAt)).toISOString()
      })),
      allQueries: queries.map(q => ({
        queryKey: q.queryKey,
        state: q.state,
        fetchStatus: q.fetchStatus,
        isFetching: q.isFetching,
        isStale: q.isStale,
        refetchCount: q.refetchCount
      }))
    };

    console.log('=== REACT QUERY MONITOR REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('=== END REPORT ===');
    
    // Also log a summary table for easy reading
    console.table(nostrQueries.map(q => ({
      Query: q.queryKey.substring(0, 50) + (q.queryKey.length > 50 ? '...' : ''),
      Status: q.isFetching ? 'FETCHING' : q.isStale ? 'STALE' : 'FRESH',
      Refetches: q.refetchCount,
      LastUpdated: new Date(Math.max(q.dataUpdatedAt, q.errorUpdatedAt)).toLocaleTimeString()
    })));
  };


  useEffect(() => {
    if (!isAutoRefresh) return;
    
    const interval = setInterval(refreshQueries, 2000);
    refreshQueries(); // Initial load
    
    return () => clearInterval(interval);
  }, [queryClient, isAutoRefresh, refreshQueries]);

  const nostrQueries = queries.filter(q => 
    q.queryKey.includes('community-content') ||
    q.queryKey.includes('user-groups') ||
    q.queryKey.includes('open-reports-count') ||
    q.queryKey.includes('notifications') ||
    q.queryKey.includes('pending-join-requests')
  );

  const activeQueries = queries.filter(q => q.isFetching);
  const staleQueries = queries.filter(q => q.isStale);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>React Query Cache Monitor</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsAutoRefresh(!isAutoRefresh)} 
              variant={isAutoRefresh ? "default" : "outline"}
              size="sm"
            >
              {isAutoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button onClick={refreshQueries} variant="outline" size="sm">
              Refresh Now
            </Button>
            <Button onClick={logToConsole} variant="secondary" size="sm">
              📋 Log to Console
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total Queries:</span>
            <Badge variant="secondary">{queries.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            <Badge variant={activeQueries.length > 0 ? "default" : "secondary"}>
              {activeQueries.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Stale:</span>
            <Badge variant={staleQueries.length > 5 ? "destructive" : "secondary"}>
              {staleQueries.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Nostr-related:</span>
            <Badge variant="outline">{nostrQueries.length}</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Active Queries Section */}
          {activeQueries.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 text-orange-600 dark:text-orange-400">
                🔄 Currently Fetching ({activeQueries.length})
              </h4>
              <div className="space-y-2">
                {activeQueries.map((query, index) => (
                  <div key={index} className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border">
                    <div className="text-sm font-mono truncate">{query.queryKey}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {query.state} | Refetches: {query.refetchCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nostr Queries Section */}
          <div>
            <h4 className="font-medium text-sm mb-2">
              🌐 Nostr-related Queries ({nostrQueries.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {nostrQueries.length === 0 ? (
                <p className="text-muted-foreground text-sm">No Nostr queries found</p>
              ) : (
                nostrQueries.map((query, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border text-sm ${
                      query.isFetching 
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                        : query.isStale
                        ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs truncate flex-1 mr-2">
                        {query.queryKey}
                      </div>
                      <div className="flex gap-1">
                        <Badge
                          variant={
                            query.isFetching ? 'default' :
                            query.isStale ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {query.isFetching ? 'Fetching' : query.isStale ? 'Stale' : 'Fresh'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Updated: {new Date(Math.max(query.dataUpdatedAt, query.errorUpdatedAt)).toLocaleTimeString()} | 
                      Refetches: {query.refetchCount}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* All Queries Section */}
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              View All Queries ({queries.length})
            </summary>
            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
              {queries.map((query, index) => (
                <div key={index} className="p-2 bg-muted/30 rounded text-xs">
                  <div className="font-mono truncate">{query.queryKey}</div>
                  <div className="text-muted-foreground mt-1">
                    {query.state} | {query.fetchStatus} | Refetches: {query.refetchCount}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}