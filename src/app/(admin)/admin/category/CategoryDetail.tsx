import React, { useState } from 'react';
import { Button, Form, Input, Modal, message, Descriptions, Tag, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { MetaCategoryBrowseNodeDto } from '@/services/metaCategory';

interface Props {
  node: any; // CategoryTreeNode
  onUpdate?: () => void;
  onDelete?: () => void;
}

const CategoryDetail: React.FC<Props> = ({ node, onUpdate, onDelete }) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleEdit = () => {
    form.setFieldsValue({
      code: node.dataRef?.code || '',
      title: node.dataRef?.title || ''
    });
    setIsModalVisible(true);
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Are you sure to delete this category?',
      content: `${node.title}`,
      okType: 'danger',
      onOk: () => {
        message.success('Mock Delete Success');
        if (onDelete) onDelete();
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Update Values:', values);
      message.success('Updated successfully (Mock)');
      setIsModalVisible(false);
      if (onUpdate) onUpdate();
    } catch (e) {
      // Validation failed
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'segment': return 'blue';
      case 'family': return 'cyan';
      case 'class': return 'geekblue';
      case 'commodity': return 'purple';
      default: return 'default';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-100 h-full">
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h2 className="text-lg font-medium m-0">Category Details</h2>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Delete</Button>
        </Space>
      </div>

      <Descriptions bordered column={1}>
        <Descriptions.Item label="Level">
          <Tag color={getLevelColor(node.level)}>{node.level?.toUpperCase()}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Code">{node.dataRef?.code}</Descriptions.Item>
        <Descriptions.Item label="Title">{node.dataRef?.title}</Descriptions.Item>
        <Descriptions.Item label="Full Path Name">{node.dataRef?.fullPathName || '-'}</Descriptions.Item>
      </Descriptions>

      <Modal
        title="Edit Category"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
             <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                <Input disabled /> 
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input />
            </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryDetail;
