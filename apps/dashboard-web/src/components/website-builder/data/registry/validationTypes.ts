export type TemplateValidationCode =
  | 'MISSING_ID'
  | 'DUPLICATE_ID'
  | 'INVALID_CATEGORY'
  | 'UNSUPPORTED_SCHEMA'
  | 'MISSING_REQUIRED'
  | 'INVALID_RELATIONSHIP'
  | 'UNKNOWN_TEMPLATE';

export interface ValidationError {
  code: TemplateValidationCode;
  message: string;
  templateId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
