
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SiteList from './pages/SiteList';
import SiteDetail from './pages/SiteDetail';
import StockManagement from './pages/StockManagement';
import Clients from './pages/Clients';
import Monteurs from './pages/Monteurs';
import AdminPanel from './pages/AdminPanel';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppModule } from './types';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, hasModuleAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // If not authenticated, show Login page
  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigate = (page: string) => {
    // Basic route guard
    if (hasModuleAccess(page as AppModule)) {
      setCurrentPage(page);
      setSelectedSiteId(null);
    } else {
      alert("Accès refusé : Vous n'avez pas les droits pour ce module.");
    }
  };

  const handleSelectSite = (id: string) => {
    setSelectedSiteId(id);
    setCurrentPage('site_detail');
  };

  const renderContent = () => {
    // Global check for current page permission (except site_detail which is part of chantiers)
    const effectiveModuleToCheck = currentPage === 'site_detail' ? 'chantiers' : currentPage;
    
    if (currentPage !== 'dashboard' && !hasModuleAccess(effectiveModuleToCheck as AppModule)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
           <div className="text-6xl mb-4">🚫</div>
           <h2 className="text-2xl font-bold text-gray-800">Accès Refusé</h2>
           <p>Votre administrateur a désactivé ce module pour votre compte.</p>
           <button onClick={() => setCurrentPage('dashboard')} className="mt-4 text-blue-600 hover:underline">Retour au Dashboard</button>
        </div>
      );
    }

    if (currentPage === 'site_detail' && selectedSiteId) {
      return (
        <SiteDetail 
          chantierId={selectedSiteId} 
          onBack={() => setCurrentPage('chantiers')} 
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard navigateTo={handleNavigate} />;
      case 'chantiers':
        return <SiteList onSelectSite={handleSelectSite} />;
      case 'stock':
        return <StockManagement />;
      case 'clients':
        return <Clients />;
      case 'monteurs':
        return <Monteurs />;
      case 'admin':
        return <AdminPanel />;
      case 'rapports':
        return <Reports />;
      default:
        return <Dashboard navigateTo={handleNavigate} />;
    }
  };

  return (
    <Layout activePage={currentPage} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
