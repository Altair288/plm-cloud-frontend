import { Form, Input, Button, Typography, Checkbox } from "antd";
import { useState } from "react";
import "./login.css";
import { ArrowRightOutlined, GoogleOutlined, GithubOutlined, QuestionCircleOutlined } from "@ant-design/icons";

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
          <aside className="ibm-login-art">
            <div className="art-background">
              <div className="dot-grid"></div>
              
              {/* 动画装饰元素 */}
              <div className="animated-shapes">
                {/* 顶部蓝色小圆点群 */}
                <div className="shape-group top-dots">
                  <div className="dot dot-1"></div>
                  <div className="dot dot-2"></div>
                  <div className="dot dot-3"></div>
                  <div className="dot dot-4"></div>
                </div>

                {/* 中间主要图形组 */}
                <div className="shape-group center-shapes">
                  <div className="diamond diamond-1"></div>
                  <div className="diamond diamond-2"></div>
                  <div className="diamond diamond-3"></div>
                  <div className="diamond diamond-4"></div>
                  <div className="circle-ring"></div>
                </div>

                {/* 右侧紫色竖条 */}
                <div className="vertical-bar"></div>

                {/* 底部圆点和蓝色元素 */}
                <div className="shape-group bottom-elements">
                  <div className="blue-diamond"></div>
                  <div className="blue-bar"></div>
                  <div className="blue-circle blue-circle-1"></div>
                  <div className="blue-circle blue-circle-2"></div>
                </div>

                {/* 其他装饰圆点 */}
                <div className="shape-group scattered-dots">
                  <div className="gray-dot gray-dot-1"></div>
                  <div className="gray-dot gray-dot-2"></div>
                  <div className="gray-dot gray-dot-3"></div>
                  <div className="purple-dot purple-dot-1"></div>
                  <div className="purple-dot purple-dot-2"></div>
                  <div className="purple-dot purple-dot-3"></div>
                </div>

                {/* 圆形轨道 */}
                <div className="orbit orbit-1"></div>
                <div className="orbit orbit-2"></div>
              </div>
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
