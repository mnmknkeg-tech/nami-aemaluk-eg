import { SectionTemplate } from '../types';

const node = (
  id: string,
  name: string,
  type: string,
  parentId: string | null,
  props: Record<string, unknown> = {},
  styles = {}
): any => ({
  id,
  name,
  type,
  category: type === 'heading' || type === 'paragraph' ? 'typography' : 'section',
  parentId,
  childrenIds: [],
  props,
  styles: { desktop: styles },
});

export const supplementalTemplates: SectionTemplate[] = [
  {
    id: 'steps-process-cards',
    name: 'steps-process-cards',
    nameAr: 'خطوات العمل - أربع مراحل واضحة',
    category: 'steps',
    activity: 'general',
    style: 'modern',
    wireframeType: 'steps',
    descriptionAr: 'قسم مرتب يشرح رحلة العميل خطوة بخطوة.',
    tags: ['خطوات', 'طريقة العمل', 'مراحل'],
    rootNodeId: 'steps_root',
    nodes: {
      steps_root: {
        ...node(
          'steps_root',
          'خطوات العمل',
          'steps',
          null,
          {},
          { width: '100%', paddingTop: '64px', paddingBottom: '64px', backgroundColor: '#ffffff' }
        ),
        childrenIds: ['steps_title', 'steps_grid'],
      },
      steps_title: {
        ...node(
          'steps_title',
          'عنوان الخطوات',
          'heading',
          'steps_root',
          { text: 'كيف نعمل معك؟' },
          { textAlign: 'center', fontSize: '32px', fontWeight: '800', marginBottom: '32px' }
        ),
      },
      steps_grid: {
        ...node(
          'steps_grid',
          'شبكة الخطوات',
          'grid',
          'steps_root',
          {},
          { display: 'grid', gridColumns: 'repeat(4, minmax(0, 1fr))', gap: '20px' }
        ),
        childrenIds: ['step_1', 'step_2', 'step_3', 'step_4'],
      },
      step_1: {
        ...node(
          'step_1',
          'الخطوة الأولى',
          'card',
          'steps_grid',
          { title: '01', description: 'أرسل طلبك وتحدث مع فريقنا.' },
          {
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '20px',
            paddingRight: '20px',
            borderRadius: '16px',
            backgroundColor: '#f8fafc',
          }
        ),
      },
      step_2: {
        ...node(
          'step_2',
          'الخطوة الثانية',
          'card',
          'steps_grid',
          { title: '02', description: 'نراجع احتياجك ونقترح الحل المناسب.' },
          {
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '20px',
            paddingRight: '20px',
            borderRadius: '16px',
            backgroundColor: '#f8fafc',
          }
        ),
      },
      step_3: {
        ...node(
          'step_3',
          'الخطوة الثالثة',
          'card',
          'steps_grid',
          { title: '03', description: 'ننفذ العمل بوضوح ومتابعة مستمرة.' },
          {
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '20px',
            paddingRight: '20px',
            borderRadius: '16px',
            backgroundColor: '#f8fafc',
          }
        ),
      },
      step_4: {
        ...node(
          'step_4',
          'الخطوة الرابعة',
          'card',
          'steps_grid',
          { title: '04', description: 'تستلم النتيجة وتبدأ الاستفادة.' },
          {
            paddingTop: '24px',
            paddingBottom: '24px',
            paddingLeft: '20px',
            paddingRight: '20px',
            borderRadius: '16px',
            backgroundColor: '#f8fafc',
          }
        ),
      },
    },
  },
  {
    id: 'logos-trusted-row',
    name: 'logos-trusted-row',
    nameAr: 'شريط الشركاء والعلامات التجارية',
    category: 'logos',
    activity: 'general',
    style: 'minimal',
    wireframeType: 'logos',
    descriptionAr: 'مساحة مرنة لعرض شعارات العملاء والشركاء.',
    tags: ['شركاء', 'شعارات', 'ثقة'],
    rootNodeId: 'logos_root',
    nodes: {
      logos_root: {
        ...node(
          'logos_root',
          'شعارات الشركاء',
          'logos',
          null,
          { title: 'نثق بشراكاتنا' },
          {
            width: '100%',
            paddingTop: '48px',
            paddingBottom: '48px',
            backgroundColor: '#f8fafc',
            textAlign: 'center',
          }
        ),
      },
    },
  },
  {
    id: 'mobile-footer-actions',
    name: 'mobile-footer-actions',
    nameAr: 'شريط تنقل سفلي للموبايل',
    category: 'mobile_footer',
    activity: 'general',
    style: 'clean',
    wireframeType: 'mobile_footer',
    descriptionAr: 'أزرار تنقل سريعة ومناسبة للشاشات الصغيرة.',
    tags: ['موبايل', 'تنقل', 'فوتر'],
    rootNodeId: 'mobile_footer_root',
    nodes: {
      mobile_footer_root: {
        ...node(
          'mobile_footer_root',
          'فوتر الموبايل',
          'mobile_footer',
          null,
          { items: ['الرئيسية', 'الخدمات', 'تواصل معنا'] },
          {
            width: '100%',
            paddingTop: '16px',
            paddingBottom: '16px',
            backgroundColor: '#0f172a',
            textColor: '#ffffff',
            position: 'sticky',
            bottom: '0',
          }
        ),
      },
    },
  },
];
