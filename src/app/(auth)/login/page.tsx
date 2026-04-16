'use client';

import { Form, Input, Button, Typography, Checkbox, Divider, message } from "antd";
import { useEffect, useState } from "react";
import { ArrowRightOutlined, GoogleOutlined, GithubOutlined, QuestionCircleOutlined, LeftOutlined } from "@ant-design/icons";
import Illustration from "@/assets/illustration-final.svg";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, isAuthErrorResponse } from '@/services/auth';
import { mapWorkspaceSessionDtoToState, persistPlatformAuthState, persistWorkspaceSessionState } from '@/utils/authStorage';

const { Title, Text } = Typography;

interface LoginFormValuesStep1 {
  plmId: string;
}
interface LoginFormValuesStep2 extends LoginFormValuesStep1 {
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const [stepOneForm] = Form.useForm<LoginFormValuesStep1>();
  const [stepTwoForm] = Form.useForm<LoginFormValuesStep2>();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [plmIdCache, setPlmIdCache] = useState('');
  const router = useRouter();

  useEffect(() => {
    const initialIdentifier = new URLSearchParams(window.location.search)
      .get('identifier')
      ?.trim();
    if (!initialIdentifier) {
      return;
    }

    setPlmIdCache(initialIdentifier);
    stepOneForm.setFieldsValue({ plmId: initialIdentifier });
  }, [stepOneForm]);

  const handleStep1Finish = ({ plmId }: LoginFormValuesStep1) => {
    setPlmIdCache(plmId.trim());
    setStep(2);
    stepTwoForm.setFieldsValue({ remember: true });
  };

