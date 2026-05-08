'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { authApi, isAuthErrorResponse } from '@/services/auth';
import {
  clearPersistedAuthState,
  persistPlatformAuthState,
  readPersistedAuthHeaders,
  readPersistedAuthSnapshot,
} from '@/utils/authStorage';

interface UseProtectedPlatformAdminAccessOptions {
  loadingMessage?: string;
}

export const useProtectedPlatformAdminAccess = (
  options?: UseProtectedPlatformAdminAccessOptions,
): boolean => {
  const router = useRouter();
  const { showLoading, hideLoading } = useGlobalLoading();
  const persistedHeaders = readPersistedAuthHeaders();
  const persistedSnapshot = readPersistedAuthSnapshot();
  const platformToken = persistedHeaders.platformToken;
  const platformTokenName = persistedHeaders.platformTokenName;
  const hasPersistedPlatformAdminAccess = Boolean(
    persistedSnapshot.platformAuth.principalType === 'platform-admin'
    && platformToken
    && platformTokenName,
  );
  const [checkingAccess, setCheckingAccess] = useState(!hasPersistedPlatformAdminAccess);

  useEffect(() => {
    let active = true;
    const loadingId = hasPersistedPlatformAdminAccess
      ? null
      : showLoading(options?.loadingMessage ?? '正在验证平台管理员访问权限...');

    const allowAccess = () => {
      if (!active) {
        return;
      }

      if (loadingId !== null) {
        hideLoading(loadingId);
      }
      setCheckingAccess(false);
    };

    const redirectTo = (targetPath: string) => {
      if (!active) {
        return;
      }

      router.replace(targetPath);
    };

    const restoreAccess = async () => {
      const requestHeaders = {
        platformToken,
        platformTokenName,
      };

      if (!platformToken || !platformTokenName) {
        clearPersistedAuthState();
        redirectTo('/admin-login');
        return;
      }

      try {
        const me = await authApi.getPlatformAdminMe(requestHeaders);

        if (!active) {
          return;
        }

        const currentSnapshot = readPersistedAuthSnapshot();
        persistPlatformAuthState({
          ...currentSnapshot.platformAuth,
          user: null,
          admin: me.admin,
          principalType: 'platform-admin',
        });

        allowAccess();
      } catch (error) {
        if (!active) {
          return;
        }

        if (
          isAuthErrorResponse(error)
          && (
            error.code === 'AUTH_NOT_LOGGED_IN'
            || error.code === 'ACCOUNT_NOT_ACTIVE'
            || error.code === 'PLATFORM_ADMIN_REQUIRED'
          )
        ) {
          clearPersistedAuthState();
        }

        redirectTo('/admin-login');
      }
    };

    void restoreAccess();

    return () => {
      active = false;
      if (loadingId !== null) {
        hideLoading(loadingId);
      }
    };
  }, [hasPersistedPlatformAdminAccess, hideLoading, options?.loadingMessage, platformToken, platformTokenName, router, showLoading]);

  return checkingAccess;
};