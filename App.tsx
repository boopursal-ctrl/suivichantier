import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster, toast } from 'sonner';
import Layout from './components/Layout';
// Static import for critical path
import Login from './pages/Login';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppModule } from './types';

// Lazy loading modules
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SiteList = lazy(() => import('./pages/SiteList'));
const SiteDetail = lazy(() => import('./pages/SiteDetail'));
const StockManagement = lazy(() => import('./pages/StockManagement'));
const Clients = lazy(() => import('./pages/Clients'));
const Monteurs = lazy(() => import('./pages/Monteurs'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Reports = lazy(() => import('./pages/Reports'));
const ResourceMatrix = lazy(() => import('./pages/ResourceMatrix'));
const Planning = lazy(() => import('./pages/Planning'));
const ChefChantier = lazy(() => import('./pages/ChefChantier'));
const PointageMensuel = lazy(() => import('./pages/PointageMensuel'));
const Contrats = lazy(() => import('./pages/Contrats'));

const LoadingScreen = () => (
  <div className="flex h-full w-full items-center justify-center p-20">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 text-sm font-medium animate-pulse">Chargement du module...</p>
    </div>
  </div>
);

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
      toast.error(`Accès refusé au module "${page}"`);
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

    // Wrap lazy components in Suspense
    return (
      <Suspense fallback={<LoadingScreen />}>
        {renderLazyContent()}
      </Suspense>
    );
  };

  const renderLazyContent = () => {
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
      case 'matrice': return <ResourceMatrix />;
      case 'planning': return <Planning />;
      case 'pointage_mensuel': return <PointageMensuel />;
      case 'contrats': return <Contrats />;
      default: return <Dashboard navigateTo={handleNavigate} />;
    }
  };

  return (
    <>
      <Toaster richColors position="top-right" />
      <Layout activePage={currentPage} onNavigate={handleNavigate}>
        {renderContent()}
      </Layout>
    </>
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