  const handleLogin = async (values: LoginFormValuesStep2) => {
    setLoading(true);

    try {
      const response = await authApi.loginWithPassword({
        identifier: plmIdCache,
        password: values.password,
      });

      const remember = values.remember !== false;
      const loginHeaders = {
        platformToken: response.platformToken,
        platformTokenName: response.platformTokenName,
      };

      persistPlatformAuthState(
        {
          platformToken: response.platformToken,
          platformTokenName: response.platformTokenName,
          user: response.user,
        },
        {
          remember,
          resetWorkspace: true,
        },
      );

      const shouldCreateWorkspace = response.user.isFirstLogin || response.user.workspaceCount === 0;
      let resolvedWorkspaceSession = response.currentWorkspace;

      if (!shouldCreateWorkspace && !resolvedWorkspaceSession) {
        const targetWorkspaceId = response.defaultWorkspace?.workspaceId ?? response.workspaceOptions[0]?.workspaceId;

        if (targetWorkspaceId) {
          try {
            resolvedWorkspaceSession = await authApi.switchWorkspace(
              {
                workspaceId: targetWorkspaceId,
                rememberAsDefault: false,
              },
              loginHeaders,
            );
          } catch (error) {
            if (isAuthErrorResponse(error)) {
              message.error(error.message || '登录成功，但默认工作区恢复失败，请稍后在工作区菜单中手动切换。');
            } else {
              message.error('登录成功，但默认工作区恢复失败，请稍后在工作区菜单中手动切换。');
            }
          }
        }
      }

      persistWorkspaceSessionState(
        mapWorkspaceSessionDtoToState(resolvedWorkspaceSession),
        {
          remember,
        },
      );

      if (shouldCreateWorkspace) {
        message.success(response.user.isFirstLogin ? '登录成功，请先创建第一个工作区。' : '登录成功，当前没有可用工作区，请创建新的工作区。');
        router.push('/workspace/create');
        return;
      }

      if (resolvedWorkspaceSession) {
        message.success('登录成功。');
      } else {
        message.warning('登录成功，但工作区会话尚未恢复，请在工作区菜单中手动切换或新建工作区。');
      }

      router.push('/dashboard');
    } catch (error) {
      if (isAuthErrorResponse(error)) {
        if (error.code === 'AUTH_INVALID_CREDENTIALS') {
          stepTwoForm.setFields([{ name: 'password', errors: ['用户名、邮箱、手机号或密码错误'] }]);
          return;
        }

        if (error.code === 'ACCOUNT_NOT_ACTIVE') {
          message.error('账号当前不可登录，请联系管理员。');
          return;
        }

        if (error.code === 'INVALID_ARGUMENT') {
          message.error(error.message || '请输入完整的登录信息');
          return;
        }

        message.error(error.message || '登录失败，请稍后重试');
        return;
      }

      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ibm-login-page">
      <header className="ibm-login-header">
        <div className="ibm-header-content">
          <div className="ibm-logo">PLM Cloud Platform</div>
        </div>
      </header>

      <main className="ibm-login-main">
        <div className="ibm-login-container">
          {/* 左侧登录表单区域 */}
          <section className="ibm-login-form-section">
            <div className="ibm-login-form-wrap">
              <Title level={2} className="login-title">
                登录 PLM Cloud Platform
              </Title>
              <Text className="login-subtitle">
                没有账号？ <Link href="/register" style={{ color: '#0f62fe' }}>创建 PLM Cloud Platform 账号</Link>
              </Text>

              {step === 1 && (
                <Form
                  form={stepOneForm}
                  layout="vertical"
                  onFinish={handleStep1Finish}
                  autoComplete="off"
                  className="ibm-login-form"
                >
                  <Form.Item
                    label="PLM Cloud Platform ID"
                    name="plmId"
                    rules={[{ required: true, message: "请输入PLM Cloud Platform ID" }]}
                  >
                    <Input
                      placeholder="用户名、邮箱或手机号"
                      size="large"
                      className="ibm-input"
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 12 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      className="ibm-continue-btn"
                      icon={<ArrowRightOutlined />}
                      iconPlacement="end"
                    >
                      继续
                    </Button>
                  </Form.Item>
                  <div className="divider-text">替代登录</div>
                  <Button
                    block
                    size="large"
                    className="google-login-btn"
                    icon={<GoogleOutlined style={{ color: '#4285f4' }} />}
                  >
                    使用 Google 继续
                  </Button>
                  <Button
                    style={{ marginTop: 16 }}
                    block
                    size="large"
                    className="google-login-btn"
                    icon={<GithubOutlined style={{ color: '#000000ff' }} />}
                  >
                    使用 Github 继续
                  </Button>
                  <div className="login-footer-links">
                    <Text className="footer-text">
                      忘记 PLM Cloud Platform ID？ <Link href="#" style={{ color: '#0f62fe' }}>帮助</Link>
                    </Text>
                  </div>
                </Form>
              )}
              {step === 2 && (
                <Form
                  form={stepTwoForm}
                  layout="vertical"
                  onFinish={handleLogin}
                  initialValues={{ remember: true }}
                  autoComplete="off"
                  className="ibm-login-form"
                >
                  <div className="step2-header">
                    <Button type="link" icon={<LeftOutlined />} onClick={() => setStep(1)} className="back-btn">返回</Button>
                  </div>
                  <Divider className="step-divider" />
                  <div className="identity-row">
                    <span className="id-label">以 <strong>{plmIdCache}</strong> 身份登录</span>
                    <Button type="link" size="small" className="not-you" onClick={() => setStep(1)}>不是您?</Button>
                  </div>
                  <Divider className="step-divider" />
                  <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: "请输入密码" }]}
                  >
                    <Input.Password
                      placeholder="请输入密码"
                      size="large"
                      className="ibm-input"
                    />
                  </Form.Item>
                  <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 16 }}>
                    <Checkbox className="ibm-checkbox">
                      记住我 <QuestionCircleOutlined style={{ fontSize: 12, color: '#666', marginLeft: 4 }} />
                    </Checkbox>
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 12 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      loading={loading}
                      className="ibm-continue-btn"
                      icon={<ArrowRightOutlined />}
                      iconPlacement="end"
                    >
                      登录
                    </Button>
                  </Form.Item>
                  <div className="login-footer-links step2-extra">
                    <Link href="#" className="forgot-link" style={{ color: '#0f62fe' }}>忘记密码?</Link>
                    <Divider className="step-divider" />
                    <Text className="footer-text small">
                      忘记 ID? <Link href="#" style={{ color: '#0f62fe' }}>帮助中心</Link>
                    </Text>
                  </div>
                </Form>
              )}
            </div>
          </section>

          {/* 右侧装饰区域 */}
          <aside className="ibm-login-art" aria-hidden="true">
            <div className="art-background">
              <Image src={Illustration} alt="" className="login-illustration" />
            </div>
          </aside>
        </div>
      </main>

      <footer className="ibm-login-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link href="#">联系</Link>
            <Link href="#">隐私条款</Link>
            <Link href="#">使用条款</Link>
            <Link href="#">辅助功能选项</Link>
          </div>
          <Text className="footer-copyright">
            Powered by PLM Cloud Platform © 2025 All Rights Reserved.
          </Text>
        </div>
      </footer>
    </div>
  );
}
