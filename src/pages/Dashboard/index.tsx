import { useEffect, useRef } from 'react';
import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { Col, List, Row, Space, Table, Tag } from 'antd';
import * as echarts from 'echarts';

type RecordItem = {
  key: string;
  name: string;
  owner: string;
  status: '进行中' | '已上线' | '待规划';
  updateTime: string;
};

const overviewItems = [
  { title: '今日新增需求', value: 18, suffix: '条' },
  { title: '待审批变更', value: 5, suffix: '项' },
  { title: '进行中项目', value: 12, suffix: '个' },
  { title: '告警工单', value: 3, suffix: '条', valueStyle: { color: '#fa541c' } },
];

const todoList = [
  { title: '物料库字段补齐', owner: '王小虎', time: '09:30' },
  { title: 'BOM 优化方案评审', owner: '李雷', time: '11:00' },
  { title: 'PLM-ERP 联调自测', owner: '韩梅梅', time: '本周五' },
  { title: '权限模型调研总结', owner: '赵云', time: '下周一' },
];

const tableColumns = [
  { title: '项目名称', dataIndex: 'name' },
  { title: '负责人', dataIndex: 'owner', width: 120 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (value: RecordItem['status']) => (
      <Tag color={value === '已上线' ? 'success' : value === '进行中' ? 'processing' : 'default'}>
        {value}
      </Tag>
    ),
  },
  { title: '最近更新时间', dataIndex: 'updateTime', width: 160 },
];

const tableData: RecordItem[] = [
  { key: '1', name: '智能工单平台', owner: '陈曦', status: '进行中', updateTime: '2025-01-12 09:15' },
  { key: '2', name: '研发 BOM 标准化', owner: '黄蓉', status: '已上线', updateTime: '2025-01-11 18:40' },
  { key: '3', name: 'PLM 培训体系搭建', owner: '张无忌', status: '待规划', updateTime: '2025-01-10 15:28' },
  { key: '4', name: '供应链协同门户', owner: '郭靖', status: '进行中', updateTime: '2025-01-09 10:02' },
];

export default function Dashboard() {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      grid: { left: 40, right: 16, top: 40, bottom: 40 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        boundaryGap: false,
      },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'line',
          name: '需求完成量',
          data: [23, 18, 32, 28, 44, 36, 30],
          smooth: true,
          areaStyle: {
            opacity: 0.2,
            color: '#0f62fe',
          },
          lineStyle: { width: 3 },
          showSymbol: false,
        },
      ],
    });
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return (
    <PageContainer
      header={{
        title: '仪表盘',
        breadcrumb: undefined,
      }}
      token={{
        paddingBlockPageContainerContent: 16,
        paddingInlinePageContainerContent: 16,
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={16}>
          {overviewItems.map((item) => (
            <Col key={item.title} xs={24} sm={12} lg={6}>
              <StatisticCard
                statistic={{
                  title: item.title,
                  value: item.value,
                  suffix: item.suffix,
                  valueStyle: item.valueStyle,
                }}
              />
            </Col>
          ))}
        </Row>

        <Row gutter={16}>
          <Col xs={24} lg={16}>
            <ProCard title="需求趋势" size="small" headStyle={{ fontWeight: 600 }}>
              <div ref={chartRef} style={{ width: '100%', height: 320 }} />
            </ProCard>
          </Col>
          <Col xs={24} lg={8}>
            <ProCard title="待办事项" size="small" headStyle={{ fontWeight: 600 }}>
              <List
                dataSource={todoList}
                split
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={`负责人：${item.owner}`}
                    />
                    <span style={{ color: 'rgba(0,0,0,0.45)' }}>{item.time}</span>
                  </List.Item>
                )}
              />
            </ProCard>
          </Col>
        </Row>

        <ProCard title="项目看板" size="small" headStyle={{ fontWeight: 600 }}>
          <Table<RecordItem>
            columns={tableColumns}
            dataSource={tableData}
            bordered={false}
            pagination={false}
          />
        </ProCard>
      </Space>
    </PageContainer>
  );
}
