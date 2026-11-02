import { StructuredAiPatch } from '../../types/ai';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  patch?: StructuredAiPatch;
  applied?: boolean;
  timestamp: string;
}

export interface PromptMasterFormula {
  id: string;
  name: string;
  template: string;
}

export interface FullSiteExample {
  title: string;
  prompt: string;
  style: string;
  badge: string;
}
