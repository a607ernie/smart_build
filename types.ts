export enum MaterialStatus {
  NEW = 'NEW',
  USED = 'USED',
  DAMAGED = 'DAMAGED'
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
  unit: string;
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

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'INVENTORY' | 'SCANNER' | 'REPORTS' | 'SETTINGS';
