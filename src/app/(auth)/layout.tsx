"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import './login/login.css';
import './register/register.css';
import './admin-login/admin-login.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;
    const persistedHeaders = readPersistedAuthHeaders();

    if (!persistedHeaders.platformToken || !persistedHeaders.platformTokenName) {
      setCheckingAccess(false);
      return;
    }

    const loadingId = showLoading('正在检查登录状态...');

    const allowAuthPage = () => {
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

    const restoreSession = async () => {
      try {
        const me = await authApi.getMe(persistedHeaders);

        if (!active) {
          return;
        }

        const currentSnapshot = readPersistedAuthSnapshot();
        persistPlatformAuthState({
          ...currentSnapshot.platformAuth,
          user: me.user,
        });

        const shouldCreateWorkspace = me.user.isFirstLogin || me.user.workspaceCount === 0;

        if (shouldCreateWorkspace) {
          persistWorkspaceSessionState(null);
          redirectTo('/workspace/create');
          return;
        }

        if (me.currentWorkspace) {
          persistWorkspaceSessionState(mapWorkspaceSessionDtoToState(me.currentWorkspace));
          redirectTo('/dashboard');
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
        redirectTo('/dashboard');
      } catch (error) {
        if (!active) {
          return;
        }

        if (isAuthErrorResponse(error) && error.code === 'AUTH_NOT_LOGGED_IN') {
          clearPersistedAuthState();
        }

        allowAuthPage();
      }
    };

    void restoreSession();

    return () => {
      active = false;
      hideLoading(loadingId);
    };
  }, [hideLoading, router, showLoading]);

  if (checkingAccess) {
    return null;
  }

  return children;
}
