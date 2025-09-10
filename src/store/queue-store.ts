import { create } from 'zustand';

interface QueueEntry {
  id: string;
  userId: string;
  userName: string;
  gurujiId: string;
  gurujiName: string;
  appointmentId?: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  position: number;
  estimatedWaitTime?: number;
  checkedInAt: string;
  notes?: string;
}

interface QueueSummary {
  gurujiId: string;
  gurujiName: string;
  waitingCount: number;
  inProgressCount: number;
  averageWaitTime: number;
  totalToday: number;
}

interface QueueState {
  entries: QueueEntry[];
  summaries: QueueSummary[];
  isLoading: boolean;
  lastUpdate: number | null;
  selectedGurujiId: string | null;

  // Actions
  setEntries: (entries: QueueEntry[]) => void;
  setSummaries: (summaries: QueueSummary[]) => void;
  addEntry: (entry: QueueEntry) => void;
  updateEntry: (entryId: string, updates: Partial<QueueEntry>) => void;
  removeEntry: (entryId: string) => void;
  setLoading: (loading: boolean) => void;
  setSelectedGuruji: (gurujiId: string | null) => void;
  updatePositions: () => void;
  getEntriesByGuruji: (gurujiId: string) => QueueEntry[];
  getWaitingEntries: () => QueueEntry[];
  getInProgressEntries: () => QueueEntry[];
  setLastUpdate: (timestamp: number) => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  entries: [],
  summaries: [],
  isLoading: false,
  lastUpdate: null,
  selectedGurujiId: null,

  setEntries: (entries) => {
    const sortedEntries = entries.sort((a, b) => {
      // Sort by priority first, then by check-in time
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
    });

    // Update positions
    const entriesWithPositions = sortedEntries.map((entry, index) => ({
      ...entry,
      position: entry.status === 'WAITING' ? index + 1 : 0,
    }));

    set({ 
      entries: entriesWithPositions,
      lastUpdate: Date.now()
    });
  },

  setSummaries: (summaries) => set({ summaries }),

  addEntry: (entry) => {
    const { entries } = get();
    const newEntries = [...entries, entry];
    get().setEntries(newEntries);
  },

  updateEntry: (entryId, updates) => {
    const { entries } = get();
    const updatedEntries = entries.map(entry =>
      entry.id === entryId ? { ...entry, ...updates } : entry
    );
    get().setEntries(updatedEntries);
  },

  removeEntry: (entryId) => {
    const { entries } = get();
    const filteredEntries = entries.filter(entry => entry.id !== entryId);
    get().setEntries(filteredEntries);
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setSelectedGuruji: (gurujiId) => set({ selectedGurujiId: gurujiId }),

  updatePositions: () => {
    const { entries } = get();
    get().setEntries(entries);
  },

  getEntriesByGuruji: (gurujiId) => {
    const { entries } = get();
    return entries.filter(entry => entry.gurujiId === gurujiId);
  },

  getWaitingEntries: () => {
    const { entries } = get();
    return entries.filter(entry => entry.status === 'WAITING');
  },

  getInProgressEntries: () => {
    const { entries } = get();
    return entries.filter(entry => entry.status === 'IN_PROGRESS');
  },

  setLastUpdate: (timestamp) => set({ lastUpdate: timestamp }),
}));

// Selector hooks for better performance
export const useQueue = () => useQueueStore((state) => state.entries);
export const useQueuePosition = (userId: string) => useQueueStore((state) => {
  const entry = state.entries.find(e => e.userId === userId);
  return entry?.position || null;
});
export const useQueueStatus = (userId: string) => useQueueStore((state) => {
  const entry = state.entries.find(e => e.userId === userId);
  return entry?.status || null;
});
export const useJoinQueue = () => useQueueStore((state) => state.addEntry);
export const useLeaveQueue = () => useQueueStore((state) => state.removeEntry);
export const useUpdateQueueStatus = () => useQueueStore((state) => state.updateEntry);