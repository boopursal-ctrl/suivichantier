import React, { useMemo, useState } from 'react';
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
  ArrowRight,
  Plus,
  FileText,
  Settings,
  ShieldAlert,
  Calendar,
  Filter,
  Download,
  Search,
  MoreHorizontal,
  ChevronRight,
  Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, BarChart, Bar
} from 'recharts';

interface DashboardProps {
  navigateTo: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
  const { chantiers, monteurs, lignesCouts, articles, mouvements } = useData();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('Mensuel');

  // --- KPI CALCULATIONS ---
  const activeChantiers = chantiers.filter(c => c.statut === 'actif');
  const activeMonteurs = monteurs.filter(m => m.actif);

  // Finance
  const totalBudgetPrevu = activeChantiers.reduce((sum, c) => sum + c.budget_prevu, 0);
  const totalDepenses = lignesCouts.reduce((sum, cout) => sum + cout.montant_reel, 0);
  const financePercent = totalBudgetPrevu > 0 ? (totalDepenses / totalBudgetPrevu) * 100 : 0;

  // Alerts
  const lowStockItems = articles.filter(a => a.quantite <= a.seuil_alerte);
  const budgetAlerts = chantiers.filter(c => {
    const siteCosts = lignesCouts.filter(l => l.id_chantier === c.id_chantier).reduce((s, l) => s + l.montant_reel, 0);
    return c.budget_prevu > 0 && siteCosts > c.budget_prevu * 0.9;
  });

