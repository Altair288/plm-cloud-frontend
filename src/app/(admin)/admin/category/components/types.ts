export interface AttributeItem {
  id: string;
  code: string;
  name: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "multi-enum";
  unit?: string;
  version: number;
  isLatest: boolean;
  description?: string;
}

export interface EnumOptionItem {
  id: string;
  value: string;
  label: string;
  color?: string;
  order: number;
}
