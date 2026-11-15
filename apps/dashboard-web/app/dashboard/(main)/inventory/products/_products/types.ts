export type Product = {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category?: string | { name?: string; id?: string };
  imageUrl?: string;
  image_url?: string;
  description?: string;
  isActive?: boolean;
  appActive?: boolean;
  unit?: string;
  colors?: any[];
  sizes?: any[];
  createdAt?: string;
};

export const PRODUCT_SECTION_TABS = [
  { id: 'products', label: 'المنتجات' },
  { id: 'categories', label: 'الفئات' },
  { id: 'brands', label: 'العلامات التجارية' },
  { id: 'variants', label: 'المتغيرات' },
  { id: 'barcode', label: 'الباركود والطباعة' },
];

export type VisibilityMenuState = {
  productId: string;
  x: number;
  y: number;
  buttonHeight: number;
} | null;
