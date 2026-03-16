import { theme } from 'antd';

export type ToolbarStyleToken = ReturnType<typeof theme.useToken>['token'];
export type CircleButtonVariant = 'primary' | 'neutral' | 'danger';

export const TOOLBAR_ICON_BUTTON_SIZE = 24;
export const TOOLBAR_PILL_RADIUS = 999;
export const TOOLBAR_CONTROL_GAP = 6;
export const TOOLBAR_SEARCH_PILL_HEIGHT = 24;
export const TOOLBAR_SEARCH_EXPANDED_WIDTH = 180;
export const TOOLBAR_ACTIONS_EXPANDED_WIDTH = 118;
export const TOOLBAR_SEARCH_CLOSE_BUTTON_SIZE = 20;

export const createCircleButtonStyle = (
  token: ToolbarStyleToken,
  variant: CircleButtonVariant = 'neutral',
  size: number = TOOLBAR_ICON_BUTTON_SIZE,
): React.CSSProperties => {
  const palette =
    variant === 'primary'
      ? {
          borderColor: token.colorPrimaryBorder,
          background: token.colorPrimaryBg,
          color: token.colorPrimary,
        }
      : variant === 'danger'
        ? {
            borderColor: token.colorErrorBorder,
            background: token.colorErrorBg,
            color: token.colorError,
          }
        : {
            borderColor: token.colorBorderSecondary,
            background: token.colorBgContainer,
            color: token.colorTextSecondary,
          };

  return {
    width: size,
    minWidth: size,
    height: size,
    paddingInline: 0,
    borderRadius: TOOLBAR_PILL_RADIUS,
    border: `1px solid ${palette.borderColor}`,
    background: palette.background,
    color: palette.color,
    boxShadow: 'none',
  };
};

export const createToolbarPillStyle = (
  token: ToolbarStyleToken,
  active: boolean,
): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: TOOLBAR_CONTROL_GAP,
  paddingLeft: active ? 10 : 0,
  paddingRight: active ? TOOLBAR_CONTROL_GAP : 0,
  height: TOOLBAR_SEARCH_PILL_HEIGHT,
  borderRadius: TOOLBAR_PILL_RADIUS,
  border: `1px solid ${active ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
  background: token.colorBgContainer,
  transition: 'all 0.2s ease',
  overflow: 'hidden',
});