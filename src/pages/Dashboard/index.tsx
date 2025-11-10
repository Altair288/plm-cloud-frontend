import { Card, Statistic, Row, Col } from 'antd';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

export default function Dashboard() {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const chart = echarts.init(chartRef.current);
      chart.setOption({
        title: { text: '示例统计图' },
        tooltip: {},
        xAxis: { data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
        yAxis: {},
        series: [
          {
            type: 'bar',
            data: [5, 20, 36, 10, 10, 20, 15],
          },
        ],
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Card><Statistic title="今日新增" value={12} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="待处理" value={5} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已完成" value={128} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="告警" value={2} valueStyle={{ color: '#fa541c' }} /></Card>
        </Col>
      </Row>
      <Card>
        <div ref={chartRef} style={{ width: '100%', height: 360 }} />
      </Card>
    </div>
  );
}
