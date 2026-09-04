import { apiFetch } from './api';
import type {
  AppNotification,
  Banner,
  Cart,
  Category,
  CreditNote,
  DeliverySlot,
  ExpiryClaim,
  MyStockBatch,
  Order,
  PaymentInfo,
  Product,
  QuickReorder,
  RequestOtpResponse,
  Retailer,
  ReturnReason,
  ReturnRequest,
  Scheme,
  VerifyOtpResponse,
} from './types';

// ---- Auth ----
export const requestOtp = (mobileNumber: string) =>
  apiFetch<RequestOtpResponse>('/auth/mobile/request-otp', {
    method: 'POST',
    body: { mobileNumber },
    skipGlobalHandlers: true,
  });

export const verifyOtp = (mobileNumber: string, code: string) =>
  apiFetch<VerifyOtpResponse>('/auth/mobile/verify-otp', {
    method: 'POST',
    body: { mobileNumber, code },
    skipGlobalHandlers: true,
  });

// ---- Retailer profile ----
export const getMe = () => apiFetch<Retailer>('/retailers/me', { skipGlobalHandlers: true });

export interface RegistrationPayload {
  ownerName: string;
  shopName: string;
  address: string;
  city: string;
  pincode: string;
  gstin?: string;
  shopPhotoUrl?: string;
}

export const updateMe = (payload: RegistrationPayload) =>
  apiFetch<Retailer>('/retailers/me', {
    method: 'PATCH',
    body: payload,
    skipGlobalHandlers: true,
  });

// ---- Catalog ----
export const getCategories = () => apiFetch<Category[]>('/categories', { skipGlobalHandlers: true });

export const getBanners = () => apiFetch<Banner[]>('/banners', { skipGlobalHandlers: true });

export const getProducts = (params?: { categoryId?: string; search?: string; brand?: string }) => {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set('categoryId', params.categoryId);
  if (params?.search) qs.set('search', params.search);
  if (params?.brand) qs.set('brand', params.brand);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<Product[]>(`/products${suffix}`);
};

export const getProduct = (id: string) => apiFetch<Product>(`/products/${id}`);

export const getSchemes = () => apiFetch<Scheme[]>('/schemes');

export const getDeliverySlots = () => apiFetch<DeliverySlot[]>('/delivery-slots');

// ---- Cart ----
export const getCart = () => apiFetch<Cart>('/cart');

export const addCartItem = (productId: string, caseQty: number) =>
  apiFetch<Cart>('/cart/items', { method: 'POST', body: { productId, caseQty } });

export const updateCartItem = (productId: string, caseQty: number) =>
  apiFetch<Cart>(`/cart/items/${productId}`, { method: 'PATCH', body: { caseQty } });

export const removeCartItem = (productId: string) =>
  apiFetch<Cart>(`/cart/items/${productId}`, { method: 'DELETE' });

export const clearCart = () => apiFetch<Cart>('/cart', { method: 'DELETE' });

export const reorder = (orderId: string) =>
  apiFetch<Cart>(`/cart/reorder/${orderId}`, { method: 'POST' });

// ---- Orders ----
export const createOrder = (
  deliverySlotId: string,
  deliveryDate?: string,
  paymentMethod: 'UPI' | 'COD' = 'UPI',
  idempotencyKey?: string,
) => apiFetch<Order>('/orders', { method: 'POST', body: { deliverySlotId, deliveryDate, paymentMethod, idempotencyKey } });

export const getQuickReorder = () =>
  apiFetch<QuickReorder | null>('/orders/quick-reorder');

export type OrderTab = 'active' | 'completed' | 'cancelled';

export const getOrders = (tab?: OrderTab) =>
  apiFetch<Order[]>(`/orders${tab ? `?tab=${tab}` : ''}`);

export const getOrder = (id: string) => apiFetch<Order>(`/orders/${id}`);

// ---- Payment ----
export const getOrderPayment = (orderId: string) =>
  apiFetch<PaymentInfo>(`/orders/${orderId}/payment`);

export const submitUtr = (orderId: string, utr: string, screenshotUrl?: string) =>
  apiFetch<PaymentInfo>(`/orders/${orderId}/payment/utr`, {
    method: 'POST',
    body: { utr, screenshotUrl },
  });

// ---- Notifications ----
export const getNotifications = () => apiFetch<AppNotification[]>('/notifications');

export const getUnreadNotificationCount = () => apiFetch<{ count: number }>('/notifications/unread-count');

export const markNotificationRead = (id: string) =>
  apiFetch<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });

export const markAllNotificationsRead = () =>
  apiFetch<{ success: boolean }>('/notifications/read-all', { method: 'POST' });

// ---- Expiry traceability & claims ----
export const getMyStock = () => apiFetch<MyStockBatch[]>('/expiry/my-stock');

export const getExpiryClaims = () => apiFetch<ExpiryClaim[]>('/expiry/claims');

export const getExpiryClaim = (id: string) => apiFetch<ExpiryClaim>(`/expiry/claims/${id}`);

export const submitExpiryClaim = (batchId: string, requestedQty: number, reason: string, evidenceUrl?: string) =>
  apiFetch<ExpiryClaim>('/expiry/claims', {
    method: 'POST',
    body: { items: [{ batchId, requestedQty }], reason, evidenceUrl },
  });

// ---- Returns & Damaged Goods Claims + Credit Notes ----
export const submitReturn = (orderItemId: string, qty: number, reason: ReturnReason, note?: string, photoUrl?: string) =>
  apiFetch<ReturnRequest>('/returns', { method: 'POST', body: { orderItemId, qty, reason, note, photoUrl } });

export const getReturns = () => apiFetch<ReturnRequest[]>('/returns');

export const getReturn = (id: string) => apiFetch<ReturnRequest>(`/returns/${id}`);

export const getCreditNotes = () => apiFetch<CreditNote[]>('/credit-notes');
