export interface ActivityTemplateMeta {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  icon: string;
  badge: string;
  themeKey: string;
  primaryColor: string;
  description: string;
  tags: string[];
  /** الأنشطة الطبية/الاستشارية تعتمد الحجز لا السلة — يخفي زر الإضافة للسلة في القالب المولَّد. */
  bookingMode?: boolean;
}
