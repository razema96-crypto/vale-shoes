import type { Badge, Color, ProductImage } from "../lib/types";

export type AdminProduct = {
  id: number; slug: string; name: string; description: string; category: string; price: number; compareAtPrice: number | null;
  sizes: number[]; colors: Color[]; images: ProductImage[]; badges: Badge[]; stock: number; popularity: number;
  isDemo: boolean; active: boolean; createdAt: string; updatedAt: string;
};
export type AdminOrder = {
  id: number; code: string;
  customer: { name: string; phone: string; city: string; address: string; notes?: string };
  items: { productId: number; slug: string; name: string; size: number; color: string; qty: number; unitPrice: number; lineTotal: number }[];
  subtotal: number; deliveryFee: number; total: number; currency: string; paymentMethod: string; channel: string;
  status: "new" | "confirmed" | "shipped" | "delivered" | "cancelled"; createdAt: string; updatedAt: string;
};
export type AdminSettingsT = {
  storeName: string; currencyCode: string; currencySymbol: string; deliveryFee: number; freeDeliveryThreshold: number;
  whatsappNumber: string; paymentCodEnabled: boolean; paymentWhatsappEnabled: boolean; shippingInfo: string;
  contactPhone: string; contactEmail: string; contactAddress: string; instagramUrl: string; facebookUrl: string;
  heroImages: string[]; heroTitle: string; heroSubtitle: string; showPrices: boolean;
};
