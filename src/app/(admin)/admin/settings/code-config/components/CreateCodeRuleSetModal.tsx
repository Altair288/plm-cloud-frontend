import React, { useEffect } from 'react';
import { Form, Input, Modal, Select } from 'antd';

interface CreateCodeRuleSetModalProps {
  open: boolean;
  loading?: boolean;
  businessDomainOptions: Array<{ value: string; label: string }>;
  initialBusinessDomain?: string;
  onCancel: () => void;
  onSubmit: (values: { businessDomain: string; name: string; remark?: string }) => Promise<void> | void;
}

const CreateCodeRuleSetModal: React.FC<CreateCodeRuleSetModalProps> = ({
  open,
  loading = false,
  businessDomainOptions,
  initialBusinessDomain,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setFieldsValue({
      businessDomain: initialBusinessDomain,
      name: '',
      remark: '',
    });
  }, [form, initialBusinessDomain, open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      title="新建规则集"
      open={open}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => void handleOk()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="businessDomain"
          label="业务领域"
          rules={[{ required: true, message: '请选择业务领域' }]}
        >
          <Select
            showSearch
            placeholder="选择业务领域"
            options={businessDomainOptions}
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name="name"
          label="规则集名称"
          rules={[{ required: true, message: '请输入规则集名称' }]}
        >
          <Input placeholder="例如：Material 编码规则集" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input placeholder="可选备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateCodeRuleSetModal;