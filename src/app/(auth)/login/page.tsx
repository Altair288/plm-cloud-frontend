'use client';

import { Form, Input, Button, Typography, Checkbox, Divider } from "antd";
import { useState } from "react";
import "./login.css";
import { ArrowRightOutlined, GoogleOutlined, GithubOutlined, QuestionCircleOutlined, LeftOutlined } from "@ant-design/icons";
import Illustration from "@/assets/illustration-final.svg";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

interface LoginFormValuesStep1 {
  plmId: string;
}
interface LoginFormValuesStep2 extends LoginFormValuesStep1 {
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [plmIdCache, setPlmIdCache] = useState('');
  const router = useRouter();

  const handleStep1Finish = ({ plmId }: LoginFormValuesStep1) => {
    setPlmIdCache(plmId.trim());
    setStep(2);
  };

  const handleLogin = async (values: LoginFormValuesStep2) => {
    setLoading(true);
    console.log("Login submit:", values);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    // 实际认证逻辑，成功后跳转 dashboard
    router.push('/dashboard');
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
                      placeholder=""
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
                  layout="vertical"
                  onFinish={handleLogin}
                  initialValues={{ plmId: plmIdCache }}
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
                      iconPosition="end"
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
            <Link href="#" style={{ color: '#0f62fe' }}>联系</Link>
            <Link href="#" style={{ color: '#0f62fe' }}>隐私条款</Link>
            <Link href="#" style={{ color: '#0f62fe' }}>使用条款</Link>
            <Link href="#" style={{ color: '#0f62fe' }}>辅助功能选项</Link>
          </div>
          <Text className="footer-copyright">
            Powered by PLM Cloud Platform © 2025 All Rights Reserved.
          </Text>
        </div>
      </footer>
    </div>
  );
}
