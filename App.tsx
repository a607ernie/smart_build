import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Box, 
  ScanLine, 
  BarChart3, 
  Bot, 
  LogOut, 
  Search, 
  ArrowRight,
  PackageCheck,
  PackageMinus,
  Recycle,
  ChevronRight,
  Building,
  MapPin,
  Users,
  Home
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { INITIAL_INVENTORY, MOCK_USER, PROJECT_HIERARCHY } from './constants';
import { Material, MaterialStatus, ViewState } from './types';
import { Scanner } from './components/Scanner';
import { AISuggestion } from './components/AISuggestion';

// Scope Interface for Navigation
interface Scope {
  projectId: string | null;
  siteId: string | null;
  groupId: string | null;
}

function App() {
  const [user, setUser] = useState<{username: string} | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [inventory, setInventory] = useState<Material[]>(INITIAL_INVENTORY);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Navigation Scope State
  const [scope, setScope] = useState<Scope>({ projectId: null, siteId: null, groupId: null });

  // Filter Inventory based on Scope
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (scope.projectId && item.projectId !== scope.projectId) return false;
      if (scope.siteId && item.siteId !== scope.siteId) return false;
      if (scope.groupId && item.groupId !== scope.groupId) return false;
      return true;
    });
  }, [inventory, scope]);

  // Helper to find names
  const getCurrentNames = () => {
    const project = PROJECT_HIERARCHY.find(p => p.id === scope.projectId);
    const site = project?.sites.find(s => s.id === scope.siteId);
    const group = site?.groups.find(g => g.id === scope.groupId);
    return { 
      projectName: project?.name, 
      siteName: site?.name, 
      groupName: group?.name 
    };
  };

  const { projectName, siteName, groupName } = getCurrentNames();

  // Login Logic
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

  const handleScan = (code: string) => {
    setShowScanner(false);
    const material = inventory.find(m => m.qrCode === code);
    if (material) {
      setScannedMaterial(material);
    } else {
      alert(`找不到 QR Code 為 ${code} 的材料。`);
    }
  };

  // Simplified Action Logic
  const handleMaterialAction = (action: 'IN' | 'OUT' | 'RECYCLE') => {
    if (!scannedMaterial) return;
    const updatedInventory = inventory.map(item => {
      if (item.id === scannedMaterial.id) {
        const changes: Partial<Material> = {};
        if (action === 'IN') {
           // Defaulting to warehouse for generic "IN" in this demo
           changes.projectId = 'WH';
           changes.siteId = 'WH_MAIN';
           changes.groupId = 'WH_G1';
           changes.status = MaterialStatus.USED;
        } else if (action === 'OUT') {
           // No location change logic implemented for OUT in demo, just status update
           changes.status = MaterialStatus.USED;
        } else if (action === 'RECYCLE') {
           changes.status = MaterialStatus.DAMAGED;
        }
        return { ...item, ...changes, lastUpdated: new Date().toISOString() };
      }
      return item;
    });
    setInventory(updatedInventory);
    setScannedMaterial(null);
    alert('狀態更新成功！');
  };

  // --- Statistics Calculation based on filteredInventory ---
  const totalItems = filteredInventory.reduce((acc, curr) => acc + curr.quantity, 0);
  const statusData = [
    { name: '全新', value: filteredInventory.filter(i => i.status === MaterialStatus.NEW).length },
    { name: '可用餘料', value: filteredInventory.filter(i => i.status === MaterialStatus.USED).length },
    { name: '報廢/損壞', value: filteredInventory.filter(i => i.status === MaterialStatus.DAMAGED).length },
  ];
  const COLORS = ['#3B82F6', '#10B981', '#EF4444'];

  // --- Hierarchy Drill Down Components ---
  const ScopeBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white p-3 rounded-lg shadow-sm mb-6 overflow-x-auto">
      <button 
        onClick={() => setScope({ projectId: null, siteId: null, groupId: null })}
        className={`flex items-center hover:text-blue-600 ${!scope.projectId ? 'font-bold text-blue-600' : ''}`}
      >
        <Home className="w-4 h-4 mr-1" /> 所有專案
      </button>

      {scope.projectId && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <button 
            onClick={() => setScope(prev => ({ ...prev, siteId: null, groupId: null }))}
            className={`flex items-center hover:text-blue-600 whitespace-nowrap ${!scope.siteId ? 'font-bold text-blue-600' : ''}`}
          >
            <Building className="w-4 h-4 mr-1" /> {projectName}
          </button>
        </>
      )}

      {scope.siteId && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <button 
            onClick={() => setScope(prev => ({ ...prev, groupId: null }))}
            className={`flex items-center hover:text-blue-600 whitespace-nowrap ${!scope.groupId ? 'font-bold text-blue-600' : ''}`}
          >
            <MapPin className="w-4 h-4 mr-1" /> {siteName}
          </button>
        </>
      )}

      {scope.groupId && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-bold text-blue-600 flex items-center whitespace-nowrap">
            <Users className="w-4 h-4 mr-1" /> {groupName}
          </span>
        </>
      )}
    </div>
  );

  const DrillDownTiles = () => {
    // Level 1: Projects
    if (!scope.projectId) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PROJECT_HIERARCHY.map(proj => (
            <button 
              key={proj.id}
              onClick={() => setScope({ projectId: proj.id, siteId: null, groupId: null })}
              className="bg-white p-6 rounded-xl shadow-sm border hover:border-blue-500 hover:shadow-md transition-all text-left group"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-mono text-gray-400">{proj.id}</span>
              </div>
              <h3 className="mt-4 font-bold text-gray-900">{proj.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{proj.sites.length} 個工區</p>
            </button>
          ))}
        </div>
      );
    }

    // Level 2: Sites
    if (!scope.siteId) {
      const project = PROJECT_HIERARCHY.find(p => p.id === scope.projectId);
      return (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">選擇 {project?.name} 的工區</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {project?.sites.map(site => (
              <button 
                key={site.id}
                onClick={() => setScope(prev => ({ ...prev, siteId: site.id, groupId: null }))}
                className="bg-white p-6 rounded-xl shadow-sm border hover:border-emerald-500 hover:shadow-md transition-all text-left group"
              >
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                      <MapPin className="w-6 h-6 text-emerald-600" />
                    </div>
                 </div>
                 <h3 className="mt-4 font-bold text-gray-900">{site.name}</h3>
                 <p className="text-sm text-gray-500 mt-1">{site.groups.length} 個組別</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Level 3: Groups (Leaf Nodes)
    if (!scope.groupId) {
       const project = PROJECT_HIERARCHY.find(p => p.id === scope.projectId);
       const site = project?.sites.find(s => s.id === scope.siteId);
       return (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">選擇 {site?.name} 的組別</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {site?.groups.map(group => (
              <button 
                key={group.id}
                onClick={() => setScope(prev => ({ ...prev, groupId: group.id }))}
                className="bg-white p-4 rounded-xl shadow-sm border hover:border-purple-500 hover:shadow-md transition-all text-left group"
              >
                 <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">{group.id}</span>
                 </div>
                 <h3 className="font-bold text-gray-900 text-sm">{group.name}</h3>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null; // Fully zoomed in
  };

  // Render Logic
  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 text-white">
              <Box className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">SmartBuild 建材管理</h1>
            <p className="text-gray-500">智慧材料追蹤系統</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="password"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
              登入 <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>測試帳號: admin / password</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Nav Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
        <span className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <Box className="w-6 h-6 text-blue-600" /> SmartBuild
        </span>
        <button onClick={handleLogout} className="text-gray-500">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Desktop */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 text-white font-bold text-xl">
          <Box className="w-8 h-8 text-blue-500" />
          SmartBuild
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavButton icon={<LayoutDashboard />} label="儀表板" active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
          <NavButton icon={<Box />} label="庫存管理" active={view === 'INVENTORY'} onClick={() => setView('INVENTORY')} />
          <NavButton icon={<BarChart3 />} label="報表統計" active={view === 'REPORTS'} onClick={() => setView('REPORTS')} />
          <NavButton icon={<Bot />} label="AI 顧問" active={view === 'AI_ADVISOR'} onClick={() => setView('AI_ADVISOR')} />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span>登出</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        {/* Mobile FAB for Scan */}
        <button 
          onClick={() => setShowScanner(true)}
          className="md:hidden fixed bottom-20 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg z-30 hover:bg-blue-700 transition-transform active:scale-95"
        >
          <ScanLine className="w-6 h-6" />
        </button>

        {/* Global Breadcrumb for Dashboard/Inventory */}
        {(view === 'DASHBOARD' || view === 'INVENTORY') && <ScopeBreadcrumb />}

        {view === 'DASHBOARD' && (
          <div className="space-y-6">
            <DrillDownTiles />

            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               總覽概況 
               {scope.projectId && <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{scope.projectId}</span>}
            </h2>
            
            {/* KPI Cards (Filtered) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard title="材料總數" value={totalItems} icon={<Box className="text-blue-500" />} />
              <KPICard title="全新庫存" value={statusData[0].value} icon={<PackageCheck className="text-green-500" />} />
              <KPICard title="可用餘料" value={statusData[1].value} icon={<PackageMinus className="text-orange-500" />} />
            </div>

            {/* Quick Actions */}
            <div className="hidden md:flex gap-4">
              <button 
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
              >
                <ScanLine className="w-5 h-5" /> 掃描 QR Code
              </button>
            </div>

            {/* Recent Items Table (Filtered) */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
               <h3 className="font-semibold text-lg mb-4">當前庫存 ({filteredInventory.length} 項)</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-gray-600">
                   <thead className="bg-gray-50 text-gray-900 font-semibold">
                     <tr>
                       <th className="p-3">材料名稱</th>
                       {/* Dynamically hide columns if we are zoomed into them */}
                       {!scope.projectId && <th className="p-3">專案</th>}
                       {!scope.siteId && <th className="p-3">工區</th>}
                       {!scope.groupId && <th className="p-3">組別</th>}
                       <th className="p-3">數量</th>
                       <th className="p-3">狀態</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y">
                     {filteredInventory.slice(0, 5).map(item => (
                       <tr key={item.id}>
                         <td className="p-3 font-medium text-gray-900">{item.name} <span className="text-xs text-gray-400 block">{item.spec}</span></td>
                         
                         {!scope.projectId && <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{item.projectId}</span></td>}
                         {!scope.siteId && <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{item.siteId}</span></td>}
                         {!scope.groupId && <td className="p-3 text-xs">{item.groupId}</td>}
                         
                         <td className="p-3 font-mono">{item.quantity} {item.unit}</td>
                         <td className="p-3"><StatusBadge status={item.status} /></td>
                       </tr>
                     ))}
                     {filteredInventory.length === 0 && (
                       <tr><td colSpan={6} className="p-6 text-center text-gray-400">目前篩選範圍內無材料。</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {view === 'INVENTORY' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">庫存管理</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" placeholder="搜尋材料..." className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
             </div>

             <DrillDownTiles />
             
             <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="p-4">編號</th>
                        <th className="p-4">名稱與規格</th>
                        
                        {/* Dynamic Columns based on scope */}
                        {!scope.projectId && <th className="p-4">專案</th>}
                        {!scope.siteId && <th className="p-4">工區</th>}
                        {!scope.groupId && <th className="p-4">組別</th>}
                        
                        <th className="p-4">狀態</th>
                        <th className="p-4 text-right">數量</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventory.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-mono text-gray-500">{item.id}</td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.spec}</div>
                          </td>
                          
                          {!scope.projectId && <td className="p-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{item.projectId}</span></td>}
                          {!scope.siteId && <td className="p-4"><span className="text-gray-600 text-xs">{item.siteId}</span></td>}
                          {!scope.groupId && <td className="p-4"><span className="text-gray-500 text-xs">{item.groupId}</span></td>}

                          <td className="p-4"><StatusBadge status={item.status} /></td>
                          <td className="p-4 text-right font-mono font-bold text-gray-800">{item.quantity} <span className="text-xs font-normal text-gray-400">{item.unit}</span></td>
                        </tr>
                      ))}
                      {filteredInventory.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-500">沒有符合條件的項目。</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {view === 'REPORTS' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">報表統計</h2>
            {/* Re-use charts but could be filtered by scope too */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="font-semibold mb-6">材料狀態分佈</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'AI_ADVISOR' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">AI 調配顧問</h2>
            <AISuggestion inventory={inventory} />
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 pb-safe z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <MobileNavIcon icon={<LayoutDashboard />} label="首頁" active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} />
        <MobileNavIcon icon={<Box />} label="庫存" active={view === 'INVENTORY'} onClick={() => setView('INVENTORY')} />
        <div className="w-8"></div> {/* Spacer for FAB */}
        <MobileNavIcon icon={<Bot />} label="AI" active={view === 'AI_ADVISOR'} onClick={() => setView('AI_ADVISOR')} />
        <MobileNavIcon icon={<BarChart3 />} label="統計" active={view === 'REPORTS'} onClick={() => setView('REPORTS')} />
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Material Action Modal (After Scan) */}
      {scannedMaterial && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="bg-blue-600 p-4 text-white text-center relative">
               <h3 className="font-bold text-lg">識別成功</h3>
               <button onClick={() => setScannedMaterial(null)} className="absolute right-4 top-4 opacity-70 hover:opacity-100">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
                  {scannedMaterial.qrCode}
                </div>
                <h4 className="text-xl font-bold text-gray-900">{scannedMaterial.name}</h4>
                <p className="text-gray-500 text-sm mt-1">{scannedMaterial.spec}</p>
                <div className="mt-4 flex flex-col gap-2 justify-center items-center">
                   <StatusBadge status={scannedMaterial.status} />
                   <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-full">
                     位置: {scannedMaterial.projectId} / {scannedMaterial.siteId}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <ActionButton 
                  icon={<PackageCheck className="w-5 h-5" />} 
                  label="入庫/歸還" 
                  color="bg-green-100 text-green-700 hover:bg-green-200" 
                  onClick={() => handleMaterialAction('IN')} 
                />
                <ActionButton 
                  icon={<PackageMinus className="w-5 h-5" />} 
                  label="領用/出庫" 
                  color="bg-blue-100 text-blue-700 hover:bg-blue-200" 
                  onClick={() => handleMaterialAction('OUT')} 
                />
                <ActionButton 
                  icon={<Recycle className="w-5 h-5" />} 
                  label="回收/報廢" 
                  color="bg-orange-100 text-orange-700 hover:bg-orange-200" 
                  onClick={() => handleMaterialAction('RECYCLE')} 
                />
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavIcon = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-gray-400'}`}
  >
    {React.cloneElement(icon, { size: 20 })}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const KPICard = ({ title, value, icon, change }: any) => (
  <div className="bg-white p-6 rounded-xl border shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      {change && (
        <p className={`text-xs mt-2 font-medium ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
          {change} <span className="text-gray-400 font-normal">vs last month</span>
        </p>
      )}
    </div>
    <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'NEW': 'bg-blue-100 text-blue-700 border-blue-200',
    'USED': 'bg-green-100 text-green-700 border-green-200',
    'DAMAGED': 'bg-red-100 text-red-700 border-red-200',
  };

  const labels: Record<string, string> = {
    'NEW': '全新',
    'USED': '可用餘料',
    'DAMAGED': '報廢/損壞',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
};

const ActionButton = ({ icon, label, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-transform active:scale-95 ${color}`}
  >
    {icon}
    <span className="text-xs font-bold mt-2">{label}</span>
  </button>
);

export default App;
