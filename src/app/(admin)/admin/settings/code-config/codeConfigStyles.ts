import type { CSSProperties } from "react";
import { theme } from "antd";

type CodeConfigToken = ReturnType<typeof theme.useToken>["token"];

export const CODE_CONFIG_CLASS_NAMES = {
    listScroll: "code-rule-list-scroll",
    workspaceScroll: "code-rule-workspace-scroll",
    listTable: "code-rule-list-table",
    listTableCheckable: "code-rule-list-table--checkable",
    resizeHandle: "code-rule-resize-handle",
    row: "code-rule-row",
    rowActive: "code-rule-row-active",
    workspaceCollapse: "code-rule-workspace-collapse",
    editorSurface: "code-rule-editor-surface",
} as const;

export const getResizableHeaderCellStyle = (
    width?: string,
    style?: CSSProperties,
): CSSProperties => ({
    ...style,
    width,
    position: "relative",
});

export const getListRuleNameStyle = (
    token: CodeConfigToken,
    active: boolean,
): CSSProperties => ({
    display: "block",
    width: "100%",
    textAlign: "center",
    color: active ? token.colorPrimary : token.colorText,
});

export const getCodeConfigStyles = (token: CodeConfigToken) => ({
    titleReset: {
        margin: 0,
    } satisfies CSSProperties,
    pageContainer: {
        height: "calc(100vh - 163px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "hidden",
    } satisfies CSSProperties,
    splitter: {
        flex: 1,
        minHeight: 0,
        background: "var(--ant-color-bg-container, #fff)",
        borderRadius: 8,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
    } satisfies CSSProperties,
    splitterPanelContent: {
        position: "relative",
        height: "100%",
        overflow: "hidden",
    } satisfies CSSProperties,
    emptyState: {
        height: "100%",
        background: token.colorBgLayout,
    } satisfies CSSProperties,
    listContainer: {
        height: "100%",
        background: token.colorBgContainer,
    } satisfies CSSProperties,
    listToolbar: {
        padding: "0 16px",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        height: 48,
    } satisfies CSSProperties,
    listScroll: {
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
    } satisfies CSSProperties,
    listFooter: {
        padding: 8,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgLayout,
        textAlign: "center",
        fontSize: 12,
        color: token.colorTextQuaternary,
    } satisfies CSSProperties,
    listSecondaryText: {
        display: "block",
        width: "100%",
        textAlign: "center",
    } satisfies CSSProperties,
    listMonoText: {
        display: "block",
        width: "100%",
        textAlign: "center",
        fontSize: 12,
        fontFamily: "monospace",
    } satisfies CSSProperties,
    workspaceContainer: {
        height: "100%",
        background: token.colorBgContainer,
    } satisfies CSSProperties,
    workspaceHeader: {
        padding: "8px 16px",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        height: 48,
        background: token.colorBgContainer,
    } satisfies CSSProperties,
    activeRuleCode: {
        fontSize: 12,
    } satisfies CSSProperties,
    workspaceCollapse: {
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: token.colorBgLayout,
    } satisfies CSSProperties,
    collapseHeader: {
        alignItems: "center",
        padding: "10px 16px",
        background: token.colorBgContainer,
    } satisfies CSSProperties,
    collapseBody: {
        padding: 0,
        background: token.colorBgContainer,
    } satisfies CSSProperties,
    editorSurface: {
        minHeight: "calc(100vh - 353px)",
        width: "100%",
        padding: 16,
    } satisfies CSSProperties,
    editorContent: {
        height: "100%",
    } satisfies CSSProperties,
    editorHead: {
        alignItems: "flex-start",
        gap: 16,
    } satisfies CSSProperties,
    editorTitle: {
        color: token.colorPrimary,
        fontSize: 18,
    } satisfies CSSProperties,
    previewCode: {
        fontSize: 20,
        fontFamily: "monospace",
    } satisfies CSSProperties,
    segmentTypeSelect: {
        width: 180,
    } satisfies CSSProperties,
    segmentCard: {
        minHeight: 220,
        borderColor: token.colorBorderSecondary,
        borderRadius: token.borderRadiusLG,
        overflow: "hidden",
    } satisfies CSSProperties,
    segmentCardHeader: {
        minHeight: 44,
        padding: "8px 16px",
        background: token.colorFillAlter,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
    } satisfies CSSProperties,
    segmentCardBody: {
        padding: 12,
    } satisfies CSSProperties,
    fullWidthField: {
        width: "100%",
    } satisfies CSSProperties,
    switchRow: {
        minHeight: 32,
    } satisfies CSSProperties,
    placeholderPanel: {
        minHeight: "calc(100vh - 353px)",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    } satisfies CSSProperties,
});

