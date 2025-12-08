import React, { useState, useEffect } from 'react';
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
  const { isAuthenticated, user, hasModuleAccess, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Restaurer la page depuis localStorage
  useEffect(() => {
    if (isAuthenticated) {
      const savedPage = localStorage.getItem('currentPage');
      if (savedPage && savedPage !== 'login') {
        setCurrentPage(savedPage);
      }
    }
  }, [isAuthenticated]);

  // Sauvegarder la page
  useEffect(() => {
    if (isAuthenticated && currentPage && currentPage !== 'login') {
      localStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage, isAuthenticated]);

  // Chargement de l'authentification
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Chargement de la session...</p>
      </div>
    );
  }

  // Si non authentifié
  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigate = (page: string) => {
    if (hasModuleAccess(page as AppModule)) {
      setCurrentPage(page);
      setSelectedSiteId(null);
    } else {
      alert(`Accès refusé au module "${page}"`);
    }
  };

  const handleSelectSite = (id: string) => {
    setSelectedSiteId(id);
    setCurrentPage('site_detail');
  };

  const renderContent = () => {
    const effectiveModule = currentPage === 'site_detail' ? 'chantiers' : currentPage;
    
    if (currentPage !== 'dashboard' && !hasModuleAccess(effectiveModule as AppModule)) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès Refusé</h2>
          <p className="text-gray-600 mb-6">Vous n'avez pas les droits pour ce module.</p>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour au Dashboard
          </button>
        </div>
      );
    }

    if (currentPage === 'site_detail' && selectedSiteId) {
      return (
        <SiteDetail 
          chantierId={selectedSiteId} 
          onBack={() => {
            setCurrentPage('chantiers');
            setSelectedSiteId(null);
          }} 
        />
      );
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard navigateTo={handleNavigate} />;
      case 'chantiers': return <SiteList onSelectSite={handleSelectSite} />;
      case 'stock': return <StockManagement />;
      case 'clients': return <Clients />;
      case 'monteurs': return <Monteurs />;
      case 'admin': return <AdminPanel />;
      case 'rapports': return <Reports />;
      default: return <Dashboard navigateTo={handleNavigate} />;
    }
  };

  return (
    <Layout activePage={currentPage} onNavigate={handleNavigate} user={user}>
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
