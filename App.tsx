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
  const { isAuthenticated, user, hasModuleAccess, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Restaurer la page précédente depuis localStorage
  useEffect(() => {
    if (isAuthenticated) {
      const savedPage = localStorage.getItem('currentPage');
      if (savedPage && savedPage !== 'login') {
        setCurrentPage(savedPage);
      }
    }
    setInitialLoad(false);
  }, [isAuthenticated]);

  // Sauvegarder la page courante dans localStorage
  useEffect(() => {
    if (isAuthenticated && currentPage && currentPage !== 'login') {
      localStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage, isAuthenticated]);

  // Afficher un loader pendant le chargement initial
  if (loading || initialLoad) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-700">Chargement de l'application...</p>
        <p className="mt-2 text-sm text-gray-500">3F INDUSTRIE</p>
      </div>
    );
  }

  // Si non authentifié, afficher la page de login
  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigate = (page: string) => {
    // Vérification des droits d'accès
    if (hasModuleAccess(page as AppModule)) {
      setCurrentPage(page);
      setSelectedSiteId(null);
      localStorage.setItem('currentPage', page);
    } else {
      alert("Accès refusé : Vous n'avez pas les droits nécessaires pour accéder à ce module.");
    }
  };

  const handleSelectSite = (id: string) => {
    setSelectedSiteId(id);
    setCurrentPage('site_detail');
    localStorage.setItem('currentPage', 'site_detail');
  };

  const renderContent = () => {
    // Vérification des permissions (site_detail fait partie de chantiers)
    const effectiveModuleToCheck = currentPage === 'site_detail' ? 'chantiers' : currentPage;
    
    if (currentPage !== 'dashboard' && !hasModuleAccess(effectiveModuleToCheck as AppModule)) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-8">
          <div className="text-6xl mb-6 text-red-500">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Accès Refusé</h2>
          <p className="text-gray-600 text-center mb-2">
            Vous n'avez pas l'autorisation d'accéder au module "{currentPage}".
          </p>
          <p className="text-gray-500 text-sm text-center mb-6">
            Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>
          <button 
            onClick={() => {
              setCurrentPage('dashboard');
              localStorage.setItem('currentPage', 'dashboard');
            }} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retour au Tableau de bord
          </button>
        </div>
      );
    }

    // Gestion de la page détail chantier
    if (currentPage === 'site_detail' && selectedSiteId) {
      return (
        <SiteDetail 
          chantierId={selectedSiteId} 
          onBack={() => {
            setCurrentPage('chantiers');
            setSelectedSiteId(null);
            localStorage.setItem('currentPage', 'chantiers');
          }} 
        />
      );
    }

    // Router principal
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
        // Fallback sur le dashboard si la page n'existe pas
        setCurrentPage('dashboard');
        localStorage.setItem('currentPage', 'dashboard');
        return <Dashboard navigateTo={handleNavigate} />;
    }
  };

  return (
    <Layout 
      activePage={currentPage} 
      onNavigate={handleNavigate}
      user={user}
    >
      <div className="min-h-full">
        {renderContent()}
      </div>
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
