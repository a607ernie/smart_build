export enum MaterialStatus {
  NEW = 'NEW',         // 全新 (剛入庫，未分配)
  USED = 'USED',       // 使用中 (已分配)
  AVAILABLE = 'AVAILABLE', // 可用 (剩餘回收，未分配)
  SCRAP = 'SCRAP'      // 報廢 (損壞，未分配)
}

// Hierarchical Data Structures
export interface GroupNode {
  id: string;
  name: string;
}

export interface SiteNode {
  id: string;
  name: string;
  groups: GroupNode[];
}

export interface ProjectNode {
  id: string;
  name: string;
  sites: SiteNode[];
}

export interface Material {
  id: string;
  name: string;
  spec: string;
  status: MaterialStatus;
  
  // Hierarchical Location
  projectId: string;
  siteId: string;
  groupId: string;
  
  qrCode: string;
  lastUpdated: string;
  quantity: number;
  maxQuantity: number; // Renamed from initialQuantity, represents the upper limit/capacity
  reuseCount: number;
}

export interface Log {
  id: string;
  materialId: string;
  action: 'CHECK_IN' | 'CHECK_OUT' | 'RECYCLE' | 'TRANSFER';
  timestamp: string;
  userId: string;
  details?: string;
}

export type ViewState = 'LOGIN' | 'PROJECT_SELECT' | 'DASHBOARD' | 'INVENTORY' | 'SCANNER' | 'REPORTS' | 'SETTINGS';