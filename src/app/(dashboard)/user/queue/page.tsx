'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { getQueueStatus, joinQueue, leaveQueue } from '@/lib/actions/queue-actions';

interface QueueStatus {
  waiting: number;
  inProgress: number;
  completedToday: number;
  totalToday: number;
  estimatedWaitTime: number;
  currentQueue: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      phone: string;
    };
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

export default function UserQueuePage() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);


  useEffect(() => {
    loadQueueStatus();
    const interval = setInterval(loadQueueStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadQueueStatus = async () => {
    try {
      const result = await getQueueStatus();
      if (result.success && result.queueStatus) {
        const formattedQueueStatus = {
          ...result.queueStatus,
          currentQueue: result.queueStatus.currentQueue.map(entry => ({
            id: entry.id,
            user: {
              id: entry.user.id,
              name: entry.user.name || 'Unknown',
              phone: entry.user.phone || '',
            },
            reason: entry.notes || 'General consultation',
            status: entry.status,
            createdAt: entry.createdAt.toISOString(),
          })),
        };
        setQueueStatus(formattedQueueStatus);
      }
    } catch (error) {
      console.error('Failed to load queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    setJoining(true);
    try {
      const formData = new FormData();
      formData.append('gurujiId', 'default-guruji-id'); // You'll need to get this from context or props
      formData.append('reason', 'General consultation');
      
      const result = await joinQueue(formData);
      if (result.success) {
        await loadQueueStatus();
      } else {
        console.error('Failed to join queue:', result.error);
      }
    } catch (error) {
      console.error('Error joining queue:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveQueue = async (queueEntryId: string) => {
    setLeaving(true);
    try {
      const formData = new FormData();
      formData.append('queueEntryId', queueEntryId);
      
      const result = await leaveQueue(formData);
      if (result.success) {
        await loadQueueStatus();
      } else {
        console.error('Failed to leave queue:', result.error);
      }
    } catch (error) {
      console.error('Error leaving queue:', error);
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Queue Status</h1>
        <p className="text-muted-foreground">
          Check your position and estimated wait time
        </p>
      </div>

      {queueStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStatus.waiting}</div>
              <p className="text-xs text-muted-foreground">
                People in queue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Wait</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {queueStatus.estimatedWaitTime} min
              </div>
              <p className="text-xs text-muted-foreground">
                Average wait time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStatus.completedToday}</div>
              <p className="text-xs text-muted-foreground">
                Consultations completed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Current Queue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueStatus?.currentQueue && queueStatus.currentQueue.length > 0 ? (
              <div className="space-y-3">
                {queueStatus.currentQueue.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{entry.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          entry.status === 'IN_PROGRESS' ? 'default' : 'secondary'
                        }
                      >
                        {entry.status}
                      </Badge>
                      {entry.user.id === 'current-user-id' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLeaveQueue(entry.id)}
                          disabled={leaving}
                        >
                          Leave
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No one in queue</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Queue Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Join Queue</h4>
              <p className="text-sm text-muted-foreground">
                Join the queue to see a guruji. You&apos;ll be notified when it&apos;s your turn.
              </p>
              <Button
                onClick={handleJoinQueue}
                disabled={joining}
                className="w-full"
              >
                {joining ? 'Joining...' : 'Join Queue'}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Estimated Wait Time</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current wait</span>
                  <span className="font-medium">
                    {queueStatus?.estimatedWaitTime || 0} minutes
                  </span>
                </div>
                <Progress
                  value={Math.min((queueStatus?.estimatedWaitTime || 0) / 60 * 100, 100)}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Based on average consultation time of 15 minutes
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Stay nearby - you&apos;ll be called when ready</li>
                <li>• You can leave the queue anytime</li>
                <li>• Check back regularly for updates</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
