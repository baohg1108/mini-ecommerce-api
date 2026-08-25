export enum OrderStatus {
  PENDING_CONFIRMATION = 'pending_confirmation',
  PENDING_PAYMENT = 'pending_payment',
  PAID_PENDING_CONFIRMATION = 'paid_pending_confirmation',
  PAYMENT_FAILED = 'payment_failed',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUND_REQUESTED = 'refund_requested',
  REFUNDED = 'refunded',
}
