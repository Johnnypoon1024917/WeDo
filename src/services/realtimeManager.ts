import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/realtime-js';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

// Data types matching the database schema
export interface MemoryEntry {
  id: string;
  relationship_id: string;
  created_by: string;
  photo_url: string;
  caption: string;
  revealed: boolean;
  audio_url: string | null;
  created_at: string;
}

export interface CalendarSticker {
  id: string;
  relationship_id: string;
  sticker_id: string;
  day: string;
  x_coordinate: number;
  y_coordinate: number;
  placed_by: string;
  is_custom: boolean;
  created_at: string;
}

export interface BucketListItem {
  id: string;
  relationship_id: string;
  title: string;
  url: string | null;
  completed: boolean;
  created_by: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  relationship_id: string;
  day: string;
  title: string;
  time: string | null;
  created_by: string;
  created_at: string;
}

// Track last-seen timestamps for reconciliation after reconnect
let lastMemoryTimestamp: string | null = null;
let lastStickerTimestamp: string | null = null;
let lastBucketTimestamp: string | null = null;
let lastCalendarEventTimestamp: string | null = null;

// Active channels for cleanup
const activeChannels: RealtimeChannel[] = [];

function handleChannelStatus(status: REALTIME_SUBSCRIBE_STATES) {
  const { setConnectionStatus } = useAppStore.getState();

  if (
    status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
    status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR
  ) {
    setConnectionStatus('reconnecting');
  } else if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
    setConnectionStatus('connected');
  } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
    setConnectionStatus('disconnected');
  }
}

async function reconcileMemories(
  relationshipId: string,
  onInsert: (entry: MemoryEntry) => void,
  _onUpdate: (entry: MemoryEntry) => void
) {
  if (!lastMemoryTimestamp) return;

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('relationship_id', relationshipId)
    .gt('created_at', lastMemoryTimestamp)
    .order('created_at', { ascending: true });

  if (!error && data) {
    for (const entry of data as MemoryEntry[]) {
      onInsert(entry);
      if (entry.created_at > (lastMemoryTimestamp ?? '')) {
        lastMemoryTimestamp = entry.created_at;
      }
    }
  }
}

async function reconcileStickers(
  relationshipId: string,
  onInsert: (sticker: CalendarSticker) => void
) {
  if (!lastStickerTimestamp) return;

  const { data, error } = await supabase
    .from('calendar_stickers')
    .select('*')
    .eq('relationship_id', relationshipId)
    .gt('created_at', lastStickerTimestamp)
    .order('created_at', { ascending: true });

  if (!error && data) {
    for (const sticker of data as CalendarSticker[]) {
      onInsert(sticker);
      if (sticker.created_at > (lastStickerTimestamp ?? '')) {
        lastStickerTimestamp = sticker.created_at;
      }
    }
  }
}

async function reconcileBucketList(
  relationshipId: string,
  onInsert: (item: BucketListItem) => void,
  _onUpdate: (item: BucketListItem) => void
) {
  if (!lastBucketTimestamp) return;

  const { data, error } = await supabase
    .from('bucket_list_items')
    .select('*')
    .eq('relationship_id', relationshipId)
    .gt('created_at', lastBucketTimestamp)
    .order('created_at', { ascending: true });

  if (!error && data) {
    for (const item of data as BucketListItem[]) {
      onInsert(item);
      if (item.created_at > (lastBucketTimestamp ?? '')) {
        lastBucketTimestamp = item.created_at;
      }
    }
  }
}

async function reconcileCalendarEvents(
  relationshipId: string,
  onInsert: (event: CalendarEvent) => void
) {
  if (!lastCalendarEventTimestamp) return;

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('relationship_id', relationshipId)
    .gt('created_at', lastCalendarEventTimestamp)
    .order('created_at', { ascending: true });

  if (!error && data) {
    for (const event of data as CalendarEvent[]) {
      onInsert(event);
      if (event.created_at > (lastCalendarEventTimestamp ?? '')) {
        lastCalendarEventTimestamp = event.created_at;
      }
    }
  }
}

export const realtimeManager = {
  subscribeToMemories(
    relationshipId: string,
    onInsert: (entry: MemoryEntry) => void,
    onUpdate: (entry: MemoryEntry) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`memories:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'memories',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const entry = payload.new as MemoryEntry;
          lastMemoryTimestamp = entry.created_at;
          onInsert(entry);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'memories',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const entry = payload.new as MemoryEntry;
          onUpdate(entry);
        }
      )
      .subscribe(async (status) => {
        handleChannelStatus(status);
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          await reconcileMemories(relationshipId, onInsert, onUpdate);
        }
      });

    activeChannels.push(channel);
    return channel;
  },

  subscribeToStickers(
    relationshipId: string,
    onInsert: (sticker: CalendarSticker) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`stickers:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendar_stickers',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const sticker = payload.new as CalendarSticker;
          lastStickerTimestamp = sticker.created_at;
          onInsert(sticker);
        }
      )
      .subscribe(async (status) => {
        handleChannelStatus(status);
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          await reconcileStickers(relationshipId, onInsert);
        }
      });

    activeChannels.push(channel);
    return channel;
  },

  subscribeToBucketList(
    relationshipId: string,
    onInsert: (item: BucketListItem) => void,
    onUpdate: (item: BucketListItem) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`bucket:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bucket_list_items',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const item = payload.new as BucketListItem;
          lastBucketTimestamp = item.created_at;
          onInsert(item);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bucket_list_items',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const item = payload.new as BucketListItem;
          onUpdate(item);
        }
      )
      .subscribe(async (status) => {
        handleChannelStatus(status);
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          await reconcileBucketList(relationshipId, onInsert, onUpdate);
        }
      });

    activeChannels.push(channel);
    return channel;
  },

  subscribeToCalendarEvents(
    relationshipId: string,
    onInsert: (event: CalendarEvent) => void,
    onDelete: (event: CalendarEvent) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`calendar_events:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendar_events',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const event = payload.new as CalendarEvent;
          lastCalendarEventTimestamp = event.created_at;
          onInsert(event);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'calendar_events',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const event = payload.old as CalendarEvent;
          onDelete(event);
        }
      )
      .subscribe(async (status) => {
        handleChannelStatus(status);
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          await reconcileCalendarEvents(relationshipId, onInsert);
        }
      });

    activeChannels.push(channel);
    return channel;
  },

  unsubscribeAll(): void {
    for (const channel of activeChannels) {
      supabase.removeChannel(channel);
    }
    activeChannels.length = 0;
    lastMemoryTimestamp = null;
    lastStickerTimestamp = null;
    lastBucketTimestamp = null;
    lastCalendarEventTimestamp = null;
    useAppStore.getState().setConnectionStatus('disconnected');
  },
};
