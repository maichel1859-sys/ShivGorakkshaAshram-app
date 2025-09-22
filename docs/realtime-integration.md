# Real-time Socket Integration for Aashram Healthcare App

## Overview

The Aashram Healthcare App features a comprehensive real-time integration system that provides instant updates across all dashboards using Socket.IO with automatic fallback to polling when socket connections fail.

## Architecture

### 🏗️ Core Components

1. **Socket Server** (`ashram-queue-socket-server/`)
   - Separate Node.js Socket.IO server
   - Handles real-time events and room management
   - Deployed on Render: `https://ashram-queue-socket-server.onrender.com`

2. **Client Integration** (`src/lib/socket/`)
   - `socket-client.ts` - Socket.IO client with auto-reconnection
   - `socket-integration.ts` - Room management and authentication
   - `socket-emitter.ts` - Server-side event emission after database commits

3. **Centralized State Management** (`src/store/`)
   - **App Store** (`app-store.ts`) - Global UI state and loading
   - **Queue Store** (`queue-store.ts`) - Real-time queue management
   - **Notification Store** (`notification-store.ts`) - Live notifications
   - **Offline Store** (`offline-store.ts`) - Offline-first functionality
   - **Auth Store** (`auth-store.ts`) - Authentication state

4. **Enhanced Hooks** (`src/hooks/`)
   - `use-queue-unified.ts` - Smart queue updates with socket + polling fallback
   - `use-polling-notifications.ts` - Adaptive polling based on socket health
   - `use-adaptive-polling.ts` - Dynamic polling intervals with retry logic
   - `use-realtime-sync.ts` - Cross-dashboard synchronization

## 🔄 Real-time Flow

### 1. Server Action → Socket Emission
```typescript
// In any Server Action after database commit
try {
  await emitQueueEvent(
    SocketEventTypes.QUEUE_ENTRY_ADDED,
    queueEntry.id,
    {
      id: queueEntry.id,
      position: queuePosition,
      status: 'WAITING',
      estimatedWait: estimatedWaitMinutes,
      priority: appointment.priority || 'NORMAL',
      appointmentId: appointment.id,
    },
    appointment.userId,
    appointment.gurujiId
  );
} catch (socketError) {
  console.warn('🔌 Socket emission failed, using polling fallback:', socketError);
  // Graceful degradation - clients automatically switch to polling
}
```

### 2. Socket Reception → Store Updates
```typescript
// Queue updates are automatically handled by useQueueUnified hook
const { queueEntries, isUsingFallback } = useQueueUnified({
  role: "guruji",
  autoRefresh: true,
  refreshInterval: 15000, // Smart intervals: 15s fallback, 30s when socket active
  enableRealtime: true, // Socket primary + polling backup
});
```

### 3. Cross-Dashboard Synchronization
```typescript
// All dashboards stay in sync through centralized stores
const queueStore = useQueueStore();        // Real-time queue state
const appStore = useAppStore();            // Global loading/error state
const notificationStore = useNotificationStore(); // Live notifications
```

## 🎯 Dashboard-Specific Features

### Patient Dashboard
- **Real-time queue position updates**
- **Instant appointment status changes**
- **Live notifications for consultations**
- **Automatic refresh when socket fails**

### Guruji Dashboard
- **Live queue management**
- **Real-time patient check-ins**
- **Consultation session updates**
- **Prescription tracking**

### Coordinator Dashboard
- **System-wide activity monitoring**
- **Manual check-in capabilities**
- **User assistance workflows**
- **Real-time queue management**

### Admin Dashboard
- **Live system statistics**
- **User management updates**
- **System health monitoring**
- **Real-time analytics**

## ⚡ Automatic Fallback System

### Socket Health Monitoring
```typescript
// Automatic fallback when socket health deteriorates
const {
  isUsingFallback,
  connectionHealth,
  retryCount
} = usePollingNotifications();

// Dynamic polling intervals based on connection health
connectionHealth: {
  isSocketConnected: boolean;
  isOnline: boolean;
  isSlowConnection: boolean;
  socketId: string;
}
```

### Adaptive Polling Intervals
- **Socket Connected**: 30-60s intervals (slow polling)
- **Socket Failed**: 5-8s intervals (fast polling)
- **Network Poor**: 2-3s intervals (aggressive polling)
- **Offline**: Queue actions, replay on reconnect

### Graceful Degradation
```typescript
// Enhanced retry logic with exponential backoff
retry: (failureCount, error) => {
  if (!isOnline) return false;
  const maxRetries = fallbackState.isUsingFallback ? 5 : 3;
  if (error?.message?.includes('Authentication')) return false;
  return failureCount < maxRetries;
},

retryDelay: (attemptIndex) => {
  const baseDelay = fallbackState.isUsingFallback ? 500 : 1000;
  return Math.min(baseDelay * 2 ** attemptIndex, 10000);
}
```

## 🔧 Integration Examples

### Adding Real-time to a New Component
```typescript
import { useQueueUnified } from '@/hooks/use-queue-unified';
import { useRealtimeSync } from '@/hooks/use-realtime-sync';

function MyDashboard() {
  // Get real-time queue data with automatic fallback
  const {
    queueEntries,
    isLoading,
    refetch,
    realtime
  } = useQueueUnified({
    role: "coordinator",
    autoRefresh: true,
    enableRealtime: true
  });

  // Setup cross-dashboard synchronization
  const {
    isSocketConnected,
    isSyncHealthy,
    applyOptimisticUpdate
  } = useRealtimeSync({
    enableOptimistic: true,
    enableCrossTab: true
  });

  return (
    <div>
      {/* Connection status indicator */}
      <ConnectionStatus />

      {/* Real-time queue display */}
      {queueEntries.map(entry => (
        <QueueEntry
          key={entry.id}
          entry={entry}
          onUpdate={(updates) => {
            // Optimistic update with rollback
            applyOptimisticUpdate(
              `queue-${entry.id}`,
              () => updateQueueEntry(entry.id, updates),
              () => refetch()
            );
          }}
        />
      ))}
    </div>
  );
}
```

