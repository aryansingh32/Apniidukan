// Types mirroring API_CONTRACT.md — kept intentionally close to the raw Prisma-shaped
// JSON the backend returns (no envelope, no re-mapping).

export type RetailerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type AdminRole = "ADMIN" | "OPERATIONS" | "FINANCE" | "SUPER_ADMIN";
export type ProductStatus = "ACTIVE" | "OUT_OF_STOCK" | "INACTIVE";
export type OrderStatus =
  | "PAYMENT_PENDING"
  | "PAYMENT_VERIFICATION"
  | "CONFIRMED"
  | "PICKING"
  | "PACKED"
  | "DISPATCHED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";
export type PaymentStatus =
  | "UNPAID"
  | "UTR_SUBMITTED"
  | "UNDER_REVIEW"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED";
export type SchemeType = "ORDER_VALUE_DISCOUNT" | "BUY_X_GET_Y_FREE";

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  productCount?: number;
}

export interface BulkPriceSlab {
  id: string;
  minCases: number;
  maxCases: number | null;
  pricePerCase: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  categoryName?: string;
  imageUrl: string | null;
  packSize: string;
  unitsPerCase: number;
  mrpPerUnit: number;
  mrpTotalPerCase?: number;
  buyingPricePerCase: number;
  yourRatePerCase?: number;
  profitPerCase?: number;
  marginPercent?: number;
  gstRate: number;
  hsnCode: string;
  sku: string;
  barcode: string;
  status: ProductStatus;
  stockCases: number;
  bulkPriceSlabs?: BulkPriceSlab[];
}

export interface Scheme {
  id: string;
  title: string;
  description: string | null;
  type: SchemeType;
  minOrderValue: number | null;
  discountPercent: number | null;
  flatDiscount: number | null;
  productId: string | null;
  product?: Product | null;
  buyQty: number | null;
  freeQty: number | null;
  startDate: string;
  endDate: string;
  active: boolean;
  imageUrl: string | null;
  maxUsagePerRetailer: number | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaTarget: string | null;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export interface DeliverySlot {
  id: string;
  label: string;
  windowStart: string;
  windowEnd: string;
  cutoffTime: string;
  active: boolean;
}

export interface Retailer {
  id: string;
  mobileNumber: string;
  ownerName: string | null;
  shopName: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  gstin: string | null;
  shopPhotoUrl: string | null;
  status: RetailerStatus;
  rejectionReason: string | null;
  createdAt: string;
  orders?: Order[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  brandSnapshot: string;
  packSizeSnapshot: string;
  caseQty: number;
  freeCaseQty: number;
  pricePerCase: number;
  mrpPerUnit: number;
  unitsPerCase: number;
  gstRate: number;
  lineSubtotal: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  amount: number;
  upiId: string | null;
  utr: string | null;
  screenshotUrl: string | null;
  status: PaymentStatus;
  rejectionReason: string | null;
  verifiedAt: string | null;
  submittedAt: string | null;
  order?: Order;
}

export interface StatusHistoryEntry {
  status: string;
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  tradeDiscount: number;
  schemeDiscount: number;
  gstAmount: number;
  totalAmount: number;
  appliedSchemes?: unknown;
  deliverySlotId: string;
  deliveryDate: string;
  requiresDeliveryOtp: boolean;
  deliveryOtp: string | null;
  deliveryOtpVerifiedAt: string | null;
  status: OrderStatus;
  items?: OrderItem[];
  payment?: Payment;
  deliverySlot?: DeliverySlot;
  statusHistory?: StatusHistoryEntry[];
  retailer?: Retailer;
  retailerId?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  todaysOrders: number;
  pendingPayments: number;
  pendingApprovals: number;
  revenue: number;
  pendingDispatches: number;
  lowStockProducts: Product[];
  totalRetailers: number;
}

// ---- Expiry traceability & claim system ----
// See EXPIRY_SYSTEM_DESIGN.md at the repo root for the design rationale.

export type BatchStatus = "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" | "BLOCKED";
export type ExpiryBucket =
  | "HEALTHY"
  | "INFO_180"
  | "WARNING_90"
  | "WARNING_60"
  | "CRITICAL_30"
  | "CRITICAL_7"
  | "EXPIRED";
export type ExpiryClaimStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "CLOSED";
export type ExpiryClaimRejectionReason =
  | "WRONG_BATCH"
  | "NOT_DELIVERED"
  | "QUANTITY_EXCEEDED"
  | "CLAIM_WINDOW"
  | "EVIDENCE"
  | "DUPLICATE"
  | "POLICY"
  | "SUSPICIOUS";

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  manufacturingDate: string | null;
  expiryDate: string;
  stockInDate: string;
  warehouseRemainingQty: number;
  receivedQty: number;
  costPricePerCase: number | null;
  storageRequirements: string | null;
  status: BatchStatus;
  expiryBucket: ExpiryBucket;
}

export interface ExpiryCenterSummary {
  counts: Record<ExpiryBucket, number>;
  totalBatches: number;
}

export interface ExpiryBucketBatchRow {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  batchNumber: string;
  expiryDate: string;
  bucket: ExpiryBucket;
  status: BatchStatus;
  warehouseRemainingQty: number;
}

export interface RetailerHolding {
  retailerId: string;
  shopName: string | null;
  ownerName: string | null;
  city: string | null;
  remainingQty: number;
  receivedQty: number;
  claimedQty: number;
}

export interface BatchDetail {
  batch: ProductBatch & { product: Product };
  liveBucket: ExpiryBucket;
  distributedTotals: {
    receivedByRetailers: number;
    claimed: number;
    returned: number;
    transferred: number;
    writtenOff: number;
    damaged: number;
    remainingWithRetailers: number;
  };
  retailersHolding: number;
  holdings: RetailerHolding[];
}

export interface ExpiryClaimPolicy {
  id: string;
  claimAllowed: boolean;
  minimumExpiryAtDeliveryDays: number;
  claimWindowAfterExpiryDays: number;
  claimWindowBeforeExpiryDays: number;
  minimumRemainingShelfLifeDays: number;
  requiresPhoto: boolean;
  autoApproveLimitAmount: number;
}

export interface ExpiryClaimItem {
  id: string;
  claimId: string;
  batchId: string;
  productId: string;
  requestedQty: number;
  claimableQtyAtSubmission: number;
  approvedQty: number | null;
  unitCreditAmount: number | null;
  totalCreditAmount: number | null;
  rejectionReasonCode: ExpiryClaimRejectionReason | null;
  batch?: ProductBatch;
}

export interface ExpiryClaim {
  id: string;
  claimNumber: string;
  retailerId: string;
  status: ExpiryClaimStatus;
  flagged: boolean;
  reason: string;
  evidenceUrl: string | null;
  totalRequestedQty: number;
  totalApprovedQty: number | null;
  decisionNote: string | null;
  decidedByAdminId: string | null;
  decidedAt: string | null;
  createdAt: string;
  items: ExpiryClaimItem[];
  retailer?: Retailer;
}
