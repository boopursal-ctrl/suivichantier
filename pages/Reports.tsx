import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, countDays } from '../utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, DollarSign, PieChart as PieIcon, Users, Printer, Calendar, Download, Filter, Wallet } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#64748b'];

const Reports: React.FC = () => {
  const { chantiers, lignesCouts, affectations, versements, monteurs } = useData();
  const [activeTab, setActiveTab] = useState<'financier' | 'analytique' | 'rh'>('financier');
  const [dateFilter, setDateFilter] = useState('year');

  // --- TRAITEMENT DES DONNÉES ---

  // --- TRAITEMENT DES DONNÉES ---
  const reportData = useMemo(() => {
    return chantiers.map(chantier => {
      // 1. Calcul Coûts Directs (Matériel, Transport, etc.)
      const expenses = lignesCouts
        .filter(c => c.id_chantier === chantier.id_chantier)
        .reduce((sum, c) => sum + (Number(c.montant_reel) || 0), 0);

      // 2. Calcul Main d'oeuvre (Salaire x Jours)
      const labor = affectations
        .filter(a => a.id_chantier === chantier.id_chantier)
        .reduce((sum, a) => {
          const days = countDays(a.date_entree, a.date_sortie) - (a.jours_arret || 0);
          return sum + (days * (Number(a.salaire_jour) || 0));
        }, 0);

      // + Main d'oeuvre locale (si non incluse dans affectations)
      const laborLocal = (chantier.monteurs_locaux || []).reduce((sum: number, ml: any) => {
        // Estimation simple si dates présentes
        if (ml.salaire_jour) {
          // Logic simplifiée ou à affiner selon vos données
          return sum + (Number(ml.salaire_jour) * 22); // Moyenne 22j/mois par défaut si pas de dates précises
        }
        return sum;
      }, 0);

      // 3. Calcul Versements (Encaissements)
      const income = versements
        .filter(v => v.id_chantier === chantier.id_chantier)
        .reduce((sum, v) => sum + (Number(v.montant) || 0), 0);

      const totalCost = expenses + labor + laborLocal;

      // Budget: Utiliser montant_marche si budget_prevu est 0 ou vide
      // Si aucun des deux, le budget est considéré comme 0 (ce qui donnera une marge négative)
      const budget = Number(chantier.budget_prevu) || Number(chantier.montant_marche) || 0;

      const margin = budget - totalCost;
      const marginPercent = budget > 0 ? (margin / budget) * 100 : 0;

      return {
        id: chantier.id_chantier,
        nom: chantier.ref_chantier,
        client: chantier.nom_client || 'Client Inconnu',
        budget: budget,
        reel: totalCost,
        mo: labor + laborLocal,
        frais: expenses,
        encaisse: income,
        marge: margin,
        margeP: marginPercent,
        statut: chantier.statut,
        date_debut: chantier.date_debut
      };
    });
  }, [chantiers, lignesCouts, affectations, versements]);

  // --- STATS GLOBALES ---
  // (Filter logic could go here based on dateFilter)
  const totalBudget = reportData.reduce((acc, curr) => acc + curr.budget, 0);
  const totalReel = reportData.reduce((acc, curr) => acc + curr.reel, 0);
  const totalMarge = totalBudget - totalReel;
  const margeGlobalePercent = totalBudget > 0 ? (totalMarge / totalBudget) * 100 : 0;
  const totalEncaisse = reportData.reduce((acc, curr) => acc + curr.encaisse, 0);

  // --- DATA POUR GRAPHIQUES ---

  // 1. Répartition des Coûts
  const costDistributionData = useMemo(() => {
    const categories: Record<string, number> = {
      'Main d\'œuvre': 0,
      'Transport': 0,
      'Hébergement': 0,
      'Restauration': 0,
      'Matériel': 0,
      'Sous-traitance': 0
    };

    // MO
    categories['Main d\'œuvre'] = reportData.reduce((acc, curr) => acc + curr.mo, 0);

    // Frais
    lignesCouts.forEach(cout => {
      if (['transport_commun', 'transport_local'].includes(cout.type_cout)) categories['Transport'] += cout.montant_reel;
      else if (cout.type_cout === 'hebergement') categories['Hébergement'] += cout.montant_reel;
      else if (['restauration', 'repas'].includes(cout.type_cout)) categories['Restauration'] += cout.montant_reel;
      else if (cout.type_cout === 'outillage_affecte') categories['Matériel'] += cout.montant_reel;
      else if (cout.type_cout === 'sous_traitant') categories['Sous-traitance'] += cout.montant_reel;
      else {
        // Autres
        if (!categories['Autre']) categories['Autre'] = 0;
        categories['Autre'] += cout.montant_reel;
      }
    });

    return Object.keys(categories)
      .map(key => ({ name: key, value: categories[key] }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [reportData, lignesCouts]);

  // 2. Performance Ouvriers
  const workerStats = useMemo(() => {
    const stats: Record<number, { nom: string, total: number, jours: number }> = {};
    affectations.forEach(aff => {
      const days = countDays(aff.date_entree, aff.date_sortie) - (aff.jours_arret || 0);
      const cost = days * aff.salaire_jour;
      if (!stats[aff.matricule]) {
        stats[aff.matricule] = { nom: aff.nom_monteur, total: 0, jours: 0 };
      }
      stats[aff.matricule].total += cost;
      stats[aff.matricule].jours += days;
    });
    return Object.values(stats).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [affectations]);

  return (
    <div className="space-y-8 pb-10 max-w-[1920px] mx-auto font-inter bg-slate-50/50 min-h-screen p-6">

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Rapports & Statistiques</h2>
          <p className="text-slate-500 font-medium mt-1">Analyse détaillée de la performance opérationnelle</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Date Filter Mock */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['Mois', 'Trimestre', 'Année'].map((range) => (
              <button
                key={range}
                onClick={() => setDateFilter(range.toLowerCase())}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${dateFilter === range.toLowerCase()
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="h-10 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>

          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-gray-200 font-semibold shadow-sm transition-colors print:hidden"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </button>
          <button className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold shadow-sm transition-colors print:hidden">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* KPI GLOBAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></span>
            <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">Budget Total</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{formatCurrency(totalBudget)}</h3>
          <p className="text-sm text-slate-500 mt-1">Prévu sur {reportData.length} chantiers</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-red-300 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <span className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingUp size={20} /></span>
            <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">Dépenses Réelles</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{formatCurrency(totalReel)}</h3>
          <p className="text-sm text-slate-500 mt-1 flex items-center">
            Dont {((costDistributionData.find(c => c.name === "Main d'œuvre")?.value || 0) / totalReel * 100).toFixed(0)}% en salaire
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-emerald-300 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><PieIcon size={20} /></span>
            <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">Marge Nette</span>
          </div>
          <h3 className={`text-3xl font-black ${totalMarge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totalMarge)}
          </h3>
          <div className="mt-2 text-sm font-bold flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs ${margeGlobalePercent >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {margeGlobalePercent.toFixed(1)}% Rentabilité
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-slate-300 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <span className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Wallet size={20} /></span>
            <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">Encaissement</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{formatCurrency(totalEncaisse)}</h3>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-slate-800 h-full rounded-full" style={{ width: `${Math.min((totalEncaisse / totalBudget) * 100, 100)}%` }}></div>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-bold">{(totalEncaisse / totalBudget * 100).toFixed(0)}% Recouvré</p>
        </div>
      </div>

      {/* MAIN CONTENT WITH TABS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
        {/* TAB HEADER */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('financier')}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'financier' ? 'border-red-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <TrendingUp size={16} /> Finance & Rentabilité
          </button>
          <button
            onClick={() => setActiveTab('analytique')}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytique' ? 'border-red-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <PieIcon size={16} /> Analyse des Coûts
          </button>
          <button
            onClick={() => setActiveTab('rh')}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'rh' ? 'border-red-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Users size={16} /> Performance RH
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="p-6">

          {/* 1. FINANCIER */}
          {activeTab === 'financier' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Chart */}
              <div className="bg-slate-50 p-6 rounded-xl border border-gray-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="text-slate-400" size={20} />
                  Comparatif Budget vs Réel par Chantier
                </h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.filter(d => d.statut === 'actif' || d.statut === 'terminé')}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nom" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={80} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `${val / 1000}k`} />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="budget" name="Budget Prévu" fill="#334155" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="reel" name="Coût Réel" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">Détail des Marges</h3>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 btn-link">Télécharger CSV</button>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-slate-500 font-semibold uppercase text-xs">
                      <tr>
                        <th className="px-6 py-4">Chantier / Client</th>
                        <th className="px-6 py-4 text-right">Budget</th>
                        <th className="px-6 py-4 text-right">Dépenses Directes</th>
                        <th className="px-6 py-4 text-right">Main d'œuvre</th>
                        <th className="px-6 py-4 text-right">Total Coûts</th>
                        <th className="px-6 py-4 text-right">Marge Nette</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{item.nom}</div>
                            <div className="text-xs text-slate-500 font-medium">{item.client}</div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 font-medium">{formatCurrency(item.budget)}</td>
                          <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(item.frais)}</td>
                          <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(item.mo)}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(item.reel)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${item.marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(item.marge)}
                            <span className="block text-[10px] opacity-70">{item.margeP.toFixed(1)}%</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${item.statut === 'actif' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              item.statut === 'terminé' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-gray-50 text-gray-600 border-gray-100'
                              }`}>
                              {item.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. ANALYTIQUE */}
          {activeTab === 'analytique' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div className="bg-slate-50 p-6 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                <h3 className="text-lg font-bold text-slate-800 mb-2 w-full text-left">Répartition Globale</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {costDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Détail des Postes de Coûts</h3>
                <div className="space-y-3">
                  {costDistributionData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                          {((item.value / totalReel) * 100).toFixed(0)}%
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <div className="w-24 bg-gray-100 h-1.5 rounded-full mt-1">
                            <div className="h-full rounded-full" style={{ width: `${(item.value / totalReel) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(item.value)}</p>
                        <p className="text-xs text-slate-400">Total sur période</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. RH */}
          {activeTab === 'rh' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-slate-900 rounded-xl p-6 text-white flex justify-between items-center shadow-lg">
                <div>
                  <h3 className="font-bold text-xl">Top 10 Salaires Versés</h3>
                  <p className="text-slate-400 text-sm">Analyse de la masse salariale par collaborateur</p>
                </div>
                <Users size={32} className="text-slate-700" />
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-slate-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Rang</th>
                      <th className="px-6 py-4">Collaborateur</th>
                      <th className="px-6 py-4 text-center">Jours Travaillés</th>
                      <th className="px-6 py-4 text-right">Salaire Total</th>
                      <th className="px-6 py-4 text-right">Moyenne / Jour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {workerStats.map((stat, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{stat.nom}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold text-xs border border-slate-200">
                            {stat.jours}j
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(stat.total)}</td>
                        <td className="px-6 py-4 text-right text-slate-500 font-medium">{formatCurrency(stat.total / (stat.jours || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default Reports;