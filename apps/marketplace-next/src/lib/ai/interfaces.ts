// ─── AI Provider Interface ────────────────────────────────────
// All AI providers must implement this interface.
// This allows swapping providers (Groq, OpenAI, Anthropic, local) without
// changing any application code.

export interface AiProvider {
  id: string;
  name: string;
  isAvailable: boolean;

  generateText(params: AiGenerateParams): Promise<AiGenerateResult>;
  generateJson<T = any>(params: AiGenerateParams): Promise<AiJsonResult<T>>;
  streamText?(params: AiGenerateParams): AsyncGenerator<string, void, unknown>;
}

export interface AiGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  context?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AiGenerateResult {
  text: string;
  usage?: { promptTokens: number; completionTokens: number; cost: number };
  model: string;
}

export interface AiJsonResult<T = any> {
  data: T;
  raw: string;
  usage?: { promptTokens: number; completionTokens: number; cost: number };
  model: string;
}

// ─── AI Service Layer ──────────────────────────────────────────
// Abstraction over providers. Application code only uses this.

export interface AiService {
  provider: AiProvider;

  // Theme generation
  generateTheme(params: ThemeGenerationParams): Promise<ThemeGenerationResult>;

  // Content generation
  generateContent(params: ContentGenerationParams): Promise<ContentGenerationResult>;

  // SEO generation
  generateSeo(params: SeoGenerationParams): Promise<SeoGenerationResult>;

  // Image generation (future)
  generateImage?(params: ImageGenerationParams): Promise<ImageGenerationResult>;

  // Business analysis
  analyzeBusiness(params: BusinessAnalysisParams): Promise<BusinessAnalysisResult>;

  // Component generation
  generateComponent?(params: ComponentGenerationParams): Promise<ComponentGenerationResult>;

  // Chat-based iterative design
  chat(params: ChatParams): Promise<ChatResult>;

  // Visual edit (element-level)
  visualEdit?(params: VisualEditParams): Promise<VisualEditResult>;
}

// ─── Generation Parameters & Results ───────────────────────────

export interface ThemeGenerationParams {
  activityId: string;
  shopName: string;
  shopDescription?: string;
  stylePreset?: string;
  locale?: string;
}

export interface ThemeGenerationResult {
  designTokens: any;
  brandIdentity: any;
  pageSchema: any;
}

export interface ContentGenerationParams {
  type: 'page' | 'section' | 'text' | 'blog' | 'product-description' | 'meta';
  prompt: string;
  context?: Record<string, any>;
  locale?: string;
}

export interface ContentGenerationResult {
  content: string | Record<string, any>;
  suggestions?: string[];
}

export interface SeoGenerationParams {
  pageContent: string;
  pageType: string;
  locale?: string;
  targetKeywords?: string[];
}

export interface SeoGenerationResult {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  schemaMarkup?: Record<string, any>;
  suggestions: string[];
}

export interface ImageGenerationParams {
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
}

export interface ImageGenerationResult {
  url: string;
  alt: string;
}

export interface BusinessAnalysisParams {
  shopId: string;
  shopName: string;
  activityId: string;
  shopDescription?: string;
}

export interface BusinessAnalysisResult {
  industry: string;
  competitors: string[];
  recommendations: string[];
  suggestedSections: string[];
  suggestedPages: string[];
  targetAudience: string;
}

export interface ComponentGenerationParams {
  componentType: string;
  prompt: string;
  locale?: string;
}

export interface ComponentGenerationResult {
  config: Record<string, any>;
  content: Record<string, any>;
}

export interface ChatParams {
  shopId: string;
  message: string;
  context?: {
    currentPage?: string;
    locale?: string;
    activityId?: string;
    selectedSectionId?: string;
  };
}

export interface ChatResult {
  reply: string;
  designTokens?: any;
  pageSchema?: any;
  brandIdentity?: any;
  applied: boolean;
}

export interface VisualEditParams {
  shopId: string;
  componentName: string;
  elementInspection: any;
  userPrompt: string;
  locale?: string;
}

export interface VisualEditResult {
  reply: string;
  change: {
    component: string;
    changes: Record<string, any>;
    contentChanges?: Record<string, string>;
  } | null;
  applied: boolean;
}

// ─── Prompt Manager ────────────────────────────────────────────
// Centralized prompt templates. Swappable, versionable, testable.

export interface PromptTemplate {
  id: string;
  version: string;
  system: string;
  user: (params: Record<string, any>) => string;
}

export interface PromptManager {
  get(templateId: string): PromptTemplate;
  register(template: PromptTemplate): void;
  list(): string[];
}

// ─── Generation Pipeline ───────────────────────────────────────
// Orchestrates: prompt → provider → validation → post-processing

export interface GenerationPipeline<TInput, TOutput> {
  id: string;
  execute(input: TInput): Promise<TOutput>;
  validate?(output: any): boolean;
  postProcess?(output: any): TOutput;
}

// ─── Future Agent System (Interfaces Only) ────────────────────

export interface AgentCapability {
  type: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

export interface Agent {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  memory?: AgentMemory;
}

export interface AgentMemory {
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  clear(): Promise<void>;
}

export interface AgentConversation {
  id: string;
  agentId: string;
  messages: ConversationMessage[];
  context: Record<string, any>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCall?: {
    name: string;
    args: Record<string, any>;
    result?: any;
  };
}

export interface ToolCallingLayer {
  tools: ToolDefinition[];
  callTool(name: string, args: Record<string, any>): Promise<any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}
