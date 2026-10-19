import { StyleProperties, ComponentType, BusinessActivity } from './builder';

export type AiScope = 'element' | 'section' | 'page' | 'website' | 'theme';
export type PatchScope = AiScope;

export type PatchOperationType =
  | 'update_style'
  | 'update_prop'
  | 'update_responsive_style'
  | 'insert_child'
  | 'remove_child'
  | 'replace_node'
  | 'update_theme_token'
  | 'add_interaction'
  | 'add_animation'
  | 'insert_node'
  | 'add_node'
  | 'UPDATE_STYLE'
  | 'UPDATE_PROPS';

export interface PatchOperation {
  op: PatchOperationType;
  targetId?: string;
  path: string; // e.g., "styles.desktop.backgroundColor" or "props.headingText"
  oldValue?: any;
  value: any;
  explanation?: string;
}

export interface StructuredAiPatch {
  id: string;
  requestId?: string;
  targetWebsiteId?: string;
  scope: PatchScope;
  targetComponentId?: string;
  targetComponentName?: string;
  targetNodeIds?: string[];
  userPrompt?: string;
  description?: string;
  summary?: string;
  operations: PatchOperation[];
  impactedComponentIds?: string[];
  diffSummary?: string[];
  estimatedRisk?: 'low' | 'medium' | 'high';
  safetyValidation?: {
    passed: boolean;
    violatesTenantBoundary: boolean;
    containsForbiddenScripts: boolean;
    warnings: string[];
  };
  appliedStatus?: 'pending' | 'previewing' | 'applied' | 'rejected';
  generatedAt?: string;
  createdAt?: string;
}


export interface AiContextResolution {
  scope: AiScope;
  targetNodeId?: string;
  targetNodeType?: ComponentType;
  activity: BusinessActivity;
  themeContext: {
    primaryColor: string;
    fontFamily: string;
  };
  hierarchyPath: string[];
}
