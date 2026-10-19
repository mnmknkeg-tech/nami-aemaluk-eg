import type { PromptTemplate, PromptManager } from './interfaces';

// ─── Prompt Templates ─────────────────────────────────────────
// All AI prompt templates live here. Versioned, testable, swappable.

const templates: Record<string, PromptTemplate> = {};

function register(t: PromptTemplate) {
  templates[t.id] = t;
}

// ─── Theme Generation ─────────────────────────────────────────

register({
  id: 'theme-generation',
  version: '1.0.0',
  system: `You are an expert web designer and brand strategist.
You generate JSON-only responses for website themes.
Never output HTML, CSS, or JavaScript. Only JSON data.
The JSON must follow the DesignTokens and PageSchema structures exactly.`,
  user: (p) => `Generate a complete website theme for:
- Business: ${p.shopName}
- Activity: ${p.activityId}
- Description: ${p.shopDescription || 'N/A'}
- Style: ${p.stylePreset || 'modern'}
- Language: ${p.locale || 'ar'}

Return JSON with:
1. designTokens: colors, typography, spacing, radius, shadow, animation, buttonStyle, cardStyle
2. brandIdentity: brandName, tagline, description, colors, typography, stylePreset
3. pageSchema: sections array with type, layout, title, visible, content`,
});

// ─── Content Generation ────────────────────────────────────────

register({
  id: 'content-generation',
  version: '1.0.0',
  system: `You are a professional content writer for business websites.
Generate compelling, SEO-friendly content in the requested language.
Return JSON only.`,
  user: (p) => `Generate ${p.type} content for:
- Prompt: ${p.prompt}
- Context: ${JSON.stringify(p.context || {})}
- Language: ${p.locale || 'ar'}

Return JSON with appropriate content fields.`,
});

// ─── SEO Generation ───────────────────────────────────────────

register({
  id: 'seo-generation',
  version: '1.0.0',
  system: `You are an SEO expert. Generate optimized meta tags, keywords, and schema markup.
Return JSON only.`,
  user: (p) => `Generate SEO for:
- Page content: ${p.pageContent}
- Page type: ${p.pageType}
- Target keywords: ${p.targetKeywords?.join(', ') || 'auto'}
- Language: ${p.locale || 'ar'}

Return JSON: { metaTitle, metaDescription, keywords[], schemaMarkup, suggestions[] }`,
});

// ─── Business Analysis ────────────────────────────────────────

register({
  id: 'business-analysis',
  version: '1.0.0',
  system: `You are a business analyst and digital marketing strategist.
Analyze the business and provide actionable recommendations.
Return JSON only.`,
  user: (p) => `Analyze this business:
- Name: ${p.shopName}
- Activity: ${p.activityId}
- Description: ${p.shopDescription || 'N/A'}

Return JSON: { industry, competitors[], recommendations[], suggestedSections[], suggestedPages[], targetAudience }`,
});

// ─── Chat-based Design ────────────────────────────────────────

register({
  id: 'builder-chat',
  version: '1.0.0',
  system: `You are an AI website design assistant.
Help the user customize their website through natural language.
Return JSON with optional designTokens, pageSchema, or brandIdentity changes.
Never output code. Only JSON data.`,
  user: (p) => `User message: ${p.message}
Current page: ${p.context?.currentPage || 'home'}
Activity: ${p.context?.activityId || 'general'}
Language: ${p.context?.locale || 'ar'}

Return JSON: { reply, designTokens?, pageSchema?, brandIdentity?, applied }`,
});

// ─── Visual Edit ─────────────────────────────────────────────

register({
  id: 'visual-edit',
  version: '1.0.0',
  system: `You are an AI visual editor assistant.
The user wants to modify a specific element on their website.
Return JSON-only changes. Never output CSS or JS code.`,
  user: (p) => `User request: ${p.userPrompt}
Component: ${p.componentName}
Element inspection: ${JSON.stringify(p.elementInspection || {})}
Language: ${p.locale || 'ar'}

Return JSON: { reply, change: { component, changes{}, contentChanges? }, applied }`,
});

// ─── Prompt Manager Implementation ────────────────────────────

export const promptManager: PromptManager = {
  get(templateId: string): PromptTemplate {
    const t = templates[templateId];
    if (!t) throw new Error(`Prompt template not found: ${templateId}`);
    return t;
  },
  register(template: PromptTemplate) {
    register(template);
  },
  list(): string[] {
    return Object.keys(templates);
  },
};

export { templates };
