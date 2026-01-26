export type AttributeType = "string" | "number" | "boolean" | "date" | "enum" | "multi-enum";

export interface AttributeItem {
  id: string;
  code: string;
  name: string;
  type: AttributeType;
  unit?: string;
  required?: boolean;
  description?: string;
  
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
  precision?: number;
  
  // Versioning (Keep existing)
  version: number;
  isLatest: boolean;
}

export interface EnumOptionItem {
  id: string;
  value: string;
  label: string;
  color?: string;
  order: number;
}
