export type AttributeType = "string" | "number" | "boolean" | "date" | "enum" | "multi-enum";

export interface AttributeItem {
  id: string;
  code: string;
  name: string;
  type: AttributeType;
  unit?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string | number | boolean;
  
  // Frontend/Display properties
  hidden?: boolean;
  readonly?: boolean;
  
  // Backend/Search properties
  searchable?: boolean;
  unique?: boolean;

  // Constraints (Simplified for demo)
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  
  // New: Advanced Constraints
  trueLabel?: string;
  falseLabel?: string;
  constraintMode?: 'none' | 'list' | 'range';
  renderType?: 'text' | 'color' | 'image'; // For Enums
  rangeConfig?: {
    min: number;
    max: number;
    step?: number;
  };

  // Versioning (Keep existing)
  version: number;
  isLatest: boolean;

  // System info
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
}

export interface EnumOptionItem {
  id: string;
  code: string;
  value: string;
  label: string;
  color?: string;
  order: number;
  image?: string;
  description?: string;
}
