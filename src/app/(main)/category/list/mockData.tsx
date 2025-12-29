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
  { label: '联合国标准产品和服务代码 (UNSPSC)', value: 'UNSPSC' },
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

export interface MillerNode {
  key: string;
  title: string;
  code: string;
  children?: MillerNode[];
  isLeaf?: boolean;
}

export const UNSPSC_DATA: MillerNode[] = [
  {
    key: 'Group-A',
    code: 'A',
    title: 'Raw Materials, Chemicals, Paper, Fuel',
    children: [
      {
        key: '10000000',
        code: '10',
        title: '活植物、活动物及其附件和用品',
        children: [
          {
            key: '10100000',
            code: '1010',
            title: '活动物',
            children: [
              {
                key: '10101500',
                code: '101015',
                title: '家畜类',
                children: [
                  { key: '10101501', code: '10101501', title: '猫', isLeaf: true },
                  { key: '10101502', code: '10101502', title: '狗', isLeaf: true },
                  { key: '10101506', code: '10101506', title: '马', isLeaf: true },
                  { key: '10101507', code: '10101507', title: '羊', isLeaf: true },
                  { key: '10101508', code: '10101508', title: '山羊', isLeaf: true },
                  { key: '10101509', code: '10101509', title: '驴', isLeaf: true },
                  { key: '10101511', code: '10101511', title: '猪', isLeaf: true },
                  { key: '10101512', code: '10101512', title: '兔子', isLeaf: true },
                  { key: '10101513', code: '10101513', title: '天竺鼠', isLeaf: true },
                  { key: '10101516', code: '10101516', title: '牛', isLeaf: true },
                ]
              },
              {
                key: '10101600',
                code: '101016',
                title: '鸟和家禽',
                children: [
                  { key: '10101601', code: '10101601', title: '活的鸡肉', isLeaf: true },
                  { key: '10101602', code: '10101602', title: '活的鸭子', isLeaf: true },
                  { key: '10101603', code: '10101603', title: '活的火鸡', isLeaf: true },
                  { key: '10101604', code: '10101604', title: '活的鹅', isLeaf: true },
                  { key: '10101605', code: '10101605', title: '活的野鸡', isLeaf: true },
                ]
              },
              {
                key: '10101700',
                code: '101017',
                title: '活鱼',
                children: [
                  { key: '10101701', code: '10101701', title: '活的鲑鱼', isLeaf: true },
                ]
              },
              {
                key: '10101800',
                code: '101018',
                title: '甲壳类动物和水生无脊椎动物',
                children: [
                  { key: '10101801', code: '10101801', title: '活的虾', isLeaf: true },
                ]
              },
              {
                key: '10101900',
                code: '101019',
                title: '昆虫',
                children: [
                  { key: '10101903', code: '10101903', title: '蜜蜂', isLeaf: true },
                  { key: '10101904', code: '10101904', title: '蚕', isLeaf: true },
                ]
              }
            ]
          },
          {
            key: '10120000',
            code: '1012',
            title: '动物饲料',
            children: [
              {
                key: '10121500',
                code: '101215',
                title: '家畜类饲料',
                children: [
                  { key: '10121501', code: '10121501', title: '精制小麦麸', isLeaf: true },
                ]
              },
              {
                key: '10121600',
                code: '101216',
                title: '鸟和家禽的饲料',
                children: [
                  { key: '10121601', code: '10121601', title: '鸟的活食', isLeaf: true },
                ]
              },
              {
                key: '10121700',
                code: '101217',
                title: '鱼食',
                children: [
                  { key: '10121701', code: '10121701', title: '新鲜的和冻的盐水', isLeaf: true },
                ]
              },
              {
                key: '10121800',
                code: '101218',
                title: '狗、猫粮',
                children: [
                  { key: '10121801', code: '10121801', title: '干的狗粮', isLeaf: true },
                ]
              }
            ]
          },
          {
            key: '10130000',
            code: '1013',
            title: '动物围栏和栖息地',
            children: [
              {
                key: '10131600',
                code: '101316',
                title: '动物栅栏',
                children: [
                  { key: '10131601', code: '10131601', title: '笼舍及其附件', isLeaf: true },
                  { key: '10131602', code: '10131602', title: '狗舍', isLeaf: true },
                ]
              },
              {
                key: '10131500',
                code: '101315',
                title: '动物遮蔽棚',
                children: []
              },
              {
                key: '10131700',
                code: '101317',
                title: '动物饲养设备',
                children: [
                  { key: '10131701', code: '10131701', title: '陆地动物饲养器皿', isLeaf: true },
                ]
              }
            ]
          },
          {
            key: '10140000',
            code: '1014',
            title: '鞍具和马具用品',
            children: [
              {
                key: '10141500',
                code: '101415',
                title: '马具',
                children: [
                  { key: '10141501', code: '10141501', title: '鞍', isLeaf: true },
                ]
              }
            ]
          },
          {
            key: '10150000',
            code: '1015',
            title: '种子、鳞茎、秧苗和剪枝',
            children: [
              {
                key: '10151500',
                code: '101515',
                title: '蔬菜种子和秧苗',
                children: [
                  { key: '10151503', code: '10151503', title: '芹菜种子和苗', isLeaf: true },
                  { key: '10151504', code: '10151504', title: '红辣椒种子和苗', isLeaf: true },
                  { key: '10151505', code: '10151505', title: '西葫芦种子和苗', isLeaf: true },
                  { key: '10151506', code: '10151506', title: '豌豆种子和苗', isLeaf: true },
                  { key: '10151507', code: '10151507', title: '黄瓜种子和苗', isLeaf: true },
                  { key: '10151508', code: '10151508', title: '茄子种子和苗', isLeaf: true },
                  { key: '10151509', code: '10151509', title: '菊苣种子和苗', isLeaf: true },
                  { key: '10151510', code: '10151510', title: '大蒜种子和苗', isLeaf: true },
                  { key: '10151511', code: '10151511', title: '韭菜种子和苗', isLeaf: true },
                  { key: '10151512', code: '10151512', title: '生菜种子和苗', isLeaf: true },
                  { key: '10151513', code: '10151513', title: '玉米种子和苗', isLeaf: true },
                  { key: '10151514', code: '10151514', title: '甜瓜种子和苗', isLeaf: true },
                  { key: '10151515', code: '10151515', title: '洋葱种子和苗', isLeaf: true },
                  { key: '10151517', code: '10151517', title: '菠菜种子和苗', isLeaf: true },
                  { key: '10151518', code: '10151518', title: '蕃茄种子和苗', isLeaf: true },
                  { key: '10151520', code: '10151520', title: '牛皮菜种子和苗', isLeaf: true },
                ]
              },
              {
                key: '10151600',
                code: '101516',
                title: '谷类种子',
                children: [
                  { key: '10151601', code: '10151601', title: '小麦种子', isLeaf: true },
                  { key: '10151602', code: '10151602', title: '菜种种子', isLeaf: true },
                  { key: '10151603', code: '10151603', title: '大麦种子', isLeaf: true },
                  { key: '10151604', code: '10151604', title: '黍的种子', isLeaf: true },
                  { key: '10151605', code: '10151605', title: '燕麦种子', isLeaf: true },
                  { key: '10151606', code: '10151606', title: '芝麻种子', isLeaf: true },
                  { key: '10151607', code: '10151607', title: '亚麻子种子', isLeaf: true },
                  { key: '10151608', code: '10151608', title: '蓖麻种子', isLeaf: true },
                  { key: '10151609', code: '10151609', title: '玉米种子', isLeaf: true },
                  { key: '10151610', code: '10151610', title: '裸麦种子', isLeaf: true },
                  { key: '10151611', code: '10151611', title: '高粱种子', isLeaf: true },
                  { key: '10151614', code: '10151614', title: '稻谷种子和苗', isLeaf: true },
                ]
              },
              {
                key: '10151700',
                code: '101517',
                title: '草、饲料种子和苗',
                children: []
              },
              {
                key: '10151800',
                code: '101518',
                title: '香料农作物的种子和苗',
                children: []
              },
              {
                key: '10151900',
                code: '101519',
                title: '花种子、鳞茎、苗和剪枝',
                children: []
              },
              {
                key: '10152000',
                code: '101520',
                title: '树、灌木种子和剪枝',
                children: [
                  { key: '10152001', code: '10152001', title: '果树种子和剪枝', isLeaf: true },
                  { key: '10152003', code: '10152003', title: '坚果树种子和剪枝', isLeaf: true },
                ]
              },
              {
                key: '10152300',
                code: '101523',
                title: '豆类种子',
                children: [
                  { key: '10152301', code: '10152301', title: '菜豆种子和苗', isLeaf: true },
                  { key: '10152302', code: '10152302', title: '黄豆种子和苗', isLeaf: true },
                ]
              },
              {
                key: '10152400',
                code: '101524',
                title: '根茎类种子',
                children: [
                  { key: '10152402', code: '10152402', title: '甘蓝种子和苗', isLeaf: true },
                  { key: '10152404', code: '10152404', title: '胡萝卜种子和苗', isLeaf: true },
                ]
              }
            ]
          },
          {
            key: '10160000',
            code: '1016',
            title: '花卉和园林产品',
            children: [
              {
                key: '10161500',
                code: '101615',
                title: '树和灌木',
                children: []
              }
            ]
          },
          {
            key: '10170000',
            code: '1017',
            title: '肥料、植物营养剂和除草剂',
            children: [
              {
                key: '10171500',
                code: '101715',
                title: '有机肥料和植物营养剂',
                children: [
                  { key: '10171501', code: '10171501', title: '肥料和天然肥', isLeaf: true },
                  { key: '10171502', code: '10171502', title: '植物生长调节剂', isLeaf: true },
                ]
              },
              {
                key: '10171600',
                code: '101716',
                title: '化学肥料和植物营养剂',
                children: [
                  { key: '10171601', code: '10171601', title: '硝氨化肥', isLeaf: true },
                  { key: '10171602', code: '10171602', title: '钾肥', isLeaf: true },
                  { key: '10171603', code: '10171603', title: '磷肥', isLeaf: true },
                  { key: '10171604', code: '10171604', title: '含硫化肥', isLeaf: true },
                  { key: '10171605', code: '10171605', title: '氮磷钾复合肥NPK', isLeaf: true },
                ]
              }
            ]
          },
          {
            key: '10190000',
            code: '1019',
            title: '虫害控制产品',
            children: [
              {
                key: '10191500',
                code: '101915',
                title: '杀虫剂和害虫驱避剂',
                children: [
                  { key: '10191506', code: '10191506', title: '灭鼠剂', isLeaf: true },
                  { key: '10191509', code: '10191509', title: '杀虫剂', isLeaf: true },
                ]
              },
              {
                key: '10191700',
                code: '101917',
                title: '虫害控制装置',
                children: []
              }
            ]
          }
        ]
      },
      {
        key: '11000000',
        code: '11',
        title: '矿物、纺织品、非食用植物和动物材料',
        children: []
      },
      {
        key: '12000000',
        code: '12',
        title: '包括生物化学品和气体原料的化学制品',
        children: []
      },
      {
        key: '13000000',
        code: '13',
        title: '树脂、松脂、橡胶、泡沫、薄膜和弹性材料',
        children: []
      },
      {
        key: '14000000',
        code: '14',
        title: '造纸原料和纸制品',
        children: [
          {
            key: '14110000',
            code: '1411',
            title: 'Paper products',
            children: [
              {
                key: '14111500',
                code: '141115',
                title: 'Printing and writing paper',
                children: [
                  { key: '14111506', code: '14111506', title: 'Computer paper', isLeaf: true },
                  { key: '14111507', code: '14111507', title: 'Copier paper', isLeaf: true },
                  { key: '14111525', code: '14111525', title: 'Printer paper', isLeaf: true },
                ]
              }
            ]
          }
        ]
      },
      {
        key: '15000000',
        code: '15',
        title: '燃料、燃料添加剂、润滑剂和防腐蚀材料',
        children: []
      }
    ]
  },
  {
    key: 'Group-B',
    code: 'B',
    title: '工业设备及工具',
  },
  {
    key: 'Group-C',
    code: 'C',
    title: '组件及用品',
  },
  {
    key: 'Group-D',
    code: 'D',
    title: '建筑、交通、设施设备及用品',
  },
  {
    key: 'Group-E',
    code: 'E',
    title: '医疗、实验、测试的设备、用品及药品',
  },
  {
    key: 'Group-F',
    code: 'F',
    title: '食品、清洁、服务行业设备及用品',
  },
  {
    key: 'Group-G',
    code: 'G',
    title: '商业、通讯、科技设备及用品',
    children: [
      {
        key: '43000000',
        code: '43',
        title: 'Information Technology Broadcasting and Telecommunications',
        children: [
          {
            key: '43200000',
            code: '4320',
            title: 'Components for information technology',
            children: [
              {
                key: '43201800',
                code: '432018',
                title: 'Media storage devices',
                children: [
                  { key: '43201802', code: '43201802', title: 'Floppy disk drives', isLeaf: true },
                  { key: '43201803', code: '43201803', title: 'Hard disk drives', isLeaf: true },
                  { key: '43201804', code: '43201804', title: 'Tape drives', isLeaf: true },
                ]
              },
              {
                key: '43201400',
                code: '432014',
                title: 'Information technology input devices',
                children: [
                  { key: '43201401', code: '43201401', title: 'Keyboards', isLeaf: true },
                  { key: '43201402', code: '43201402', title: 'Mouse', isLeaf: true },
                ]
              }
            ]
          },
          {
            key: '43210000',
            code: '4321',
            title: 'Computer Equipment and Accessories',
            children: [
              {
                key: '43211500',
                code: '432115',
                title: 'Computers',
                children: [
                  { key: '43211501', code: '43211501', title: 'Servers', isLeaf: true },
                  { key: '43211502', code: '43211502', title: 'Workstations', isLeaf: true },
                  { key: '43211503', code: '43211503', title: 'Notebook computers', isLeaf: true },
                  { key: '43211507', code: '43211507', title: 'Desktop computers', isLeaf: true },
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    key: 'Group-H',
    code: 'H',
    title: '国防、保安、安全设备及用品',
  },
  {
    key: 'Group-I',
    code: 'I',
    title: '个人、家用、消费类设备及用品',
  },
  {
    key: 'Group-J',
    code: 'J',
    title: '服务',
  }
];
