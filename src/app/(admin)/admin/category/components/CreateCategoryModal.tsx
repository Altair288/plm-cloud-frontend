import React from 'react';
import { App, Form, Input, Select, Button, Row, Col, Space, Card, theme, Typography } from 'antd';
import dynamic from 'next/dynamic';
import DraggableModal from '@/components/DraggableModal';

const { Option } = Select;
const { Text } = Typography;
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'font',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
];

export interface CreateCategoryModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ open, onCancel, onOk }) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { modal } = App.useApp();

  const handleFinish = (values: any) => {
    form.resetFields();
    onOk(values);
  };

  const handleRequestClose = () => {
    if (!form.isFieldsTouched(true)) {
      form.resetFields();
      onCancel();
      return;
    }

    modal.confirm({
      title: '存在未保存内容',
      content: '当前表单内容尚未保存，确认关闭并放弃本次编辑吗？',
      okText: '放弃并关闭',
      cancelText: '继续编辑',
      okType: 'danger',
      onOk: () => {
        form.resetFields();
        onCancel();
      },
    });
  };

  const readOnlyStyle = {
    color: token.colorTextDisabled,
    backgroundColor: token.colorBgContainerDisabled,
    cursor: 'not-allowed',
  };

  return (
    <DraggableModal
      title="新增分类"
      open={open}
      width={800}
      onCancel={handleRequestClose}
      maskClosable={false}
      keyboard={false}
      footer={null}
      destroyOnHidden
    >
      <div style={{ padding: '0 0 16px 0' }}>
        <Space size="middle" style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={() => form.submit()}>保存</Button>
          <Button>复制新增</Button>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            code: 'FL00000001',
            name: '工业液压机',
            domain: '物料（自动获取）',
            parent: '液压机（自动获取）',
            status: 'draft',
            root: '工业设备及工具',
            version: 'V01',
            versionDate: '2026-02-28',
            creator: '系统管理员',
            createDate: '2026-02-28'
          }}
        >
          <Card 
            size="small" 
            variant="outlined"
            style={{ 
              borderRadius: token.borderRadiusLG,
              backgroundColor: token.colorFillAlter,
              marginBottom: 16
            }}
          >
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="分类编码" name="code" rules={[{ required: true }]}>
                  <Input placeholder="请输入分类编码" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="分类名称" name="name" rules={[{ required: true }]}>
                  <Input placeholder="请输入分类名称" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="业务领域" name="domain">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="父级分类" name="parent">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="分类状态" name="status">
                  <Select>
                    <Option value="draft">创建</Option>
                    <Option value="active">生效</Option>
                    <Option value="inactive">失效</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="根分类" name="root">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={24}>
                <Form.Item label="详细描述" name="description">
                  <div
                    className="category-description-editor"
                    style={{
                      border: `1px solid ${token.colorBorder}`,
                      borderRadius: token.borderRadius,
                      overflow: 'hidden',
                      background: token.colorBgContainer,
                    }}
                  >
                    <ReactQuill
                      theme="snow"
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="请输入详细描述..."
                      style={{ minHeight: 180 }}
                    />
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="版本" name="version">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="版本日期" name="versionDate">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="创建人" name="creator">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="创建日期" name="createDate">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card 
            size="small" 
            style={{ 
              backgroundColor: token.colorInfoBg, 
              borderColor: token.colorInfoBorder,
              borderRadius: token.borderRadiusLG
            }}
          >
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              状态说明：创建（默认），生效（允许业务调用），失效（停止业务调用）
            </Text>
          </Card>
        </Form>
      </div>
    </DraggableModal>
  );
};

export default CreateCategoryModal; 
