export type Color = { name: string; hex: string };
export type ProductImage = { url: string; color?: string; alt?: string };
export type Badge = "bestseller" | "new";
export type Availability = "in_stock" | "low_stock" | "out_of_stock";

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  sizes: number[];
  colors: Color[];
  images: ProductImage[];
  badges: Badge[];
  popularity: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  availability: Availability;
  stockLeft?: number;
  rating?: { count: number; average: number } | null;
};

export type Review = { id: number; name: string; rating: number; body: string; createdAt: string };

export type PublicSettings = {
  storeName: string;
  currencyCode: string;
  currencySymbol: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  whatsappNumber: string;
  paymentMethods: { cod: boolean; whatsapp: boolean; online: boolean };
  shippingInfo: string;
  showPrices: boolean;
  hero: { images: string[]; title: string; subtitle: string };
  contact: { phone: string; email: string; address: string; instagramUrl: string; facebookUrl: string };
};

export type OrderLine = {
  productId: number; slug: string; name: string; size: number; color: string; qty: number; unitPrice: number; lineTotal: number;
};
export type PublicOrder = {
  code: string; items: OrderLine[]; subtotal: number; deliveryFee: number; total: number; currency: string;
  paymentMethod: "cod" | "whatsapp"; status: string; createdAt: string; customer: { name: string; city: string };
};