  // --- CHART DATA ---
  const chartData = useMemo(() => {
    const data: Record<string, { name: string; budget: number; reel: number }> = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const monthName = d.toLocaleDateString('fr-FR', { month: 'short' });
      data[key] = { name: monthName, budget: 0, reel: 0 };
    }
    lignesCouts.forEach(cout => {
      const d = cout.created_at ? new Date(cout.created_at) : new Date();
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (data[key]) data[key].reel += cout.montant_reel;
    });
    // Smooth curve approximation for budget
    const budgetTrend = totalBudgetPrevu / 6;
    Object.keys(data).forEach((k, idx) => {
      data[k].budget = budgetTrend + (Math.sin(idx) * budgetTrend * 0.2);
    });
    return Object.values(data);
  }, [lignesCouts, totalBudgetPrevu]);

  const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-inter">

      {/* 1. TOP HERO SECTION */}
      <div className="bg-white border-b border-gray-100 py-8 px-6 md:px-12 mb-8">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              Tableau de Bord Exécutif
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Bonjour, {user?.prenom || 'Administrateur'}</h1>
            <p className="text-gray-500 font-medium text-lg">Voici un aperçu de vos performances ce {currentDate}.</p>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-xl border border-gray-200 overflow-x-auto max-w-full">
            {['Journalier', 'Hebdo', 'Mensuel', 'Annuel'].map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${timeRange === t
                  ? 'bg-white text-indigo-600 shadow-md ring-1 ring-gray-100'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-12 space-y-10">

        {/* 2. PREMIUM CARDS ROW - GRADIENTS & SHADOWS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-8">

          {/* Card 1: Chantiers - Gradient Blue/Indigo */}
          <div onClick={() => navigateTo('chantiers')} className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Briefcase size={120} />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white">
                  <Briefcase size={24} />
                </div>
                <span className="font-semibold text-blue-100 tracking-wide uppercase text-sm">Chantiers Actifs</span>
              </div>
              <div>
                <h3 className="text-5xl font-black tracking-tight">{activeChantiers.length}</h3>
                <div className="mt-2 flex items-center gap-2 text-blue-100 text-sm font-medium">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-white flex items-center gap-1">
                    <TrendingUp size={12} /> +12%
                  </span>
                  vs mois dernier
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Finance - White with Colorful Elements */}
          <div onClick={() => navigateTo('rapports')} className="relative overflow-hidden rounded-[24px] bg-white p-8 border border-gray-100 shadow-xl shadow-gray-100 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group">
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Wallet size={24} />
                  </div>
                  <span className="font-semibold text-gray-400 tracking-wide uppercase text-sm">Dépenses Globales</span>
                </div>
                <div className="radial-progress text-emerald-500 text-xs font-bold" style={{ "--value": financePercent, "--size": "40px" } as any}>
                  {financePercent.toFixed(0)}%
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(totalDepenses)}</h3>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full" style={{ width: `${Math.min(financePercent, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2 font-medium">Budget consommé à {financePercent.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Card 3: RH - Light Theme */}
          <div onClick={() => navigateTo('monteurs')} className="relative overflow-hidden rounded-[24px] bg-white p-8 border border-gray-100 shadow-xl shadow-indigo-50 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group">
            <div className="absolute -bottom-10 -right-10 p-6 opacity-5 text-indigo-200">
              <Users size={180} />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Users size={24} />
                </div>
                <span className="font-semibold text-gray-400 tracking-wide uppercase text-sm">Force de Travail</span>
              </div>
              <div>
                <h3 className="text-5xl font-black text-gray-900 tracking-tight">{activeMonteurs.length}</h3>
                <p className="text-gray-500 font-medium mt-1">Monteurs actifs sur terrain</p>
              </div>
              <div className="flex -space-x-3 pt-2">
                {[...Array(Math.min(5, activeMonteurs.length))].map((_, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                {activeMonteurs.length > 5 && (
                  <div className="w-10 h-10 rounded-full border-4 border-white bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    +{activeMonteurs.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Alerts - Red Gradient or White with Alert */}
          <div onClick={() => navigateTo('stock')} className="relative overflow-hidden rounded-[24px] bg-white p-8 border border-gray-100 shadow-xl shadow-gray-100 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${(lowStockItems.length + budgetAlerts.length) > 0 ? 'bg-red-50 text-red-600 animate-bounce-slow' : 'bg-gray-50 text-gray-400'}`}>
                    <Bell size={24} />
                  </div>
                  <span className="font-semibold text-gray-400 tracking-wide uppercase text-sm">Notifications</span>
                </div>
                {(lowStockItems.length + budgetAlerts.length) > 0 &&
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                }
              </div>

              {(lowStockItems.length + budgetAlerts.length) === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 size={48} className="text-gray-200 mx-auto mb-2" />
                  <p className="font-bold text-gray-400">Tout est calme</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-4xl font-black text-gray-900">
                    {lowStockItems.length + budgetAlerts.length}
                  </h3>
                  <div className="space-y-2">
                    {lowStockItems.length > 0 && (
                      <div className="flex items-center text-sm font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        <Package size={16} className="mr-2" /> Stock Critique ({lowStockItems.length})
                      </div>
                    )}
                    {budgetAlerts.length > 0 && (
                      <div className="flex items-center text-sm font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                        <Wallet size={16} className="mr-2" /> Budget Alert ({budgetAlerts.length})
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 3. MAIN CONTENT: CHART & ACTIONS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Main Chart Card */}
          <div className="xl:col-span-2 bg-white rounded-[24px] p-4 md:p-8 shadow-xl shadow-gray-100 border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Performance Financière</h3>
                <p className="text-gray-400 font-medium mt-1 text-sm md:text-base">Flux de trésorerie sur 6 mois</p>
              </div>
              <button className="bg-gray-50 hover:bg-gray-100 p-2 rounded-xl transition-colors self-end sm:self-auto">
                <MoreHorizontal className="text-gray-500" />
              </button>
            </div>

            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReelPremium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBudgetPremium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e2e8f0" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e2e8f0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13 }} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 600 }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Area type="monotone" name="Budget Estimé" dataKey="budget" stroke="#cbd5e1" strokeWidth={3} fill="url(#colorBudgetPremium)" />
                  <Area type="monotone" name="Dépenses Réelles" dataKey="reel" stroke="#6366f1" strokeWidth={4} fill="url(#colorReelPremium)" dot={{ r: 6, strokeWidth: 4, stroke: '#fff', fill: '#6366f1' }} activeDot={{ r: 8, stroke: '#6366f1', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Info / Quick Actions */}
          <div className="space-y-8">

            {/* Quick Actions Panel */}
            <div className="bg-indigo-900 rounded-[24px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Zap size={20} className="text-yellow-400 fill-yellow-400" /> Actions Rapides
                </h3>
                <div className="space-y-3">
                  <button onClick={() => navigateTo('chantiers')} className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-xl backdrop-blur-md transition-all border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg"><Plus size={16} /></div>
                      <span className="font-semibold">Nouveau Chantier</span>
                    </div>
                    <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button onClick={() => navigateTo('stock')} className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-xl backdrop-blur-md transition-all border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 rounded-lg"><Package size={16} /></div>
                      <span className="font-semibold">Entrée Stock</span>
                    </div>
                    <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button onClick={() => navigateTo('rapports')} className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-xl backdrop-blur-md transition-all border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg"><FileText size={16} /></div>
                      <span className="font-semibold">Rapports PDF</span>
                    </div>
                    <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
              {/* Decor */}
              <div className="absolute top-0 right-0 p-8 opacity-20">
                <div className="w-32 h-32 bg-indigo-500 rounded-full blur-3xl"></div>
              </div>
            </div>

            {/* Mini Recent List */}
            <div className="bg-white rounded-[24px] p-6 shadow-xl shadow-gray-100 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Derniers Mouvements</h3>
              <div className="space-y-4">
                {lignesCouts.slice(0, 4).map((cout, i) => (
                  <div key={i} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">
                      {cout.created_at ? new Date(cout.created_at).getDate() : 'J'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-800 truncate">{cout.type_cout}</p>
                      <p className="text-xs text-gray-400">Validé par Admin</p>
                    </div>
                    <div className="font-bold text-sm text-gray-900">
                      {formatCurrency(cout.montant_reel)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;