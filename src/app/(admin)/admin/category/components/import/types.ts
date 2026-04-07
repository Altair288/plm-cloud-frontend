// // ================= 导入流程步骤 =================
// export type ImportStep = 0 | 1 | 2 | 3;
// export type StepStatus = 'wait' | 'process' | 'finish' | 'error';

// export const IMPORT_STEPS = [
//   { title: '上传文件' },
//   { title: '配置选项' },
//   { title: '预检验证' },
//   { title: '执行导入' },
// ] as const;

// // ================= 编码策略 =================
// export type CodeStrategy = 'EXCEL' | 'SYSTEM';

// export interface ImportConfig {
//   codeStrategy: CodeStrategy;     // 编码来源策略
//   skipDuplicateCode: boolean;     // 跳过重复编码
//   updateExisting: boolean;        // 更新已存在的分类
//   parentId: string | null;        // 导入目标父节点
// }

// export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
//   codeStrategy: 'SYSTEM',
//   skipDuplicateCode: true,
//   updateExisting: false,
//   parentId: null,
// };

// // ================= Excel 解析行 =================
// export interface ImportRow {
//   rowIndex: number;
//   code: string;
//   name: string;
//   parentCode: string;
//   level: number;
//   description?: string;
//   status?: string;
// }

// // ================= Dry-Run 验证结果 =================
// export type ValidationSeverity = 'success' | 'warning' | 'error';

// export interface ValidationIssue {
//   rowIndex: number;
//   field: string;
//   severity: ValidationSeverity;
//   message: string;
// }

// export interface DryRunResult {
//   totalRows: number;
//   validRows: number;
//   warningRows: number;
//   errorRows: number;
//   newCategories: number;
//   updateCategories: number;
//   skippedRows: number;
//   issues: ValidationIssue[];
//   generatedCodes?: Array<{ rowIndex: number; originalCode: string; generatedCode: string }>;
// }

// // ================= 执行结果 =================
// export interface ImportResult {
//   success: boolean;
//   totalProcessed: number;
//   created: number;
//   updated: number;
//   skipped: number;
//   failed: number;
//   errors: Array<{ rowIndex: number; message: string }>;
// }

// // ================= Mock =================

// export const MOCK_PARSED_ROWS: ImportRow[] = [
//   { rowIndex: 1, code: '', name: '电子元器件', parentCode: '', level: 1, description: '电子类物料根分类' },
//   { rowIndex: 2, code: '', name: '电阻', parentCode: '电子元器件', level: 2, description: '各类电阻' },
//   { rowIndex: 3, code: '', name: '贴片电阻', parentCode: '电阻', level: 3, description: 'SMD电阻' },
//   { rowIndex: 4, code: '', name: '插件电阻', parentCode: '电阻', level: 3 },
//   { rowIndex: 5, code: '', name: '电容', parentCode: '电子元器件', level: 2, description: '各类电容' },
//   { rowIndex: 6, code: '', name: '陶瓷电容', parentCode: '电容', level: 3 },
//   { rowIndex: 7, code: '', name: '电解电容', parentCode: '电容', level: 3 },
//   { rowIndex: 8, code: '', name: '集成电路', parentCode: '电子元器件', level: 2 },
//   { rowIndex: 9, code: '', name: 'MCU', parentCode: '集成电路', level: 3, description: '微控制器' },
//   { rowIndex: 10, code: '', name: '连接器', parentCode: '电子元器件', level: 2 },
//   { rowIndex: 11, code: 'CNT-FPC', name: 'FPC连接器', parentCode: '连接器', level: 3, description: '柔性排线连接器' },
//   { rowIndex: 12, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 13, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 14, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 15, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 16, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 17, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 18, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 19, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 20, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 21, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 22, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
//   { rowIndex: 23, code: 'CNT-PIN', name: '排针排母', parentCode: '连接器', level: 3 },
// ];

// /** 带手动编码的版本 (codeStrategy=EXCEL) */
// export const MOCK_PARSED_ROWS_WITH_CODE: ImportRow[] = MOCK_PARSED_ROWS.map(row => ({
//   ...row,
//   code: row.code || `MAN-${String(row.rowIndex).padStart(3, '0')}`,
// }));

// export const MOCK_DRY_RUN_RESULT: DryRunResult = {
//   totalRows: 12,
//   validRows: 10,
//   warningRows: 1,
//   errorRows: 1,
//   newCategories: 11,
//   updateCategories: 0,
//   skippedRows: 1,
//   issues: [
//     { rowIndex: 11, field: 'code', severity: 'warning', message: '编码 CNT-FPC 与系统生成规则不一致，将保留手动编码' },
//     { rowIndex: 12, field: 'code', severity: 'warning', message: '编码 CNT-PIN 与系统生成规则不一致，将保留手动编码' },
//     { rowIndex: 7, field: 'name', severity: 'error', message: '分类名称 "电解电容" 在目标分类下已存在' },
//   ],
//   generatedCodes: [
//     { rowIndex: 1, originalCode: '', generatedCode: 'MAT-001' },
//     { rowIndex: 2, originalCode: '', generatedCode: 'MAT-001-001' },
//     { rowIndex: 3, originalCode: '', generatedCode: 'MAT-001-001-001' },
//     { rowIndex: 4, originalCode: '', generatedCode: 'MAT-001-001-002' },
//     { rowIndex: 5, originalCode: '', generatedCode: 'MAT-001-002' },
//     { rowIndex: 6, originalCode: '', generatedCode: 'MAT-001-002-001' },
//     { rowIndex: 7, originalCode: '', generatedCode: 'MAT-001-002-002' },
//     { rowIndex: 8, originalCode: '', generatedCode: 'MAT-001-003' },
//     { rowIndex: 9, originalCode: '', generatedCode: 'MAT-001-003-001' },
//     { rowIndex: 10, originalCode: '', generatedCode: 'MAT-001-004' },
//     { rowIndex: 11, originalCode: 'CNT-FPC', generatedCode: 'CNT-FPC' },
//     { rowIndex: 12, originalCode: 'CNT-PIN', generatedCode: 'CNT-PIN' },
//   ],
// };

// export const MOCK_IMPORT_RESULT: ImportResult = {
//   success: true,
//   totalProcessed: 12,
//   created: 10,
//   updated: 0,
//   skipped: 1,
//   failed: 1,
//   errors: [
//     { rowIndex: 7, message: '分类名称 "电解电容" 在目标分类下已存在，已跳过' },
//   ],
// };
