import { theme } from 'antd';

type TransferNodeStyleToken = ReturnType<typeof theme.useToken>['token'];

interface TransferNodeStyleOptions {
  disabled?: boolean;
  dragging?: boolean;
  overlay?: boolean;
}

export const TRANSFER_NODE_MIN_WIDTH = 150;
export const TRANSFER_NODE_MAX_WIDTH = 350;
export const TRANSFER_NODE_HEIGHT = 24;
export const TRANSFER_OVERLAY_CARD_MIN_WIDTH = 180;
export const TRANSFER_OVERLAY_CARD_MAX_WIDTH = 420;

const clampChannel = (value: number): number => {
  return Math.max(0, Math.min(255, value));
};

const hexToRgba = (hex: string, alpha: number): string | null => {
  const normalized = hex.replace('#', '').trim();
  const isShortHex = normalized.length === 3;
  const isLongHex = normalized.length === 6;

  if (!isShortHex && !isLongHex) {
    return null;
  }

  const expanded = isShortHex
    ? normalized
        .split('')
        .map((part) => `${part}${part}`)
        .join('')
    : normalized;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const colorToRgba = (color: string, alpha: number): string => {
  if (color.startsWith('#')) {
    return hexToRgba(color, alpha) ?? color;
  }

  const rgbMatch = color.match(/rgba?\(([^)]+)\)/i);
  if (!rgbMatch) {
    return color;
  }

  const channels = rgbMatch[1]
    .split(',')
    .slice(0, 3)
    .map((value) => clampChannel(Number.parseFloat(value.trim()) || 0));

  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
};

export const getTransferNodeLabelStyle = (
  token: TransferNodeStyleToken,
  options: TransferNodeStyleOptions = {},
): React.CSSProperties => {
  const { disabled = false, dragging = false, overlay = false } = options;

  return {
    color: disabled ? token.colorTextDisabled : token.colorText,
    fontWeight: disabled ? 'normal' : 500,
    opacity: dragging ? 0.4 : disabled ? 0.6 : overlay ? 0.92 : 1,
    fontStyle: disabled ? 'italic' : 'normal',
    cursor: disabled ? 'default' : dragging ? 'grabbing' : 'grab',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 4,
    touchAction: 'none',
    minHeight: TRANSFER_NODE_HEIGHT,
    minWidth: TRANSFER_NODE_MIN_WIDTH,
    maxWidth: TRANSFER_NODE_MAX_WIDTH,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1,
    verticalAlign: 'middle',
    backgroundColor: overlay ? token.colorBgElevated : 'transparent',
    border: overlay ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
    boxShadow: overlay ? token.boxShadowSecondary : 'none',
  };
};

export const getTransferNodeOverlayShellStyle = (
  token: TransferNodeStyleToken,
): React.CSSProperties => {
  return {
    display: 'inline-flex',
    pointerEvents: 'none',
    userSelect: 'none',
  };
};

export const getTransferNodeOverlayCardStyle = (
  token: TransferNodeStyleToken,
): React.CSSProperties => {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    minWidth: TRANSFER_OVERLAY_CARD_MIN_WIDTH,
    maxWidth: TRANSFER_OVERLAY_CARD_MAX_WIDTH,
    padding: '7px 12px',
    borderRadius: 999,
    border: `1px solid ${colorToRgba(token.colorBorderSecondary, 0.22)}`,
    background: colorToRgba(token.colorBgElevated, 0.48),
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.05)',
    backdropFilter: 'blur(6px) saturate(1.15)',
    WebkitBackdropFilter: 'blur(6px) saturate(1.15)',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  };
};

export const getTransferNodeOverlayActionStyle = (
  token: TransferNodeStyleToken,
): React.CSSProperties => {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    color: token.colorTextSecondary,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '18px',
  };
};

export const getTransferNodeOverlayIconStyle = (
  token: TransferNodeStyleToken,
): React.CSSProperties => {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: 6,
    background: colorToRgba(token.colorPrimaryBg, 0.4),
    color: token.colorPrimary,
    boxShadow: `inset 0 0 0 1px ${colorToRgba(token.colorPrimaryBorder, 0.32)}`,
  };
};

export const getTransferNodeOverlayTitleStyle = (
  token: TransferNodeStyleToken,
): React.CSSProperties => {
  return {
    minWidth: 0,
    flex: 1,
    color: token.colorText,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
};

export const getTransferNodeOverlayConnectorStyle = (
  token: TransferNodeStyleToken,
): React.CSSProperties => {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    color: token.colorTextDescription,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '18px',
  };
};

export const getTransferNodeOverlayTargetStyle = (
  token: TransferNodeStyleToken,
): React.CSSProperties => {
  return {
    minWidth: 0,
    maxWidth: 132,
    flexShrink: 1,
    color: token.colorPrimary,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
};
