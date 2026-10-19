/**
 * Page Schema — JSON-only contract between AI and Frontend.
 *
 * The AI NEVER generates code. It generates JSON that the frontend
 * renders into pre-built React components. This prevents XSS,
 * code injection, and all script-based attacks.
 *
 * ┌──────┐     JSON      ┌───────────┐    React     ┌──────┐
 * │  AI  │ ──────────▶  │  Frontend  │ ──────────▶ │ DOM  │
 * └──────┘              └───────────┘              └──────┘
 */

// ─── Design Tokens ─────────────────────────────────────────────

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    headerBg: string;
    headerText: string;
    footerBg: string;
    footerText: string;
  };
  typography: {
    fontFamily: string;
    headingFamily: string;
    headingSize: 'sm' | 'base' | 'lg' | 'xl';
    textSize: 'xs' | 'sm' | 'base' | 'lg';
    fontWeight: 'normal' | 'medium' | 'bold' | 'black';
  };
  spacing: {
    sectionGap: 'compact' | 'normal' | 'loose';
    itemGap: 'tight' | 'normal' | 'wide';
    pagePadding: 'none' | 'sm' | 'md' | 'lg';
  };
  radius: {
    card: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    button: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    input: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  };
  shadow: {
    card: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    button: 'none' | 'sm' | 'md';
  };
  animation: {
    entrance: 'none' | 'fade' | 'slide-up' | 'slide-right' | 'scale';
    duration: 'fast' | 'normal' | 'slow';
  };
  buttonStyle: {
    shape: 'solid' | 'outline' | 'ghost' | 'gradient';
    size: 'sm' | 'md' | 'lg';
    fullWidth: boolean;
  };
  cardStyle: {
    layout: 'standard' | 'overlay' | 'minimal' | 'glass';
    imageAspect: 'square' | 'portrait' | 'landscape';
    showShadow: boolean;
    showBorder: boolean;
  };
}

// ─── Section Types ─────────────────────────────────────────────

export type SectionType =
  | 'hero'
  | 'features'
  | 'products'
  | 'categories'
  | 'testimonials'
  | 'gallery'
  | 'faq'
  | 'cta'
  | 'contact'
  | 'about'
  | 'services'
  | 'projects'
  | 'booking'
  | 'providers'
  | 'menu'
  | 'map'
  | 'stats'
  | 'team'
  | 'newsletter'
  | 'social'
  | 'custom';

export type SectionLayout = 'grid' | 'list' | 'carousel' | 'masonry' | 'full-width' | 'split';

export interface SectionContentField {
  key: string;
  value: string;
}

export interface PageSection {
  id: string;
  type: SectionType;
  layout?: SectionLayout;
  title?: string;
  subtitle?: string;
  visible: boolean;
  content?: Record<string, any>;
  style?: {
    background?: string;
    padding?: 'compact' | 'normal' | 'loose';
    columns?: number;
    itemsPerRow?: number;
  };
}

export interface PageSchema {
  version: string;
  sections: PageSection[];
}

// ─── Brand Identity (AI Brand Generator output) ────────────────

export interface BrandIdentity {
  brandName: string;
  tagline: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    headingFamily: string;
    fontWeight: string;
  };
  stylePreset: StylePreset;
  iconSet: string;
  cardStyle: 'standard' | 'overlay' | 'minimal' | 'glass';
  buttonShape: 'solid' | 'outline' | 'ghost' | 'gradient';
  bannerText: string;
  heroText: string;
  suggestedImages: string[];
}

// ─── Style Presets ─────────────────────────────────────────────

export type StylePreset =
  | 'modern'
  | 'luxury'
  | 'minimal'
  | 'glass'
  | 'dark'
  | 'elegant'
  | 'corporate'
  | 'playful'
  | 'bold';

export const STYLE_PRESETS: StylePreset[] = [
  'modern', 'luxury', 'minimal', 'glass', 'dark', 'elegant', 'corporate', 'playful', 'bold',
];

// ─── Theme Generation Request ──────────────────────────────────

export interface GenerateThemeRequest {
  activityId: string;
  shopName: string;
  shopDescription?: string;
  stylePreset?: StylePreset;
  locale?: string;
}

export interface GenerateThemeResponse {
  designTokens: DesignTokens;
  brandIdentity: Partial<BrandIdentity>;
  pageSchema: PageSchema;
}

// ─── Page Generation Request ───────────────────────────────────

export interface GeneratePagesRequest {
  activityId: string;
  shopName: string;
  shopDescription?: string;
  locale?: string;
  pages?: string[];
}

export interface GeneratePagesResponse {
  pages: Record<string, PageSchema>;
}

// ─── Brand Generation Request ──────────────────────────────────

export interface GenerateBrandRequest {
  activityId: string;
  shopName: string;
  shopDescription?: string;
  locale?: string;
}

// ─── Chat-based Builder Request ────────────────────────────────

export interface BuilderChatRequest {
  shopId: string;
  message: string;
  context?: {
    currentPage?: string;
    locale?: string;
    activityId?: string;
    selectedSectionId?: string;
  };
}

export interface BuilderChatResponse {
  reply: string;
  designTokens?: Partial<DesignTokens>;
  pageSchema?: Partial<PageSchema>;
  brandIdentity?: Partial<BrandIdentity>;
  applied: boolean;
}

// ─── Activity-specific default page templates ──────────────────

export interface ActivityPageTemplate {
  activityId: string;
  pages: Record<string, PageSchema>;
  defaultDesignTokens: DesignTokens;
}

// ─── Default Design Tokens ─────────────────────────────────────

export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    primary: '#00E5FF',
    secondary: '#BD00FF',
    accent: '#0F172A',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
    textMuted: '#64748B',
    headerBg: '#FFFFFF',
    headerText: '#0F172A',
    footerBg: '#0F172A',
    footerText: '#CBD5E1',
  },
  typography: {
    fontFamily: 'Cairo',
    headingFamily: 'Cairo',
    headingSize: 'xl',
    textSize: 'sm',
    fontWeight: 'bold',
  },
  spacing: {
    sectionGap: 'normal',
    itemGap: 'normal',
    pagePadding: 'md',
  },
  radius: {
    card: '2xl',
    button: '2xl',
    input: 'xl',
  },
  shadow: {
    card: 'md',
    button: 'sm',
  },
  animation: {
    entrance: 'fade',
    duration: 'normal',
  },
  buttonStyle: {
    shape: 'solid',
    size: 'md',
    fullWidth: false,
  },
  cardStyle: {
    layout: 'standard',
    imageAspect: 'square',
    showShadow: true,
    showBorder: true,
  },
};
