import request from './request';
import type {
  AuthCreateWorkspaceRequestDto,
  AuthErrorCode,
  AuthErrorResponseDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
  AuthPasswordLoginRequestDto,
  AuthRegisterRequestDto,
  AuthRegisterResponseDto,
  AuthRequestHeaders,
  AuthSendRegisterEmailCodeRequestDto,
  AuthSendRegisterEmailCodeResponseDto,
  AuthSwitchWorkspaceRequestDto,
  AuthWorkspaceSessionDto,
  AuthWorkspaceSummaryDto,
  PlatformAuthState,
  WorkspaceSessionState,
} from '@/models/auth';

export type {
  AuthCreateWorkspaceRequestDto,
  AuthErrorCode,
  AuthErrorResponseDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
  AuthPasswordLoginRequestDto,
  AuthRegisterRequestDto,
  AuthRegisterResponseDto,
  AuthRequestHeaders,
  AuthSendRegisterEmailCodeRequestDto,
  AuthSendRegisterEmailCodeResponseDto,
  AuthSwitchWorkspaceRequestDto,
  AuthUserStatus,
  AuthWorkspaceMemberStatus,
  AuthWorkspaceSessionDto,
  AuthWorkspaceStatus,
  AuthWorkspaceSummaryDto,
  AuthWorkspaceType,
  PlatformAuthState,
  WorkspaceSessionState,
} from '@/models/auth';

const AUTH_BASE = '/auth';
const AUTH_PUBLIC_BASE = `${AUTH_BASE}/public`;
const AUTH_WORKSPACE_SESSION_BASE = `${AUTH_BASE}/workspace-session`;

const normalize204Response = <T>(data: T | '' | null | undefined): T | null => {
  if (data === '' || data == null) {
    return null;
  }

  return data;
};

export const buildAuthHeaders = (authHeaders?: AuthRequestHeaders): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (authHeaders?.platformTokenName && authHeaders.platformToken) {
    headers[authHeaders.platformTokenName] = authHeaders.platformToken;
  }

  if (authHeaders?.workspaceTokenName && authHeaders.workspaceToken) {
    headers[authHeaders.workspaceTokenName] = authHeaders.workspaceToken;
  }

  return headers;
};

export const isAuthErrorResponse = (error: unknown): error is AuthErrorResponseDto => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return 'status' in error && 'message' in error && 'code' in error;
};

export const authApi = {
  sendRegisterEmailCode(
    data: AuthSendRegisterEmailCodeRequestDto,
  ): Promise<AuthSendRegisterEmailCodeResponseDto> {
    return request.post(`${AUTH_PUBLIC_BASE}/register/email-code`, data);
  },

  registerAccount(data: AuthRegisterRequestDto): Promise<AuthRegisterResponseDto> {
    return request.post(`${AUTH_PUBLIC_BASE}/register`, data);
  },

  loginWithPassword(data: AuthPasswordLoginRequestDto): Promise<AuthLoginResponseDto> {
    return request.post(`${AUTH_PUBLIC_BASE}/login/password`, data);
  },

  logout(authHeaders: AuthRequestHeaders): Promise<void> {
    return request.post(`${AUTH_BASE}/logout`, undefined, {
      headers: buildAuthHeaders(authHeaders),
    }).then(() => undefined);
  },

  getMe(authHeaders: AuthRequestHeaders): Promise<AuthMeResponseDto> {
    return request.get(`${AUTH_BASE}/me`, {
      headers: buildAuthHeaders(authHeaders),
    });
  },

  listWorkspaces(authHeaders: AuthRequestHeaders): Promise<AuthWorkspaceSummaryDto[]> {
    return request.get(`${AUTH_BASE}/workspaces`, {
      headers: buildAuthHeaders(authHeaders),
    });
  },

  createWorkspace(
    data: AuthCreateWorkspaceRequestDto,
    authHeaders: AuthRequestHeaders,
  ): Promise<AuthWorkspaceSessionDto> {
    return request.post(`${AUTH_BASE}/workspaces`, data, {
      headers: buildAuthHeaders(authHeaders),
    });
  },

  switchWorkspace(
    data: AuthSwitchWorkspaceRequestDto,
    authHeaders: AuthRequestHeaders,
  ): Promise<AuthWorkspaceSessionDto> {
    return request.post(`${AUTH_WORKSPACE_SESSION_BASE}/switch`, data, {
      headers: buildAuthHeaders(authHeaders),
    });
  },

  getCurrentWorkspaceSession(authHeaders: AuthRequestHeaders): Promise<AuthWorkspaceSessionDto | null> {
    return request.get(`${AUTH_WORKSPACE_SESSION_BASE}/current`, {
      headers: buildAuthHeaders(authHeaders),
    }).then((response) => normalize204Response(response as unknown as AuthWorkspaceSessionDto | '' | null | undefined));
  },

  clearCurrentWorkspaceSession(authHeaders: AuthRequestHeaders): Promise<void> {
    return request.delete(`${AUTH_WORKSPACE_SESSION_BASE}/current`, {
      headers: buildAuthHeaders(authHeaders),
    }).then(() => undefined);
  },
};

export interface RegisterPayload {
  email: string;
  password: string;
  givenName: string;
  surname: string;
  company: string;
}

export interface RegisterResult {
  success: boolean;
  userId?: string;
}

export function register(data: RegisterPayload): Promise<RegisterResult> {
  return request.post('/api/auth/register', data).then(() => ({ success: true }));
}
