import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../utils';
import { 
  Briefcase, 
  Users, 
  Wallet,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  Bell,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

interface DashboardProps {
  navigateTo: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { chantiers, monteurs, lignesCouts, articles, mouvements } = useData();
  const { user } = useAuth();

  // --- KPI CALCULATIONS ---
  const activeChantiers = chantiers.filter(c => c.statut === 'actif');
  const finishedChantiers = chantiers.filter(c => c.statut === 'terminé');
  const activeMonteurs = monteurs.filter(m => m.actif);
  
  // Finance Global
  const totalBudgetPrevu = activeChantiers.reduce((sum, c) => sum + c.budget_prevu, 0);
  const totalDepenses = lignesCouts.reduce((sum, cout) => sum + cout.montant_reel, 0);
  const financePercent = totalBudgetPrevu > 0 ? (totalDepenses / totalBudgetPrevu) * 100 : 0;

  // Stock Alerts
  const lowStockItems = articles.filter(a => a.quantite <= a.seuil_alerte);

  // Budget Alerts (Chantiers > 90% budget)
  const budgetAlerts = chantiers.filter(c => {
    const siteCosts = lignesCouts.filter(l => l.id_chantier === c.id_chantier).reduce((s, l) => s + l.montant_reel, 0);
    return c.budget_prevu > 0 && siteCosts > c.budget_prevu * 0.9;
  });

  // --- ACTIVITY FEED GENERATION ---
  const activityFeed = useMemo(() => {
    const feed = [];
    
    // Add Sites
    chantiers.forEach(c => {
      feed.push({ 
        id: `site-${c.id_chantier}`, 
        type: 'chantier', 
        date: c.date_debut, 
        title: `Nouveau chantier: ${c.ref_chantier}`,
        subtitle: c.nom_client,
        icon: Briefcase,
        color: 'text-blue-600 bg-blue-100'
      });
    });

    // Add Costs (Last 5)
    lignesCouts.slice(-5).forEach(c => {
      const chantier = chantiers.find(ch => ch.id_chantier === c.id_chantier);
      feed.push({
        id: c.id_cout,
        type: 'cout',
        date: new Date().toISOString(), // Mock current date for display
        title: `Dépense: ${formatCurrency(c.montant_reel)}`,
        subtitle: `${c.type_cout} - ${chantier?.ref_chantier}`,
        icon: Wallet,
        color: 'text-red-600 bg-red-100'
      });
    });

    // Add Movements (Last 5)
    mouvements.slice(-5).forEach(m => {
      const article = articles.find(a => a.id_article === m.id_article);
      feed.push({
        id: m.id_mouvement,
        type: 'stock',
        date: m.date,
        title: `${m.type === 'ENTREE' ? 'Entrée' : 'Sortie'} Stock: ${article?.nom}`,
        subtitle: `${m.quantite} unités`,
        icon: Package,
        color: m.type === 'ENTREE' ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100'
      });
    });

    // Sort by date desc
    return feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [chantiers, lignesCouts, mouvements, articles]);

  // --- CHART DATA GENERATION (Mock Monthly) ---
  const chartData = [
    { name: 'Jan', budget: 40000, reel: 24000 },
    { name: 'Fév', budget: 30000, reel: 13980 },
    { name: 'Mar', budget: 20000, reel: 18000 },
    { name: 'Avr', budget: 27800, reel: 29080 }, // Alert
    { name: 'Mai', budget: 18900, reel: 14800 },
    { name: 'Juin', budget: 23900, reel: 18000 },
  ];

  const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Tableau de Bord</h2>
          <p className="text-gray-500 mt-1 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            {currentDate.charAt(0).toUpperCase() + currentDate.slice(1)}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigateTo('chantiers')} className="px-4 py-2 bg-red-700 text-white rounded-lg shadow-sm hover:bg-red-800 transition-colors text-sm font-bold flex items-center">
            <Briefcase className="w-4 h-4 mr-2" />
            Gérer Chantiers
          </button>
          <button onClick={() => navigateTo('rapports')} className="px-4 py-2 bg-slate-800 text-white rounded-lg shadow-sm hover:bg-slate-900 transition-colors text-sm font-bold flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Voir Rapports
          </button>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Chantiers */}
        <div 
          onClick={() => navigateTo('chantiers')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-red-200 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
              <Briefcase className="text-red-700 w-6 h-6" />
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              Actif
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{activeChantiers.length}</h3>
          <p className="text-sm text-gray-500 font-medium">Chantiers en cours</p>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
             <span>Total historique: {chantiers.length}</span>
             <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-red-600" />
          </div>
        </div>

        {/* KPI 2: Finance */}
        <div 
          onClick={() => navigateTo('rapports')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
              <Wallet className="text-green-600 w-6 h-6" />
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${financePercent > 90 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {financePercent.toFixed(0)}% Budget
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(totalDepenses)}</h3>
          <p className="text-sm text-gray-500 font-medium">Dépenses engagées</p>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
             <span>Sur {formatCurrency(totalBudgetPrevu)} prévus</span>
             <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-green-500" />
          </div>
        </div>

        {/* KPI 3: Stock */}
        <div 
          onClick={() => navigateTo('stock')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-colors">
              <Package className="text-slate-700 w-6 h-6" />
            </div>
            {lowStockItems.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                {lowStockItems.length} Critiques
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{articles.length}</h3>
          <p className="text-sm text-gray-500 font-medium">Références stock</p>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
             <span>Mouvements récents: {mouvements.length}</span>
             <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-500" />
          </div>
        </div>

        {/* KPI 4: RH */}
        <div 
          onClick={() => navigateTo('monteurs')}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <Users className="text-blue-600 w-6 h-6" />
            </div>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
              Équipe
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{activeMonteurs.length}</h3>
          <p className="text-sm text-gray-500 font-medium">Collaborateurs actifs</p>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
             <span>Total Effectif: {monteurs.length}</span>
             <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-blue-500" />
          </div>
        </div>

      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2/3) - Chart & Alerts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* FINANCIAL CHART */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-gray-800 flex items-center">
                 <TrendingUp className="w-5 h-5 mr-2 text-red-700"/>
                 Performance Financière (6 mois)
               </h3>
             </div>
             {/* Fix: Enforced height to prevent Recharts -1 height warning */}
             <div className="w-full h-[300px]" style={{ minHeight: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#334155" stopOpacity={0.1}/>
                       <stop offset="95%" stopColor="#334155" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorReel" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.1}/>
                       <stop offset="95%" stopColor="#b91c1c" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                   <YAxis hide />
                   <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     formatter={(value: number) => formatCurrency(value)}
                   />
                   <Area type="monotone" dataKey="budget" stroke="#334155" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" />
                   <Area type="monotone" dataKey="reel" stroke="#b91c1c" strokeWidth={3} fillOpacity={1} fill="url(#colorReel)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* CRITICAL ALERTS SECTION */}
          {(lowStockItems.length > 0 || budgetAlerts.length > 0) && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
              <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-bold text-red-800">Alertes Critiques ({lowStockItems.length + budgetAlerts.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {lowStockItems.slice(0, 3).map(item => (
                  <div key={item.id_article} onClick={() => navigateTo('stock')} className="p-4 flex justify-between items-center hover:bg-red-50/50 cursor-pointer transition-colors">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-3"></div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">Stock Critique: {item.nom}</p>
                        <p className="text-xs text-gray-500">Reste {item.quantite} {item.unite} (Seuil: {item.seuil_alerte})</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
                {budgetAlerts.slice(0, 3).map(c => (
                  <div key={c.id_chantier} onClick={() => navigateTo('rapports')} className="p-4 flex justify-between items-center hover:bg-red-50/50 cursor-pointer transition-colors">
                     <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mr-3"></div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">Budget Critique: {c.ref_chantier}</p>
                        <p className="text-xs text-gray-500">Dépenses élevées détectées</p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (1/3) - Activity Feed */}
        <div className="space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 flex items-center">
                   <Bell className="w-5 h-5 mr-2 text-slate-500" />
                   Activité Récente
                 </h3>
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>
              <div className="p-2">
                 {activityFeed.map((item, index) => (
                   <div key={index} className="flex gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
                        <item.icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-sm font-bold text-gray-900 truncate">{item.title}</p>
                         <p className="text-xs text-gray-500 truncate mb-1">{item.subtitle}</p>
                         <p className="text-[10px] text-gray-400 flex items-center">
                           <Clock className="w-3 h-3 mr-1" /> {new Date(item.date).toLocaleDateString()}
                         </p>
                      </div>
                   </div>
                 ))}
                 {activityFeed.length === 0 && (
                   <div className="text-center py-10 text-gray-400 text-sm">
                     Aucune activité récente.
                   </div>
                 )}
              </div>
              <div className="p-4 border-t border-gray-100">
                <button className="w-full py-2 text-sm text-center text-red-700 font-bold hover:bg-red-50 rounded-lg transition-colors">
                  Voir tout l'historique
                </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;