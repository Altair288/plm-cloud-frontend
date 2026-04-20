'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Divider, message, Collapse, Checkbox, Flex } from 'antd';
import { GoogleOutlined, CheckCircleFilled } from '@ant-design/icons';
import { evaluatePassword } from '@/utils/passwordRules';
import { authApi, isAuthErrorResponse } from '@/services/auth';
import type { AuthSendRegisterEmailCodeResponseDto } from '@/models/auth';
import { useRouter } from 'next/navigation';
import { encryptPasswordWithPublicKey } from '@/utils/passwordEncryption';
import URXBgSvg from '@/assets/URX-bg.svg';
import Image from 'next/image';
import NextLink from 'next/link';

const { Title, Text, Link: AntLink } = Typography;

interface RegisterFormValues {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  code?: string;
  agreePersonal?: boolean;
  agreeMarketing?: boolean;
}

const RegisterPage: React.FC = () => {
  const [form] = Form.useForm<RegisterFormValues>();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [activeKey, setActiveKey] = useState<string>('1');
  const [secondUnlocked, setSecondUnlocked] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState<AuthSendRegisterEmailCodeResponseDto | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationCodeError, setVerificationCodeError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const emailValue = Form.useWatch('email', form);
  const passwordValue = Form.useWatch('password', form);

  // 规则评估函数
  const passwordRules = evaluatePassword(passwordValue || '');

  useEffect(()=> {
    if (passwordRules.score !== passwordStrength) setPasswordStrength(passwordRules.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordValue, passwordRules.score]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  // 失焦后才执行的邮箱合法性（顶级域要求至少2位字母）
  const emailValidRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  useEffect(()=> {
    if(emailFocused){
      // 聚焦期间不显示勾
      if(emailValidated) setEmailValidated(false);
    }
  }, [emailValue, emailFocused, emailValidated]);

  useEffect(() => {
    if (!verificationInfo) {
      return;
    }

    if ((emailValue || '').trim() === verificationInfo.email) {
      return;
    }

    setSecondUnlocked(false);
    setVerificationInfo(null);
    setVerificationCode('');
    setVerificationCodeError(null);
    setResendCountdown(0);
    setActiveKey('1');
  }, [emailValue, verificationInfo]);

  const router = useRouter();

  const applyRegisterError = (error: unknown, mode: 'send-code' | 'register') => {
    if (!isAuthErrorResponse(error)) {
      message.error(mode === 'send-code' ? '验证码发送失败，请稍后重试' : '注册失败，请稍后重试');
      return;
    }

    if (mode === 'send-code') {
      if (error.code === 'EMAIL_ALREADY_EXISTS') {
        form.setFields([{ name: 'email', errors: ['该邮箱已注册'] }]);
        return;
      }

      if (error.code === 'INVALID_ARGUMENT') {
        form.setFields([{ name: 'email', errors: [error.message || '请输入有效邮箱'] }]);
        return;
      }

      message.error(error.message || '验证码发送失败，请稍后重试');
      return;
    }

    if (error.code === 'USERNAME_ALREADY_EXISTS') {
      form.setFields([{ name: 'username', errors: ['用户名已存在'] }]);
      setActiveKey('1');
      return;
    }

    if (error.code === 'EMAIL_ALREADY_EXISTS') {
      form.setFields([{ name: 'email', errors: ['邮箱已存在'] }]);
      setActiveKey('1');
      return;
    }

    if (error.code === 'PHONE_ALREADY_EXISTS') {
      form.setFields([{ name: 'phone', errors: ['手机号已存在'] }]);
      setActiveKey('1');
      return;
    }

    if (error.code === 'EMAIL_VERIFICATION_CODE_INVALID') {
      setVerificationCodeError('验证码错误');
      setActiveKey('2');
      return;
    }

    if (error.code === 'EMAIL_VERIFICATION_CODE_EXPIRED') {
      setVerificationCodeError('验证码已过期，请重新发送');
      setActiveKey('2');
      return;
    }

    message.error(error.message || '注册失败，请稍后重试');
  };

  const sendEmailCode = async () => {
    try {
      await form.validateFields(['username', 'displayName', 'email', 'password', 'confirmPassword', 'phone']);
    } catch {
      message.error('请先正确填写账户信息');
      return;
    }

    const email = (form.getFieldValue('email') || '').trim();
    if (!email) {
      return;
    }

    setSendingCode(true);

    try {
      const response = await authApi.sendRegisterEmailCode({ email });
      setVerificationInfo(response);
      setVerificationCode('');
      setVerificationCodeError(null);
      setResendCountdown(response.resendCooldownSeconds);
      setSecondUnlocked(true);
      setActiveKey('2');
      message.success('验证码已发送，请查收邮箱');
    } catch (error) {
      applyRegisterError(error, 'send-code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    const sanitizedVerificationCode = verificationCode.replace(/\D/g, '').slice(0, 6);
    if (sanitizedVerificationCode.length !== 6) {
      setVerificationCodeError('请输入 6 位数字验证码');
      setActiveKey('2');
      return;
    }

    setLoading(true);
    setVerificationCodeError(null);

    try {
      const encryptionKey = await authApi.getPasswordEncryptionKey();
      const passwordCiphertext = await encryptPasswordWithPublicKey(
        values.password,
        encryptionKey.publicKeyBase64 || encryptionKey.publicKeyPem || '',
        encryptionKey.transformation,
      );
      const confirmPasswordCiphertext = await encryptPasswordWithPublicKey(
        values.confirmPassword,
        encryptionKey.publicKeyBase64 || encryptionKey.publicKeyPem || '',
        encryptionKey.transformation,
      );

      const response = await authApi.registerAccount({
        username: values.username.trim(),
        displayName: values.displayName.trim(),
        email: values.email,
        passwordCiphertext,
        confirmPasswordCiphertext,
        encryptionKeyId: encryptionKey.keyId,
        emailVerificationCode: sanitizedVerificationCode,
        phone: values.phone?.trim() || null,
      });

      message.success('注册成功，请登录');
      router.push(`/login?identifier=${encodeURIComponent(response.username)}`);
    } catch (error) {
      applyRegisterError(error, 'register');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    await sendEmailCode();
  };

  const collapseItems = [
    {
      key: '1',
      label: '账户信息',
      children: (
        <>
          <div className="form-row">
            <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]} className="form-item-half">
              <Input placeholder="例如 alice_001" className="form-input" size="large" />
            </Form.Item>
            <Form.Item label="显示名称" name="displayName" rules={[{ required: true, message: '请输入显示名称' }]} className="form-item-half">
              <Input placeholder="例如 Alice" className="form-input" size="large" />
            </Form.Item>
          </div>
          <div className="form-row">
            <Form.Item label="商务电子邮件" name="email" rules={[{ required: true, message: '请输入电子邮件' },{ type:'email', message:'格式不正确'}]} className="form-item-half">
              <div className="input-with-indicator">
                <Input 
                  placeholder="name@company.com" 
                  className="form-input" 
                  size="large"
                  onFocus={()=> { setEmailFocused(true); }}
                  onBlur={()=> { 
                    setEmailFocused(false); 
                    const v = form.getFieldValue('email') || ''; 
                    setEmailValidated(emailValidRegex.test(v)); 
                  }}
                  suffix={(!emailFocused && emailValidated) ? <CheckCircleFilled className="rule-icon-pass" /> : undefined}
                />
                <div className="field-hint">我们将向您发送一个 6 位数字代码，用于在步骤 2 中验证您的电子邮件。</div>
              </div>
            </Form.Item>
            <Form.Item label="手机号" name="phone" rules={[{ pattern: /^$|^1\d{10}$/, message: '请输入有效手机号' }]} className="form-item-half">
              <Input placeholder="选填，11 位手机号" className="form-input" size="large" />
            </Form.Item>
          </div>
          <div className="form-row">
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' },{ min:12, message:'密码至少 12 位'}]} className="form-item-half">
              <>
                <div className="password-input-wrapper">
                  <Input.Password 
                    placeholder="12-63 个字符" 
                    className="form-input" 
                    size="large"
                    maxLength={63}
                    onFocus={()=> setShowPasswordRules(true)}
                    onBlur={()=> setShowPasswordRules(false)}
                    onChange={(e)=> form.setFieldsValue({ password: e.target.value })}
                    value={passwordValue}
                  />
                  {showPasswordRules && (
                    <div className="password-rules-panel" role="list" aria-label="密码规则" onMouseDown={(e)=> e.preventDefault()}>
                      <div className={`rule-item ${passwordRules.lengthOk ? 'pass' : ''}`} role="listitem">
                        <CheckCircleFilled className={passwordRules.lengthOk ? 'rule-icon-pass':'rule-icon'} /> 12-63 个字符
                      </div>
                      <div className={`rule-item ${passwordRules.hasUpper ? 'pass' : ''}`} role="listitem">
                        <CheckCircleFilled className={passwordRules.hasUpper ? 'rule-icon-pass':'rule-icon'} /> 一个大写字符
                      </div>
                      <div className={`rule-item ${passwordRules.hasLower ? 'pass' : ''}`} role="listitem">
                        <CheckCircleFilled className={passwordRules.hasLower ? 'rule-icon-pass':'rule-icon'} /> 一个小写字符
                      </div>
                      <div className={`rule-item ${passwordRules.hasDigit ? 'pass' : ''}`} role="listitem">
                        <CheckCircleFilled className={passwordRules.hasDigit ? 'rule-icon-pass':'rule-icon'} /> 一个数字
                      </div>
                      <div className={`rule-item ${passwordRules.hasSpecial ? 'pass' : ''}`} role="listitem">
                        <CheckCircleFilled className={passwordRules.hasSpecial ? 'rule-icon-pass':'rule-icon'} /> 至少一个特殊字符 (可提升强度)
                      </div>
                      <div className={`rule-item ${passwordRules.strongEnough ? 'pass' : ''}`} role="listitem">
                        <CheckCircleFilled className={passwordRules.strongEnough ? 'rule-icon-pass':'rule-icon'} /> 足够强
                      </div>
                      <div className={`rule-item ${passwordRules.hasNoDoubleByte ? 'pass' : ''}`} role="listitem">
                        <CheckCircleFilled className={passwordRules.hasNoDoubleByte ? 'rule-icon-pass':'rule-icon'} /> 不含双字节字符
                      </div>
                      <div className="rule-item description" role="listitem">
                        使用更长的词语组合或短语来提高安全性。
                      </div>
                      <div className="password-strength-wrapper inline inside-panel">
                        <div className={`strength-bars strength-${passwordStrength}`} aria-label={`密码强度: ${['极弱','较弱','一般','较强','很强'][passwordStrength]}`}> 
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className="strength-label">{['极弱','较弱','一般','较强','很强'][passwordStrength]}</div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            </Form.Item>
            <Form.Item
              label="确认密码"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
              className="form-item-half"
            >
              <Input.Password placeholder="再次输入密码" className="form-input" size="large" maxLength={63} />
            </Form.Item>
          </div>
          <div className="panel-actions">
            <Button type="primary" size="large" block onClick={handleNext} loading={sendingCode}>发送验证码并继续</Button>
          </div>
        </>
      ),
    },
    {
      key: '2',
      label: '邮箱验证',
      collapsible: secondUnlocked ? undefined : 'disabled' as const,
      children: (
        <>
          <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
            <Text type="secondary">
              {verificationInfo
                ? <>我们已向 <strong>{verificationInfo.maskedEmail}</strong> 发送了 6 位数字验证码。</>
                : <>我们向 <strong>{form.getFieldValue('email') || '您的邮箱'}</strong> 发送了 6 位数字验证码。</>}
            </Text>
            <Button type="link" onClick={sendEmailCode} disabled={sendingCode || resendCountdown > 0}>
              {resendCountdown > 0 ? `${resendCountdown}s 后重发` : '重新发送'}
            </Button>
          </Flex>
          {verificationInfo ? (
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              验证码有效期 {verificationInfo.expireInSeconds} 秒，过期后请重新发送。
            </Text>
          ) : null}
          <Form.Item 
            label="验证码"
            required
            validateStatus={verificationCodeError ? 'error' : undefined}
            help={verificationCodeError ?? undefined}
          >
            <Flex gap="small" align="flex-start" vertical>
              <Input.OTP 
                length={6} 
                size="large" 
                value={verificationCode}
                formatter={(str)=> str.replace(/\D/g,'')}
                onChange={(str)=> {
                  const cleaned = (str||'').replace(/\D/g,'').slice(0,6);
                  setVerificationCode(cleaned);
                  if (verificationCodeError) {
                    setVerificationCodeError(null);
                  }
                  if(cleaned.length === 6){
                    setVerificationCodeError(null);
                  }
                }}
                className="otp-input" 
              />
            </Flex>
          </Form.Item>
          <Form.Item name="agreePersonal" valuePropName="checked" rules={[{ validator:(_,v)=> v?Promise.resolve():Promise.reject('请勾选同意声明') }]}> 
            <Checkbox>本人同意，为方便提供服务，个人信息可按需处理。</Checkbox>
          </Form.Item>
          <Form.Item name="agreeMarketing" valuePropName="checked"> 
            <Checkbox>我同意接收与产品相关的资讯与更新（可选）。</Checkbox>
          </Form.Item>
          <div className="panel-actions">
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>完成注册</Button>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="ibm-register-page">
      {/* Header */}
      <header className="ibm-register-header">
        <div className="ibm-header-content">
          <span className="ibm-logo">PLM Cloud Platform</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="register-main">
        <div className="register-container">
          {/* 左侧SVG背景区域 */}
          <div className="register-left-section">
            <div className="art-background">
              <Image src={URXBgSvg} alt="" className="bg-svg" aria-hidden="true" />
            </div>
          </div>

          {/* 右侧表单区域 */}
          <div className="register-right-section">
          <div className="form-container">
            <div className="form-header">
              <Title level={2} className="form-title">创建 PLM Cloud Platform 账号</Title>
              <Text className="form-subtitle">
                已有 PLM Cloud Platform 账号？ <NextLink href="/login" passHref legacyBehavior><AntLink>登录</AntLink></NextLink>
              </Text>
            </div>

            <div className="google-signin">
              <Button
                block
                icon={<GoogleOutlined />}
                className="google-btn"
                size="large"
              >
                Sign up with Google
              </Button>
            </div>

            <Divider className="form-divider" plain>或</Divider>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleRegister}
              autoComplete="off"
              className="register-form"
            >
              <Collapse
                accordion
                activeKey={activeKey}
                onChange={(key)=> {
                  const nextKey = Array.isArray(key) ? String(key[0] ?? '1') : String(key ?? '1');
                  // 禁止用户跳过第一步直接打开第二步
                  if(!secondUnlocked && nextKey === '2') return;
                  setActiveKey(nextKey);
                }}
                ghost
                className="form-collapse"
                items={collapseItems}
              />
              <div className="form-footer">
                <Text type="secondary" className="footer-text">
                  继续操作即表示您同意我们的 <NextLink href="#" passHref legacyBehavior><AntLink>隐私政策</AntLink></NextLink> 与 <NextLink href="#" passHref legacyBehavior><AntLink>使用条款</AntLink></NextLink>。
                </Text>
              </div>
            </Form>

            <div className="bottom-actions">
              <Button type="link" className="cancel-btn" onClick={() => router.push('/login')}>返回登录</Button>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="ibm-register-footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#">联系</a>
            <a href="#">隐私条款</a>
            <a href="#">使用条款</a>
            <a href="#">Cookie 首选项</a>
          </div>
          <div className="footer-copyright">
            Powered by PLM Cloud Platform © 2026 All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;
