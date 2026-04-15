import type { PlatformAuthState, WorkspaceSessionState } from '@/models/auth';
import { createEmptyPlatformAuthState, createEmptyWorkspaceSessionState } from '@/models/auth';

type AuthPersistence = 'local' | 'session';

export interface AuthStorageSnapshot {
  platformAuth: PlatformAuthState;
  workspaceSession: WorkspaceSessionState;
}

const AUTH_STORAGE_KEY = 'plm-auth-snapshot';

const createEmptyAuthStorageSnapshot = (): AuthStorageSnapshot => ({
  platformAuth: createEmptyPlatformAuthState(),
  workspaceSession: createEmptyWorkspaceSessionState(),
});

const getStorage = (persistence: AuthPersistence): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return persistence === 'local' ? window.localStorage : window.sessionStorage;
};

const parseAuthStorageSnapshot = (rawValue: string | null): AuthStorageSnapshot | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AuthStorageSnapshot>;
    return {
      platformAuth: {
        ...createEmptyPlatformAuthState(),
        ...(parsed.platformAuth ?? {}),
      },
      workspaceSession: {
        ...createEmptyWorkspaceSessionState(),
        ...(parsed.workspaceSession ?? {}),
      },
    };
  } catch {
    return null;
  }
};

const readStorageSnapshot = (persistence: AuthPersistence): AuthStorageSnapshot | null => {
  const storage = getStorage(persistence);
  return storage ? parseAuthStorageSnapshot(storage.getItem(AUTH_STORAGE_KEY)) : null;
};

const clearStorageSnapshot = (persistence: AuthPersistence): void => {
  const storage = getStorage(persistence);
  storage?.removeItem(AUTH_STORAGE_KEY);
};

export const readPersistedAuthSnapshot = (): AuthStorageSnapshot => {
  return readStorageSnapshot('local') ?? readStorageSnapshot('session') ?? createEmptyAuthStorageSnapshot();
};

export const persistAuthSnapshot = (
  snapshot: AuthStorageSnapshot,
  persistence: AuthPersistence = 'local',
): void => {
  clearStorageSnapshot('local');
  clearStorageSnapshot('session');

  const storage = getStorage(persistence);
  storage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
};

export const persistPlatformAuthState = (
  platformAuth: PlatformAuthState,
  options?: {
    remember?: boolean;
    resetWorkspace?: boolean;
  },
): void => {
  const currentSnapshot = readPersistedAuthSnapshot();
  const nextSnapshot: AuthStorageSnapshot = {
    platformAuth,
    workspaceSession: options?.resetWorkspace ? createEmptyWorkspaceSessionState() : currentSnapshot.workspaceSession,
  };

  persistAuthSnapshot(nextSnapshot, options?.remember === false ? 'session' : 'local');
};

export const clearPersistedAuthState = (): void => {
  clearStorageSnapshot('local');
  clearStorageSnapshot('session');
};