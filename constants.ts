import { Material, MaterialStatus, ProjectNode } from './types';

export const PROJECT_HIERARCHY: ProjectNode[] = [
  {
    id: 'P01',
    name: '專案 Alpha (機場工程)',
    sites: [
      {
        id: 'S01_TP',
        name: '台北總部工區',
        groups: [
          { id: 'G_A', name: 'A組 (地基工程)' },
          { id: 'G_B', name: 'B組 (結構工程)' }
        ]
      },
      {
        id: 'S01_KH',
        name: '高雄工區',
        groups: [
          { id: 'G_C', name: 'C組 (物流管理)' }
        ]
      }
    ]
  },
  {
    id: 'P02',
    name: '專案 Beta (捷運工程)',
    sites: [
      {
        id: 'S02_TN',
        name: '台南站點',
        groups: [
          { id: 'G_D', name: 'D組 (機電工程)' },
          { id: 'G_E', name: 'E組 (裝修工程)' }
        ]
      }
    ]
  },
  {
    id: 'WH',
    name: '中央倉庫',
    sites: [
      {
        id: 'WH_MAIN',
        name: '主要倉儲區',
        groups: [
          { id: 'WH_G1', name: '一般資材區' }
        ]
      }
    ]
  }
];

export const INITIAL_INVENTORY: Material[] = [
  {
    id: 'M001',
    name: '鋼管',
    spec: '直徑 50mm, 長度 3m',
    status: MaterialStatus.NEW,
    projectId: 'WH',
    siteId: 'WH_MAIN',
    groupId: 'WH_G1',
    qrCode: 'M001-STEEL-50-3',
    lastUpdated: new Date().toISOString(),
    quantity: 100,
    maxQuantity: 100,
    reuseCount: 0
  },
  {
    id: 'M002',
    name: '鋼管',
    spec: '直徑 50mm, 長度 3m',
    status: MaterialStatus.USED,
    projectId: 'P01',
    siteId: 'S01_TP',
    groupId: 'G_A',
    qrCode: 'M002-STEEL-50-3-USED',
    lastUpdated: new Date().toISOString(),
    quantity: 15,
    maxQuantity: 50, 
    reuseCount: 2
  },
  {
    id: 'M003',
    name: '木棧板',
    spec: '2x4, 防腐處理',
    status: MaterialStatus.NEW,
    projectId: 'P01',
    siteId: 'S01_TP',
    groupId: 'G_B',
    qrCode: 'M003-WOOD-2x4',
    lastUpdated: new Date().toISOString(),
    quantity: 200,
    maxQuantity: 200,
    reuseCount: 0
  },
  {
    id: 'M004',
    name: '鷹架扣件',
    spec: '標準旋轉扣',
    status: MaterialStatus.USED,
    projectId: 'P02',
    siteId: 'S02_TN',
    groupId: 'G_D',
    qrCode: 'M004-CLAMP-SWIVEL',
    lastUpdated: new Date().toISOString(),
    quantity: 50,
    maxQuantity: 100,
    reuseCount: 5
  },
  {
    id: 'M005',
    name: '安全圍欄',
    spec: '塑膠, 橘色警示',
    status: MaterialStatus.USED,
    projectId: 'P02',
    siteId: 'S02_TN',
    groupId: 'G_E',
    qrCode: 'M005-BARRIER',
    lastUpdated: new Date().toISOString(),
    quantity: 10,
    maxQuantity: 20,
    reuseCount: 12
  }
];

export const MOCK_USER = {
  id: 'u_01',
  username: 'admin',
  password: 'password'
};
