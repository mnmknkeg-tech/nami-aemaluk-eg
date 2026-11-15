export interface AvailableProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  stock?: number;
}

export interface BundleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CustomBundleSection {
  id: string;
  title: string;
  minSelect: number;
  maxSelect: number;
  items: BundleItem[];
}
