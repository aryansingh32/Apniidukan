import React from 'react';
import type { OrderStatus, PaymentStatus } from '@/lib/types';
import { Badge } from './Badge';

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_VERIFICATION: 'Payment Verification',
  CONFIRMED: 'Confirmed',
  PICKING: 'Picking',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const ORDER_STATUS_TONE: Record<OrderStatus, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  PAYMENT_PENDING: 'warning',
  PAYMENT_VERIFICATION: 'warning',
  CONFIRMED: 'primary',
  PICKING: 'primary',
  PACKED: 'primary',
  DISPATCHED: 'primary',
  OUT_FOR_DELIVERY: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Badge label={ORDER_STATUS_LABEL[status]} tone={ORDER_STATUS_TONE[status]} />;
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  UTR_SUBMITTED: 'Verification Pending',
  UNDER_REVIEW: 'Verification Pending',
  PAYMENT_APPROVED: 'Payment Verified',
  PAYMENT_REJECTED: 'Payment Rejected',
  COD_PENDING: 'Pay on Delivery',
  COD_COLLECTED: 'Cash Collected',
};

const PAYMENT_STATUS_TONE: Record<PaymentStatus, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  UNPAID: 'neutral',
  UTR_SUBMITTED: 'warning',
  UNDER_REVIEW: 'warning',
  PAYMENT_APPROVED: 'success',
  PAYMENT_REJECTED: 'danger',
  COD_PENDING: 'warning',
  COD_COLLECTED: 'success',
};

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <Badge label={PAYMENT_STATUS_LABEL[status]} tone={PAYMENT_STATUS_TONE[status]} />;
}

export { ORDER_STATUS_LABEL };
