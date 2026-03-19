import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/realtime-js';
import { supabase } from '../lib/supabase';
import type { InteractionType } from './petService';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InteractionPayload {
  type: InteractionType;
  fromUserId: string;
  targetPetId: string;
  timestamp: number;
}

export type InteractionCallback = (payload: InteractionPayload) => void;

// ─── Internal State ─────────────────────────────────────────────────────────

const pendingQueue: InteractionPayload[] = [];
let hasSubscribedOnce = false;

// ─── Functions ──────────────────────────────────────────────────────────────

/**
 * Subscribe to the pet-room broadcast channel for a relationship.
 * Filters out self-echo (messages from the current user).
 * On reconnect (SUBSCRIBED after initial), flushes any queued interactions.
 * Returns the RealtimeChannel for the caller to manage.
 */
export function subscribeToPetRoom(
  relationshipId: string,
  currentUserId: string,
  onInteraction: InteractionCallback
): RealtimeChannel {
  hasSubscribedOnce = false;

  const channel = supabase
    .channel(`pet-room:${relationshipId}`)
    .on('broadcast', { event: 'interaction' }, (message) => {
      const payload = message.payload as InteractionPayload;
      if (payload.fromUserId === currentUserId) return;
      onInteraction(payload);
    })
    .subscribe((status) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        if (hasSubscribedOnce) {
          // Reconnect — flush queued interactions
          flushQueue(channel);
        }
        hasSubscribedOnce = true;
      }
    });

  return channel;
}

/**
 * Send an interaction on the pet-room channel.
 * If the channel is not in SUBSCRIBED state, the interaction is queued
 * and will be flushed on reconnect.
 */
export function sendInteraction(
  channel: RealtimeChannel,
  payload: InteractionPayload
): void {
  if ((channel as any).state === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
    channel.send({
      type: 'broadcast',
      event: 'interaction',
      payload,
    });
  } else {
    pendingQueue.push(payload);
  }
}

/**
 * Remove the pet-room channel from the Supabase client.
 * Call this on component unmount to clean up resources.
 */
export function unsubscribeFromPetRoom(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function flushQueue(channel: RealtimeChannel): void {
  while (pendingQueue.length > 0) {
    const payload = pendingQueue.shift()!;
    channel.send({
      type: 'broadcast',
      event: 'interaction',
      payload,
    });
  }
}
