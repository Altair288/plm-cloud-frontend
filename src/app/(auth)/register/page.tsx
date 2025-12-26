'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Divider, message, Collapse, Checkbox, Flex } from 'antd';
import { GoogleOutlined, CheckCircleFilled } from '@ant-design/icons';
import { evaluatePassword } from '@/utils/passwordRules';
import './register.css';
import { register } from '@/services/auth';
import { useRouter } from 'next/navigation';
import URXBgSvg from '@/assets/URX-bg.svg';
import Image from 'next/image';
import NextLink from 'next/link';

const { Title, Text, Link: AntLink } = Typography;

interface RegisterFormValues {
  email: string;
  password: string;
  givenName: string;
  surname: string;
  company: string;
  region?: string;
  code?: string;
}

const RegisterPage: React.FC = () => {
  const [form] = Form.useForm<RegisterFormValues>();
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string[]>(['1']);
  const [secondUnlocked, setSecondUnlocked] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const emailValue = Form.useWatch('email', form);
  const passwordValue = Form.useWatch('password', form);
  const codeValue = Form.useWatch('code', form);

  // 规则评估函数
  const passwordRules = evaluatePassword(passwordValue || '');

  useEffect(()=> {
    if (passwordRules.score !== passwordStrength) setPasswordStrength(passwordRules.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passwordValue, passwordRules.score]);

  // 验证码长度达到 6 时自动尝试校验一次
  useEffect(()=> {
    if(codeValue && codeValue.length === 6){
      form.validateFields(['code']).catch(()=>{});
    }
  }, [codeValue, form]);

  // 失焦后才执行的邮箱合法性（顶级域要求至少2位字母）
  const emailValidRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  useEffect(()=> {
    if(emailFocused){
      // 聚焦期间不显示勾
      if(emailValidated) setEmailValidated(false);
    }
  }, [emailValue, emailFocused, emailValidated]);
  const router = useRouter();

  const handleRegister = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        givenName: values.givenName,
        surname: values.surname,
        company: values.company,
      });
      message.success('注册成功，请登录');
      router.push('/login');
    } catch {
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      // 验证第一折叠面板字段
      await form.validateFields(['email','password','givenName','surname','company']);
      setSecondUnlocked(true);
      setActiveKey(['2']);
      message.success('账户信息已验证，继续邮箱验证');
    } catch {
      message.error('请先正确填写账户信息');
    }
  };

  const collapseItems = [
    {
      key: '1',
      label: '账户信息',
      children: (
        <>
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
          </div>
          <div className="form-row">
            <Form.Item label="名字" name="givenName" rules={[{ required: true, message: '请输入名字' }]} className="form-item-half">
              <Input placeholder="您的名字" className="form-input" size="large" />
            </Form.Item>
            <Form.Item label="姓氏" name="surname" rules={[{ required: true, message: '请输入姓氏' }]} className="form-item-half">
              <Input placeholder="您的姓氏" className="form-input" size="large" />
            </Form.Item>
          </div>
          <Form.Item label="公司" name="company" rules={[{ required: true, message: '请输入公司名称' }]}>
            <Input placeholder="公司名称" className="form-input" size="large" />
          </Form.Item>
          <div className="panel-actions">
            <Button type="primary" size="large" block onClick={handleNext}>下一步</Button>
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
          <Text type="secondary" style={{ display:'block', marginBottom:12 }}>我们向 <strong>{form.getFieldValue('email') || '您的邮箱'}</strong> 发送了一个 6 位验证码。</Text>
          <Form.Item 
            label="验证码" 
            name="code" 
            validateTrigger={['onBlur','onSubmit']} 
            rules={[
              { validator:(_,value)=> {
                  const sanitized = (value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
                  if(!sanitized) return Promise.reject('请输入验证码');
                  // 长度不足时不抛错，保持静默，等到 6 位再判断
                  if(sanitized.length < 6) return Promise.resolve();
                  return /^[A-Z0-9]{6}$/.test(sanitized) ? Promise.resolve() : Promise.reject('请输入 6 位字母或数字');
                } }
            ]}
          >
            <Flex gap="small" align="flex-start" vertical>
              <Input.OTP 
                length={6} 
                size="large" 
                formatter={(str)=> str.toUpperCase().replace(/[^A-Z0-9]/g,'')}
                onChange={(str)=> {
                  const cleaned = (str||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
                  form.setFieldsValue({ code: cleaned });
                  if(cleaned.length === 6){
                    // 满 6 位时主动校验一次
                    form.validateFields(['code']).catch(()=>{});
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
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>提交</Button>
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
                  const k = Array.isArray(key)? key: [key as string];
                  // 禁止用户跳过第一步直接打开第二步
                  if(!secondUnlocked && k.includes('2')) return;
                  setActiveKey(k);
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
              <Button type="link" className="cancel-btn">继续</Button>
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
            © 2025 PLM Cloud Platform
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;
