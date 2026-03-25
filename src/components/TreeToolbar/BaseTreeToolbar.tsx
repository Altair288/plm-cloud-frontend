import React from 'react';
import { Button, Dropdown, Input, Tooltip, theme } from 'antd';
import type { MenuProps } from 'antd';
import { CloseOutlined, SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import type { CategoryTreeToolbarState } from '@/features/category/CategoryTree';
import {
  TOOLBAR_ACTIONS_EXPANDED_WIDTH,
  TOOLBAR_CONTROL_GAP,
  TOOLBAR_SEARCH_CLOSE_BUTTON_SIZE,
  TOOLBAR_SEARCH_EXPANDED_WIDTH,
  createCircleButtonStyle,
  createToolbarPillStyle,
} from './treeToolbarStyles';

export type TreeToolbarAction =
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

export interface BaseTreeToolbarProps {
  toolbarState: CategoryTreeToolbarState;
  searchPlaceholder?: string;
  showCheckableToggle?: boolean;
  batchActionsVisible?: boolean;
  primaryActions?: TreeToolbarAction[];
  batchActions?: TreeToolbarAction[];
  trailingActions?: TreeToolbarAction[];
  batchActionsExpandedWidth?: number;
}

const renderAction = (action: TreeToolbarAction, token: ReturnType<typeof theme.useToken>['token']) => {
  if (action.hidden) {
    return null;
  }

  const buttonNode = (
    <Button
      type="default"
      size="small"
      icon={action.icon}
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

const BaseTreeToolbar: React.FC<BaseTreeToolbarProps> = ({
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
            <SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
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
              placeholder={searchPlaceholder || '搜索分类'}
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
            size="small"
            type="default"
            icon={toolbarState.searchExpanded || toolbarState.searchValue ? <CloseOutlined /> : <SearchOutlined />}
            aria-label="切换搜索"
            onClick={() => {
              if (toolbarState.searchExpanded || toolbarState.searchValue) {
                toolbarState.onSearchClear();
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
            size="small"
            type="default"
            icon={<UnorderedListOutlined />}
            aria-label="切换复选框"
            onClick={toolbarState.onCheckableToggle}
            style={createCircleButtonStyle(
              token,
              toolbarState.checkableEnabled ? 'primary' : 'neutral',
            )}
          />
        )}
      </div>
    </div>
  );
};

export default BaseTreeToolbar;