// Types mirror API_CONTRACT.md exactly. Do not add fields the backend
// doesn't send, and never compute money/margin values client-side —
// every number here is server-computed and just rendered.

export type RetailerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

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
}

export interface VerifyOtpResponse {
  token: string;
  retailer: Retailer;
  isNewRetailer: boolean;
  needsRegistration: boolean;
}

export interface RequestOtpResponse {
  message: string;
  devNote?: string;
  expiresInSeconds: number;
}

export interface Category {
  id: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaTarget: string | null;
  priority: number;
}

export interface BulkPriceSlab {
  minCases: number;
  maxCases: number | null;
  pricePerCase: number;
}

export interface NextSlab {
  minCases: number;
  pricePerCase: number;
}

export interface ActiveFreeGoodsScheme {
  id: string;
  title: string;
  description: string | null;
  buyQty: number;
  freeQty: number;
}

export type ProductStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'INACTIVE';

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  packSize: string;
  unitsPerCase: number;
  mrpPerUnit: number;
  mrpTotalPerCase: number;
  buyingPricePerCase: number;
  yourRatePerCase: number;
  profitPerCase: number;
  marginPercent: number;
  gstRate: number;
  hsnCode: string | null;
  sku: string;
  barcode: string | null;
  status: ProductStatus;
  stockCases: number;
  nextSlab: NextSlab | null;
  bulkPriceSlabs: BulkPriceSlab[];
  activeFreeGoodsScheme: ActiveFreeGoodsScheme | null;
}

export type SchemeType = 'ORDER_VALUE_DISCOUNT' | 'BUY_X_GET_Y_FREE';

export interface Scheme {
  id: string;
  title: string;
  description: string | null;
  type: SchemeType;
  minOrderValue: number | null;
  discountPercent: number | null;
  flatDiscount: number | null;
  productId: string | null;
  buyQty: number | null;
  freeQty: number | null;
  startDate: string;
  endDate: string;
  active: boolean;
  imageUrl: string | null;
  maxUsagePerRetailer: number | null;
  product?: Product | null;
}

export interface DeliverySlot {
  id: string;
  label: string;
  windowStart: string;
  windowEnd: string;
  cutoffTime: string;
}

export interface CartLine {
  productId: string;
  productName: string;
  brand: string;
  packSize: string;
  imageUrl: string | null;
  unitsPerCase: number;
  mrpPerUnit: number;
  caseQty: number;
  freeCaseQty: number;
  pricePerCase: number;
  gstRate: number;
  lineSubtotal: number;
  lineDiscountShare: number;
  taxableValue: number;
  lineGst: number;
  lineTotal: number;
  mrpTotal: number;
  profitTotal: number;
  marginPercent: number;
  appliedFreeGoodsScheme: { id: string; title: string; freeCaseQty: number } | null;
  nextSlab: NextSlab | null;
}

export interface AppliedTradeScheme {
  id: string;
  title: string;
  discountAmount: number;
}

export interface AppliedFreeGoodsScheme {
  id: string;
  title: string;
  productId: string;
  freeCaseQty: number;
  freeValue: number;
}

export interface Upsell {
  schemeTitle: string;
  amountNeeded: number;
}

export interface Cart {
  cartId: string;
  itemCount: number;
  lines: CartLine[];
  subtotal: number;
  tradeDiscount: number;
  schemeDiscount: number;
  gstAmount: number;
  totalAmount: number;
  totalMrpValue: number;
  totalProfit: number;
  appliedTradeScheme: AppliedTradeScheme | null;
  appliedFreeGoodsSchemes: AppliedFreeGoodsScheme[];
  upsell: Upsell | null;
  unavailableProducts?: string[];
}

export interface QuickReorderItem {
  productId: string;
  name: string;
  brand: string;
  caseQty: number;
}

export interface QuickReorder {
  orderId: string;
  orderNumber: string;
  placedAt: string;
  items: QuickReorderItem[];
}

export type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFICATION'
  | 'CONFIRMED'
  | 'PICKING'
  | 'PACKED'
  | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'UTR_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED';

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
}

export interface StatusHistoryEntry {
  status: string;
  note: string | null;
  createdAt: string;
}

export interface AppliedSchemesSummary {
  tradeScheme: AppliedTradeScheme | null;
  freeGoodsSchemes: AppliedFreeGoodsScheme[] | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  tradeDiscount: number;
  schemeDiscount: number;
  gstAmount: number;
  totalAmount: number;
  appliedSchemes: AppliedSchemesSummary | null;
  deliverySlotId: string;
  deliveryDate: string;
  status: OrderStatus;
  items: OrderItem[];
  payment: Payment;
  deliverySlot: DeliverySlot;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
}

export interface PaymentInfo extends Payment {
  payeeName: string;
  upiDeepLink: string;
  orderId?: string;
  orderNumber?: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
