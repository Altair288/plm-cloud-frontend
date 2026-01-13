'use client';
import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, ShopOutlined, DatabaseOutlined } from '@ant-design/icons';

export default function AdminDashboardPage() {
  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总用户数"
              value={112893}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="物料总数"
              value={93}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="系统负载"
              value={12}
              suffix="%"
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 24 }} title="最近活动">
        <p>User A updated product X</p>
        <p>User B registered</p>
        <p>System backup completed</p>
      </Card>
    </div>
  );
}
