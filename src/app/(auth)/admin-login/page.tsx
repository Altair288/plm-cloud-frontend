'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Typography,
  theme,
} from 'antd';
import {
  ArrowRightOutlined,
  LeftOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface AdminLoginFormValues {
  account: string;
  password: string;
  otp: string;
  rememberDevice?: boolean;
}

interface GradientBlob {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  drift: number;
  speed: number;
  phase: number;
}

export default function AdminLoginPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm<AdminLoginFormValues>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
    const blobs: GradientBlob[] = Array.from({ length: 7 }, () => ({
      x: randomBetween(0.08, 0.92),
      y: randomBetween(0.06, 0.94),
      radius: randomBetween(0.18, 0.34),
      alpha: randomBetween(0.12, 0.28),
      drift: randomBetween(0.012, 0.04),
      speed: randomBetween(0.00018, 0.00042),
      phase: randomBetween(0, Math.PI * 2),
    }));

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const syncCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (timestamp: number) => {
      context.clearRect(0, 0, width, height);

      const baseGradient = context.createLinearGradient(0, 0, width, height);
      baseGradient.addColorStop(0, '#f8fbff');
      baseGradient.addColorStop(0.36, '#eef6ff');
      baseGradient.addColorStop(0.7, '#f6fbff');
      baseGradient.addColorStop(1, '#ffffff');
      context.fillStyle = baseGradient;
      context.fillRect(0, 0, width, height);

      blobs.forEach((blob, index) => {
        const oscillation = timestamp * blob.speed + blob.phase;
        const centerX = width * blob.x + Math.sin(oscillation) * blob.drift * width;
        const centerY = height * blob.y + Math.cos(oscillation * (0.84 + index * 0.04)) * blob.drift * height;
        const radius = Math.min(width, height) * blob.radius;
        const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

        gradient.addColorStop(0, `rgba(96, 165, 250, ${blob.alpha})`);
        gradient.addColorStop(0.45, `rgba(147, 197, 253, ${blob.alpha * 0.72})`);
        gradient.addColorStop(0.78, `rgba(219, 234, 254, ${blob.alpha * 0.36})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();
      });

      const highlightGradient = context.createLinearGradient(0, height * 0.08, width, height * 0.92);
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      highlightGradient.addColorStop(0.42, 'rgba(255, 255, 255, 0.08)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.48)');
      context.fillStyle = highlightGradient;
      context.fillRect(0, 0, width, height);

      frameId = window.requestAnimationFrame(drawFrame);
    };

    syncCanvasSize();
    frameId = window.requestAnimationFrame(drawFrame);
    window.addEventListener('resize', syncCanvasSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, []);

  const handleSubmit = (values: AdminLoginFormValues) => {
    void values;
    message.info('平台管理员登录接口暂未接入，当前页面为 UI 设计预览。');
  };

  return (
    <div
      className="admin-auth-page"
      style={{
        '--admin-color-primary': token.colorPrimary,
        '--admin-color-primary-hover': token.colorPrimaryHover,
        '--admin-color-text': token.colorText,
        '--admin-color-text-secondary': token.colorTextSecondary,
        '--admin-color-text-tertiary': token.colorTextTertiary,
        '--admin-color-border': token.colorBorderSecondary,
        '--admin-color-fill': token.colorFillAlter,
        '--admin-color-fill-strong': token.colorFillQuaternary,
        '--admin-color-bg': token.colorBgContainer,
        '--admin-color-layout': token.colorBgLayout,
        '--admin-color-warning': token.colorWarning,
        '--admin-color-success': token.colorSuccess,
        '--admin-color-error': token.colorError,
        '--admin-radius': `${token.borderRadiusLG}px`,
        '--admin-shadow': token.boxShadowSecondary,
      } as React.CSSProperties}
    >
      <canvas ref={canvasRef} className="admin-auth-canvas" aria-hidden="true" />

      <div className="admin-auth-overlay">
        <header className="ibm-login-header admin-auth-header">
          <div className="ibm-header-content admin-auth-header-content">
            <div className="ibm-logo">PLM Cloud Platform</div>
            <div className="admin-auth-header-spacer" aria-hidden="true" />
          </div>
        </header>

        <main className="admin-auth-main">
          <div className="admin-auth-main-inner">
            <section className="admin-auth-panel">
              <div className="admin-auth-form-wrap">
                <Link href="/login" className="admin-auth-back-link">
                  <LeftOutlined />
                  返回普通登录
                </Link>

                <div className="admin-auth-form-head">
                  <Text className="admin-auth-form-eyebrow">Platform Admin Sign In</Text>
                  <Title level={2} className="admin-auth-form-title">
                    登录平台管理员控制台
                  </Title>
                  <Text className="admin-auth-form-subtitle">
                    仅保留管理员账号、密码与验证码输入，当前页面仅作 UI 展示，不执行实际登录。
                  </Text>
                </div>

                <Form<AdminLoginFormValues>
                  form={form}
                  layout="vertical"
                  className="admin-auth-form"
                  initialValues={{ rememberDevice: true }}
                  onFinish={handleSubmit}
                >
                  <Form.Item
                    label="管理员账号"
                    name="account"
                    rules={[{ required: true, message: '请输入管理员账号' }]}
                  >
                    <Input
                      size="large"
                      placeholder="用户名 / 邮箱 / 工号"
                      className="ibm-input admin-auth-input"
                    />
                  </Form.Item>

                  <Form.Item
                    label="管理员密码"
                    name="password"
                    rules={[{ required: true, message: '请输入管理员密码' }]}
                  >
                    <Input.Password
                      size="large"
                      placeholder="请输入密码"
                      className="ibm-input admin-auth-input"
                    />
                  </Form.Item>

                  <Form.Item
                    label="一次性验证码"
                    name="otp"
                    rules={[{ required: true, message: '请输入一次性验证码' }]}
                  >
                    <Input
                      size="large"
                      placeholder="6 位验证码 / MFA Token"
                      className="ibm-input admin-auth-input"
                    />
                  </Form.Item>

                  <div className="admin-auth-form-meta">
                    <Form.Item name="rememberDevice" valuePropName="checked" noStyle>
                      <Checkbox className="admin-auth-checkbox">记住当前设备 7 天</Checkbox>
                    </Form.Item>

                    <Link href="#" className="admin-auth-inline-link">
                      重置管理员密码
                    </Link>
                  </div>

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    className="admin-auth-submit"
                    icon={<ArrowRightOutlined />}
                    iconPlacement="end"
                  >
                    进入平台控制台
                  </Button>
                </Form>
              </div>
            </section>
          </div>
        </main>

        <footer className="ibm-login-footer admin-auth-footer">
          <div className="footer-content">
            <div className="footer-links">
              <Link href="#">联系</Link>
              <Link href="#">隐私条款</Link>
              <Link href="#">使用条款</Link>
              <Link href="#">辅助功能选项</Link>
            </div>
            <Text className="footer-copyright">
              Powered by PLM Cloud Platform © 2026 All Rights Reserved.
            </Text>
          </div>
        </footer>
      </div>
    </div>
  );
}