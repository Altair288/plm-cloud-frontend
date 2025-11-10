import { Card, Form, Input, Button, Typography, theme } from 'antd';
import { useState } from 'react';
import './login.css';
import { APP_NAME } from '@/config';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();

  const onFinish = async () => {
    setLoading(true);
    // mock delay
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
  };

  return (
    <div className="login-root" style={{ background: token.colorBgLayout }}>
      <div className="login-panel">
        <div className="login-brand">
          <Title level={3} style={{ margin: 0 }}>{APP_NAME}</Title>
          <Text type="secondary">产品生命周期管理平台</Text>
        </div>
        <Card bordered={false} className="login-card" bodyStyle={{ padding: '32px 40px 40px' }}>
          <Title level={4} style={{ marginBottom: 8, fontWeight: 500 }}>登录</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>请输入账号与密码继续</Text>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}> 
              <Input size="large" placeholder="用户名" prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}> 
              <Input.Password size="large" placeholder="密码" prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Form.Item style={{ marginTop: 8 }}>
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>登录</Button>
            </Form.Item>
          </Form>
          <div className="login-footer">
            <Text type="secondary">© {new Date().getFullYear()} {APP_NAME}</Text>
          </div>
        </Card>
      </div>
      <div className="login-side">
        <div className="login-side-inner">
          <Title level={2} style={{ color: '#fff', fontWeight: 500 }}>简洁 · 专注 · 高效</Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)' }}>让产品数据驱动协同与创新</Text>
        </div>
      </div>
    </div>
  );
}
