import React, { useEffect } from 'react';
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
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
];

export interface CreateCategoryModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: any) => Promise<void> | void;
  parentNode?: {
    id?: string | null;
    code?: string;
    name?: string;
    level?: number;
    path?: string;
    rootCode?: string;
    rootName?: string;
  } | null;
  submitLoading?: boolean;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  open,
  onCancel,
  onOk,
  parentNode,
  submitLoading,
}) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { modal } = App.useApp();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      code: '',
      name: '',
      businessDomain: 'MATERIAL',
      parentId: parentNode?.id || null,
      parentDisplay: parentNode?.code || parentNode?.name
        ? `${parentNode?.code || '-'} - ${parentNode?.name || '未命名分类'}`
        : '根分类（无父级）',
      rootDisplay: (() => {
        if (!parentNode) return '当前创建为根分类';
        if (parentNode.rootCode) {
          return `${parentNode.rootCode} - ${parentNode.rootName || '未命名根分类'}`;
        }
        if (parentNode.level === 1) {
          return `${parentNode.code || '-'} - ${parentNode.name || '未命名分类'}`;
        }
        return '根分类信息加载中...';
      })(),
      status: 'CREATED',
      description: '',
    });
  }, [open, parentNode, form]);

  const handleFinish = async (values: any) => {
    await onOk(values);
    form.resetFields();
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
          <Button type="primary" loading={submitLoading} onClick={() => form.submit()}>保存</Button>
          <Button disabled>复制新增</Button>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
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
                <Form.Item label="业务领域" name="businessDomain">
                  <Select>
                    <Option value="MATERIAL">物料 (MATERIAL)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="父级分类" name="parentDisplay">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
                <Form.Item name="parentId" hidden>
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="分类状态" name="status">
                  <Select>
                    <Option value="CREATED">创建</Option>
                    <Option value="EFFECTIVE">生效</Option>
                    <Option value="INVALID">失效</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="根分类" name="rootDisplay">
                  <Input readOnly style={readOnlyStyle} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={24}>
                <Form.Item label="详细描述">
                  <div
                    className="category-description-editor"
                    style={{
                      border: `1px solid ${token.colorBorder}`,
                      borderRadius: token.borderRadius,
                      overflow: 'hidden',
                      background: token.colorBgContainer,
                    }}
                  >
                    <Form.Item name="description" noStyle>
                      <ReactQuill
                        theme="snow"
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="请输入详细描述..."
                        style={{ minHeight: 180 }}
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  说明：分类编码创建后不可修改；排序由系统自动分配并在拖拽/移动后自动重算。
                </Text>
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
