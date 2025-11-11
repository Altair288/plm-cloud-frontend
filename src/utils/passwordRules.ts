export interface PasswordRuleState {
  lengthOk: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  hasNoDoubleByte: boolean;
  strongEnough: boolean;
  score: number; // 0-4 for meter
}

/**
 * 评估密码各项规则与强度
 * 长度要求: 12-63
 * 强度计分: 长度 + 大小写组合 + 数字 + 特殊字符
 */
export function evaluatePassword(password: string): PasswordRuleState {
  const pwd = password || '';
  const lengthOk = pwd.length >= 12 && pwd.length <= 63;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const hasNoDoubleByte = Array.from(pwd).every(ch => ch.charCodeAt(0) <= 255);
  let score = 0;
  if (lengthOk) score++;
  if (hasUpper && hasLower) score++;
  if (hasDigit) score++;
  if (hasSpecial) score++;
  const upperLowerScore = (hasUpper && hasLower) ? 1 : 0;
  const strongEnough = lengthOk && (upperLowerScore + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0) >= 2);
  return { lengthOk, hasUpper, hasLower, hasDigit, hasSpecial, hasNoDoubleByte, strongEnough, score };
}
