import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Box, 
  ScanLine, 
  BarChart3, 
  LogOut, 
  Search, 
  ArrowRight,
  PackageCheck,
  PackageMinus,
  Recycle,
  ChevronRight,
  ChevronDown,
  Building,
  MapPin,
  Users,
  Home,
  Settings,
  Plus,
  Trash2,
  FolderTree,
  ArrowLeftRight,
  ClipboardList,
  Save,
  X,
  Layers,
  AlertTriangle,
  Filter,
  Monitor,
  MoreHorizontal,
  Briefcase,
  ArrowLeft,
  MinusCircle,
  PlusCircle,
  ShoppingCart,
  Edit,
  Pencil,
  HelpCircle,
  MousePointerClick
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { INITIAL_INVENTORY, MOCK_USER, PROJECT_HIERARCHY as INITIAL_HIERARCHY } from './constants';
import { Material, MaterialStatus, ViewState, ProjectNode } from './types';
import { Scanner } from './components/Scanner';

// Scope Interface
interface Scope {
  projectId: string | null;
  siteId: string | null;
  groupId: string | null;
}

// Interfaces for UI modals
interface MaterialFormState {
  name: string;
  spec: string;
  quantity: number;
  maxQuantity: number;
  projectId: string;
  siteId: string; // Can be empty string for Unassigned
  groupId: string; // Can be empty string for Unassigned
}

interface TransferState {
  materialName: string; // Grouping by name/spec
  fromGroupId: string; // Empty string means "Unassigned"
  toGroupId: string;
  quantity: number;
}

interface UsageState {
  materialId: string;
  name: string;
  currentQty: number;
  useQty: number;
  type: 'CONSUME' | 'ADD'; // Distinguish between consuming and purchasing
}

// New Interfaces for Hierarchy Modals
type AddModalType = 'PROJECT' | 'SITE' | 'GROUP' | null;
interface AddModalState {
  type: AddModalType;
  projectId?: string;
  siteId?: string;
}

type DeleteModalType = 'PROJECT' | 'SITE' | 'GROUP' | 'MATERIAL' | null;
interface DeleteModalState {
  type: DeleteModalType;
  id: string;
  name: string;
  projectId?: string; // for site/group deletion context
  siteId?: string;    // for group deletion context
}

// Helper for Progress Bar Color
const getProgressColor = (current: number, max: number) => {
  if (max === 0) return 'bg-gray-300';
  const ratio = current / max;
  
  if (current > max) return 'bg-purple-600'; // Overflow / Anomalous
  if (ratio >= 0.7) return 'bg-emerald-500'; // Safe (Green)
  if (ratio >= 0.3) return 'bg-yellow-400';  // Warning (Yellow)
  return 'bg-red-500';                       // Danger (Red)
};

const getProgressLabel = (current: number, max: number) => {
  if (current > max) return '溢出';
  const ratio = max > 0 ? current / max : 0;
  if (ratio >= 0.7) return '安全';
  if (ratio >= 0.3) return '偏低';
  return '危險';
};

const getStatusLabel = (status: MaterialStatus) => {
  switch (status) {
    case MaterialStatus.NEW: return '全新 (NEW)';
    case MaterialStatus.USED: return '使用中 (USED)';
    case MaterialStatus.AVAILABLE: return '可用 (AVAILABLE)';
    case MaterialStatus.SCRAP: return '報廢 (SCRAP)';
    default: return status;
  }
};

