import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'apniidukan_offline_order_drafts';

export interface OfflineOrderDraft {
  id: string;
  idempotencyKey: string;
  deliverySlotId: string;
  deliveryDate?: string;
  paymentMethod: 'UPI' | 'COD';
  itemCount: number;
  totalAmount: number;
  createdAt: string;
}

export function generateIdempotencyKey(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDrafts(): Promise<OfflineOrderDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOrderDraft[]) : [];
  } catch {
    return [];
  }
}

export async function saveDraft(draft: OfflineOrderDraft): Promise<void> {
  const drafts = await getDrafts();
  drafts.push(draft);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // best-effort — if storage write fails, the draft simply won't survive a restart
  }
}

export async function removeDraft(id: string): Promise<void> {
  const drafts = await getDrafts();
  const next = drafts.filter((d) => d.id !== id);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
}
