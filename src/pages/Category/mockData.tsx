import { AppstoreOutlined, FolderOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

// --- 用户分类树模拟数据 ---
export const defaultUserTreeData: DataNode[] = [
  {
    title: '食品制造业',
    key: 'IND-001',
    icon: <AppstoreOutlined />,
    children: [
      {
        title: '产成品',
        key: 'CAT-001-01',
        icon: <FolderOutlined />,
        children: [
          { title: '休闲零食', key: 'CAT-001-01-01', icon: <FolderOutlined />, isLeaf: true },
          { title: '饮料', key: 'CAT-001-01-02', icon: <FolderOutlined />, isLeaf: true },
        ],
      },
      {
        title: '原材料',
        key: 'CAT-001-02',
        icon: <FolderOutlined />,
        children: [
          { title: '面粉', key: 'CAT-001-02-01', icon: <FolderOutlined />, isLeaf: true },
          { title: '糖类', key: 'CAT-001-02-02', icon: <FolderOutlined />, isLeaf: true },
        ],
      },
      { title: '包材', key: 'CAT-001-03', icon: <FolderOutlined />, isLeaf: true },
    ],
  },
  {
    title: '烟草制品制造',
    key: 'IND-002',
    icon: <AppstoreOutlined />,
    children: [
      { title: '卷烟', key: 'CAT-002-01', icon: <FolderOutlined />, isLeaf: true },
      { title: '烟叶原料', key: 'CAT-002-02', icon: <FolderOutlined />, isLeaf: true },
    ],
  },
  {
    title: '纺织品制造业',
    key: 'IND-003',
    icon: <AppstoreOutlined />,
    children: [
      { title: '棉纺织', key: 'CAT-003-01', icon: <FolderOutlined />, isLeaf: true },
      { title: '化纤织造', key: 'CAT-003-02', icon: <FolderOutlined />, isLeaf: true },
    ],
  },
  {
    title: '汽车制造业',
    key: 'IND-004',
    icon: <AppstoreOutlined />,
    children: [
      { title: '乘用车整车', key: 'CAT-004-01', icon: <FolderOutlined />, isLeaf: true },
      {
        title: '零部件',
        key: 'CAT-004-02',
        icon: <FolderOutlined />,
        children: [
          { title: '电机总成', key: 'CAT-004-02-01', icon: <FolderOutlined />, isLeaf: true },
          { title: '螺丝类原材料', key: 'CAT-004-02-02', icon: <FolderOutlined />, isLeaf: true },
        ],
      },
    ],
  },
];

// --- 市场分类库模拟数据 ---

export interface CategoryItem {
  key: string;
  title: string;
  code: string;
  path: string[]; // 面包屑路径
  library: string; // 所属库
}

export const LIBRARIES = [
  { label: '国家标准分类库 (GB/T)', value: 'GB' },
  { label: '电子行业标准库 (SJ)', value: 'SJ' },
  { label: '企业私有分类库', value: 'PRIVATE' },
];

// 模拟生成一些数据
const generateMockData = (lib: string, count: number): CategoryItem[] => {
  return Array.from({ length: count }).map((_, i) => ({
    key: `${lib}-${i + 1000}`,
    title: `${lib === 'GB' ? '通用' : lib === 'SJ' ? '电子' : '自研'}物料分类-${i + 1}`,
    code: `${lib}.${(i + 1000).toString()}`,
    path: [lib === 'GB' ? '国标' : '行标', '原材料', `分类组-${Math.floor(i / 10)}`],
    library: lib,
  }));
};

export const MOCK_DB: Record<string, CategoryItem[]> = {
  'GB': generateMockData('GB', 50),
  'SJ': generateMockData('SJ', 50),
  'PRIVATE': generateMockData('PRIVATE', 20),
};

// 模拟属性库
export const MOCK_ATTRIBUTES = [
  '规格型号', '材质', '颜色', '表面处理', '额定电压', '工作温度', '供应商代码', '环保等级', '重量', '尺寸'
];
