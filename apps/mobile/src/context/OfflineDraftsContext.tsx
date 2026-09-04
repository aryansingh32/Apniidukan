import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { createOrder } from '@/lib/endpoints';
import { isApiError } from '@/lib/api';
import { getDrafts, removeDraft, saveDraft, type OfflineOrderDraft } from '@/lib/offlineDrafts';
import { useAuth } from './AuthContext';

interface OfflineDraftsContextValue {
  drafts: OfflineOrderDraft[];
  syncing: boolean;
  addDraft: (draft: OfflineOrderDraft) => Promise<void>;
  syncNow: () => Promise<void>;
}

const OfflineDraftsContext = createContext<OfflineDraftsContextValue | undefined>(undefined);

export function OfflineDraftsProvider({ children }: { children: React.ReactNode }) {
  const { authStatus } = useAuth();
  const [drafts, setDrafts] = useState<OfflineOrderDraft[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshDrafts = useCallback(async () => {
    setDrafts(await getDrafts());
  }, []);

  useEffect(() => {
    if (authStatus === 'approved') refreshDrafts();
  }, [authStatus, refreshDrafts]);

  const syncNow = useCallback(async () => {
    if (syncingRef.current || authStatus !== 'approved') return;
    const pending = await getDrafts();
    if (pending.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const draft of pending) {
        try {
          await createOrder(draft.deliverySlotId, draft.deliveryDate, draft.paymentMethod, draft.idempotencyKey);
          await removeDraft(draft.id);
        } catch (e) {
          // Network still down — stop and retry on the next reconnect event.
          // A non-network error (e.g. slot no longer valid) means this draft
          // can never succeed, so drop it rather than retrying forever.
          if (isApiError(e) && e.statusCode !== 0) {
            await removeDraft(draft.id);
          } else {
            break;
          }
        }
      }
    } finally {
      await refreshDrafts();
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [authStatus, refreshDrafts]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncNow();
    });
    return unsubscribe;
  }, [syncNow]);

  const addDraft = useCallback(
    async (draft: OfflineOrderDraft) => {
      await saveDraft(draft);
      await refreshDrafts();
    },
    [refreshDrafts],
  );

  return (
    <OfflineDraftsContext.Provider value={{ drafts, syncing, addDraft, syncNow }}>{children}</OfflineDraftsContext.Provider>
  );
}

export function useOfflineDrafts() {
  const ctx = useContext(OfflineDraftsContext);
  if (!ctx) throw new Error('useOfflineDrafts must be used within OfflineDraftsProvider');
  return ctx;
}
