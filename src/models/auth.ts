type OpenEndedUnion<T extends string> = T | (string & {});

export type AuthUserStatus = OpenEndedUnion<'ACTIVE' | 'INACTIVE' | 'DISABLED' | 'LOCKED'>;

export type AuthWorkspaceStatus = OpenEndedUnion<'ACTIVE' | 'INACTIVE' | 'FROZEN'>;

export type AuthWorkspaceMemberStatus = OpenEndedUnion<'ACTIVE' | 'INACTIVE'>;

export type AuthWorkspaceType = OpenEndedUnion<'DEFAULT'>;

export type AuthErrorCode = OpenEndedUnion<
  | 'INVALID_ARGUMENT'
  | 'AUTH_NOT_LOGGED_IN'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'EMAIL_ALREADY_EXISTS'
  | 'PHONE_ALREADY_EXISTS'
  | 'USERNAME_ALREADY_EXISTS'
  | 'EMAIL_VERIFICATION_CODE_INVALID'
  | 'EMAIL_VERIFICATION_CODE_EXPIRED'
  | 'EMAIL_VERIFICATION_SEND_TOO_FREQUENT'
  | 'EMAIL_VERIFICATION_SEND_FAILED'
  | 'EMAIL_VERIFICATION_DISABLED'
  | 'EMAIL_VERIFICATION_NOT_CONFIGURED'
  | 'USER_NOT_ACTIVE'
  | 'WORKSPACE_CODE_ALREADY_EXISTS'
  | 'WORKSPACE_MEMBER_NOT_FOUND'
  | 'WORKSPACE_MEMBER_INACTIVE'
  | 'WORKSPACE_NOT_FOUND'
  | 'WORKSPACE_NOT_ACTIVE'
  | 'GATEWAY_ROUTE_NOT_FOUND'
  | 'GATEWAY_DOWNSTREAM_UNAVAILABLE'
  | 'GATEWAY_INTERNAL_ERROR'
>;

export interface AuthErrorResponseDto {
  timestamp: string;
  status: number;
  error: string;
  code: AuthErrorCode;
  message: string;
  path: string;
}

export interface AuthUserSummaryDto {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: AuthUserStatus;
}

export interface AuthWorkspaceSummaryDto {
  workspaceId: string;
  workspaceCode: string;
  workspaceName: string;
  workspaceStatus: AuthWorkspaceStatus;
  workspaceMemberId: string;
  memberStatus: AuthWorkspaceMemberStatus;
  isDefaultWorkspace: boolean;
}

export interface AuthWorkspaceSessionDto {
  workspaceToken: string;
  workspaceTokenName: string;
  workspaceId: string;
  workspaceCode: string;
  workspaceName: string;
  workspaceMemberId: string;
  roleCodes: string[];
}

export interface AuthRequestHeaders {
  platformTokenName?: string | null;
  platformToken?: string | null;
  workspaceTokenName?: string | null;
  workspaceToken?: string | null;
}

export interface AuthSendRegisterEmailCodeRequestDto {
  email: string;
}

export interface AuthSendRegisterEmailCodeResponseDto {
  email: string;
  maskedEmail: string;
  expiresAt: string;
  expireInSeconds: number;
  resendCooldownSeconds: number;
}

export interface AuthRegisterRequestDto {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  email: string;
  emailVerificationCode: string;
  phone?: string | null;
}

export interface AuthRegisterResponseDto {
  userId: string;
  username: string;
  displayName: string;
  registeredAt: string;
}

export interface AuthPasswordLoginRequestDto {
  identifier: string;
  password: string;
}

export interface AuthLoginResponseDto {
  platformToken: string;
  platformTokenName: string;
  user: AuthUserSummaryDto;
  defaultWorkspace: AuthWorkspaceSummaryDto | null;
  workspaceOptions: AuthWorkspaceSummaryDto[];
  currentWorkspace: AuthWorkspaceSessionDto | null;
}

export interface AuthMeResponseDto {
  user: AuthUserSummaryDto;
  defaultWorkspace: AuthWorkspaceSummaryDto | null;
  workspaceOptions: AuthWorkspaceSummaryDto[];
  currentWorkspace: AuthWorkspaceSessionDto | null;
}

export interface AuthListWorkspacesResponseDto extends Array<AuthWorkspaceSummaryDto> {}

export interface AuthCreateWorkspaceRequestDto {
  workspaceName: string;
  workspaceCode: string;
  workspaceType: AuthWorkspaceType;
  defaultLocale: string;
  defaultTimezone: string;
  rememberAsDefault?: boolean;
}

export interface AuthSwitchWorkspaceRequestDto {
  workspaceId: string;
  rememberAsDefault?: boolean;
}

export interface PlatformAuthState {
  platformToken: string | null;
  platformTokenName: string | null;
  user: AuthUserSummaryDto | null;
}

export interface WorkspaceSessionState {
  workspaceToken: string | null;
  workspaceTokenName: string | null;
  workspaceId: string | null;
  workspaceCode: string | null;
  workspaceName: string | null;
  workspaceMemberId: string | null;
  roleCodes: string[];
}

export const createEmptyPlatformAuthState = (): PlatformAuthState => ({
  platformToken: null,
  platformTokenName: null,
  user: null,
});

export const createEmptyWorkspaceSessionState = (): WorkspaceSessionState => ({
  workspaceToken: null,
  workspaceTokenName: null,
  workspaceId: null,
  workspaceCode: null,
  workspaceName: null,
  workspaceMemberId: null,
  roleCodes: [],
});