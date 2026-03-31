import React from 'react';
import { Button, Dropdown, Input, Tooltip, theme } from 'antd';
import type { MenuProps } from 'antd';
import { CloseOutlined, SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import {
  TOOLBAR_ACTIONS_EXPANDED_WIDTH,
  TOOLBAR_CONTROL_GAP,
  TOOLBAR_ICON_GLYPH_SIZE,
  TOOLBAR_SEARCH_CLOSE_BUTTON_SIZE,
  TOOLBAR_SEARCH_EXPANDED_WIDTH,
  createCircleButtonStyle,
  createToolbarPillStyle,
} from './treeToolbarStyles';

export interface BaseToolbarState {
  checkableEnabled: boolean;
  checkedKeys: React.Key[];
  checkedCount: number;
  searchValue: string;
  searchExpanded: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchVisibilityChange: (expanded: boolean) => void;
  onSearchClear: () => void;
  onCheckableToggle: () => void;
}

export type ToolbarAction =
  | {
      key: string;
      type?: 'button';
      icon: React.ReactNode;
      tooltip: string;
      onClick?: () => void;
      variant?: 'primary' | 'neutral' | 'danger';
      size?: number;
      hidden?: boolean;
      disabled?: boolean;
      ariaLabel?: string;
    }
  | {
      key: string;
      type: 'dropdown';
      icon: React.ReactNode;
      tooltip: string;
      menuItems: MenuProps['items'];
      trigger?: Array<'click' | 'hover' | 'contextMenu'>;
      variant?: 'primary' | 'neutral' | 'danger';
      size?: number;
      hidden?: boolean;
      disabled?: boolean;
      ariaLabel?: string;
    };

export interface BaseToolbarProps {
  toolbarState: BaseToolbarState;
  searchPlaceholder?: string;
  showCheckableToggle?: boolean;
  batchActionsVisible?: boolean;
  primaryActions?: ToolbarAction[];
  batchActions?: ToolbarAction[];
  trailingActions?: ToolbarAction[];
  batchActionsExpandedWidth?: number;
}

const renderToolbarIcon = (icon: React.ReactNode) => (
  <span className="base-toolbar-icon-glyph">{icon}</span>
);

const renderAction = (action: ToolbarAction, token: ReturnType<typeof theme.useToken>['token']) => {
  if (action.hidden) {
    return null;
  }

  const buttonNode = (
    <Button
      className="base-toolbar-icon-button"
      type="default"
      size="small"
      icon={renderToolbarIcon(action.icon)}
      disabled={action.disabled}
      aria-label={action.ariaLabel || action.tooltip}
      onClick={action.type === 'dropdown' ? undefined : action.onClick}
      style={createCircleButtonStyle(token, action.variant || 'neutral', action.size)}
    />
  );

  if (action.type === 'dropdown') {
    return (
      <Dropdown
        key={action.key}
        menu={{ items: action.menuItems }}
        trigger={action.trigger || ['click']}
        disabled={action.disabled}
      >
        <Tooltip title={action.tooltip} mouseEnterDelay={0.4}>
          {buttonNode}
        </Tooltip>
      </Dropdown>
    );
  }

  return (
    <Tooltip key={action.key} title={action.tooltip} mouseEnterDelay={0.4}>
      {buttonNode}
    </Tooltip>
  );
};

const BaseToolbar: React.FC<BaseToolbarProps> = ({
  toolbarState,
  searchPlaceholder,
  showCheckableToggle = true,
  batchActionsVisible = false,
  primaryActions,
  batchActions,
  trailingActions,
  batchActionsExpandedWidth = TOOLBAR_ACTIONS_EXPANDED_WIDTH,
}) => {
  const { token } = theme.useToken();
  const primaryActionNodes = (primaryActions || []).map((action) => renderAction(action, token));
  const batchActionNodes = (batchActions || []).map((action) => renderAction(action, token));
  const trailingActionNodes = (trailingActions || []).map((action) => renderAction(action, token));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: TOOLBAR_CONTROL_GAP,
          flexShrink: 0,
        }}
      >
        {primaryActionNodes}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            maxWidth: batchActionsVisible ? batchActionsExpandedWidth : 0,
            opacity: batchActionsVisible ? 1 : 0,
            transition: 'max-width 0.25s ease, opacity 0.2s ease',
            gap: TOOLBAR_CONTROL_GAP,
          }}
        >
          {batchActionNodes}
        </div>

        {trailingActionNodes}
      </div>

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: TOOLBAR_CONTROL_GAP,
          flexShrink: 0,
        }}
      >
        <div style={createToolbarPillStyle(token, toolbarState.searchExpanded || !!toolbarState.searchValue)}>
          {(toolbarState.searchExpanded || toolbarState.searchValue) && (
            <span className="base-toolbar-search-glyph">
              <SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
            </span>
          )}
          <div
            style={{
              width: toolbarState.searchExpanded || toolbarState.searchValue ? TOOLBAR_SEARCH_EXPANDED_WIDTH : 0,
              opacity: toolbarState.searchExpanded || toolbarState.searchValue ? 1 : 0,
              transition: 'width 0.2s ease, opacity 0.2s ease',
              overflow: 'hidden',
            }}
          >
            <Input
              size="small"
              variant="borderless"
              placeholder={searchPlaceholder || '搜索'}
              value={toolbarState.searchValue}
              onChange={toolbarState.onSearchChange}
              onBlur={() => {
                if (!toolbarState.searchValue) {
                  toolbarState.onSearchVisibilityChange(false);
                }
              }}
              style={{ paddingInline: 0, background: 'transparent' }}
            />
          </div>
          <Button
            className="base-toolbar-icon-button"
            size="small"
            type="default"
            icon={renderToolbarIcon(toolbarState.searchExpanded || toolbarState.searchValue ? <CloseOutlined /> : <SearchOutlined />)}
            aria-label="切换搜索"
            onClick={() => {
              if (toolbarState.searchExpanded || toolbarState.searchValue) {
                toolbarState.onSearchClear();
                toolbarState.onSearchVisibilityChange(false);
                return;
              }
              toolbarState.onSearchVisibilityChange(true);
            }}
            style={createCircleButtonStyle(
              token,
              toolbarState.searchExpanded || !!toolbarState.searchValue ? 'primary' : 'neutral',
              toolbarState.searchExpanded || !!toolbarState.searchValue
                ? TOOLBAR_SEARCH_CLOSE_BUTTON_SIZE
                : undefined,
            )}
          />
        </div>

        {showCheckableToggle && (
          <Button
            className="base-toolbar-icon-button"
            size="small"
            type="default"
            icon={renderToolbarIcon(<UnorderedListOutlined />)}
            aria-label="切换复选框"
            onClick={toolbarState.onCheckableToggle}
            style={createCircleButtonStyle(
              token,
              toolbarState.checkableEnabled ? 'primary' : 'neutral',
            )}
          />
        )}
      </div>

      <style jsx global>{`
        .base-toolbar-icon-button.ant-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          overflow: hidden;
        }
        .base-toolbar-icon-button.ant-btn > .ant-btn-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-inline-end: 0;
          line-height: 1;
          width: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          height: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          min-width: ${TOOLBAR_ICON_GLYPH_SIZE}px;
        }
        .base-toolbar-icon-glyph,
        .base-toolbar-search-glyph {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          height: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          min-width: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          min-height: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          line-height: 1;
        }
        .base-toolbar-icon-button.ant-btn .anticon,
        .base-toolbar-search-glyph .anticon,
        .base-toolbar-icon-glyph .anticon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          vertical-align: 0;
        }
        .base-toolbar-icon-button.ant-btn .anticon svg,
        .base-toolbar-search-glyph .anticon svg,
        .base-toolbar-icon-glyph .anticon svg,
        .base-toolbar-icon-glyph .MuiSvgIcon-root,
        .base-toolbar-search-glyph .MuiSvgIcon-root {
          display: block;
          width: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          height: ${TOOLBAR_ICON_GLYPH_SIZE}px;
          font-size: ${TOOLBAR_ICON_GLYPH_SIZE}px;
        }
      `}</style>
    </div>
  );
};

export default BaseToolbar;