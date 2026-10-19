import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تسجيل موقع على الخريطة',
  description: 'سجّل موقعك الخارجي على خريطة من مكانك — بدون نقل بياناتك.',
};

export default function AddListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
