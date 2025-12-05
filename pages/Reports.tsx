import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatCurrency, countDays } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Users, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react';

const COLORS = ['#b91c1c', '#334155', '#ea580c', '#64748b', '#dc2626', '#94a3b8'];

const Reports: React.FC = () => {
  const { chantiers, lignesCouts, affectations, versements, monteurs } = useData();
  const [activeTab, setActiveTab] = useState<'financier' | 'analytique' | 'rh'>('financier');

  // --- TRAITEMENT DES DONNÉES ---

  const reportData = useMemo(() => {
    return chantiers.map(chantier => {
      // 1. Calcul Coûts Directs (Matériel, Transport, etc.)
      const expenses = lignesCouts
        .filter(c => c.id_chantier === chantier.id_chantier)
        .reduce((sum, c) => sum + c.montant_reel, 0);

      // 2. Calcul Main d'oeuvre
      const labor = affectations
        .filter(a => a.id_chantier === chantier.id_chantier)
        .reduce((sum, a) => {
          const days = countDays(a.date_entree, a.date_sortie) - (a.jours_arret || 0);
          return sum + (days * a.salaire_jour);
        }, 0);

      // 3. Calcul Versements (Chiffre d'affaire encaissé)
      const income = versements
        .filter(v => v.id_chantier === chantier.id_chantier)
        .reduce((sum, v) => sum + v.montant, 0);

      const totalCost = expenses + labor;
      const margin = chantier.budget_prevu - totalCost;
      const marginPercent = chantier.budget_prevu > 0 ? (margin / chantier.budget_prevu) * 100 : 0;

      return {
        id: chantier.id_chantier,
        nom: chantier.ref_chantier,
        client: chantier.nom_client,
        budget: chantier.budget_prevu,
        reel: totalCost,
        mo: labor,
        frais: expenses,
        encaisse: income,
        marge: margin,
        margeP: marginPercent,
        statut: chantier.statut
      };
    });
  }, [chantiers, lignesCouts, affectations, versements]);

  // --- STATS GLOBALES ---
  const totalBudget = reportData.reduce((acc, curr) => acc + curr.budget, 0);
  const totalReel = reportData.reduce((acc, curr) => acc + curr.reel, 0);
  const totalMarge = totalBudget - totalReel;
  const margeGlobalePercent = totalBudget > 0 ? (totalMarge / totalBudget) * 100 : 0;
  const totalEncaisse = reportData.reduce((acc, curr) => acc + curr.encaisse, 0);

  // --- DATA POUR GRAPHIQUES ---
  
  // 1. Répartition des Coûts (Pie Chart)
  const costDistributionData = useMemo(() => {
    const categories: Record<string, number> = {
      'Main d\'œuvre': 0,
      'Transport': 0,
      'Hébergement': 0,
      'Restauration': 0,
      'Matériel/Outillage': 0,
      'Sous-traitance': 0
    };

    // MO
    categories['Main d\'œuvre'] = reportData.reduce((acc, curr) => acc + curr.mo, 0);

    // Frais
    lignesCouts.forEach(cout => {
      if (cout.type_cout === 'transport_commun' || cout.type_cout === 'transport_local') categories['Transport'] += cout.montant_reel;
      else if (cout.type_cout === 'hebergement') categories['Hébergement'] += cout.montant_reel;
      else if (cout.type_cout === 'restauration') categories['Restauration'] += cout.montant_reel;
      else if (cout.type_cout === 'outillage_affecte') categories['Matériel/Outillage'] += cout.montant_reel;
      else if (cout.type_cout === 'sous_traitant') categories['Sous-traitance'] += cout.montant_reel;
    });

    return Object.keys(categories)
      .map(key => ({ name: key, value: categories[key] }))
      .filter(item => item.value > 0);
  }, [reportData, lignesCouts]);

  // 2. Performance Ouvriers (Top 5 Coûts)
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
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rapports & Analytique</h2>
          <p className="text-gray-500">Vision globale de la santé financière de l'entreprise</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-200"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimer Rapport
        </button>
      </div>

      {/* Cartes KPI Globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm font-medium text-gray-500 mb-1">Chiffre d'Affaires (Prévu)</p>
           <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</h3>
           <div className="mt-2 text-xs text-green-600 font-medium flex items-center">
             <DollarSign size={14} className="mr-1"/> Sur {reportData.length} chantiers
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm font-medium text-gray-500 mb-1">Coûts Totaux (Réel)</p>
           <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalReel)}</h3>
           <div className="mt-2 text-xs text-red-600 font-medium flex items-center">
             <TrendingUp size={14} className="mr-1"/> Charges & Salaires
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm font-medium text-gray-500 mb-1">Marge Nette</p>
           <h3 className={`text-2xl font-bold ${totalMarge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
             {formatCurrency(totalMarge)}
           </h3>
           <div className={`mt-2 text-xs font-bold px-2 py-0.5 rounded w-fit ${totalMarge >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             {margeGlobalePercent.toFixed(1)}% de rentabilité
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <p className="text-sm font-medium text-gray-500 mb-1">Trésorerie (Encaissé)</p>
           <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalEncaisse)}</h3>
           <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-slate-600 h-1.5 rounded-full" style={{ width: `${Math.min((totalEncaisse/totalBudget)*100, 100)}%` }}></div>
           </div>
           <p className="text-xs text-gray-400 mt-1">{(totalEncaisse/totalBudget*100).toFixed(0)}% recouvré</p>
        </div>
      </div>

      {/* Navigation Onglets */}
      <div className="border-b border-gray-200 flex gap-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('financier')}
          className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'financier' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Rentabilité par Chantier
        </button>
        <button 
          onClick={() => setActiveTab('analytique')}
          className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'analytique' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <PieIcon className="w-4 h-4 mr-2" />
          Analyse des Coûts
        </button>
        <button 
          onClick={() => setActiveTab('rh')}
          className={`pb-4 px-2 font-medium text-sm border-b-2 transition-colors flex items-center whitespace-nowrap ${activeTab === 'rh' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Users className="w-4 h-4 mr-2" />
          Performance RH
        </button>
      </div>

      {/* CONTENU ONGLET 1: FINANCIER */}
      {activeTab === 'financier' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-bold text-gray-800 mb-6">Comparatif Budget Prévu vs Réel</h3>
             {/* Fix: Enforced height to prevent Recharts -1 height warning */}
             <div className="w-full h-[300px]" style={{ minHeight: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={reportData.filter(d => d.statut === 'actif')}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="nom" tick={{fontSize: 12}} interval={0} angle={-15} textAnchor="end" height={60}/>
                   <YAxis hide />
                   <Tooltip 
                     formatter={(value: number) => formatCurrency(value)}
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   />
                   <Legend />
                   <Bar dataKey="budget" name="Budget Prévu" fill="#334155" radius={[4, 4, 0, 0]} barSize={30} />
                   <Bar dataKey="reel" name="Coût Réel" fill="#b91c1c" radius={[4, 4, 0, 0]} barSize={30} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>

           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                 <h3 className="font-bold text-gray-800">Détail par Chantier</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Chantier</th>
                      <th className="px-6 py-3 text-right">Budget</th>
                      <th className="px-6 py-3 text-right">Main d'œuvre</th>
                      <th className="px-6 py-3 text-right">Frais Divers</th>
                      <th className="px-6 py-3 text-right">Total Réel</th>
                      <th className="px-6 py-3 text-right">Marge</th>
                      <th className="px-6 py-3 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{item.nom}</div>
                          <div className="text-xs text-gray-500">{item.client}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(item.budget)}</td>
                        <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.mo)}</td>
                        <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.frais)}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(item.reel)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${item.marge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.marge)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.margeP < 0 ? 'bg-red-100 text-red-700' :
                            item.margeP < 15 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {item.margeP.toFixed(0)}%
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

      {/* CONTENU ONGLET 2: ANALYTIQUE */}
      {activeTab === 'analytique' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-bold text-gray-800 mb-2">Répartition des Coûts</h3>
             <p className="text-sm text-gray-500 mb-6">Où va l'argent de l'entreprise ?</p>
             {/* Fix: Enforced height to prevent Recharts -1 height warning */}
             <div className="w-full h-[300px] flex justify-center" style={{ minHeight: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={costDistributionData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={100}
                     fill="#8884d8"
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {costDistributionData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(value: number) => formatCurrency(value)} />
                   <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-bold text-gray-800 mb-4">Détails par poste</h3>
             <ul className="space-y-4">
               {costDistributionData.map((item, index) => (
                 <li key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                   <div className="flex items-center">
                     <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                     <span className="text-gray-700 font-medium">{item.name}</span>
                   </div>
                   <div className="text-right">
                     <span className="block font-bold text-gray-900">{formatCurrency(item.value)}</span>
                     <span className="text-xs text-gray-500">{((item.value / totalReel) * 100).toFixed(1)}% du total</span>
                   </div>
                 </li>
               ))}
             </ul>
           </div>
        </div>
      )}

      {/* CONTENU ONGLET 3: RH */}
      {activeTab === 'rh' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100 flex justify-between items-center">
             <div>
               <h3 className="font-bold text-lg text-gray-800">Top Salaires Versés</h3>
               <p className="text-sm text-gray-500">Cumul des salaires par monteur sur la période</p>
             </div>
             <Users className="text-slate-200 w-8 h-8"/>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Monteur</th>
                  <th className="px-6 py-4 text-center">Jours Travaillés</th>
                  <th className="px-6 py-4 text-right">Total Salaire Versé</th>
                  <th className="px-6 py-4 text-right">Coût Moyen / Jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workerStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs mr-3 border">
                        {index + 1}
                      </span>
                      {stat.nom}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-xs">
                        {stat.jours} jours
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800">{formatCurrency(stat.total)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(stat.total / (stat.jours || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;