export const createCodeConfigGlobalStyles = (
    token: CodeConfigToken,
    checkboxColWidth: number,
) => `
  .${CODE_CONFIG_CLASS_NAMES.listScroll},
  .${CODE_CONFIG_CLASS_NAMES.workspaceScroll} {
    scrollbar-width: thin;
    scrollbar-color: ${token.colorBorder} transparent;
  }

  .${CODE_CONFIG_CLASS_NAMES.listScroll}::-webkit-scrollbar,
  .${CODE_CONFIG_CLASS_NAMES.workspaceScroll}::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  .${CODE_CONFIG_CLASS_NAMES.listScroll}::-webkit-scrollbar-track,
  .${CODE_CONFIG_CLASS_NAMES.workspaceScroll}::-webkit-scrollbar-track {
    background: transparent;
  }

  .${CODE_CONFIG_CLASS_NAMES.listScroll}::-webkit-scrollbar-thumb,
  .${CODE_CONFIG_CLASS_NAMES.workspaceScroll}::-webkit-scrollbar-thumb {
    background: ${token.colorBorder};
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
  }

  .${CODE_CONFIG_CLASS_NAMES.listScroll}::-webkit-scrollbar-thumb:hover,
  .${CODE_CONFIG_CLASS_NAMES.workspaceScroll}::-webkit-scrollbar-thumb:hover {
    background: ${token.colorTextQuaternary};
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table,
  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-container {
    background: ${token.colorBgContainer};
    width: 100%;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} table {
    width: 100% !important;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-thead > tr > th,
  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-tbody > tr > td {
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-thead > tr > th {
    background: ${token.colorFillAlter};
    color: ${token.colorTextSecondary};
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable}:not(.${CODE_CONFIG_CLASS_NAMES.listTableCheckable}) .ant-table-thead > tr > th:first-child,
  .${CODE_CONFIG_CLASS_NAMES.listTable}:not(.${CODE_CONFIG_CLASS_NAMES.listTableCheckable}) .ant-table-tbody > tr > td:first-child {
    padding-left: 20px;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-selection-column {
    width: ${checkboxColWidth}px !important;
    min-width: ${checkboxColWidth}px;
    text-align: center;
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-tbody > tr.${CODE_CONFIG_CLASS_NAMES.row} > td,
  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-tbody > tr.${CODE_CONFIG_CLASS_NAMES.rowActive} > td {
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-tbody > tr.${CODE_CONFIG_CLASS_NAMES.row}:hover > td {
    background: ${token.controlItemBgHover};
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-tbody > tr.${CODE_CONFIG_CLASS_NAMES.rowActive} > td {
    background: ${token.controlItemBgActive} !important;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-tbody > tr.${CODE_CONFIG_CLASS_NAMES.rowActive} > td:first-child {
    box-shadow: inset 4px 0 0 ${token.colorPrimary};
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-tbody > tr > td {
    background: ${token.colorBgContainer};
    text-align: center;
  }

  .${CODE_CONFIG_CLASS_NAMES.resizeHandle} {
    position: absolute;
    top: 0;
    right: -5px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
    z-index: 3;
  }

  .${CODE_CONFIG_CLASS_NAMES.resizeHandle}::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 4px;
    transform: translateY(-50%);
    width: 2px;
    height: 18px;
    border-radius: 999px;
    background: ${token.colorBorder};
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .${CODE_CONFIG_CLASS_NAMES.listTable} .ant-table-thead > tr > th:hover .${CODE_CONFIG_CLASS_NAMES.resizeHandle}::after {
    opacity: 1;
  }

  .${CODE_CONFIG_CLASS_NAMES.workspaceCollapse} > .ant-collapse-item:not(:last-child) {
    border-bottom: 1px solid ${token.colorBorderSecondary} !important;
  }

  .${CODE_CONFIG_CLASS_NAMES.workspaceCollapse} .ant-collapse-body,
  .${CODE_CONFIG_CLASS_NAMES.workspaceCollapse} .ant-collapse-content > .ant-collapse-content-box {
    padding: 0 !important;
  }

  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-input-filled,
  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-select-filled .ant-select-selector {
    background: ${token.colorFillAlter} !important;
    border: 1px solid ${token.colorBorderSecondary} !important;
    box-shadow: none !important;
  }

  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-input-filled:hover,
  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-select-filled:hover .ant-select-selector {
    border-color: ${token.colorBorder} !important;
  }

  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-input-filled:focus,
  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-input-filled:focus-within,
  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-select-focused.ant-select-filled .ant-select-selector,
  .${CODE_CONFIG_CLASS_NAMES.editorSurface} .ant-select-open.ant-select-filled .ant-select-selector {
    border-color: ${token.colorPrimaryBorder} !important;
  }
`;