### Adding Socket Events to Server Actions
```typescript
import {
  emitAppointmentEvent,
  SocketEventTypes
} from '@/lib/socket/socket-emitter';

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  // 1. Update database
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status }
  });

  // 2. Emit socket event with fallback handling
  try {
    await emitAppointmentEvent(
      SocketEventTypes.APPOINTMENT_UPDATED,
      appointmentId,
      {
        id: appointment.id,
        userId: appointment.userId,
        gurujiId: appointment.gurujiId,
        date: appointment.date,
        time: appointment.startTime,
        status: appointment.status,
        priority: appointment.priority || 'NORMAL',
      }
    );
  } catch (socketError) {
    console.warn('🔌 Socket emission failed, using polling fallback:', socketError);
    // Clients automatically handle fallback via polling
  }

  // 3. Revalidate cache
  revalidatePath('/appointments');

  return { success: true, appointment };
}
```

## 📊 Performance Optimization

### React Query Integration
- **Smart caching** with socket-aware stale times
- **Background updates** only when socket is down
- **Optimistic mutations** with automatic rollback
- **Structural sharing** to prevent unnecessary re-renders

### Cross-tab Synchronization
```typescript
// Automatic sync between browser tabs
const channel = new BroadcastChannel('ashram-realtime-sync');

// Sync queue updates across tabs
channel.postMessage({
  type: 'QUEUE_UPDATE',
  data: { entries: queueEntries },
  timestamp: Date.now()
});
```

### Memory Management
- **Automatic cleanup** of pending optimistic updates
- **Garbage collection** for stale socket listeners
- **Efficient data structures** for large queue lists

## 🛠️ Configuration

### Environment Variables
```env
# Socket server configuration
NEXT_PUBLIC_SOCKET_SERVER_URL=https://ashram-queue-socket-server.onrender.com
SOCKET_SERVER_URL=https://ashram-queue-socket-server.onrender.com
SOCKET_SERVER_PATH=/socket.io

# Fallback polling intervals (optional)
NEXT_PUBLIC_POLLING_INTERVAL_NORMAL=15000
NEXT_PUBLIC_POLLING_INTERVAL_FAST=5000
NEXT_PUBLIC_POLLING_INTERVAL_SLOW=30000
```

### Socket Provider Setup
```typescript
// Already integrated in AppProviders
<AppProviders>
  <SocketProvider>
    <QueryProvider>
      <SessionProvider>
        {/* Your app */}
      </SessionProvider>
    </QueryProvider>
  </SocketProvider>
</AppProviders>
```

## 🔍 Debugging and Monitoring

### Connection Status
The app includes a connection status indicator that shows:
- 🟢 **Real-time**: Socket connected, instant updates
- 🟡 **Fallback**: Using polling, automatic fallback active
- 🔴 **Offline**: No connection, queuing actions for retry

### Debug Mode
```typescript
// Enable debug logging for real-time hooks
const queue = useQueueUnified({
  role: "admin",
  debug: true // Enables detailed logging
});

// Console output:
// [Queue] Socket event: queue_updated
// [RealtimeSync] Cross-tab message received: QUEUE_UPDATE
// 🔌 Socket emission failed, using polling fallback
```

### Health Monitoring
```typescript
const { health, syncStats } = useRealtimeSync();

console.log('Real-time Health:', {
  isHealthy: health.isHealthy,
  errorRate: health.errorRate,
  socketConnected: syncStats.socketConnected,
  lastUpdate: syncStats.lastUpdate
});
```

## 🧪 Testing

### End-to-End Scenarios
1. **Socket Disconnect**: Disable network → Enable network → Verify automatic reconnection
2. **Cross-Dashboard**: Open multiple tabs → Make changes → Verify sync across tabs
3. **Optimistic Updates**: Perform action → Disconnect socket → Verify rollback
4. **High Load**: Multiple concurrent users → Verify performance degradation is graceful

### Performance Testing
- **Network throttling** to test slow connections
- **Socket server restart** to test reconnection logic
- **High concurrent users** to test scalability
- **Memory usage** over extended periods

## 🚀 Success Criteria

✅ **Instant Updates**: All dashboards reflect changes within 100ms when socket connected
✅ **Graceful Fallback**: Automatic polling when socket fails (5-15s intervals)
✅ **Consistent State**: No data inconsistencies across dashboards
✅ **Offline Resilience**: Actions queued and replayed on reconnection
✅ **Cross-tab Sync**: Changes sync instantly between browser tabs
✅ **Performance**: Handles 100+ concurrent users without degradation
✅ **Maintainable**: Clear patterns for adding new real-time features

## 📝 Adding New Real-time Features

1. **Add socket emission** to relevant Server Actions
2. **Update socket event handlers** in existing hooks
3. **Add new events** to SocketEventTypes enum
4. **Test fallback behavior** when socket fails
5. **Verify cross-dashboard synchronization**

The real-time system is designed to be robust, performant, and maintainable, providing an excellent user experience whether socket connections are working perfectly or falling back to polling mechanisms.