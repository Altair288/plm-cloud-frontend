'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { authApi, isAuthErrorResponse } from '@/services/auth';
import {
  clearPersistedAuthState,
  mapWorkspaceSessionDtoToState,
  persistPlatformAuthState,
  persistWorkspaceSessionState,
  readPersistedAuthHeaders,
  readPersistedAuthSnapshot,
} from '@/utils/authStorage';

interface UseProtectedAppAccessOptions {
  loadingMessage?: string;
}

export const useProtectedAppAccess = (
  options?: UseProtectedAppAccessOptions,
): boolean => {
  const router = useRouter();
  const pathname = usePathname();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;
    const loadingId = showLoading(options?.loadingMessage ?? '正在验证访问权限...');

    const allowAccess = () => {
      if (!active) {
        return;
      }

      hideLoading(loadingId);
      setCheckingAccess(false);
    };

    const redirectTo = (targetPath: string) => {
      if (!active) {
        return;
      }

      router.replace(targetPath);
    };

    const restoreAccess = async () => {
      const currentSnapshot = readPersistedAuthSnapshot();
      const persistedHeaders = readPersistedAuthHeaders();

      if (currentSnapshot.platformAuth.principalType === 'platform-admin') {
        persistWorkspaceSessionState(null);
        redirectTo('/admin/dashboard');
        return;
      }

      if (!persistedHeaders.platformToken || !persistedHeaders.platformTokenName) {
        clearPersistedAuthState();
        redirectTo('/login');
        return;
      }

      try {
        const me = await authApi.getMe(persistedHeaders);

        if (!active) {
          return;
        }

        const currentSnapshot = readPersistedAuthSnapshot();
        persistPlatformAuthState({
          ...currentSnapshot.platformAuth,
          user: me.user,
          admin: null,
          principalType: 'user',
        });

        const shouldCreateWorkspace = me.user.isFirstLogin || me.user.workspaceCount === 0;

        if (shouldCreateWorkspace) {
          persistWorkspaceSessionState(null);
          redirectTo('/workspace/create');
          return;
        }

        if (me.currentWorkspace) {
          persistWorkspaceSessionState(mapWorkspaceSessionDtoToState(me.currentWorkspace));
          allowAccess();
          return;
        }

        const targetWorkspaceId = me.defaultWorkspace?.workspaceId ?? me.workspaceOptions[0]?.workspaceId;
        if (!targetWorkspaceId) {
          persistWorkspaceSessionState(null);
          redirectTo('/workspace/create');
          return;
        }

        const restoredSession = await authApi.switchWorkspace(
          {
            workspaceId: targetWorkspaceId,
            rememberAsDefault: false,
          },
          persistedHeaders,
        );

        if (!active) {
          return;
        }

        persistWorkspaceSessionState(mapWorkspaceSessionDtoToState(restoredSession));
        allowAccess();
      } catch (error) {
        if (!active) {
          return;
        }

        if (isAuthErrorResponse(error)) {
          if (error.code === 'PLATFORM_ADMIN_REQUIRED') {
            try {
              const adminMe = await authApi.getPlatformAdminMe(persistedHeaders);
              if (!active) {
                return;
              }

              const snapshot = readPersistedAuthSnapshot();
              persistPlatformAuthState({
                ...snapshot.platformAuth,
                user: null,
                admin: adminMe.admin,
                principalType: 'platform-admin',
              });
              persistWorkspaceSessionState(null);
              redirectTo('/admin/dashboard');
              return;
            } catch {
              clearPersistedAuthState();
              redirectTo('/admin-login');
              return;
            }
          }

          if (error.code === 'AUTH_NOT_LOGGED_IN') {
            clearPersistedAuthState();
            redirectTo('/login');
            return;
          }

          if (
            error.code === 'WORKSPACE_MEMBER_NOT_FOUND'
            || error.code === 'WORKSPACE_MEMBER_INACTIVE'
            || error.code === 'WORKSPACE_NOT_FOUND'
            || error.code === 'WORKSPACE_NOT_ACTIVE'
          ) {
            persistWorkspaceSessionState(null);

            try {
              const workspaces = await authApi.listWorkspaces(persistedHeaders);
              if (!active) {
                return;
              }

              if (workspaces.length === 0) {
                const snapshot = readPersistedAuthSnapshot();
                if (snapshot.platformAuth.user) {
                  persistPlatformAuthState({
                    ...snapshot.platformAuth,
                    user: {
                      ...snapshot.platformAuth.user,
                      workspaceCount: 0,
                    },
                    admin: null,
                    principalType: 'user',
                  });
                }
                redirectTo('/workspace/create');
                return;
              }

              const restoredSession = await authApi.switchWorkspace(
                {
                  workspaceId: workspaces[0].workspaceId,
                  rememberAsDefault: false,
                },
                persistedHeaders,
              );

              if (!active) {
                return;
              }

              persistWorkspaceSessionState(mapWorkspaceSessionDtoToState(restoredSession));
              allowAccess();
              return;
            } catch {
              redirectTo('/workspace/create');
              return;
            }
          }
        }

        redirectTo('/login');
      }
    };

    void restoreAccess();

    return () => {
      active = false;
      hideLoading(loadingId);
    };
  }, [hideLoading, options?.loadingMessage, pathname, router, showLoading]);

  return checkingAccess;
};