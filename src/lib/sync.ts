// src/lib/sync.ts
// Realtime Cross-Tab & Cross-Component Synchronization Hub for AHS Real Estate

export type SyncEventType =
  | 'PRODUCT_UPDATED'
  | 'LOCK_UPDATED'
  | 'CONTRACT_UPDATED'
  | 'CUSTOMER_UPDATED'
  | 'BOOKING_UPDATED'
  | 'ALL_DATA_UPDATED';

export interface SyncMessage {
  type: SyncEventType;
  payload?: any;
  timestamp: number;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!channel && 'BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel('ahs_realtime_sync_channel');
    } catch (e) {
      console.warn('BroadcastChannel not supported or restricted:', e);
    }
  }
  return channel;
}

/**
 * Broadcast an update event across ALL open tabs, windows, and local components
 */
export function broadcastSync(type: SyncEventType = 'ALL_DATA_UPDATED', payload?: any) {
  if (typeof window === 'undefined') return;

  const message: SyncMessage = {
    type,
    payload,
    timestamp: Date.now()
  };

  // 1. BroadcastChannel (for multiple tabs/windows in modern browsers)
  try {
    const ch = getChannel();
    ch?.postMessage(message);
  } catch (e) {
    // Ignore channel post error
  }

  // 2. localStorage event fallback (triggers storage event across all other tabs)
  try {
    localStorage.setItem('ahs_last_sync_event', JSON.stringify(message));
  } catch (e) {
    // Ignore storage quota error
  }

  // 3. Custom DOM event (for components within the SAME tab/window)
  try {
    window.dispatchEvent(new CustomEvent('ahs:realtime_sync', { detail: message }));
  } catch (e) {
    // Ignore
  }
}

/**
 * Subscribe to realtime synchronization events across all tabs & local state
 */
export function onSync(callback: (message?: SyncMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (evt: MessageEvent) => {
    callback(evt.data);
  };

  const handleStorage = (evt: StorageEvent) => {
    if (evt.key === 'ahs_last_sync_event' && evt.newValue) {
      try {
        const parsed = JSON.parse(evt.newValue);
        callback(parsed);
      } catch (e) {
        callback();
      }
    }
  };

  const handleCustomEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent;
    callback(customEvt.detail);
  };

  const ch = getChannel();
  ch?.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);
  window.addEventListener('ahs:realtime_sync', handleCustomEvent);

  return () => {
    ch?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('ahs:realtime_sync', handleCustomEvent);
  };
}
