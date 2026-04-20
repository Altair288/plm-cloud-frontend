import type {
  AuthRequestHeaders,
  AuthWorkspaceSessionDto,
  PlatformAuthState,
  WorkspaceSessionState,
} from '@/models/auth';
import { createEmptyPlatformAuthState, createEmptyWorkspaceSessionState } from '@/models/auth';

type AuthPersistence = 'local' | 'session';

export interface AuthStorageSnapshot {
  platformAuth: PlatformAuthState;
  workspaceSession: WorkspaceSessionState;
}

const AUTH_STORAGE_KEY = 'plm-auth-snapshot';
const AUTH_PERSISTENCE_KEY = 'plm-auth-persistence';
const AUTH_SESSION_COOKIE_KEY = 'plm-auth-session-active';

const createEmptyAuthStorageSnapshot = (): AuthStorageSnapshot => ({
  platformAuth: createEmptyPlatformAuthState(),
  workspaceSession: createEmptyWorkspaceSessionState(),
});

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

const getLegacySessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage;
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

const readLocalStorageSnapshot = (): AuthStorageSnapshot | null => {
  const storage = getLocalStorage();
  return storage ? parseAuthStorageSnapshot(storage.getItem(AUTH_STORAGE_KEY)) : null;
};

const readLegacySessionStorageSnapshot = (): AuthStorageSnapshot | null => {
  const storage = getLegacySessionStorage();
  return storage ? parseAuthStorageSnapshot(storage.getItem(AUTH_STORAGE_KEY)) : null;
};

const readPersistedAuthMode = (): AuthPersistence | null => {
  const storage = getLocalStorage();
  const mode = storage?.getItem(AUTH_PERSISTENCE_KEY);
  return mode === 'local' || mode === 'session' ? mode : null;
};

const hasSessionCookieMarker = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie
    .split('; ')
    .some((entry) => entry.startsWith(`${AUTH_SESSION_COOKIE_KEY}=`));
};

const persistSessionCookieMarker = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${AUTH_SESSION_COOKIE_KEY}=1; Path=/; SameSite=Lax`;
};

const clearSessionCookieMarker = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${AUTH_SESSION_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
};

const clearLocalStorageSnapshot = (): void => {
  const storage = getLocalStorage();
  storage?.removeItem(AUTH_STORAGE_KEY);
  storage?.removeItem(AUTH_PERSISTENCE_KEY);
};

const clearLegacySessionStorageSnapshot = (): void => {
  const storage = getLegacySessionStorage();
  storage?.removeItem(AUTH_STORAGE_KEY);
};

const clearPersistedSessionArtifacts = (): void => {
  clearSessionCookieMarker();
  clearLegacySessionStorageSnapshot();
};

const readModernPersistedSnapshot = (): AuthStorageSnapshot | null => {
  const snapshot = readLocalStorageSnapshot();
  if (!snapshot) {
    return null;
  }

  const persistence = readPersistedAuthMode() ?? 'local';
  if (persistence === 'local') {
    return snapshot;
  }

  if (hasSessionCookieMarker()) {
    return snapshot;
  }

  clearLocalStorageSnapshot();
  return null;
};

const resolvePersistedAuthPersistence = (): AuthPersistence => {
  if (readLocalStorageSnapshot()) {
    return readPersistedAuthMode() ?? 'local';
  }

  if (readLegacySessionStorageSnapshot()) {
    return 'session';
  }

  return 'local';
};

export const readPersistedAuthSnapshot = (): AuthStorageSnapshot => {
  return readModernPersistedSnapshot() ?? readLegacySessionStorageSnapshot() ?? createEmptyAuthStorageSnapshot();
};

export const persistAuthSnapshot = (
  snapshot: AuthStorageSnapshot,
  persistence: AuthPersistence = 'local',
): void => {
  clearLocalStorageSnapshot();
  clearPersistedSessionArtifacts();

  const storage = getLocalStorage();
  storage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
  storage?.setItem(AUTH_PERSISTENCE_KEY, persistence);

  if (persistence === 'session') {
    persistSessionCookieMarker();
  }
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

  persistAuthSnapshot(
    nextSnapshot,
    options?.remember === undefined
      ? resolvePersistedAuthPersistence()
      : options.remember === false
        ? 'session'
        : 'local',
  );
};

export const mapPersistedAuthSnapshotToHeaders = (
  snapshot: AuthStorageSnapshot,
): AuthRequestHeaders => ({
  platformToken: snapshot.platformAuth.platformToken,
  platformTokenName: snapshot.platformAuth.platformTokenName,
  workspaceToken: snapshot.workspaceSession.workspaceToken,
  workspaceTokenName: snapshot.workspaceSession.workspaceTokenName,
});

export const readPersistedAuthHeaders = (): AuthRequestHeaders => {
  return mapPersistedAuthSnapshotToHeaders(readPersistedAuthSnapshot());
};

export const mapWorkspaceSessionDtoToState = (
  workspaceSession: AuthWorkspaceSessionDto | null,
): WorkspaceSessionState => {
  if (!workspaceSession) {
    return createEmptyWorkspaceSessionState();
  }

  return {
    workspaceToken: workspaceSession.workspaceToken,
    workspaceTokenName: workspaceSession.workspaceTokenName,
    workspaceId: workspaceSession.workspaceId,
    workspaceCode: workspaceSession.workspaceCode,
    workspaceName: workspaceSession.workspaceName,
    workspaceType: workspaceSession.workspaceType,
    defaultLocale: workspaceSession.defaultLocale,
    defaultTimezone: workspaceSession.defaultTimezone,
    workspaceMemberId: workspaceSession.workspaceMemberId,
    roleCodes: [...workspaceSession.roleCodes],
  };
};

export const persistWorkspaceSessionState = (
  workspaceSession: WorkspaceSessionState | null,
  options?: {
    remember?: boolean;
  },
): void => {
  const currentSnapshot = readPersistedAuthSnapshot();
  const nextSnapshot: AuthStorageSnapshot = {
    platformAuth: currentSnapshot.platformAuth,
    workspaceSession: workspaceSession ?? createEmptyWorkspaceSessionState(),
  };

  persistAuthSnapshot(
    nextSnapshot,
    options?.remember === undefined
      ? resolvePersistedAuthPersistence()
      : options.remember === false
        ? 'session'
        : 'local',
  );
};

export const clearPersistedAuthState = (): void => {
  clearLocalStorageSnapshot();
  clearPersistedSessionArtifacts();
};