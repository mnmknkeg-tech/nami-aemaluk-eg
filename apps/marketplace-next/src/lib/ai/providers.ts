import type {
  AiProvider,
  AiGenerateParams,
  AiGenerateResult,
  AiJsonResult,
} from './interfaces';

// ─── Manual Provider ───────────────────────────────────────────
// No AI calls. Uses preset-based generation for offline/manual mode.
// This is the default provider. Swap with real providers later.

export class ManualProvider implements AiProvider {
  id = 'manual';
  name = 'Manual (No AI)';
  isAvailable = true;

  async generateText(params: AiGenerateParams): Promise<AiGenerateResult> {
    return {
      text: `Manual mode: ${params.userPrompt}`,
      model: 'manual',
    };
  }

  async generateJson<T = any>(params: AiGenerateParams): Promise<AiJsonResult<T>> {
    // Parse JSON from the user prompt context
    try {
      const data = JSON.parse(params.userPrompt) as T;
      return { data, raw: params.userPrompt, model: 'manual' };
    } catch {
      return { data: {} as T, raw: params.userPrompt, model: 'manual' };
    }
  }
}

// ─── Groq Provider (Future) ────────────────────────────────────
// Uncomment and implement when ready to use Groq API server-side.

export class GroqProvider implements AiProvider {
  id = 'groq';
  name = 'Groq';
  isAvailable = false;

  constructor(private apiKey?: string, private model = 'llama-3.3-70b-versatile') {
    this.isAvailable = !!apiKey;
  }

  async generateText(params: AiGenerateParams): Promise<AiGenerateResult> {
    if (!this.apiKey) throw new Error('Groq API key not configured');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model || this.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
      }),
    });
    const json = await res.json();
    return {
      text: json.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: json.usage?.prompt_tokens || 0,
        completionTokens: json.usage?.completion_tokens || 0,
        cost: 0,
      },
      model: this.model,
    };
  }

  async generateJson<T = any>(params: AiGenerateParams): Promise<AiJsonResult<T>> {
    const result = await this.generateText({
      ...params,
      systemPrompt: `${params.systemPrompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.`,
    });
    let data: T;
    try {
      const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      data = JSON.parse(cleaned) as T;
    } catch {
      data = {} as T;
    }
    return { data, raw: result.text, usage: result.usage, model: result.model };
  }
}

// ─── Provider Factory ──────────────────────────────────────────

export function createProvider(type: 'manual' | 'groq', config?: { apiKey?: string; model?: string }): AiProvider {
  switch (type) {
    case 'groq':
      return new GroqProvider(config?.apiKey, config?.model);
    case 'manual':
    default:
      return new ManualProvider();
  }
}
