import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useNostr } from '@/hooks/useNostr';

interface ConnectionEvent {
  timestamp: string;
  type: 'query' | 'connection' | 'error';
  message: string;
  filters?: unknown[];
  relayUrl?: string;
}

interface QueryStats {
  totalQueries: number;
  queriesPerMinute: number;
  lastQueryTime?: string;
}

export function NostrConnectionMonitor() {
  const { nostr } = useNostr();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [stats, setStats] = useState<QueryStats>({
    totalQueries: 0,
    queriesPerMinute: 0,
  });

  // Clear events
  const clearEvents = () => {
    setEvents([]);
    setStats({ totalQueries: 0, queriesPerMinute: 0 });
  };

  // Add event to the log
  const addEvent = (event: ConnectionEvent) => {
    setEvents(prev => {
      const newEvents = [event, ...prev.slice(0, 99)]; // Keep last 100 events
      return newEvents;
    });

    // Update stats if it's a query event
    if (event.type === 'query') {
      setStats(prev => ({
        ...prev,
        totalQueries: prev.totalQueries + 1,
        lastQueryTime: event.timestamp,
      }));
    }
  };

  // Monitor nostr.query calls by wrapping the method
  useEffect(() => {
    if (!nostr || !isMonitoring) return;

    // Store original query method
    const originalQuery = nostr.query.bind(nostr);

    // Wrap the query method to log calls
    nostr.query = async function(filters: unknown[], opts?: unknown) {
      const timestamp = new Date().toISOString();
      
      addEvent({
        timestamp,
        type: 'query',
        message: `Query with ${filters.length} filter(s)`,
        filters: filters.map((f: Record<string, unknown>) => ({
          kinds: f.kinds,
          authors: Array.isArray(f.authors) ? f.authors.slice(0, 1) : f.authors, // Only show first author for brevity
          limit: f.limit,
          since: f.since,
          '#a': f['#a'],
          '#p': Array.isArray(f['#p']) ? f['#p'].slice(0, 1) : f['#p'], // Only show first pubkey for brevity
          '#d': f['#d'],
          '#e': Array.isArray(f['#e']) ? f['#e'].slice(0, 1) : f['#e'], // Only show first event ID for brevity
        })),
      });

      try {
        const result = await originalQuery(filters, opts);
        
        addEvent({
          timestamp: new Date().toISOString(),
          type: 'query',
          message: `Query completed: ${result.length} events returned`,
        });

        return result;
      } catch (error) {
        addEvent({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `Query failed: ${error}`,
        });
        throw error;
      }
    };

    // Cleanup function to restore original method
    return () => {
      if (nostr) {
        nostr.query = originalQuery;
      }
    };
  }, [nostr, isMonitoring]);

  // Calculate queries per minute
  useEffect(() => {
    const interval = setInterval(() => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentQueries = events.filter(
        event => 
          event.type === 'query' && 
          new Date(event.timestamp) > oneMinuteAgo
      );
      
      setStats(prev => ({
        ...prev,
        queriesPerMinute: recentQueries.length,
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [events]);

  const logToConsole = () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentQueries = events.filter(
      event => event.type === 'query' && new Date(event.timestamp) > oneMinuteAgo
    );
    
    const last5MinQueries = events.filter(
      event => event.type === 'query' && new Date(event.timestamp) > fiveMinutesAgo
    );

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalQueries: stats.totalQueries,
        queriesPerMinute: stats.queriesPerMinute,
        queriesLast5Min: last5MinQueries.length,
        lastQueryTime: stats.lastQueryTime,
        totalEvents: events.length
      },
      recentQueries: recentQueries.map(event => ({
        timestamp: event.timestamp,
        message: event.message,
        filters: event.filters
      })),
      allEvents: events.map(event => ({
        timestamp: event.timestamp,
        type: event.type,
        message: event.message,
        hasFilters: !!event.filters
      }))
    };

    console.log('=== NOSTR CONNECTION MONITOR REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('=== END REPORT ===');
    
    // Also log a summary table for recent queries
    if (recentQueries.length > 0) {
      console.table(recentQueries.map(event => ({
        Time: new Date(event.timestamp).toLocaleTimeString(),
        Message: event.message,
        Filters: event.filters ? event.filters.length : 0
      })));
    }
  };


  if (!isMonitoring) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Nostr Connection Monitor
            <Button onClick={() => setIsMonitoring(true)} size="sm">
              Start Monitoring
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Click "Start Monitoring" to track Nostr websocket queries and connections.
            This will help identify potential performance issues.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Nostr Connection Monitor</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={clearEvents} variant="outline" size="sm">
              Clear
            </Button>
            <Button onClick={logToConsole} variant="secondary" size="sm">
              📋 Log to Console
            </Button>
            <Button onClick={() => setIsMonitoring(false)} variant="outline" size="sm">
              Stop Monitoring
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total Queries:</span>
            <Badge variant="secondary">{stats.totalQueries}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Queries/min:</span>
            <Badge variant={stats.queriesPerMinute > 10 ? "destructive" : "default"}>
              {stats.queriesPerMinute}
            </Badge>
          </div>
          {stats.lastQueryTime && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Last Query:</span>
              <span className="text-xs">{new Date(stats.lastQueryTime).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events yet...</p>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  event.type === 'query' 
                    ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                    : event.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge
                    variant={
                      event.type === 'query' ? 'default' :
                      event.type === 'error' ? 'destructive' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {event.type.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="font-medium">{event.message}</p>
                {event.filters && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      View Filters ({event.filters.length})
                    </summary>
                    <pre className="text-xs mt-1 p-2 bg-background rounded overflow-x-auto">
                      {JSON.stringify(event.filters, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}