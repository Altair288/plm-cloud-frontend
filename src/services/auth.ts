import request from '@/services/request';

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

// Placeholder register API call
export function register(data: RegisterPayload): Promise<RegisterResult> {
  // Replace '/api/auth/register' with actual backend endpoint when available
  return request.post('/api/auth/register', data).then(() => ({ success: true }));
}
