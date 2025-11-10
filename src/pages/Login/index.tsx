import { Form, Input, Button, Typography, Checkbox } from "antd";
import { useState } from "react";
import "./login.css";
import { ArrowRightOutlined, GoogleOutlined, GithubOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import Illustration from "@/assets/illustration-final.svg";

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  ibmid: string;
  remember?: boolean;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    console.log("Login:", values);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
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
                没有账号？ <Link href="#">创建 PLM Cloud Platform 账号</Link>
              </Text>

              <Form
                layout="vertical"
                onFinish={onFinish}
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
                    loading={loading}
                    className="ibm-continue-btn"
                    icon={<ArrowRightOutlined />}
                    iconPosition="end"
                  >
                    继续
                  </Button>
                </Form.Item>

                <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 24 }}>
                  <Checkbox className="ibm-checkbox">
                    记住我 <QuestionCircleOutlined style={{ fontSize: 12, color: '#666', marginLeft: 4 }} />
                  </Checkbox>
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
                    忘记 PLM Cloud Platform ID？ <Link href="#">帮助</Link>
                  </Text>
                </div>
              </Form>
            </div>
          </section>

          {/* 右侧装饰区域 */}
          <aside className="ibm-login-art" aria-hidden="true">
            <div className="art-background">
              <img src={Illustration} alt="" className="login-illustration" />
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
