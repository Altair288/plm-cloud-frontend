import React, { useEffect, useMemo, useState } from 'react';
import { App, Avatar, Button, Divider, Empty, Flex, Popover, Space, Spin, Switch, Typography } from 'antd';
import {
  ApartmentOutlined,
  CheckOutlined,
  DownOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { AppPalette } from '@/styles/colors';
import { authApi, isAuthErrorResponse } from '@/services/auth';
import type { AuthWorkspaceSummaryDto } from '@/models/auth';
import {
  mapWorkspaceSessionDtoToState,
  persistWorkspaceSessionState,
  readPersistedAuthHeaders,
  readPersistedAuthSnapshot,
} from '@/utils/authStorage';

interface WorkspaceSwitcherProps {
  palette: AppPalette;
}

const formatWorkspaceMeta = (workspace: AuthWorkspaceSummaryDto): string => {
  return [workspace.workspaceType, workspace.defaultLocale, workspace.defaultTimezone]
    .filter(Boolean)
    .join(' · ');
};

const createSnapshotWorkspaceSummary = (): AuthWorkspaceSummaryDto | null => {
  const snapshot = readPersistedAuthSnapshot();
  if (!snapshot.workspaceSession.workspaceId) {
    return null;
  }

  return {
    workspaceId: snapshot.workspaceSession.workspaceId,
    workspaceCode: snapshot.workspaceSession.workspaceCode ?? 'workspace',
    workspaceName: snapshot.workspaceSession.workspaceName ?? '当前工作区',
    workspaceStatus: 'ACTIVE',
    workspaceType: snapshot.workspaceSession.workspaceType ?? 'TEAM',
    defaultLocale: snapshot.workspaceSession.defaultLocale ?? 'zh-CN',
    defaultTimezone: snapshot.workspaceSession.defaultTimezone ?? 'Asia/Shanghai',
    workspaceMemberId: snapshot.workspaceSession.workspaceMemberId ?? '',
    memberStatus: 'ACTIVE',
    isDefaultWorkspace: false,
  };
};

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ palette }) => {
  const { message } = App.useApp();
  const router = useRouter();
  const initialSnapshot = useMemo(() => readPersistedAuthSnapshot(), []);
  const snapshotWorkspace = useMemo(() => createSnapshotWorkspaceSummary(), []);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialSnapshot.platformAuth.platformToken));
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const [workspaceOptions, setWorkspaceOptions] = useState<AuthWorkspaceSummaryDto[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(initialSnapshot.workspaceSession.workspaceId);
  const [accountEmail, setAccountEmail] = useState(initialSnapshot.platformAuth.user?.email ?? null);
  const [newSidebarEnabled, setNewSidebarEnabled] = useState(false);

  useEffect(() => {
    const persistedHeaders = readPersistedAuthHeaders();
    if (!persistedHeaders.platformToken || !persistedHeaders.platformTokenName) {
      setLoading(false);
      return;
    }

    let active = true;

    authApi.getMe(persistedHeaders)
      .then((response) => {
        if (!active) {
          return;
        }

        setWorkspaceOptions(response.workspaceOptions);
        setAccountEmail(response.user.email);

        if (response.currentWorkspace) {
          setCurrentWorkspaceId(response.currentWorkspace.workspaceId);
          persistWorkspaceSessionState(mapWorkspaceSessionDtoToState(response.currentWorkspace));
          return;
        }

        setCurrentWorkspaceId(response.defaultWorkspace?.workspaceId ?? response.workspaceOptions[0]?.workspaceId ?? null);
      })
      .catch(() => {
        if (active) {
          setWorkspaceOptions(snapshotWorkspace ? [snapshotWorkspace] : []);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [snapshotWorkspace]);

  const currentWorkspace = useMemo(
    () => workspaceOptions.find((item) => item.workspaceId === currentWorkspaceId)
      ?? snapshotWorkspace
      ?? workspaceOptions[0]
      ?? null,
    [currentWorkspaceId, snapshotWorkspace, workspaceOptions],
  );

  const triggerActive = open || hovered;
  const workspaceInitial = currentWorkspace?.workspaceName.trim().charAt(0).toUpperCase() || 'W';

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    if (!workspaceId || workspaceId === currentWorkspace?.workspaceId) {
      setOpen(false);
      return;
    }

    const persistedHeaders = readPersistedAuthHeaders();
    if (!persistedHeaders.platformToken || !persistedHeaders.platformTokenName) {
      message.error('登录态已失效，请重新登录。');
      router.push('/login');
      return;
    }

    setSwitchingWorkspaceId(workspaceId);

    try {
      const response = await authApi.switchWorkspace(
        {
          workspaceId,
          rememberAsDefault: false,
        },
        persistedHeaders,
      );

      persistWorkspaceSessionState(mapWorkspaceSessionDtoToState(response));
      setCurrentWorkspaceId(response.workspaceId);
      setOpen(false);
      message.success(`已切换到 ${response.workspaceName}`);
      router.refresh();
    } catch (error) {
      if (isAuthErrorResponse(error)) {
        message.error(error.message || '工作区切换失败，请稍后重试。');
        return;
      }

      message.error('工作区切换失败，请稍后重试。');
    } finally {
      setSwitchingWorkspaceId(null);
    }
  };

  const popoverContent = (
    <div
      style={{
        width: 360,
        padding: 8,
      }}
    >
      <Space orientation="vertical" size={0} style={{ width: '100%' }}>
        <div
          style={{
            padding: 12,
            borderRadius: 16,
            background: palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : palette.bgContainer,
            border: `1px solid ${palette.borderColor}`,
          }}
        >
          <Flex justify="space-between" align="start" gap={12}>
            <Space align="start" size={12}>
              <Avatar
                shape="square"
                size={40}
                icon={<ApartmentOutlined />}
                style={{
                  background: palette.mode === 'dark' ? '#8a4b12' : '#b85c18',
                  color: '#fff',
                  borderRadius: 10,
                }}
              />
              <div>
                <Typography.Text strong style={{ color: palette.textPrimary, display: 'block' }}>
                  {currentWorkspace?.workspaceName ?? '暂无工作区'}
                </Typography.Text>
                <Typography.Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                  {currentWorkspace ? formatWorkspaceMeta(currentWorkspace) : '创建或切换工作区'}
                </Typography.Text>
              </div>
            </Space>
            <Button type="text" icon={<SettingOutlined />} style={{ color: palette.iconColor }} />
          </Flex>

          <Space style={{ marginTop: 14 }}>
            <Button
              size="small"
              style={{ borderRadius: 10 }}
              icon={<SettingOutlined />}
            >
              设置
            </Button>
            <Button
              size="small"
              style={{ borderRadius: 10 }}
              icon={<TeamOutlined />}
            >
              邀请成员
            </Button>
          </Space>
        </div>

        <div style={{ padding: '14px 12px 8px' }}>
          <Typography.Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            账号
          </Typography.Text>
        </div>

        <div style={{ padding: '0 12px 10px' }}>
          <Typography.Text style={{ color: palette.textPrimary }}>
            {accountEmail || '未登录账号'}
          </Typography.Text>
        </div>

        <div style={{ padding: '0 8px 8px' }}>
          {loading ? (
            <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
              <Spin size="small" />
            </div>
          ) : workspaceOptions.length === 0 && !currentWorkspace ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无可用工作区"
              styles={{ image: { height: 44 }, description: { color: palette.textSecondary } }}
            />
          ) : (
            (workspaceOptions.length > 0 ? workspaceOptions : currentWorkspace ? [currentWorkspace] : []).map((workspace) => {
              const selected = workspace.workspaceId === currentWorkspaceId;
              return (
                <button
                  key={workspace.workspaceId}
                  type="button"
                  onClick={() => void handleWorkspaceSwitch(workspace.workspaceId)}
                  disabled={switchingWorkspaceId === workspace.workspaceId}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: 'none',
                    background: selected
                      ? palette.mode === 'dark'
                        ? 'rgba(15, 98, 254, 0.14)'
                        : 'rgba(15, 98, 254, 0.08)'
                      : 'transparent',
                    color: palette.textPrimary,
                    cursor: switchingWorkspaceId === workspace.workspaceId ? 'wait' : 'pointer',
                    opacity: switchingWorkspaceId === workspace.workspaceId ? 0.75 : 1,
                  }}
                >
                  <Space size={10}>
                    <Avatar
                      shape="square"
                      size={28}
                      style={{
                        background: workspace.workspaceType === 'TEAM' ? '#5b8c00' : '#b85c18',
                        color: '#fff',
                        borderRadius: 8,
                      }}
                    >
                      {workspace.workspaceName.trim().charAt(0).toUpperCase() || 'W'}
                    </Avatar>
                    <div style={{ textAlign: 'left' }}>
                      <Typography.Text style={{ color: palette.textPrimary, display: 'block' }}>
                        {workspace.workspaceName}
                      </Typography.Text>
                      <Typography.Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                        {formatWorkspaceMeta(workspace)}
                      </Typography.Text>
                    </div>
                  </Space>
                  {selected ? <CheckOutlined style={{ color: palette.menuTextSelected }} /> : null}
                </button>
              );
            })
          )}
        </div>

        <div style={{ padding: '0 12px 12px' }}>
          <Button
            type="link"
            icon={<PlusOutlined />}
            style={{ paddingInline: 0, color: palette.menuTextSelected }}
            onClick={() => {
              setOpen(false);
              router.push('/workspace/create');
            }}
          >
            新建工作空间
          </Button>
        </div>

        <Divider style={{ margin: '4px 0 8px', borderColor: palette.borderColor }} />

        <div style={{ padding: '0 12px 8px' }}>
          <Typography.Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            Placeholder
          </Typography.Text>
        </div>

        <Space orientation="vertical" size={2} style={{ width: '100%', padding: '0 8px 12px' }}>
          <Button type="text" style={{ justifyContent: 'flex-start', color: palette.textPrimary }} icon={<UserSwitchOutlined />}>
            Placeholder
          </Button>
          <Button type="text" style={{ justifyContent: 'flex-start', color: palette.textPrimary }} icon={<UserSwitchOutlined />}>
            Placeholder
          </Button>
          <Button type="text" style={{ justifyContent: 'flex-start', color: palette.textPrimary }} icon={<UserSwitchOutlined />}>
            Placeholder
          </Button>
        </Space>

        <div
          style={{
            margin: '0 8px 4px',
            padding: 14,
            borderRadius: 14,
            border: `1px solid ${palette.borderColor}`,
            background: palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          }}
        >
          <Flex justify="space-between" align="center" gap={12}>
            <div>
              <Typography.Text style={{ color: palette.textPrimary, display: 'block' }}>
                试用新侧边栏
              </Typography.Text>
              <Typography.Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                你的页面、会议和 AI，一步到位。
              </Typography.Text>
            </div>
            <Switch checked={newSidebarEnabled} onChange={setNewSidebarEnabled} size="small" />
          </Flex>
        </div>
      </Space>
    </div>
  );

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
      content={popoverContent}
      styles={{
        root: { paddingTop: 0 },
        container: {
          padding: 0,
          borderRadius: 20,
          background: palette.bgContainer,
          border: `1px solid ${palette.borderColor}`,
          boxShadow:
            palette.mode === 'dark'
              ? '0 24px 64px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04)'
              : '0 28px 60px rgba(15, 24, 40, 0.16), 0 8px 20px rgba(15, 24, 40, 0.08)',
          overflow: 'hidden',
        },
      }}
    >
      <button
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '6px 16px 6px 8px',
          minHeight: 40,
          borderRadius: 999,
          border: 'none',
          background: triggerActive
            ? palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(15, 24, 40, 0.06)'
            : 'transparent',
          color: palette.textPrimary,
          cursor: 'pointer',
          boxShadow: 'none',
          transition: 'background-color 0.18s ease',
        }}
      >
        <Avatar
          shape="square"
          size={24}
          style={{
            background: palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 24, 40, 0.08)',
            color: palette.textSecondary,
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            flex: '0 0 auto',
          }}
        >
          {workspaceInitial}
        </Avatar>
        <Typography.Text
          strong
          style={{
            color: palette.textPrimary,
            fontSize: 13,
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
            {currentWorkspace?.workspaceName ?? '选择工作区'}
        </Typography.Text>
        <DownOutlined style={{ color: palette.iconColor, fontSize: 10, flex: '0 0 auto' }} />
      </button>
    </Popover>
  );
};

export default WorkspaceSwitcher;