// ─── Shared report data types ─────────────────────────────────────────────

export interface StatusCount {
  status: string;
  count: number;
  total: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  orders: number;
  revenue: number;
  itemsSold?: number;
  profit?: number;
}

export interface SalesKpis {
  grossRevenue: number;
  netRevenue: number;
  refunds: number;
  totalOrders: number;
  successfulOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  avgOrderValue: number;
  itemsSold: number;
  salesGrowthPct: number;
}

export interface SalesReportData {
  kpis: SalesKpis;
  hourlySales: { hour: number; label: string; orders: number; revenue: number }[];
  dailyTrend: TrendPoint[];
  monthlyTrend: TrendPoint[];
  weeklyComparison: TrendPoint[];
  statusBreakdown: StatusCount[];
  paymentBreakdown: StatusCount[];
}

export interface ProfitLossData {
  summary: {
    grossRevenue: number;
    productCost: number;
    grossProfit: number;
    shippingCost: number;
    discounts: number;
    refunds: number;
    expenses: number;
    courierCost: number;
    netProfit: number;
    grossMarginPct: number;
    netMarginPct: number;
  };
  lines: { category: string; amount: number; kind: 'revenue' | 'expense' | 'profit' }[];
  byProduct: {
    productId: number | null;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  dailyProfit: { date: string; label: string; revenue: number; cost: number; expenses: number; profit: number }[];
  monthlyProfit: { month: string; label: string; revenue: number; cost: number; expenses: number; profit: number }[];
}

export interface ExpenseCategoryRow {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface ExpensesReportData {
  kpis: {
    totalExpenses: number;
    expenseCount: number;
    dailyAverage: number;
    topCategory: string | null;
  };
  byCategory: ExpenseCategoryRow[];
  trend: { date: string; label: string; total: number }[];
  monthlyTrend: { month: string; label: string; total: number }[];
  recent: {
    id: string;
    category: string;
    amount: number;
    expenseDate: string;
    paymentMethod: string;
    notes: string | null;
    description: string | null;
  }[];
}

export interface ProductPerformanceRow {
  productId: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  stockStatus: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  returns: number;
  popularity: number;
}

export interface ProductsReportData {
  kpis: {
    totalProducts: number;
    productsSold: number;
    totalUnitsSold: number;
    totalRevenue: number;
    totalProfit: number;
    totalStockUnits: number;
    stockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    inStockCount: number;
  };
  bestSelling: ProductPerformanceRow[];
  worstSelling: ProductPerformanceRow[];
  mostPopular: ProductPerformanceRow[];
  performance: ProductPerformanceRow[];
  lowStockProducts: ProductPerformanceRow[];
  outOfStockProducts: ProductPerformanceRow[];
  recentlyAdded: ProductPerformanceRow[];
}

export interface CustomerRow {
  customerId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  orders: number;
  totalSpent: number;
  avgOrderValue: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  joinedAt: string | null;
}

export interface CustomersReportData {
  kpis: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    activeCustomers: number;
    totalSpend: number;
    avgLifetimeValue: number;
  };
  topCustomers: CustomerRow[];
  acquisition: { month: string; label: string; newCustomers: number; cumulative: number }[];
  ltvSegments: { segment: string; customerCount: number; avgLtv: number; totalRevenue: number }[];
}

export interface InventoryReportData {
  kpis: {
    totalProducts: number;
    totalStockUnits: number;
    totalStockValue: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    avgStockPerProduct: number;
    cogs: number;
    turnoverRatio: number;
  };
  byWarehouse: {
    id: string;
    name: string;
    isActive: boolean;
    movementsIn: number;
    movementsOut: number;
    netUnits: number;
  }[];
  movements: {
    id: string;
    productId: number | null;
    productName: string;
    movementType: string;
    quantityChange: number;
    stockBefore: number;
    stockAfter: number;
    referenceType: string;
    notes: string | null;
    createdAt: string;
  }[];
  stockInOut: { date: string; label: string; stockIn: number; stockOut: number }[];
  lowStock: ProductPerformanceRow[];
  outOfStock: ProductPerformanceRow[];
}

export interface OrdersReportData {
  kpis: {
    totalOrders: number;
    totalRevenue: number;
    pending: number;
    confirmed: number;
    processing: number;
    packed: number;
    shipped: number;
    delivered: number;
    returned: number;
    cancelled: number;
  };
  byStatus: StatusCount[];
  byPaymentMethod: { method: string; count: number; total: number }[];
  dailyVolume: TrendPoint[];
  recentOrders: {
    id: number;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
  }[];
}

export interface PaymentsReportData {
  kpis: {
    codOrders: number;
    codCollected: number;
    codPending: number;
    cashCollectedToday: number;
    collectionRatePct: number;
  };
  dailyCollection: { date: string; label: string; collected: number; pending: number; orders: number }[];
  cashFlow: { inflow: number; outflow: number; net: number };
  byMethod: { method: string; count: number; total: number; paid: number; pending: number }[];
}

export interface DashboardReportData {
  sales: SalesKpis;
  profit: {
    grossProfit: number;
    netProfit: number;
    netMarginPct: number;
    grossMarginPct: number;
  };
  expenses: number;
  customers: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
  };
  salesTrend: TrendPoint[];
  profitTrend: { key: string; label: string; revenue: number; profit: number; expenses: number }[];
  ordersByStatus: StatusCount[];
  bestSellingProducts: ProductPerformanceRow[];
  customerGrowth: { month: string; label: string; newCustomers: number; cumulative: number }[];
  monthlyComparison: TrendPoint[];
  weeklyComparison: TrendPoint[];
  paymentStatus: StatusCount[];
}

// ─── Generic table / export column helpers ─────────────────────────────────

import type { ReactNode } from 'react';

export interface ReportColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
}
