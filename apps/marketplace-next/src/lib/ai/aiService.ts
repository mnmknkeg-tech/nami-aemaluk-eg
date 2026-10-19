import type {
  AiService,
  AiProvider,
  ThemeGenerationParams,
  ThemeGenerationResult,
  ContentGenerationParams,
  ContentGenerationResult,
  SeoGenerationParams,
  SeoGenerationResult,
  BusinessAnalysisParams,
  BusinessAnalysisResult,
  ChatParams,
  ChatResult,
  VisualEditParams,
  VisualEditResult,
  GenerationPipeline,
} from './interfaces';
import { promptManager } from './promptManager';
import { createProvider } from './providers';
import { DEFAULT_DESIGN_TOKENS } from '@/types/pageSchema';

// ─── AI Service Implementation ────────────────────────────────
// Currently uses manual provider (preset-based).
// To enable AI: set AI_PROVIDER=groq and AI_API_KEY in env.

class AiServiceImpl implements AiService {
  provider: AiProvider;

  constructor(provider?: AiProvider) {
    const type = (process.env.AI_PROVIDER as 'manual' | 'groq') || 'manual';
    const apiKey = process.env.AI_API_KEY;
    this.provider = provider || createProvider(type, { apiKey });
  }

  async generateTheme(params: ThemeGenerationParams): Promise<ThemeGenerationResult> {
    const template = promptManager.get('theme-generation');
    const userPrompt = template.user(params);

    if (this.provider.id === 'manual') {
      return this.fallbackTheme(params);
    }

    const result = await this.provider.generateJson<ThemeGenerationResult>({
      systemPrompt: template.system,
      userPrompt,
      context: params,
    });
    return result.data;
  }

  async generateContent(params: ContentGenerationParams): Promise<ContentGenerationResult> {
    const template = promptManager.get('content-generation');
    const result = await this.provider.generateText({
      systemPrompt: template.system,
      userPrompt: template.user(params),
      context: params,
    });
    return { content: result.text };
  }

  async generateSeo(params: SeoGenerationParams): Promise<SeoGenerationResult> {
    const template = promptManager.get('seo-generation');
    const result = await this.provider.generateJson<SeoGenerationResult>({
      systemPrompt: template.system,
      userPrompt: template.user(params),
      context: params,
    });
    return result.data;
  }

  async analyzeBusiness(params: BusinessAnalysisParams): Promise<BusinessAnalysisResult> {
    const template = promptManager.get('business-analysis');
    const result = await this.provider.generateJson<BusinessAnalysisResult>({
      systemPrompt: template.system,
      userPrompt: template.user(params),
      context: params,
    });
    return result.data;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const template = promptManager.get('builder-chat');
    const result = await this.provider.generateJson<ChatResult>({
      systemPrompt: template.system,
      userPrompt: template.user(params),
      context: params,
    });
    return result.data;
  }

  async visualEdit(params: VisualEditParams): Promise<VisualEditResult> {
    const template = promptManager.get('visual-edit');
    const result = await this.provider.generateJson<VisualEditResult>({
      systemPrompt: template.system,
      userPrompt: template.user(params),
      context: params,
    });
    return result.data;
  }

  // ─── Fallback: Preset-based theme (no AI) ───────────────────
  private fallbackTheme(params: ThemeGenerationParams): ThemeGenerationResult {
    const presets: Record<string, any> = {
      modern: {
        primary: '#00E5FF', secondary: '#BD00FF', accent: '#0F172A',
        background: '#FFFFFF', surface: '#F8FAFC',
      },
      luxury: {
        primary: '#D4AF37', secondary: '#1A1A1A', accent: '#2C2C2C',
        background: '#0A0A0A', surface: '#1A1A1A',
      },
      minimal: {
        primary: '#000000', secondary: '#64748B', accent: '#3B82F6',
        background: '#FFFFFF', surface: '#F8FAFC',
      },
      glass: {
        primary: '#00E5FF', secondary: '#BD00FF', accent: '#FFFFFF',
        background: '#F0F4F8', surface: 'rgba(255,255,255,0.7)',
      },
      dark: {
        primary: '#00E5FF', secondary: '#BD00FF', accent: '#FFFFFF',
        background: '#0A0A0A', surface: '#141414',
      },
      elegant: {
        primary: '#7C3AED', secondary: '#0F172A', accent: '#E0E7FF',
        background: '#FAFAFA', surface: '#F5F3FF',
      },
      corporate: {
        primary: '#2563EB', secondary: '#1E40AF', accent: '#3B82F6',
        background: '#FFFFFF', surface: '#F1F5F9',
      },
      playful: {
        primary: '#F59E0B', secondary: '#EF4444', accent: '#8B5CF6',
        background: '#FFFBEB', surface: '#FEF3C7',
      },
      bold: {
        primary: '#DC2626', secondary: '#000000', accent: '#FBBF24',
        background: '#FFFFFF', surface: '#FEF2F2',
      },
    };

    const preset = presets[params.stylePreset || 'modern'] || presets.modern;

    return {
      designTokens: {
        ...DEFAULT_DESIGN_TOKENS,
        colors: {
          ...DEFAULT_DESIGN_TOKENS.colors,
          primary: preset.primary,
          secondary: preset.secondary,
          accent: preset.accent,
          background: preset.background,
          surface: preset.surface,
        },
      },
      brandIdentity: {
        brandName: params.shopName,
        tagline: '',
        description: params.shopDescription || '',
        stylePreset: (params.stylePreset as any) || 'modern',
      },
      pageSchema: {
        version: '1.0.0',
        sections: [
          { id: 'hero', type: 'hero', visible: true, title: params.shopName },
          { id: 'features', type: 'features', visible: true, title: 'مميزاتنا' },
          { id: 'products', type: 'products', visible: true, title: 'منتجاتنا' },
          { id: 'about', type: 'about', visible: true, title: 'من نحن' },
          { id: 'contact', type: 'contact', visible: true, title: 'تواصل معنا' },
        ],
      },
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────

let _instance: AiService | null = null;

export function getAiService(): AiService {
  if (!_instance) {
    _instance = new AiServiceImpl();
  }
  return _instance;
}

export { AiServiceImpl };
