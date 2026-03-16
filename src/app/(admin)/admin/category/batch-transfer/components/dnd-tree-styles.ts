export const DRAG_OVERLAY_Z_INDEX = 2000;
export const TREE_ROW_HEIGHT = 32;
export const TREE_INNER_CONTROL_HEIGHT = 24;
export const TREE_FOLDER_ICON_VERTICAL_OFFSET = -2;
export const TREE_SWITCHER_ICON_VERTICAL_OFFSET = 0;

export const dndTreeGlobalStyles = `
  .dnd-transfer-tree .ant-tree-treenode {
    display: flex !important;
    align-items: center !important;
    min-height: ${TREE_ROW_HEIGHT}px;
  }
  .drop-target-tree .ant-tree-treenode {
    width: 100%;
  }
  .dnd-transfer-tree .ant-tree-indent {
    align-self: stretch;
    display: inline-flex;
    align-items: center;
  }
  .dnd-transfer-tree .ant-tree-node-content-wrapper {
    display: inline-flex !important;
    align-items: center !important;
    min-height: ${TREE_ROW_HEIGHT}px;
    line-height: ${TREE_ROW_HEIGHT}px;
    vertical-align: middle;
  }
  .drop-target-tree .ant-tree-node-content-wrapper {
    flex: 1 1 auto;
    width: 0;
    min-width: 0;
  }
  .dnd-transfer-tree .ant-tree-title {
    display: inline-flex !important;
    align-items: center !important;
    min-height: ${TREE_INNER_CONTROL_HEIGHT}px;
    line-height: ${TREE_INNER_CONTROL_HEIGHT}px;
    vertical-align: middle;
  }
  .drop-target-tree .ant-tree-title {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
  }
  .dnd-transfer-tree .ant-tree-iconEle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${TREE_INNER_CONTROL_HEIGHT}px;
    height: ${TREE_ROW_HEIGHT}px;
    line-height: ${TREE_ROW_HEIGHT}px;
    vertical-align: middle;
    align-self: center;
  }
  .dnd-transfer-tree .ant-tree-switcher {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${TREE_INNER_CONTROL_HEIGHT}px;
    min-width: ${TREE_INNER_CONTROL_HEIGHT}px;
    height: ${TREE_INNER_CONTROL_HEIGHT}px;
    line-height: ${TREE_INNER_CONTROL_HEIGHT}px;
    vertical-align: middle;
    align-self: center;
    border-radius: 6px;
  }
  .dnd-transfer-tree .ant-tree-switcher .ant-tree-switcher-icon,
  .dnd-transfer-tree .ant-tree-switcher .ant-tree-switcher-icon svg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transform: translateY(${TREE_SWITCHER_ICON_VERTICAL_OFFSET}px);
  }
  .dnd-transfer-tree .ant-tree-iconEle .anticon,
  .dnd-transfer-tree .ant-tree-iconEle .anticon svg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transform: translateY(${TREE_FOLDER_ICON_VERTICAL_OFFSET}px);
  }
`;