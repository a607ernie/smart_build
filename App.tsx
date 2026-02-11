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
  MoreHorizontal
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
  unit: string;
  projectId: string;
  siteId: string;
  groupId: string;
}

interface TransferState {
  materialName: string; // Grouping by name/spec
  fromGroupId: string;
  toGroupId: string;
  quantity: number;
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

function App() {
  const [user, setUser] = useState<{username: string} | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [projects, setProjects] = useState<ProjectNode[]>(INITIAL_HIERARCHY);
  const [inventory, setInventory] = useState<Material[]>(INITIAL_INVENTORY);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Navigation Scope
  const [scope, setScope] = useState<Scope>({ projectId: null, siteId: null, groupId: null });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Dashboard Monitor Filters
  const [monitorFilters, setMonitorFilters] = useState<string[]>([]);

  // UI States for Modals
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState<MaterialFormState>({
    name: '', spec: '', quantity: 1, unit: '個', projectId: '', siteId: '', groupId: ''
  });
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState<TransferState>({
    materialName: '', fromGroupId: '', toGroupId: '', quantity: 1
  });

  // --- New Modal States ---
  const [addModal, setAddModal] = useState<AddModalState>({ type: null });
  const [newItemName, setNewItemName] = useState('');
  
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ type: null, id: '', name: '' });

  // --- Initial Effects ---
  // When inventory loads, set all materials as active filters by default (or just top 5)
  useEffect(() => {
    if (inventory.length > 0 && monitorFilters.length === 0) {
      const allNames = Array.from(new Set(inventory.map(i => i.name)));
      setMonitorFilters(allNames);
    }
  }, [inventory]);

  // --- Helpers ---
  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedNodes(newExpanded);
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (scope.projectId && item.projectId !== scope.projectId) return false;
      if (scope.siteId && item.siteId !== scope.siteId) return false;
      if (scope.groupId && item.groupId !== scope.groupId) return false;
      return true;
    });
  }, [inventory, scope]);

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
      setView('DASHBOARD');
    } else {
      alert('帳號或密碼錯誤。請嘗試 admin / password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('LOGIN');
    setLoginForm({ username: '', password: '' });
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
    if (!newMaterial.name || !newMaterial.projectId) {
      alert("請填寫完整資訊 (名稱、專案為必填)");
      return;
    }
    const newItem: Material = {
      id: `M_${Date.now()}`,
      name: newMaterial.name,
      spec: newMaterial.spec,
      quantity: newMaterial.quantity,
      unit: newMaterial.unit,
      status: MaterialStatus.NEW,
      projectId: newMaterial.projectId,
      siteId: newMaterial.siteId,
      groupId: newMaterial.groupId,
      qrCode: `MAT-${Date.now()}`, // Auto-gen QR
      lastUpdated: new Date().toISOString(),
      reuseCount: 0
    };
    setInventory([...inventory, newItem]);
    setShowMaterialModal(false);
    setNewMaterial({ name: '', spec: '', quantity: 1, unit: '個', projectId: '', siteId: '', groupId: '' });
  };

  // --- COORDINATION: Transfer Logic ---
  const openTransferModal = (materialName: string, fromGroupId?: string) => {
    setTransferData({
      materialName,
      fromGroupId: fromGroupId || '',
      toGroupId: '',
      quantity: 1
    });
    setShowTransferModal(true);
  };

  const handleTransfer = () => {
    const { materialName, fromGroupId, toGroupId, quantity } = transferData;
    if (!fromGroupId || !toGroupId || fromGroupId === toGroupId) {
      alert("請選擇有效的來源與目的小組");
      return;
    }

    // Find items in source group matching name
    const sourceItems = inventory.filter(i => i.name === materialName && i.groupId === fromGroupId);
    let remainingToMove = quantity;
    let newInv = [...inventory];

    // Check if enough stock
    const totalSourceQty = sourceItems.reduce((acc, curr) => acc + curr.quantity, 0);
    if (totalSourceQty < quantity) {
      alert(`庫存不足！來源小組只有 ${totalSourceQty}，您嘗試調撥 ${quantity}`);
      return;
    }

    // Find target location details
    const targetProject = projects.find(p => p.sites.some(s => s.groups.some(g => g.id === toGroupId)));
    const targetSite = targetProject?.sites.find(s => s.groups.some(g => g.id === toGroupId));

    if (!targetProject || !targetSite) return;

    // Execute Move
    for (const item of sourceItems) {
      if (remainingToMove <= 0) break;

      const moveAmount = Math.min(item.quantity, remainingToMove);
      
      if (moveAmount === item.quantity) {
        // Move entire item
        newInv = newInv.map(i => i.id === item.id ? { 
          ...i, 
          projectId: targetProject.id, 
          siteId: targetSite.id, 
          groupId: toGroupId,
          lastUpdated: new Date().toISOString()
        } : i);
      } else {
        // Split item: Reduce source, Create target
        newInv = newInv.map(i => i.id === item.id ? { ...i, quantity: i.quantity - moveAmount } : i);
        
        const splitItem: Material = {
          ...item,
          id: `${item.id}_split_${Date.now()}`,
          quantity: moveAmount,
          projectId: targetProject.id,
          siteId: targetSite.id,
          groupId: toGroupId,
          lastUpdated: new Date().toISOString()
        };
        newInv.push(splitItem);
      }
      remainingToMove -= moveAmount;
    }

    setInventory(newInv);
    setShowTransferModal(false);
    alert(`成功調撥 ${quantity} ${materialName} 到目的小組`);
  };


  // --- VISUALIZATION: Monitor Data Preparation ---
  // Get all unique materials available in the current scope
  const availableMaterials = useMemo(() => {
    return Array.from(new Set(filteredInventory.map(i => i.name)));
  }, [filteredInventory]);

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
    // Return structure: [{ siteName: 'Site A', groups: [Group1, Group2] }, ...]
    
    // 1. If Global Scope -> Show all Projects (Summary View) OR Flatten all sites? 
    //    The user wants "Project View" -> "Show all groups".
    //    Let's make it recursive based on scope.
    
    let result: { siteName: string, siteId: string, groups: {id: string, name: string}[] }[] = [];

    const relevantProjects = scope.projectId 
      ? projects.filter(p => p.id === scope.projectId)
      : projects;

    relevantProjects.forEach(proj => {
      const relevantSites = scope.siteId 
         ? proj.sites.filter(s => s.id === scope.siteId) 
         : proj.sites;
      
      relevantSites.forEach(site => {
        // Filter groups if needed (though usually we show all groups in a site)
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

  // --- Render Functions ---

  const renderHierarchyTree = () => (
    <div className="space-y-1 text-sm">
      <div 
        onClick={() => setScope({ projectId: null, siteId: null, groupId: null })}
        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
          !scope.projectId ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
        }`}
      >
        <Home className="w-4 h-4" />
        <span className="font-medium">總管理處</span>
      </div>

      {projects.map(project => {
        const isExpanded = expandedNodes.has(project.id) || scope.projectId === project.id;
        return (
          <div key={project.id} className="ml-1">
             <div className="flex items-center gap-1 group">
                <button onClick={(e) => { e.stopPropagation(); toggleNode(project.id); }} className="p-1 text-slate-400 hover:text-white">
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <div 
                  onClick={() => setScope({ projectId: project.id, siteId: null, groupId: null })}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    scope.projectId === project.id && !scope.siteId ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                   <Building className="w-4 h-4" />
                   <span className="truncate">{project.name}</span>
                </div>
             </div>

             {isExpanded && (
               <div className="ml-4 border-l border-slate-700 pl-2 space-y-1 mt-1">
                 {project.sites.map(site => {
                   const isSiteExpanded = expandedNodes.has(site.id) || scope.siteId === site.id;
                   return (
                     <div key={site.id}>
                        <div className="flex items-center gap-1 group">
                          <button onClick={(e) => { e.stopPropagation(); toggleNode(site.id); }} className="p-1 text-slate-400 hover:text-white">
                             {isSiteExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                           </button>
                           <div 
                             onClick={() => setScope({ projectId: project.id, siteId: site.id, groupId: null })}
                             className={`flex-1 flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                               scope.siteId === site.id && !scope.groupId ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                             }`}
                           >
                             <MapPin className="w-3 h-3" />
                             <span className="truncate">{site.name}</span>
                           </div>
                        </div>
                        {isSiteExpanded && (
                          <div className="ml-4 border-l border-slate-700 pl-2 space-y-1 mt-1">
                            {site.groups.map(group => (
                              <div 
                                key={group.id}
                                onClick={() => setScope({ projectId: project.id, siteId: site.id, groupId: group.id })}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                  scope.groupId === group.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'
                                }`}
                              >
                                <Users className="w-3 h-3" />
                                <span className="truncate">{group.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        );
      })}
    </div>
  );

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
              <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
              <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="admin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
              <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="password" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
              登入 <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400">測試帳號: admin / password</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-72 bg-slate-900 text-slate-300 h-full border-r border-slate-800">
        <div className="p-6 flex items-center gap-3 text-white font-bold text-xl shrink-0">
          <Box className="w-8 h-8 text-blue-500" />
          SmartBuild
        </div>
        
        <div className="px-4 pb-4 border-b border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">組織架構導航</p>
          <div className="h-[calc(100vh-320px)] overflow-y-auto no-scrollbar pr-2">
            {renderHierarchyTree()}
          </div>
        </div>

        <nav className="p-4 space-y-1 shrink-0 bg-slate-900">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">管理功能</p>
          <NavButton icon={<LayoutDashboard />} label="戰情監控室" active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
          <NavButton icon={<ClipboardList />} label="庫存清單與註冊" active={view === 'INVENTORY'} onClick={() => setView('INVENTORY')} />
          <NavButton icon={<Settings />} label="專案結構設定" active={view === 'SETTINGS'} onClick={() => setView('SETTINGS')} />
        </nav>
        
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span>登出</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center shrink-0">
          <span className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <Box className="w-6 h-6 text-blue-600" /> SmartBuild
          </span>
          <button onClick={() => setShowScanner(true)}><ScanLine className="w-6 h-6 text-gray-600" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 bg-gray-50">
          <div className="flex justify-between items-end mb-6">
             <div>
               <h2 className="text-2xl font-bold text-gray-800">{currentScopeName}</h2>
               <p className="text-gray-500 text-sm mt-1">
                 {scope.projectId ? (scope.siteId ? (scope.groupId ? '小組層級' : '工區層級') : '專案層級') : '集團總覽'}
               </p>
             </div>
          </div>

          {view === 'DASHBOARD' && (
            <div className="space-y-6">
               {/* 1. Filter Bar (The Control Panel) */}
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">監控材料篩選</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableMaterials.length === 0 && <span className="text-sm text-gray-400">目前無庫存數據</span>}
                    {availableMaterials.map(mat => (
                      <button
                        key={mat}
                        onClick={() => toggleMonitorFilter(mat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
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

               {/* 2. Monitor Grid (Grouped by Site) */}
               {monitorGroups.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Monitor className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-slate-400">此範圍內無工區或小組數據</p>
                 </div>
               ) : (
                 monitorGroups.map(siteGroup => (
                   <div key={siteGroup.siteId} className="space-y-3">
                      {/* Site Header */}
                      <div className="flex items-center gap-2 px-1">
                         <MapPin className="w-5 h-5 text-blue-600" />
                         <h3 className="text-lg font-bold text-slate-800">{siteGroup.siteName}</h3>
                         <div className="h-px bg-slate-200 flex-1 ml-2"></div>
                      </div>

                      {/* Group Grid (CCTV Screens) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {siteGroup.groups.map(group => {
                          // Get data for this group
                          const groupMaterials = inventory.filter(i => i.groupId === group.id);
                          
                          return (
                            <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden h-full">
                               {/* Group Title Bar */}
                               <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                     <div className="bg-white p-1 rounded border shadow-sm">
                                       <Users className="w-4 h-4 text-purple-600" />
                                     </div>
                                     <span className="font-bold text-slate-700">{group.name}</span>
                                  </div>
                               </div>

                               {/* Material Stats Body */}
                               <div className="p-4 space-y-3 flex-1">
                                  {monitorFilters.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-4">請選取上方材料以開始監控</p>
                                  ) : (
                                    monitorFilters.map(filterName => {
                                      const items = groupMaterials.filter(i => i.name === filterName);
                                      const totalQty = items.reduce((a,c) => a + c.quantity, 0);
                                      const unit = items[0]?.unit || '-';
                                      
                                      // Visual bar calculation (arbitrary max for demo visuals, e.g., 100)
                                      const percent = Math.min((totalQty / 200) * 100, 100); 

                                      return (
                                        <div key={filterName} className="group/item">
                                           <div className="flex justify-between items-end mb-1">
                                              <span className="text-xs font-medium text-slate-600">{filterName}</span>
                                              <div className="flex items-center gap-2">
                                                 <span className={`text-sm font-mono font-bold ${totalQty === 0 ? 'text-gray-300' : 'text-slate-800'}`}>
                                                   {totalQty} <span className="text-[10px] text-gray-400 font-sans">{unit}</span>
                                                 </span>
                                                 {/* Quick Transfer Button */}
                                                 <button 
                                                   onClick={() => openTransferModal(filterName, group.id)}
                                                   className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                                   title={`從 ${group.name} 調出 ${filterName}`}
                                                 >
                                                   <ArrowLeftRight className="w-3 h-3" />
                                                 </button>
                                              </div>
                                           </div>
                                           {/* Progress Bar */}
                                           <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                   totalQty === 0 ? 'bg-transparent' : 
                                                   totalQty < 20 ? 'bg-red-400' : 'bg-blue-500'
                                                }`}
                                                style={{ width: `${percent}%` }}
                                              ></div>
                                           </div>
                                        </div>
                                      );
                                    })
                                  )}
                                  
                                  {/* Empty State if filter selected but no matching items */}
                                  {monitorFilters.length > 0 && monitorFilters.every(f => !groupMaterials.some(i => i.name === f)) && (
                                     <div className="text-center py-4">
                                        <span className="text-xs text-gray-300 italic">無相關庫存</span>
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
                    <Settings className="w-6 h-6 text-gray-600" /> 
                    組織結構配置
                  </h3>
                  <p className="text-gray-500 mt-1">管理專案、工區以及負責的小組單位</p>
                </div>
                <button 
                  onClick={openAddProjectModal} 
                  className="flex items-center gap-2 bg-slate-800 text-white px-5 py-3 rounded-lg hover:bg-slate-700 shadow-md transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" /> 建立新專案
                </button>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {projects.map(proj => (
                  <div key={proj.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
                    
                    {/* Project Header */}
                    <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                           <Building className="w-6 h-6 text-blue-600" />
                         </div>
                         <div>
                           <h4 className="font-bold text-lg text-slate-800">{proj.name}</h4>
                           <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{proj.id}</span>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openDeleteModal('PROJECT', proj.id, proj.name)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="刪除專案"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sites List */}
                    <div className="p-5 space-y-4 flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">轄下工區 (Sites)</span>
                        <button 
                          onClick={() => openAddSiteModal(proj.id)}
                          className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded"
                        >
                          <Plus className="w-3 h-3" /> 新增工區
                        </button>
                      </div>

                      {proj.sites.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 text-sm">
                          尚未建立工區
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {proj.sites.map(site => (
                            <div key={site.id} className="relative pl-4 border-l-2 border-emerald-500/30 group">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-slate-700">{site.name}</h5>
                                    <button 
                                      onClick={() => openDeleteModal('SITE', site.id, site.name, proj.id)}
                                      className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  {/* Groups Container */}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {site.groups.map(group => (
                                      <div 
                                        key={group.id} 
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 group/chip"
                                      >
                                        <Users className="w-3 h-3" />
                                        {group.name}
                                        <button 
                                          onClick={() => openDeleteModal('GROUP', group.id, group.name, proj.id, site.id)}
                                          className="ml-1 text-purple-300 hover:text-red-500 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => openAddGroupModal(proj.id, site.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 border-dashed hover:border-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" /> 小組
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
                ))}
                
                {/* Empty State / Add Placeholder */}
                {projects.length === 0 && (
                  <div 
                    onClick={openAddProjectModal}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all min-h-[300px]"
                  >
                    <Layers className="w-12 h-12 mb-4 opacity-50" />
                    <h3 className="font-bold text-lg">目前沒有專案</h3>
                    <p className="text-sm">點擊此處建立您的第一個專案結構</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'INVENTORY' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-xl font-bold text-gray-800">庫存清單與註冊</h2>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setShowMaterialModal(true)}
                       className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow"
                     >
                       <Plus className="w-4 h-4" /> 註冊新材料
                     </button>
                   </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-gray-50 text-gray-700 font-semibold uppercase tracking-wider">
                         <tr>
                           <th className="p-4">材料資訊</th>
                           <th className="p-4">歸屬位置</th>
                           <th className="p-4">狀態</th>
                           <th className="p-4 text-right">數量</th>
                           <th className="p-4 text-center">操作</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                         {filteredInventory.map(item => {
                           const pName = projects.find(p=>p.id===item.projectId)?.name || item.projectId;
                           const p = projects.find(proj => proj.id === item.projectId);
                           const sName = p?.sites.find(s=>s.id===item.siteId)?.name || item.siteId;
                           const s = p?.sites.find(site => site.id === item.siteId);
                           const gName = s?.groups.find(g=>g.id===item.groupId)?.name || item.groupId;

                           return (
                             <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                               <td className="p-4">
                                 <div className="font-medium text-gray-900">{item.name}</div>
                                 <div className="text-xs text-gray-500">{item.spec}</div>
                                 <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.qrCode}</div>
                               </td>
                               <td className="p-4 text-xs text-gray-600">
                                 <div className="flex flex-col gap-0.5">
                                   <span className="font-semibold text-blue-800">{pName}</span>
                                   <span className="pl-2 border-l-2 border-gray-200">{sName}</span>
                                   <span className="pl-2 border-l-2 border-gray-200">{gName}</span>
                                 </div>
                               </td>
                               <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                                    item.status === 'NEW' ? 'bg-blue-100 text-blue-700' : 
                                    item.status === 'USED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {item.status}
                                  </span>
                               </td>
                               <td className="p-4 text-right font-mono font-bold text-gray-800">{item.quantity} <span className="text-xs font-normal text-gray-400">{item.unit}</span></td>
                               <td className="p-4 text-center">
                                 <button onClick={() => openDeleteModal('MATERIAL', item.id, item.name)} className="text-gray-400 hover:text-red-600">
                                   <Trash2 className="w-4 h-4" />
                                 </button>
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
             </div>
          )}
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 pb-safe z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <MobileNavIcon icon={<LayoutDashboard />} label="首頁" active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <MobileNavIcon icon={<Box />} label="庫存" active={view === 'INVENTORY'} onClick={() => setView('INVENTORY')} />
        <MobileNavIcon icon={<FolderTree />} label="結構" active={view === 'SETTINGS'} onClick={() => setView('SETTINGS')} />
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
              className="w-full border rounded p-2 mb-4" 
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
      
      {/* 1. Material Registration Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b pb-4">
               <h3 className="text-xl font-bold text-gray-800">註冊新材料</h3>
               <button onClick={() => setShowMaterialModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
             </div>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">材料名稱</label>
                     <input type="text" className="w-full border rounded p-2" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="例如: 鋼管" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">規格</label>
                     <input type="text" className="w-full border rounded p-2" value={newMaterial.spec} onChange={e => setNewMaterial({...newMaterial, spec: e.target.value})} placeholder="例如: 50mm x 3m" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">數量</label>
                     <input type="number" className="w-full border rounded p-2" value={newMaterial.quantity} onChange={e => setNewMaterial({...newMaterial, quantity: parseInt(e.target.value) || 0})} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">單位</label>
                     <input type="text" className="w-full border rounded p-2" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} />
                   </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                   <p className="text-xs font-bold text-gray-500 uppercase">初始位置設定</p>
                   <select className="w-full border rounded p-2" value={newMaterial.projectId} onChange={e => setNewMaterial({...newMaterial, projectId: e.target.value, siteId: '', groupId: ''})}>
                      <option value="">選擇專案</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <select className="w-full border rounded p-2" value={newMaterial.siteId} onChange={e => setNewMaterial({...newMaterial, siteId: e.target.value, groupId: ''})} disabled={!newMaterial.projectId}>
                      <option value="">選擇工區</option>
                      {projects.find(p=>p.id===newMaterial.projectId)?.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                   <select className="w-full border rounded p-2" value={newMaterial.groupId} onChange={e => setNewMaterial({...newMaterial, groupId: e.target.value})} disabled={!newMaterial.siteId}>
                      <option value="">選擇小組</option>
                      {projects.find(p=>p.id===newMaterial.projectId)?.sites.find(s=>s.id===newMaterial.siteId)?.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                   </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                   <button onClick={() => setShowMaterialModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                   <button onClick={handleAddMaterial} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2">
                     <Save className="w-4 h-4" /> 儲存
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
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">來源小組 (調出)</label>
                   <select 
                     className="w-full border rounded p-2 bg-gray-50"
                     value={transferData.fromGroupId}
                     onChange={e => setTransferData({...transferData, fromGroupId: e.target.value})}
                   >
                     <option value="">請選擇來源</option>
                     {projects.find(p => p.id === scope.projectId)?.sites.find(s => s.id === scope.siteId)?.groups.map(g => (
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
                     className="w-full border rounded p-2"
                     value={transferData.toGroupId}
                     onChange={e => setTransferData({...transferData, toGroupId: e.target.value})}
                   >
                     <option value="">請選擇目的</option>
                     {projects.find(p => p.id === scope.projectId)?.sites.find(s => s.id === scope.siteId)?.groups.map(g => (
                       <option key={g.id} value={g.id} disabled={g.id === transferData.fromGroupId}>{g.name}</option>
                     ))}
                   </select>
                </div>

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">調撥數量</label>
                   <input 
                     type="number" 
                     className="w-full border rounded p-2 font-mono text-lg" 
                     value={transferData.quantity}
                     min={1}
                     onChange={e => setTransferData({...transferData, quantity: parseInt(e.target.value) || 0})}
                   />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                   <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                   <button onClick={handleTransfer} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">
                     確認調撥
                   </button>
                </div>
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
    className={`w-full flex items-center gap-3 px-4 py-2 mx-1 rounded-lg transition-all text-sm font-medium ${
      active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {React.cloneElement(icon, { size: 18 })}
    <span>{label}</span>
  </button>
);

const MobileNavIcon = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-gray-400'}`}>
    {React.cloneElement(icon, { size: 20 })}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
