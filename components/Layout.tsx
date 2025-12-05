import React from 'react';
import { LayoutDashboard, HardHat, Users, Building2, BarChart3, Settings, Menu, X, LogOut, Package, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AppModule } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

// Composant Logo CSS pur pour garantir l'affichage sans dépendance externe
export const Logo3F: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="flex items-center justify-center bg-red-700 text-white font-bold rounded-lg h-10 w-10 text-xl tracking-tighter border-2 border-red-800 shadow-sm">
      3F
    </div>
    <div className="flex flex-col leading-none">
      <span className="font-extrabold text-slate-800 text-lg tracking-tight">3F INDUSTRIE</span>
      <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">Équipement & Logistique</span>
    </div>
  </div>
);

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { user, logout, hasModuleAccess } = useAuth();

  const allNavItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, module: 'dashboard' as AppModule },
    { id: 'chantiers', label: 'Chantiers', icon: HardHat, module: 'chantiers' as AppModule },
    { id: 'stock', label: 'Stock & Matériel', icon: Package, module: 'stock' as AppModule },
    { id: 'clients', label: 'Clients', icon: Building2, module: 'clients' as AppModule },
    { id: 'monteurs', label: 'Équipe RH', icon: Users, module: 'monteurs' as AppModule },
    { id: 'rapports', label: 'Rapports & Stats', icon: BarChart3, module: 'rapports' as AppModule },
    { id: 'admin', label: 'Administration', icon: Shield, module: 'admin' as AppModule },
  ];

  // Filter items based on permissions
  const navItems = allNavItems.filter(item => hasModuleAccess(item.module));

  const handleNav = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm fixed h-full z-20">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
           <Logo3F />
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map(item => {
             const Icon = item.icon;
             const isActive = activePage === item.id;
             return (
               <button
                 key={item.id}
                 onClick={() => handleNav(item.id)}
                 className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                   isActive 
                     ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' 
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                 }`}
               >
                 <Icon className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                 {item.label}
               </button>
             );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 mb-4">
             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs border border-slate-300">
               {user?.name?.substring(0,2).toUpperCase()}
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
               <p className="text-xs text-gray-500 truncate">{user?.role}</p>
             </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Header & Overlay */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 shadow-sm">
         <Logo3F className="scale-75 origin-left" />
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
           {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-gray-800/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <Logo3F />
              </div>
              <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {navItems.map(item => {
                   const Icon = item.icon;
                   const isActive = activePage === item.id;
                   return (
                     <button
                       key={item.id}
                       onClick={() => handleNav(item.id)}
                       className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                         isActive ? 'bg-red-50 text-red-700 border border-red-100' : 'text-gray-600 hover:bg-gray-50'
                       }`}
                     >
                       <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                       {item.label}
                     </button>
                   );
                })}
              </nav>
              <div className="p-4 border-t border-gray-100">
                 <button onClick={logout} className="w-full flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 rounded-lg font-bold">
                   <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-full">
         <div className="max-w-7xl mx-auto min-h-full">
           {children}
         </div>
      </main>
    </div>
  );
};

export default Layout;