import { SectionTemplate } from '../types';

export const authTemplates: SectionTemplate[] = [
  {
    id: 'auth_split_luxury',
    name: 'auth_split_luxury',
    nameAr: 'شاشة تسجيل دخول منقسمة فاخرة (Split Luxury Auth)',
    category: 'auth',
    activity: 'general',
    style: 'luxury',
    wireframeType: 'auth-split',
    descriptionAr:
      'تصميم مقسوم راقي: جهة للصورة الترويجية ومميزات العضوية، وجهة للتبديل السلس بين تسجيل الدخول وإنشاء حساب جديد.',
    tags: ['auth', 'login', 'register', 'دخول', 'تسجيل', 'حساب', 'أعضاء', 'عضوية'],
    rootNodeId: 'tmpl_auth_split_root',
    nodes: {
      tmpl_auth_split_root: {
        id: 'tmpl_auth_split_root',
        name: 'قسم تسجيل الدخول الفاخر',
        type: 'auth',
        category: 'auth',
        parentId: null,
        childrenIds: [],
        props: {
          layout: 'split',
          title: 'أهلاً بك مجدداً في متجرنا',
          subtitle: 'سجل دخولك لمتابعة طلباتك، حجوزاتك، والاستفادة من عروض الأعضاء الحصرية.',
          badge: 'عضويات VIP',
          heroImage:
            'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=1200&auto=format&fit=crop&q=80',
          perks: [
            'متابعة حالة شحن وتوصيل الطلبات لحظة بلحظة',
            'إدارة وتجديد اشتراكات العضوية بنقرة واحدة',
            'خصومات وعروض أسعار خاصة بالمشتركين فقط',
            'دعم فني واستشارات مخصصة عبر واتساب',
          ],
          defaultTab: 'login',
          allowGuest: true,
        },
        styles: {
          desktop: {
            width: '100%',
            backgroundColor: '#ffffff',
            paddingTop: '60px',
            paddingBottom: '60px',
          },
          mobile: {
            paddingTop: '24px',
            paddingBottom: '24px',
          },
        },
      },
    },
  },
  {
    id: 'auth_card_modern',
    name: 'auth_card_modern',
    nameAr: 'بطاقة تسجيل دخول عصرية ومركزية (Modern Center Card)',
    category: 'auth',
    activity: 'general',
    style: 'modern',
    wireframeType: 'auth-card',
    descriptionAr:
      'بطاقة مركزية أنيقة مع تابات سريعة للتبديل بين الدخول وإنشاء الحساب، تدعم الهاتف أو البريد.',
    tags: ['auth', 'login', 'register', 'دخول', 'حساب', 'كارت', 'مركزية'],
    rootNodeId: 'tmpl_auth_card_root',
    nodes: {
      tmpl_auth_card_root: {
        id: 'tmpl_auth_card_root',
        name: 'بطاقة الدخول العصرية',
        type: 'auth',
        category: 'auth',
        parentId: null,
        childrenIds: [],
        props: {
          layout: 'card',
          title: 'حساب العميل',
          subtitle: 'أدخل بياناتك لتسجيل الدخول أو ابدأ رحلتك معنا بحساب جديد',
          badge: 'تسجيل آمن 100%',
          defaultTab: 'login',
          allowGuest: true,
        },
        styles: {
          desktop: {
            width: '100%',
            backgroundColor: '#f8fafc',
            paddingTop: '80px',
            paddingBottom: '80px',
          },
          mobile: {
            paddingTop: '32px',
            paddingBottom: '32px',
          },
        },
      },
    },
  },
  {
    id: 'auth_quick_phone',
    name: 'auth_quick_phone',
    nameAr: 'تسجيل سريع برقم الهاتف والـ OTP (Quick Phone Auth)',
    category: 'auth',
    activity: 'general',
    style: 'clean',
    wireframeType: 'auth-phone',
    descriptionAr:
      'أسرع وأسهل طريقة تسجيل للجمهور: إدخال رقم الهاتف وإرسال رمز التحقق بدون تعقيد كلمات المرور.',
    tags: ['auth', 'phone', 'otp', 'هاتف', 'سريع', 'تحقق', 'دخول'],
    rootNodeId: 'tmpl_auth_phone_root',
    nodes: {
      tmpl_auth_phone_root: {
        id: 'tmpl_auth_phone_root',
        name: 'تسجيل سريع بالهاتف',
        type: 'auth',
        category: 'auth',
        parentId: null,
        childrenIds: [],
        props: {
          layout: 'phone_otp',
          title: 'تسجيل الدخول برقم الهاتف',
          subtitle: 'سنرسل لك رمز تحقق سريع على رقم هاتفك للتأكيد دون الحاجة لكلمة مرور',
          badge: 'تسجيل فوري',
          defaultTab: 'login',
        },
        styles: {
          desktop: {
            width: '100%',
            backgroundColor: '#ffffff',
            paddingTop: '70px',
            paddingBottom: '70px',
          },
          mobile: {
            paddingTop: '28px',
            paddingBottom: '28px',
          },
        },
      },
    },
  },
];