const getStatusColor = (status: MaterialStatus) => {
  switch (status) {
    case MaterialStatus.NEW: return 'bg-blue-50 text-blue-700 border-blue-200';
    case MaterialStatus.USED: return 'bg-orange-50 text-orange-700 border-orange-200';
    case MaterialStatus.AVAILABLE: return 'bg-green-50 text-green-700 border-green-200';
    case MaterialStatus.SCRAP: return 'bg-gray-100 text-gray-500 border-gray-300';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

function App() {
  const [user, setUser] = useState<{username: string} | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [projects, setProjects] = useState<ProjectNode[]>(INITIAL_HIERARCHY);
  const [inventory, setInventory] = useState<Material[]>(INITIAL_INVENTORY);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Navigation Scope - Defaults to null
  const [scope, setScope] = useState<Scope>({ projectId: null, siteId: null, groupId: null });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Dashboard Monitor Filters
  const [monitorFilters, setMonitorFilters] = useState<string[]>([]);

  // UI States for Modals
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState<MaterialFormState>({
    name: '', spec: '', quantity: 1, maxQuantity: 1, projectId: '', siteId: '', groupId: ''
  });
  
  // Edit Modal State
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  // Action Menu State (New for Dashboard)
  const [selectedDashboardMaterial, setSelectedDashboardMaterial] = useState<{material: Material, groupId: string} | null>(null);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState<TransferState>({
    materialName: '', fromGroupId: '', toGroupId: '', quantity: 1
  });

  // Usage/Consumption/Add Stock Modal
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageData, setUsageData] = useState<UsageState>({
    materialId: '', name: '', currentQty: 0, useQty: 0, type: 'CONSUME'
  });

  // --- New Modal States ---
  const [addModal, setAddModal] = useState<AddModalState>({ type: null });
  const [newItemName, setNewItemName] = useState('');
  
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ type: null, id: '', name: '' });

  // --- Helpers ---
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === scope.projectId);
  }, [projects, scope.projectId]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (scope.projectId && item.projectId !== scope.projectId) return false;
      if (scope.siteId && item.siteId !== scope.siteId) return false;
      if (scope.groupId && item.groupId !== scope.groupId) return false;
      return true;
    });
  }, [inventory, scope]);

  // Get all unique materials available in the current filtered scope
  const availableMaterials = useMemo(() => {
    return Array.from(new Set(filteredInventory.map(i => i.name))).sort();
  }, [filteredInventory]);

  // Update filters when available materials change (e.g. switching projects)
  useEffect(() => {
    setMonitorFilters(availableMaterials);
  }, [availableMaterials.join(',')]);

  const currentScopeName = useMemo(() => {
    if (scope.groupId) {
      const p = projects.find(p => p.id === scope.projectId);
      const s = p?.sites.find(s => s.id === scope.siteId);
      const g = s?.groups.find(g => g.id === scope.groupId);
      return g?.name || scope.groupId;
    }
    if (scope.siteId) {
      const p = projects.find(p => p.id === scope.projectId);
      const s = p?.sites.find(s => s.id === scope.siteId);
      return s?.name || scope.siteId;
    }
    if (scope.projectId) {
      const p = projects.find(p => p.id === scope.projectId);
      return p?.name || scope.projectId;
    }
    return "總管理處";
  }, [scope, projects]);

  // --- Actions ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === MOCK_USER.username && loginForm.password === MOCK_USER.password) {
      setUser({ username: MOCK_USER.username });
      setView('PROJECT_SELECT'); // Go to Project Selection instead of Dashboard
    } else {
      alert('帳號或密碼錯誤。請嘗試 admin / password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('LOGIN');
    setLoginForm({ username: '', password: '' });
    setScope({ projectId: null, siteId: null, groupId: null });
  };

  const selectProject = (projectId: string) => {
    setScope({ projectId, siteId: null, groupId: null });
    setView('DASHBOARD');
  };

  const exitProject = () => {
    setScope({ projectId: null, siteId: null, groupId: null });
    setView('PROJECT_SELECT');
  };

  // --- CRUD: Hierarchy Wrappers (Open Modals) ---
  const openAddProjectModal = () => {
    setNewItemName('');
    setAddModal({ type: 'PROJECT' });
  };

  const openAddSiteModal = (projectId: string) => {
    setNewItemName('');
    setAddModal({ type: 'SITE', projectId });
  };

  const openAddGroupModal = (projectId: string, siteId: string) => {
    setNewItemName('');
    setAddModal({ type: 'GROUP', projectId, siteId });
  };

  const openDeleteModal = (type: DeleteModalType, id: string, name: string, projectId?: string, siteId?: string) => {
    setDeleteModal({ type, id, name, projectId, siteId });
  };

  // --- CRUD: Actual Logic Executed by Modals ---
  const handleSaveNewItem = () => {
    if (!newItemName.trim()) return;

    if (addModal.type === 'PROJECT') {
      const newId = `P_${Date.now()}`;
      setProjects([...projects, { id: newId, name: newItemName, sites: [] }]);
    } else if (addModal.type === 'SITE' && addModal.projectId) {
      const newId = `S_${Date.now()}`;
      setProjects(projects.map(p => {
        if (p.id === addModal.projectId) {
          return { ...p, sites: [...p.sites, { id: newId, name: newItemName, groups: [] }] };
        }
        return p;
      }));
    } else if (addModal.type === 'GROUP' && addModal.projectId && addModal.siteId) {
      const newId = `G_${Date.now()}`;
      setProjects(projects.map(p => {
        if (p.id === addModal.projectId) {
          const newSites = p.sites.map(s => {
            if (s.id === addModal.siteId) {
              return { ...s, groups: [...s.groups, { id: newId, name: newItemName }] };
            }
            return s;
          });
          return { ...p, sites: newSites };
        }
        return p;
      }));
    }

    setAddModal({ type: null });
    setNewItemName('');
  };

  const handleConfirmDelete = () => {
    const { type, id, projectId, siteId } = deleteModal;

    if (type === 'PROJECT') {
      setProjects(projects.filter(p => p.id !== id));
      setInventory(inventory.filter(i => i.projectId !== id));
      if (scope.projectId === id) setScope({ projectId: null, siteId: null, groupId: null });
    } else if (type === 'SITE' && projectId) {
      setProjects(projects.map(p => {
        if (p.id === projectId) {
          return { ...p, sites: p.sites.filter(s => s.id !== id) };
        }
        return p;
      }));
      setInventory(inventory.filter(i => i.siteId !== id));
      if (scope.siteId === id) setScope({ ...scope, siteId: null, groupId: null });
    } else if (type === 'GROUP' && projectId && siteId) {
      setProjects(projects.map(p => {
        if (p.id === projectId) {
          const newSites = p.sites.map(s => {
            if (s.id === siteId) {
              return { ...s, groups: s.groups.filter(g => g.id !== id) };
            }
            return s;
          });
          return { ...p, sites: newSites };
        }
        return p;
      }));
      setInventory(inventory.filter(i => i.groupId !== id));
      if (scope.groupId === id) setScope({ ...scope, groupId: null });
    } else if (type === 'MATERIAL') {
       setInventory(inventory.filter(i => i.id !== id));
    }

    setDeleteModal({ type: null, id: '', name: '' });
  };


  // --- CRUD: Material Registration ---
  const handleAddMaterial = () => {
    // Note: We expect projectId to be present if currentProject is loaded.
    // If it was unassigned, we used default scope.
    if (!newMaterial.name || !newMaterial.projectId) {
      alert("請填寫完整資訊 (名稱、專案為必填)");
      return;
    }
    // Validation: Quantity <= Max Quantity (implicitly handled by sync, but keep check)
    if (newMaterial.quantity > newMaterial.maxQuantity) {
      alert(`錯誤：初始數量 (${newMaterial.quantity}) 不可大於最大數量上限 (${newMaterial.maxQuantity})。`);
      return;
    }

    const newItem: Material = {
      id: `M_${Date.now()}`,
      name: newMaterial.name,
      spec: newMaterial.spec,
      quantity: newMaterial.quantity,
      maxQuantity: newMaterial.maxQuantity, // Synced
      status: MaterialStatus.NEW, // Default to NEW
      projectId: newMaterial.projectId,
      siteId: newMaterial.siteId,   // Can be empty (Unassigned)
      groupId: newMaterial.groupId, // Can be empty (Unassigned)
      qrCode: `MAT-${Date.now()}`, // Auto-gen QR
      lastUpdated: new Date().toISOString(),
      reuseCount: 0
    };
    setInventory([...inventory, newItem]);
    setShowMaterialModal(false);
    // Reset form
    setNewMaterial({ name: '', spec: '', quantity: 1, maxQuantity: 1, projectId: '', siteId: '', groupId: '' });
  };

  const handleUpdateMaterial = () => {
    if (!editingMaterial) return;
    
    // Validation: Max Quantity >= Current Quantity
    if (editingMaterial.maxQuantity < editingMaterial.quantity) {
      alert(`錯誤：最大數量 (${editingMaterial.maxQuantity}) 不可小於目前庫存數量 (${editingMaterial.quantity})。`);
      return;
    }

    setInventory(inventory.map(item => item.id === editingMaterial.id ? editingMaterial : item));
    setEditingMaterial(null);
    setSelectedDashboardMaterial(null); // Close dashboard modal if open
  };

  // --- CONSUMPTION & ADDITION Logic ---
  const openUsageModal = (item: Material, type: 'CONSUME' | 'ADD') => {
    setUsageData({
      materialId: item.id,
      name: item.name,
      currentQty: item.quantity,
      useQty: 1,
      type
    });
    setShowUsageModal(true);
    setSelectedDashboardMaterial(null); // Fix: Close dashboard selection modal
  };

  const handleUsageOrAdd = () => {
    const { materialId, useQty, type } = usageData;
    if (useQty <= 0) return;
    
    // Find item
    const targetItem = inventory.find(i => i.id === materialId);
    if (!targetItem) return;

    if (type === 'CONSUME' && useQty > targetItem.quantity) {
      alert(`錯誤：消耗數量 (${useQty}) 超過當前庫存 (${targetItem.quantity})`);
      return;
    }

    // Update Inventory
    const updatedInventory = inventory.map(item => {
      if (item.id === materialId) {
        if (type === 'CONSUME') {
          return {
            ...item,
            quantity: item.quantity - useQty,
            lastUpdated: new Date().toISOString()
          };
        } else {
          // ADD (Restock): Increase current quantity.
          return {
            ...item,
            quantity: item.quantity + useQty,
            lastUpdated: new Date().toISOString()
          };
        }
      }
      return item;
    });

    setInventory(updatedInventory);
    setShowUsageModal(false);
    setSelectedDashboardMaterial(null); // Close dashboard modal if open
  };


  // --- COORDINATION: Transfer Logic ---
  const openTransferModal = (materialName: string, fromGroupId?: string) => {
    // If fromGroupId is undefined, it means unassigned, which is empty string in our logic
    setTransferData({
      materialName,
      fromGroupId: fromGroupId || '',
      toGroupId: '',
      quantity: 1
    });
    setShowTransferModal(true);
    setSelectedDashboardMaterial(null); // Fix: Close dashboard selection modal
  };

  const handleTransfer = () => {
    const { materialName, fromGroupId, toGroupId, quantity } = transferData;
    
    // Validate target (must choose a destination, even if "unassigned" in future, but currently modal forces selection)
    // Note: If toGroupId is empty string, it means "Unassigned" (Return/Recycle)
    
    // Cannot transfer to same place (though fromGroupId could be '' which is fine)
    if (fromGroupId === toGroupId) {
       alert("來源與目的不可相同");
       return;
    }

    // Find items in source group matching name
    // If fromGroupId is '', it matches items with groupId === '' (Unassigned)
    const sourceItems = inventory.filter(i => i.name === materialName && i.groupId === fromGroupId);
    
    let remainingToMove = quantity;
    let newInv = [...inventory];

    // Check if enough stock
    const totalSourceQty = sourceItems.reduce((acc, curr) => acc + curr.quantity, 0);
    if (totalSourceQty < quantity) {
      alert(`庫存不足！來源只有 ${totalSourceQty}，您嘗試調撥 ${quantity}`);
      return;
    }

    // Determine Destination & Status
    let targetProject = projects.find(p => p.id === scope.projectId);
    let targetSiteId = '';
    let targetStatus = MaterialStatus.USED; // Default if assigned

    if (toGroupId) {
       // Moving to a specific Group -> Status: USED
       const tProj = projects.find(p => p.sites.some(s => s.groups.some(g => g.id === toGroupId)));
       const tSite = tProj?.sites.find(s => s.groups.some(g => g.id === toGroupId));
       if (tProj) targetProject = tProj;
       if (tSite) targetSiteId = tSite.id;
       targetStatus = MaterialStatus.USED;
    } else {
       // Moving to Unassigned (Empty toGroupId) -> Status: AVAILABLE (Return)
       // Keeping same project
       targetStatus = MaterialStatus.AVAILABLE;
       targetSiteId = '';
    }

    if (!targetProject) return;

    // Execute Move
    for (const item of sourceItems) {
      if (remainingToMove <= 0) break;

      const moveAmount = Math.min(item.quantity, remainingToMove);
      
      if (moveAmount === item.quantity) {
        // Move entire item
        newInv = newInv.map(i => i.id === item.id ? { 
          ...i, 
          projectId: targetProject!.id, 
          siteId: targetSiteId, 
          groupId: toGroupId,
          status: targetStatus, // Update Status
          lastUpdated: new Date().toISOString()
        } : i);
      } else {
        // Split item: Reduce source quantity AND maxQuantity
        newInv = newInv.map(i => i.id === item.id ? { 
          ...i, 
          quantity: i.quantity - moveAmount,
          maxQuantity: Math.max(0, i.maxQuantity - moveAmount) // Reduce max from source
        } : i);
        
        const splitItem: Material = {
          ...item,
          id: `${item.id}_split_${Date.now()}`,
          quantity: moveAmount,
          maxQuantity: moveAmount, // New item gets the split allocation
          projectId: targetProject!.id,
          siteId: targetSiteId,
          groupId: toGroupId,
          status: targetStatus, // Update Status
          lastUpdated: new Date().toISOString()
        };
        newInv.push(splitItem);
      }
      remainingToMove -= moveAmount;
    }

    setInventory(newInv);
    setShowTransferModal(false);
    setSelectedDashboardMaterial(null); // Close dashboard modal if open
    alert(`成功調撥 ${quantity} ${materialName}`);
  };

  // Toggle monitor filter
  const toggleMonitorFilter = (name: string) => {
    if (monitorFilters.includes(name)) {
      setMonitorFilters(monitorFilters.filter(f => f !== name));
    } else {
      setMonitorFilters([...monitorFilters, name]);
    }
  };

  // Helper to get Groups based on scope
  const monitorGroups = useMemo(() => {
    let result: { siteName: string, siteId: string, groups: {id: string, name: string}[] }[] = [];

    const relevantProjects = scope.projectId 
      ? projects.filter(p => p.id === scope.projectId)
      : projects;

    relevantProjects.forEach(proj => {
      const relevantSites = scope.siteId 
         ? proj.sites.filter(s => s.id === scope.siteId) 
         : proj.sites;
      
      relevantSites.forEach(site => {
        const relevantGroups = scope.groupId 
          ? site.groups.filter(g => g.id === scope.groupId)
          : site.groups;
        
        if (relevantGroups.length > 0) {
           result.push({
             siteName: scope.projectId ? site.name : `${proj.name} - ${site.name}`,
             siteId: site.id,
             groups: relevantGroups
           });
        }
      });
    });

    return result;
  }, [projects, scope]);

  // Identify unassigned materials in current project scope
  const unassignedMaterials = useMemo(() => {
    if (!scope.projectId) return [];
    return inventory.filter(i => i.projectId === scope.projectId && (!i.siteId || !i.groupId));
  }, [inventory, scope.projectId]);

  // --- Render Functions ---

  // 1. Login View
  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 text-white">
              <Box className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">SmartBuild 工程管理</h1>
            <p className="text-gray-500">材料調度與監控中心</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">帳號</label>
              <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full px-4 py-3 border rounded-lg text-lg text-gray-900 bg-white" placeholder="admin" />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">密碼</label>
              <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full px-4 py-3 border rounded-lg text-lg text-gray-900 bg-white" placeholder="password" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 text-lg">
              登入 <ArrowRight className="w-5 h-5" />
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400">測試帳號: admin / password</div>
        </div>
      </div>
    );
  }

  // 2. Project Selection View
  if (view === 'PROJECT_SELECT') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8">
        <div className="w-full max-w-5xl">
          <div className="flex justify-between items-center mb-12">
             <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2 rounded-lg text-white">
                 <Box className="w-6 h-6" />
               </div>
               <h1 className="text-xl md:text-3xl font-bold text-gray-800">SmartBuild 專案選擇</h1>
             </div>
             <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-base md:text-lg">
               <LogOut className="w-5 h-5" /> 登出
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(proj => (
              <div 
                key={proj.id} 
                onClick={() => selectProject(proj.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-blue-600 transition-colors">
                    <Briefcase className="w-6 h-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{proj.name}</h2>
                <div className="text-base text-gray-500 mb-4">專案編號: {proj.id}</div>
                <div className="border-t pt-4 flex gap-4 text-base text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {proj.sites.length} 個工區
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" /> {proj.sites.reduce((acc, s) => acc + s.groups.length, 0)} 個小組
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add Project Card */}
            <div 
              onClick={openAddProjectModal}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer min-h-[240px]"
            >
              <Plus className="w-16 h-16 mb-4" />
              <span className="font-bold text-xl">建立新專案</span>
            </div>
          </div>
        </div>
        
        {/* Add Project Modal (Reused) */}
        {addModal.type === 'PROJECT' && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">新增專案</h3>
              <input 
                type="text" 
                autoFocus
                className="w-full border rounded p-2 mb-4 text-gray-900 bg-white" 
                placeholder="專案名稱..." 
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveNewItem()}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex justify-end gap-3">
                <button onClick={(e) => { e.stopPropagation(); setAddModal({type: null}); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                <button onClick={(e) => { e.stopPropagation(); handleSaveNewItem(); }} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">確認</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Project Dashboard Layout
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen overflow-hidden text-base">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-300 h-full border-r border-slate-800">
        <div className="p-6 flex items-center gap-3 text-white font-bold text-xl shrink-0">
          <Box className="w-8 h-8 text-blue-500" />
          SmartBuild
        </div>
        
        <div className="px-4 pb-6 border-b border-slate-800">
           <div className="text-xs font-bold text-slate-500 uppercase mb-2">當前專案</div>
           <div className="text-white font-bold text-lg leading-tight mb-3">
             {currentProject?.name}
           </div>
           <button 
             onClick={exitProject}
             className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded flex items-center gap-2 w-full transition-colors"
           >
             <ArrowLeftRight className="w-3 h-3" /> 切換專案
           </button>
        </div>

        <nav className="p-4 space-y-1 shrink-0 bg-slate-900 mt-2">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">專案管理功能</p>
          <NavButton icon={<Monitor />} label="戰情監控室" active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
          <NavButton icon={<ClipboardList />} label="庫存清單" active={view === 'INVENTORY'} onClick={() => setView('INVENTORY')} />
          <NavButton icon={<Settings />} label="結構設定 (工區/小組)" active={view === 'SETTINGS'} onClick={() => setView('SETTINGS')} />
        </nav>
        
        <div className="mt-auto p-4 border-t border-slate-800 shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span>登出</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center shrink-0 border-b">
          <div className="flex items-center gap-3 overflow-hidden">
             {/* Mobile Back Button */}
             <button onClick={exitProject} className="text-gray-500 hover:text-blue-600 p-1">
               <ArrowLeft className="w-6 h-6" />
             </button>
             <span className="font-bold text-lg text-gray-800 flex items-center gap-2 truncate">
               <Box className="w-6 h-6 text-blue-600 shrink-0" /> 
               <span className="truncate">{currentProject?.name}</span>
             </span>
          </div>
          <button onClick={() => setShowScanner(true)}><ScanLine className="w-7 h-7 text-gray-600" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-gray-50">
          {view === 'DASHBOARD' && (
            <div className="space-y-6">
               <div className="flex justify-between items-end">
                  <h2 className="text-2xl font-bold text-gray-800">專案戰情監控</h2>
               </div>

               {/* 1. Filter Bar (The Control Panel) */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">監控材料篩選</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableMaterials.length === 0 && <span className="text-sm text-gray-400">此專案目前無庫存數據</span>}
                    {availableMaterials.map(mat => (
                      <button
                        key={mat}
                        onClick={() => toggleMonitorFilter(mat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                          monitorFilters.includes(mat)
                            ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {mat}
                      </button>
                    ))}
                  </div>
               </div>

               {/* NEW: Unassigned Materials Section */}
               {unassignedMaterials.length > 0 && (
                  <div className="mb-8">
                     <div className="flex items-center gap-2 mb-3 px-1">
                        <HelpCircle className="w-5 h-5 text-gray-500" />
                        <h3 className="text-xl font-bold text-gray-600">待分配材料區 (Unassigned)</h3>
                        <div className="h-px bg-gray-200 flex-1 ml-2 border-dashed"></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden h-full">
                           <div className="bg-gray-100 border-b border-gray-200 p-4 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                 <div className="bg-white p-1 rounded border shadow-sm">
                                   <Layers className="w-5 h-5 text-gray-500" />
                                 </div>
                                 <span className="font-bold text-gray-700 text-lg">待分配材料</span>
                              </div>
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-bold">
                                {unassignedMaterials.length} 項
                              </span>
                           </div>
                           <div className="p-5 space-y-4 flex-1">
                              {/* Filter unassigned by name if filters active */}
                              {monitorFilters.length > 0 && unassignedMaterials.filter(i => monitorFilters.includes(i.name)).length === 0 && (
                                 <p className="text-sm text-gray-400 text-center">已篩選隱藏</p>
                              )}
                              
                              {(monitorFilters.length === 0 ? unassignedMaterials : unassignedMaterials.filter(i => monitorFilters.includes(i.name))).map(item => {
                                  const percent = item.maxQuantity > 0 ? Math.min((item.quantity / item.maxQuantity) * 100, 100) : 0;
                                  const barColor = getProgressColor(item.quantity, item.maxQuantity);
                                  const label = getProgressLabel(item.quantity, item.maxQuantity);

                                  return (
                                     <div 
                                      key={item.id} 
                                      className="group/item cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                      onClick={() => setSelectedDashboardMaterial({material: item, groupId: ''})}
                                     >
                                         <div className="flex justify-between items-end mb-1">
                                            <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                              {item.name} <span className="text-xs text-gray-400">({item.spec})</span>
                                            </span>
                                            <div className="flex items-center gap-2">
                                               <span className={`text-base font-mono font-bold text-gray-800`}>
                                                 {item.quantity} / {item.maxQuantity}
                                               </span>
                                               <div className="bg-gray-100 p-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                  <MousePointerClick className="w-4 h-4 text-gray-500" />
                                               </div>
                                            </div>
                                         </div>
                                         <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300 relative">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                              style={{ width: `${percent}%` }}
                                            ></div>
                                         </div>
                                         <div className="flex justify-between mt-1">
                                            <span className={`text-xs font-bold ${item.quantity >= item.maxQuantity * 0.7 ? 'text-emerald-600' : item.quantity < item.maxQuantity * 0.3 ? 'text-red-500' : 'text-yellow-600'}`}>
                                              {label}
                                            </span>
                                            <span className="text-xs text-gray-400">{percent.toFixed(0)}%</span>
                                         </div>
                                     </div>
                                  );
                              })}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* 2. Monitor Grid (Grouped by Site) */}
               {monitorGroups.length === 0 && unassignedMaterials.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Monitor className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-slate-400 text-lg">此專案尚未建立工區或小組</p>
                    <button onClick={() => setView('SETTINGS')} className="mt-2 text-blue-600 hover:underline">前往設定新增</button>
                 </div>
               ) : (
                 monitorGroups.map(siteGroup => (
                   <div key={siteGroup.siteId} className="space-y-3">
                      {/* Site Header */}
                      <div className="flex items-center gap-2 px-1">
                         <MapPin className="w-5 h-5 text-blue-600" />
                         <h3 className="text-xl font-bold text-slate-800">{siteGroup.siteName}</h3>
                         <div className="h-px bg-slate-200 flex-1 ml-2"></div>
                      </div>

                      {/* Group Grid (CCTV Screens) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {siteGroup.groups.map(group => {
                          const groupMaterials = inventory.filter(i => i.groupId === group.id);
                          const activeFilters = monitorFilters.filter(f => availableMaterials.includes(f));

                          return (
                            <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden h-full">
                               {/* Group Title Bar */}
                               <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                     <div className="bg-white p-1 rounded border shadow-sm">
                                       <Users className="w-5 h-5 text-purple-600" />
                                     </div>
                                     <span className="font-bold text-slate-800 text-lg">{group.name}</span>
                                  </div>
                               </div>

                               {/* Material Stats Body */}
                               <div className="p-5 space-y-4 flex-1">
                                  {activeFilters.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">請選取上方材料以開始監控</p>
                                  ) : (
                                    activeFilters.map(filterName => {
                                      const items = groupMaterials.filter(i => i.name === filterName);
                                      const totalQty = items.reduce((a,c) => a + c.quantity, 0);
                                      const maxQty = items.reduce((a,c) => a + (c.maxQuantity || c.quantity), 0);
                                      
                                      // Logic: Width based on Max Quantity vs Current
                                      const percent = maxQty > 0 ? Math.min((totalQty / maxQty) * 100, 100) : 0;
                                      const barColor = getProgressColor(totalQty, maxQty);
                                      const label = getProgressLabel(totalQty, maxQty);

                                      return (
                                        <div 
                                          key={filterName} 
                                          className="group/item cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
                                          onClick={() => {
                                            // Find the first material of this type in this group to use as reference/target
                                            const refItem = items[0];
                                            if (refItem) setSelectedDashboardMaterial({material: refItem, groupId: group.id});
                                          }}
                                        >
                                           <div className="flex justify-between items-end mb-1">
                                              <span className="text-sm font-medium text-slate-600">{filterName}</span>
                                              <div className="flex items-center gap-2">
                                                 <span className={`text-base font-mono font-bold ${totalQty === 0 ? 'text-gray-300' : 'text-slate-800'}`}>
                                                   {totalQty} / {maxQty}
                                                 </span>
                                                 <div className="bg-gray-100 p-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                    <MousePointerClick className="w-4 h-4 text-gray-500" />
                                                 </div>
                                              </div>
                                           </div>
                                           {/* Progress Bar Container (Represents Max/Total) */}
                                           <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                                              {/* Filled Bar (Represents Current) */}
                                              <div 
                                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                                style={{ width: `${percent}%` }}
                                              ></div>
                                           </div>
                                            <div className="flex justify-between mt-1">
                                                <span className={`text-xs font-bold ${totalQty >= maxQty * 0.7 ? 'text-emerald-600' : totalQty < maxQty * 0.3 ? 'text-red-500' : 'text-yellow-600'}`}>
                                                  {label}
                                                </span>
                                                <span className="text-xs text-gray-400">{percent.toFixed(0)}%</span>
                                             </div>
                                        </div>
                                      );
                                    })
                                  )}
                                  
                                  {activeFilters.length > 0 && activeFilters.every(f => !groupMaterials.some(i => i.name === f)) && (
                                     <div className="text-center py-4">
                                        <span className="text-sm text-gray-300 italic">無相關庫存</span>
                                     </div>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                 ))
               )}
            </div>
          )}

          {view === 'SETTINGS' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="w-7 h-7 text-gray-600" /> 
                    結構設定: {currentProject?.name}
                  </h3>
                  <p className="text-gray-500 mt-1 text-base">管理本專案下的工區與小組</p>
                </div>
              </div>

              {/* Current Project Structure Only */}
              {currentProject && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  {/* Sites List */}
                  <div className="p-6 space-y-6 flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">轄下工區 (Sites)</span>
                      <button 
                        onClick={() => openAddSiteModal(currentProject.id)}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1 hover:bg-emerald-50 px-3 py-1.5 rounded"
                      >
                        <Plus className="w-4 h-4" /> 新增工區
                      </button>
                    </div>

                    {currentProject.sites.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 text-lg">
                        尚未建立工區
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {currentProject.sites.map(site => (
                          <div key={site.id} className="relative pl-6 border-l-4 border-emerald-500/30 group">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-bold text-xl text-slate-700">{site.name}</h5>
                                  <button 
                                    onClick={() => openDeleteModal('SITE', site.id, site.name, currentProject.id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                {/* Groups Container */}
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {site.groups.map(group => (
                                    <div 
                                      key={group.id} 
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-100 group/chip"
                                    >
                                      <Users className="w-4 h-4" />
                                      {group.name}
                                      <button 
                                        onClick={() => openDeleteModal('GROUP', group.id, group.name, currentProject.id, site.id)}
                                        className="ml-2 text-purple-300 hover:text-red-500 hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  ))}
                                  <button 
                                    onClick={() => openAddGroupModal(currentProject.id, site.id)}
                                    className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-slate-50 text-slate-500 border border-slate-200 border-dashed hover:border-slate-400 hover:text-slate-700 transition-colors"
                                  >
                                    <Plus className="w-4 h-4" /> 小組
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'INVENTORY' && (
             <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                      <h2 className="text-2xl font-bold text-gray-800">庫存清單與註冊</h2>
                      <p className="text-base text-gray-500">{currentProject?.name} 全域庫存</p>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => {
                          // Initialize with current project context to allow saving 'Unassigned'
                          setNewMaterial({
                            name: '', 
                            spec: '', 
                            quantity: 1, 
                            maxQuantity: 1, 
                            projectId: currentProject?.id || '', 
                            siteId: '', 
                            groupId: ''
                          });
                          setShowMaterialModal(true);
                       }}
                       className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 shadow font-bold"
                     >
                       <Plus className="w-5 h-5" /> 註冊新材料
                     </button>
                   </div>
                </div>

                {/* Local Inventory Filters */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="text-base font-bold text-gray-600">篩選範圍:</span>
                  </div>
                  
                  <select 
                    className="border rounded px-3 py-2 text-base bg-gray-50 text-gray-900 min-w-[120px]"
                    value={scope.siteId || ''}
                    onChange={e => setScope(prev => ({ ...prev, siteId: e.target.value || null, groupId: null }))}
                  >
                    <option value="">所有工區</option>
                    {currentProject?.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  <select 
                    className="border rounded px-3 py-2 text-base bg-gray-50 disabled:opacity-50 text-gray-900 min-w-[120px]"
                    value={scope.groupId || ''}
                    disabled={!scope.siteId}
                    onChange={e => setScope(prev => ({ ...prev, groupId: e.target.value || null }))}
                  >
                    <option value="">所有小組</option>
                    {currentProject?.sites.find(s => s.id === scope.siteId)?.groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>

                  {(scope.siteId || scope.groupId) && (
                    <button 
                      onClick={() => setScope(prev => ({ ...prev, siteId: null, groupId: null }))}
                      className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"
                    >
                      <X className="w-4 h-4" /> 清除篩選
                    </button>
                  )}
                </div>
                
                {/* Desktop View: Table */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-base">
                       <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b">
                         <tr>
                           <th className="p-5">材料資訊</th>
                           <th className="p-5">歸屬位置 (工區/小組)</th>
                           <th className="p-5">狀態</th>
                           <th className="p-5 text-right">數量 (上限)</th>
                           <th className="p-5 text-center">操作</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                         {filteredInventory.map(item => {
                           const p = projects.find(proj => proj.id === item.projectId);
                           const sName = p?.sites.find(s=>s.id===item.siteId)?.name || item.siteId;
                           const gName = p?.sites.find(s=>s.id===item.siteId)?.groups.find(g=>g.id===item.groupId)?.name || item.groupId;
                           
                           // Determine if Unassigned
                           const isUnassigned = !item.siteId || !item.groupId;

                           return (
                             <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                               <td className="p-5">
                                 <div className="font-bold text-lg text-gray-900">{item.name}</div>
                                 <div className="text-sm text-gray-500">{item.spec}</div>
                                 <div className="text-xs text-gray-400 font-mono mt-1">{item.qrCode}</div>
                               </td>
                               <td className="p-5">
                                 {isUnassigned ? (
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-sm font-bold rounded">
                                      <HelpCircle className="w-3 h-3 inline mr-1" /> 待分配
                                    </span>
                                 ) : (
                                    <div className="flex flex-col items-start gap-2">
                                      <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-800 text-sm font-bold rounded">
                                        <MapPin className="w-3 h-3 inline mr-1" /> {sName}
                                      </span>
                                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-sm font-bold rounded">
                                        <Users className="w-3 h-3 inline mr-1" /> {gName}
                                      </span>
                                    </div>
                                 )}
                               </td>
                               <td className="p-5">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(item.status)}`}>
                                    {getStatusLabel(item.status)}
                                  </span>
                               </td>
                               <td className="p-5 text-right font-mono font-bold text-xl text-gray-800">
                                  {item.quantity} 
                                  <span className="text-sm text-gray-400 font-normal ml-1">/ {item.maxQuantity}</span>
                               </td>
                               <td className="p-5">
                                 <div className="flex justify-center items-center gap-2">
                                   <button 
                                     onClick={() => setEditingMaterial(item)}
                                     className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 text-sm font-bold"
                                     title="編輯"
                                   >
                                     <Pencil className="w-4 h-4" /> 編輯
                                   </button>
                                   <button 
                                     onClick={() => openUsageModal(item, 'ADD')}
                                     className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 text-sm font-bold"
                                     title="補貨"
                                   >
                                     <PlusCircle className="w-4 h-4" /> 補貨
                                   </button>
                                   <button 
                                     onClick={() => openUsageModal(item, 'CONSUME')}
                                     className="flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded hover:bg-orange-200 text-sm font-bold"
                                     title="領用"
                                   >
                                     <MinusCircle className="w-4 h-4" /> 領用
                                   </button>
                                   <button onClick={() => openDeleteModal('MATERIAL', item.id, item.name)} className="text-gray-400 hover:text-red-600 p-2" title="刪除">
                                     <Trash2 className="w-5 h-5" />
                                   </button>
                                 </div>
                               </td>
                             </tr>
                           );
                         })}
                         {filteredInventory.length === 0 && (
                           <tr><td colSpan={5} className="p-8 text-center text-gray-500">此範圍內無庫存資料。</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden space-y-4">
                  {filteredInventory.map(item => {
                      const p = projects.find(proj => proj.id === item.projectId);
                      const sName = p?.sites.find(s=>s.id===item.siteId)?.name || item.siteId;
                      const gName = p?.sites.find(s=>s.id===item.siteId)?.groups.find(g=>g.id===item.groupId)?.name || item.groupId;
                      const isUnassigned = !item.siteId || !item.groupId;

                      return (
                        <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                          <div className="flex justify-between items-start mb-3">
                             <div>
                               <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                               <p className="text-sm text-gray-500 mt-1">{item.spec}</p>
                             </div>
                             <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(item.status)}`}>
                               {getStatusLabel(item.status)}
                             </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                             {isUnassigned ? (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded">
                                   <HelpCircle className="w-3 h-3 mr-1" /> 待分配
                                </span>
                             ) : (
                               <>
                                 <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
                                   <MapPin className="w-3 h-3 mr-1" /> {sName}
                                 </span>
                                 <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded">
                                   <Users className="w-3 h-3 mr-1" /> {gName}
                                 </span>
                               </>
                             )}
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                             <div className="font-mono text-2xl font-bold text-gray-800">
                               {item.quantity} <span className="text-sm text-gray-400 font-normal">/ {item.maxQuantity}</span>
                             </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-3">
                               <button 
                                 onClick={() => setEditingMaterial(item)}
                                 className="flex items-center justify-center gap-1 bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 text-xs font-bold"
                               >
                                 <Pencil className="w-4 h-4" /> 編輯
                               </button>
                               <button 
                                 onClick={() => openUsageModal(item, 'ADD')}
                                 className="flex items-center justify-center gap-1 bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 text-xs font-bold"
                               >
                                 <PlusCircle className="w-4 h-4" /> 補貨
                               </button>
                               <button 
                                 onClick={() => openUsageModal(item, 'CONSUME')}
                                 className="flex items-center justify-center gap-1 bg-orange-100 text-orange-700 p-2 rounded-lg hover:bg-orange-200 text-xs font-bold"
                               >
                                 <MinusCircle className="w-4 h-4" /> 領用
                               </button>
                               <button 
                                 onClick={() => openDeleteModal('MATERIAL', item.id, item.name)} 
                                 className="flex items-center justify-center p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg"
                               >
                                 <Trash2 className="w-5 h-5" />
                               </button>
                             </div>
                        </div>
                      );
                  })}
                  {filteredInventory.length === 0 && (
                     <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                       無庫存資料
                     </div>
                  )}
                </div>

             </div>
          )}
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 pb-safe z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <MobileNavIcon icon={<Monitor />} label="監控" active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <MobileNavIcon icon={<ClipboardList />} label="庫存" active={view === 'INVENTORY'} onClick={() => setView('INVENTORY')} />
        <MobileNavIcon icon={<Settings />} label="設定" active={view === 'SETTINGS'} onClick={() => setView('SETTINGS')} />
      </div>

      {/* --- MODALS --- */}

      {/* 0. Add Hierarchy Item Modal */}
      {addModal.type && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {addModal.type === 'PROJECT' && '新增專案'}
              {addModal.type === 'SITE' && '新增工區'}
              {addModal.type === 'GROUP' && '新增小組'}
            </h3>
            <input 
              type="text" 
              autoFocus
              className="w-full border rounded p-2 mb-4 text-gray-900 bg-white" 
              placeholder="請輸入名稱..." 
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveNewItem()}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setAddModal({type: null})} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
              <button onClick={handleSaveNewItem} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 0.5 Delete Confirmation Modal */}
      {deleteModal.type && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200 border-l-4 border-red-500">
             <div className="flex items-start gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-800">確認刪除?</h3>
                   <p className="text-sm text-gray-500 mt-1">
                     您即將刪除 <span className="font-bold text-gray-800">{deleteModal.name}</span>。
                     {deleteModal.type === 'PROJECT' || deleteModal.type === 'SITE' ? ' 此操作將連帶移除其下所有層級與材料數據，且無法復原。' : ''}
                   </p>
                </div>
             </div>
             <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteModal({type: null, id: '', name: ''})} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                <button onClick={handleConfirmDelete} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold">
                  確認刪除
                </button>
             </div>
          </div>
        </div>
      )}

      {/* 0.6 Usage (Consumption/Add) Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200 border-t-4 ${usageData.type === 'CONSUME' ? 'border-orange-500' : 'border-blue-500'}`}>
             <div className="flex items-center gap-2 mb-4">
                {usageData.type === 'CONSUME' ? <MinusCircle className="w-6 h-6 text-orange-500" /> : <PlusCircle className="w-6 h-6 text-blue-500" />}
                <h3 className="text-xl font-bold text-gray-800">
                  {usageData.type === 'CONSUME' ? '材料領用/消耗' : '材料採購/補貨'}
                </h3>
             </div>
             
             <div className={`${usageData.type === 'CONSUME' ? 'bg-orange-50 text-orange-800' : 'bg-blue-50 text-blue-800'} p-3 rounded mb-4`}>
               <p className="text-sm font-bold">{usageData.name}</p>
               <p className="text-xs opacity-80">當前庫存: {usageData.currentQty}</p>
             </div>

             <div className="mb-6">
                <label className="block text-sm font-bold text-gray-600 mb-2">
                   {usageData.type === 'CONSUME' ? '領用數量' : '補貨數量'}
                </label>
                <div className="flex items-center gap-2">
                   <input 
                    type="number" 
                    autoFocus
                    min={1}
                    max={usageData.type === 'CONSUME' ? usageData.currentQty : undefined}
                    className={`w-full border-2 rounded-lg p-3 text-2xl font-mono text-center text-gray-900 outline-none ${usageData.type === 'CONSUME' ? 'border-orange-200 focus:border-orange-500' : 'border-blue-200 focus:border-blue-500'}`}
                    value={usageData.useQty}
                    onChange={e => setUsageData({...usageData, useQty: parseInt(e.target.value) || 0})}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  操作後庫存將變更為: {usageData.type === 'CONSUME' ? usageData.currentQty - usageData.useQty : usageData.currentQty + usageData.useQty}
                </p>
             </div>

             <div className="flex justify-end gap-3">
                <button onClick={() => setShowUsageModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">取消</button>
                <button 
                  onClick={handleUsageOrAdd} 
                  className={`px-6 py-2 text-white rounded-lg font-bold ${usageData.type === 'CONSUME' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                  確認{usageData.type === 'CONSUME' ? '領用' : '補貨'}
                </button>
             </div>
          </div>
        </div>
      )}
      
      {/* 1. Material Registration Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <h3 className="text-xl font-bold text-gray-800">註冊新材料</h3>
               <button onClick={() => setShowMaterialModal(false)}><X className="w-6 h-6 text-gray-500" /></button>
             </div>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">材料名稱 <span className="text-red-500">*</span></label>
                     <input type="text" className="w-full border rounded p-3 text-gray-900 bg-white" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="例如: 鋼管" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">規格</label>
                     <input type="text" className="w-full border rounded p-3 text-gray-900 bg-white" value={newMaterial.spec} onChange={e => setNewMaterial({...newMaterial, spec: e.target.value})} placeholder="例如: 50mm x 3m" />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">初始數量 <span className="text-red-500">*</span></label>
                   <input 
                     type="number" 
                     className="w-full border rounded p-3 text-gray-900 bg-white" 
                     value={newMaterial.quantity} 
                     onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setNewMaterial({...newMaterial, quantity: val, maxQuantity: val});
                     }} 
                   />
                   <p className="text-xs text-gray-500 mt-1">最大數量將自動同步為初始數量。</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                   <p className="text-xs font-bold text-gray-500 uppercase">初始位置設定 (選填)</p>
                   {/* Scoped Logic: Only show sites/groups for CURRENT project */}
                   <div className="p-2 border rounded bg-gray-100 text-sm font-bold text-gray-600 mb-2">
                      專案: {currentProject?.name}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                     <select className="w-full border rounded p-3 text-gray-900 bg-white" value={newMaterial.siteId} onChange={e => setNewMaterial({...newMaterial, projectId: currentProject?.id || '', siteId: e.target.value, groupId: ''})}>
                        <option value="">(未分配) 選擇工區</option>
                        {currentProject?.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                     <select className="w-full border rounded p-3 text-gray-900 bg-white" value={newMaterial.groupId} onChange={e => setNewMaterial({...newMaterial, groupId: e.target.value})} disabled={!newMaterial.siteId}>
                        <option value="">(未分配) 選擇小組</option>
                        {currentProject?.sites.find(s=>s.id===newMaterial.siteId)?.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                     </select>
                   </div>
                   <p className="text-xs text-gray-400">若不選擇，材料將標記為「待分配」且狀態為「全新」。</p>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                   <button onClick={() => setShowMaterialModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">取消</button>
                   <button onClick={handleAddMaterial} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2">
                     <Save className="w-5 h-5" /> 儲存
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 1.1 Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <h3 className="text-xl font-bold text-gray-800">編輯材料資訊</h3>
               <button onClick={() => setEditingMaterial(null)}><X className="w-6 h-6 text-gray-500" /></button>
             </div>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">材料名稱</label>
                     <input type="text" className="w-full border rounded p-3 text-gray-900 bg-white" value={editingMaterial.name} onChange={e => setEditingMaterial({...editingMaterial, name: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">規格</label>
                     <input type="text" className="w-full border rounded p-3 text-gray-900 bg-white" value={editingMaterial.spec} onChange={e => setEditingMaterial({...editingMaterial, spec: e.target.value})} />
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">最大數量 (上限)</label>
                   <input type="number" className="w-full border rounded p-3 text-gray-900 bg-white" value={editingMaterial.maxQuantity} onChange={e => setEditingMaterial({...editingMaterial, maxQuantity: parseInt(e.target.value) || 0})} />
                   <p className="text-xs text-gray-500 mt-1">此數值用於計算監控進度條的百分比。</p>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">狀態</label>
                   <select 
                     className="w-full border rounded p-3 text-gray-900 bg-white"
                     value={editingMaterial.status}
                     onChange={e => setEditingMaterial({...editingMaterial, status: e.target.value as MaterialStatus})}
                   >
                     <option value={MaterialStatus.NEW}>全新 (NEW)</option>
                     <option value={MaterialStatus.USED}>使用中 (USED)</option>
                     <option value={MaterialStatus.AVAILABLE}>可用 (AVAILABLE)</option>
                     <option value={MaterialStatus.SCRAP}>報廢 (SCRAP)</option>
                   </select>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                   <p className="mb-1"><span className="font-bold">目前庫存:</span> {editingMaterial.quantity}</p>
                   <p><span className="font-bold">位置:</span> {(!editingMaterial.siteId || !editingMaterial.groupId) ? "待分配" : 
                      `${projects.find(p=>p.id===editingMaterial.projectId)?.name} / ${projects.find(p=>p.id===editingMaterial.projectId)?.sites.find(s=>s.id===editingMaterial.siteId)?.name} / ${projects.find(p=>p.id===editingMaterial.projectId)?.sites.find(s=>s.id===editingMaterial.siteId)?.groups.find(g=>g.id===editingMaterial.groupId)?.name}`
                   }</p>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                   <button onClick={() => setEditingMaterial(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">取消</button>
                   <button onClick={handleUpdateMaterial} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2">
                     <Save className="w-5 h-5" /> 更新
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 2. Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200 border-t-4 border-blue-600">
             <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
               <ArrowLeftRight className="w-5 h-5 text-blue-600" /> 材料快速調度
             </h3>
             
             <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 font-medium">
                  目標材料: {transferData.materialName}
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">來源 (調出)</label>
                   <select 
                     className="w-full border rounded p-3 bg-gray-50 text-gray-900"
                     value={transferData.fromGroupId}
                     onChange={e => setTransferData({...transferData, fromGroupId: e.target.value})}
                   >
                     {/* Allow selecting unassigned if current scope allows, but usually we pre-fill this */}
                     <option value="">(未分配)</option>
                     {projects.find(p => p.id === scope.projectId)?.sites.flatMap(s => s.groups).map(g => (
                       <option key={g.id} value={g.id}>{g.name}</option>
                     ))}
                   </select>
                </div>

                <div className="flex justify-center">
                   <ArrowRight className="w-5 h-5 text-gray-400 transform rotate-90 md:rotate-0" />
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">目的小組 (調入)</label>
                   <select 
                     className="w-full border rounded p-3 bg-white text-gray-900"
                     value={transferData.toGroupId}
                     onChange={e => setTransferData({...transferData, toGroupId: e.target.value})}
                   >
                     <option value="">(未分配) - 退回/回收</option>
                     {projects.find(p => p.id === scope.projectId)?.sites.flatMap(s => s.groups).map(g => (
                       <option key={g.id} value={g.id} disabled={g.id === transferData.fromGroupId}>{g.name}</option>
                     ))}
                   </select>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">調撥數量</label>
                   <input 
                     type="number" 
                     className="w-full border rounded p-3 font-mono text-xl text-gray-900 bg-white" 
                     value={transferData.quantity}
                     min={1}
                     onChange={e => setTransferData({...transferData, quantity: parseInt(e.target.value) || 0})}
                   />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                   <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">取消</button>
                   <button onClick={handleTransfer} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">
                     確認調撥
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 2.5 Dashboard Action Modal (NEW) */}
      {selectedDashboardMaterial && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
              <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                 <div>
                   <h3 className="font-bold text-lg">{selectedDashboardMaterial.material.name}</h3>
                   <p className="text-sm opacity-80">{selectedDashboardMaterial.material.spec}</p>
                 </div>
                 <button onClick={() => setSelectedDashboardMaterial(null)}><X className="w-6 h-6" /></button>
              </div>
              <div className="p-2 grid grid-cols-1 divide-y divide-gray-100">
                 <button 
                   onClick={() => openTransferModal(selectedDashboardMaterial.material.name, selectedDashboardMaterial.groupId)}
                   className="flex items-center gap-3 p-4 hover:bg-blue-50 hover:text-blue-700 text-gray-700 transition-colors"
                 >
                   <div className="bg-blue-100 p-2 rounded-full text-blue-600"><ArrowLeftRight className="w-5 h-5" /></div>
                   <div className="text-left">
                      <div className="font-bold">調撥分配</div>
                      <div className="text-xs opacity-70">移動位置或退回未分配區</div>
                   </div>
                 </button>
                 <button 
                   onClick={() => openUsageModal(selectedDashboardMaterial.material, 'CONSUME')}
                   className="flex items-center gap-3 p-4 hover:bg-orange-50 hover:text-orange-700 text-gray-700 transition-colors"
                 >
                   <div className="bg-orange-100 p-2 rounded-full text-orange-600"><MinusCircle className="w-5 h-5" /></div>
                   <div className="text-left">
                      <div className="font-bold">領用消耗</div>
                      <div className="text-xs opacity-70">登記使用數量</div>
                   </div>
                 </button>
                 <button 
                   onClick={() => {
                     setEditingMaterial(selectedDashboardMaterial.material);
                     setSelectedDashboardMaterial(null);
                   }}
                   className="flex items-center gap-3 p-4 hover:bg-gray-50 text-gray-700 transition-colors"
                 >
                   <div className="bg-gray-100 p-2 rounded-full text-gray-600"><Edit className="w-5 h-5" /></div>
                   <div className="text-left">
                      <div className="font-bold">編輯詳情</div>
                      <div className="text-xs opacity-70">修改數量、狀態或備註</div>
                   </div>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Scanner & Action Modal (Kept for mobile use) */}
      {showScanner && <Scanner onScan={(code) => { setShowScanner(false); const m = inventory.find(i=>i.qrCode===code); if(m) setScannedMaterial(m); else alert('無此材料'); }} onClose={() => setShowScanner(false)} />}
      
      {scannedMaterial && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-blue-600 p-4 text-white text-center relative">
               <h3 className="font-bold text-lg">識別成功</h3>
               <button onClick={() => setScannedMaterial(null)} className="absolute right-4 top-4 opacity-70 hover:opacity-100">
                 <X className="w-6 h-6" />
               </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <h4 className="text-xl font-bold text-gray-900">{scannedMaterial.name}</h4>
                <p className="text-gray-500 text-sm mt-1">{scannedMaterial.spec}</p>
                <div className="mt-4 bg-gray-100 rounded p-2 text-sm text-gray-600">
                   {currentScopeName}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button className="bg-gray-100 p-3 rounded hover:bg-gray-200 text-sm font-bold text-gray-700">更新狀態</button>
                 <button className="bg-gray-100 p-3 rounded hover:bg-gray-200 text-sm font-bold text-gray-700">查看詳情</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
const NavButton = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 mx-1 rounded-lg transition-all text-base font-medium ${
      active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {React.cloneElement(icon, { size: 20 })}
    <span>{label}</span>
  </button>
);

const MobileNavIcon = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-gray-400'}`}>
    {React.cloneElement(icon, { size: 24 })}
    <span className="text-xs font-bold">{label}</span>
  </button>
);

export default App;