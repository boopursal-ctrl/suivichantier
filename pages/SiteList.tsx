import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency, countDays, countWorkDays, getCityName, cn } from '../utils';
import { Chantier } from '../types';
import { Plus, Search, Grid, List, MapPin, Calendar, User, ArrowRight, X, Info, Trash2, UserCheck, HardHat, Wallet, DollarSign } from 'lucide-react';

interface SiteListProps {
  onSelectSite: (id: string) => void;
}

const SiteList: React.FC<SiteListProps> = ({ onSelectSite }) => {
  // ... existing SiteList logic ...
  const { chantiers, clients, addChantier, deleteChantier, monteurs, lignesCouts, versements, affectations, globalLaborCost } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('en_instance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Chantier Form State
  const [newChantier, setNewChantier] = useState<Partial<Chantier>>({
    // ...

    statut: 'en_instance',
    trans_compta: 'Auto',
    documents_at_rc: false,
    vehicule_utilise: false,
    budget_prevu: 0,
    commentaire: '',
    adresse: '',
    chef_chantier: '',
    duree_prevue: 1 // Default duration
  });

  // ... (keep useEffect and filter logic) ...

  React.useEffect(() => {
    if (newChantier.id_client) {
      const client = clients.find(c => c.id_client === newChantier.id_client);
      if (client) {
        const dateStr = new Date().toISOString().split('T')[0].replaceAll('-', '');
        const orderNum = chantiers.length + 1;
        const autoRef = `${orderNum}-${client.code_client}-${dateStr}`;
        setNewChantier(prev => ({ ...prev, ref_chantier: autoRef }));
      }
    }
  }, [newChantier.id_client, clients, chantiers.length]);

  const filteredChantiers = chantiers.filter(chantier => {
    const matchesSearch =
      chantier.ref_chantier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chantier.nom_client.toLowerCase().includes(searchTerm.toLowerCase());

    const progress = chantier.taux_avancement || 0;
    // Un chantier est considéré comme "Terminé" si son statut le dit OU si son avancement est à 100%
    const isTechnicallyFinished = chantier.statut === 'terminé' || progress === 100;

    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'terminé') {
      matchesStatus = isTechnicallyFinished;
    } else if (statusFilter === 'actif') {
      // Un chantier actif ne doit pas être terminé (100%)
      matchesStatus = chantier.statut === 'actif' && !isTechnicallyFinished;
    } else {
      // Pour 'en_instance' ou autre
      matchesStatus = chantier.statut === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const handleCreateChantier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChantier.id_client) return;

    const client = clients.find(c => c.id_client === newChantier.id_client);
    const dateStr = new Date().toISOString().split('T')[0].replaceAll('-', '');
    const orderNum = chantiers.length + 1;
    const finalRef = `${orderNum}-${client?.code_client || 'UNK'}-${dateStr}`;

    const chantierToAdd: Chantier = {
      ...newChantier as Chantier,
      id_chantier: Date.now().toString(),
      numero_ordre: orderNum,
      ref_chantier: finalRef,
      nom_client: client?.nom_client || '',
      code_client: client?.code_client || '',
      ville_code: newChantier.ville_code || client?.ville_code || '000',
      budget_prevu: newChantier.budget_prevu || 0,
    };

    addChantier(chantierToAdd);
    setIsModalOpen(false);
    setNewChantier({ statut: 'en_instance', trans_compta: 'Auto', documents_at_rc: false, vehicule_utilise: false, budget_prevu: 0, commentaire: '', adresse: '', chef_chantier: '', duree_prevue: 1 });
  };

  return (
    <div className="space-y-8">
      {/* ... (Keep Header and Filters identical) ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Mes Chantiers</h2>
          <p className="text-gray-500 text-lg">Gérez vos projets en cours et terminés.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 shadow-md font-bold text-md transition-transform hover:scale-105"
        >
          <Plus className="w-6 h-6 md:w-5 md:h-5 md:mr-2" />
          <span className="hidden md:inline">Créer un Chantier</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          {['en_instance', 'actif', 'terminé', 'all'].map(status => {
            const labels: Record<string, string> = {
              'en_instance': 'En Attente',
              'actif': 'En Cours',
              'terminé': 'Terminés',
              'all': 'Tout'
            };
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${statusFilter === status
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Chercher un chantier ou un client..."
            className="w-full pl-10 pr-4 py-3 border-none bg-gray-50 rounded-xl focus:ring-2 focus:ring-red-500 text-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 border-l pl-4 border-gray-200 hidden md:flex">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      {filteredChantiers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">Aucun chantier trouvé pour cette recherche.</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChantiers.map((chantier) => {
                // ============================================================
                // BUDGET PRÉVU = Total Coûts Engagés (identique à SiteDetail)
                //   frais réels payés + salaires planifiés (jours × taux)
                // BUDGET RÉEL  = Ce que le Chef a pointé (pointages_mensuels)
                // ============================================================

                const costs = lignesCouts.filter(c => c.id_chantier === chantier.id_chantier);
                const affectationsChantier = affectations.filter(a => a.id_chantier === chantier.id_chantier);
                const MGMT = [100, 101, 102, 103, 104, 157];

                // Frais réels (lignes_couts)
                const totalFraisReels = costs.reduce((sum, c) => sum + Number(c.montant_reel || 0), 0);

                // Salaires planifiés (jours ouvrés × tarif, identique à SiteDetail)
                // Les salaires des titulaires CDI ne sont pas comptés dans le budget du chantier
                const salPlanifiesPerm = 0;

                const salPlanifiesLocaux = (chantier.monteurs_locaux || []).reduce((sum, ml) => {
                  const s = ml.date_debut || chantier.date_debut || new Date().toISOString().split('T')[0];
                  const e = ml.date_fin   || chantier.date_fin   || new Date().toISOString().split('T')[0];
                  return sum + (Number(ml.salaire_jour || 0) * Math.max(0, countWorkDays(s, e)));
                }, 0);

                const totalSalairesPlanning = salPlanifiesPerm + salPlanifiesLocaux;

                // BUDGET PRÉVU = Total Coûts Engagés (comme SiteDetail)
                const budgetPrevuCalcule = totalFraisReels + totalSalairesPlanning;

                // BUDGET RÉEL = Pointages Chef (pointages_mensuels) + Frais Réels (inclut indem. hors ville)
                const salairesPointes = (globalLaborCost || {})[chantier.id_chantier] || 0;
                const budgetReelChef = totalFraisReels + salairesPointes;
                const hasPointage = salairesPointes > 0 || totalFraisReels > 0;

                // Avances client
                const acomptes = versements.filter(v => v.id_chantier === chantier.id_chantier);
                const totalAcomptes = acomptes.reduce((sum, v) => sum + Number(v.montant || 0), 0);

                return (
                  <div
                    key={chantier.id_chantier}
                    onClick={() => onSelectSite(chantier.id_chantier)}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-white rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 z-0`}></div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        {(() => {
                          // LOGIC STATUS DYNAMIQUE
                          let computedStatus = chantier.statut;
                          let badgeClass = 'bg-gray-100 text-gray-600';
                          let label = chantier.statut;

                          const today = new Date().toISOString().split('T')[0];
                          const start = chantier.date_debut;
                          const end = chantier.date_fin;
                          const progress = chantier.taux_avancement || 0;


                          // 1. Calculer statut logique
                          // PRIORITÉ ABSOLUE : Si l'avancement est 100%, c'est TERMINÉ, peu importe les dates.
                          if (progress === 100) {
                            computedStatus = 'terminé';
                            badgeClass = 'bg-slate-800 text-white';
                            label = 'TERMINÉ';
                          }
                          // Si pas terminé mais date de début future
                          else if (start && start > today) {
                            computedStatus = 'planifié';
                            badgeClass = 'bg-blue-100 text-blue-700';
                            label = 'A VENIR';
                          }
                          // Si pas terminé et date fin dépassée (et avancement < 100)
                          else if (end && end < today) {
                            computedStatus = 'en_retard';
                            badgeClass = 'bg-red-100 text-red-700 border border-red-200 animate-pulse';
                            label = 'EN RETARD';
                          }
                          // Si actif (date début passée, date fin pas encore passée ou absente)
                          else if ((start && start <= today) && (!end || end >= today)) {
                            computedStatus = 'actif';
                            badgeClass = 'bg-green-100 text-green-700';
                            label = 'EN COURS';
                          } else {
                            // Fallback to existing manual status
                            if (chantier.statut === 'en_instance') {
                              badgeClass = 'bg-amber-100 text-amber-700';
                              label = 'EN ATTENTE';
                            } else if (chantier.statut === 'actif') {
                              badgeClass = 'bg-green-100 text-green-700';
                              label = 'EN COURS';
                            } else if (chantier.statut === 'terminé') {
                              badgeClass = 'bg-slate-800 text-white';
                              label = 'TERMINÉ';
                            }
                          }

                          return (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${badgeClass}`}>
                              {label}
                            </span>
                          );
                        })()}
                        <span className="text-gray-400 font-mono text-sm">#{chantier.numero_ordre}</span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-1">{chantier.ref_chantier}</h3>
                      <div className="mb-4">
                        <p className="text-red-700 font-medium flex items-center">
                          <MapPin size={14} className="mr-1" /> {chantier.nom_client}
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-gray-600 font-normal">{getCityName(chantier.ville_code)}</span>
                        </p>
                        {chantier.adresse && (
                          <p className="text-xs text-gray-500 ml-5 mt-1 truncate">{chantier.adresse}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div className="flex items-center text-gray-500">
                          <Calendar size={14} className="mr-2" />
                          {formatDate(chantier.date_debut)}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <UserCheck size={14} className="mr-2 text-blue-600" />
                          <span className="truncate text-sm">{chantier.responsable_chantier}</span>
                        </div>
                        {chantier.chef_chantier && (
                          <div className="col-span-2 flex items-center text-gray-600">
                            <HardHat size={14} className="mr-2 text-orange-600" />
                            <span className="text-sm">Chef: {chantier.chef_chantier}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Budget Prévu</p>
                            <p className="text-lg font-bold text-gray-700">{formatCurrency(budgetPrevuCalcule)}</p>
                            <p className="text-[9px] text-gray-400 mt-1">Coûts engagés (frais + équipe)</p>
                          </div>
                          <div className={cn(
                            "rounded-lg p-3 border",
                            !hasPointage ? "bg-gray-50 border-gray-100" :
                            budgetReelChef > budgetPrevuCalcule ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
                          )}>
                            <p className={cn(
                              "text-[10px] font-bold mb-1 uppercase",
                              !hasPointage ? "text-gray-400" :
                              budgetReelChef > budgetPrevuCalcule ? "text-red-700" : "text-blue-700"
                            )}>Budget Réel</p>
                            <p className={cn(
                              "text-lg font-bold",
                              !hasPointage ? "text-gray-400" :
                              budgetReelChef > budgetPrevuCalcule ? "text-red-700" : "text-blue-700"
                            )}>{hasPointage ? formatCurrency(budgetReelChef) : '–'}</p>
                            <p className="text-[9px] mt-1 text-gray-400">
                              {hasPointage ? 'Pointage mensuel chef' : 'En attente de pointage'}
                            </p>
                          </div>
                        </div>

                        {/* Avance + Reste à verser */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                            <p className="text-[10px] text-green-700 font-bold uppercase">Avance Client</p>
                            <p className="text-md font-bold text-green-700">{formatCurrency(totalAcomptes)}</p>
                          </div>
                          <div className={cn(
                            "rounded-lg p-2 border text-center",
                            (budgetPrevuCalcule - totalAcomptes) > 0 ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"
                          )}>
                            <p className={cn(
                              "text-[10px] font-bold uppercase",
                              (budgetPrevuCalcule - totalAcomptes) > 0 ? "text-amber-700" : "text-emerald-700"
                            )}>Reste à verser</p>
                            <p className={cn(
                              "text-md font-bold",
                              (budgetPrevuCalcule - totalAcomptes) > 0 ? "text-amber-700" : "text-emerald-700"
                            )}>{formatCurrency(budgetPrevuCalcule - totalAcomptes)}</p>
                          </div>
                        </div>

                        {/* Avancement */}
                        {(() => {
                          const progressTime = (() => {
                            if (!chantier.date_debut || !chantier.date_fin) return 0;
                            const start = new Date(chantier.date_debut).getTime();
                            const end = new Date(chantier.date_fin).getTime();
                            const now = new Date().getTime();
                            if (now < start) return 0;
                            if (now > end) return 100;
                            const total = end - start;
                            if (total <= 0) return 100;
                            const elapsed = now - start;
                            return Math.round((elapsed / total) * 100);
                          })();

                          const displayProgress = chantier.taux_avancement !== undefined ? chantier.taux_avancement : progressTime;
                          const isManual = chantier.taux_avancement !== undefined;

                          return (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">{isManual ? 'Avancement' : 'Avancement (Estimé)'}</span>
                                <span className={`font-bold ${displayProgress > 100 ? 'text-red-600' : 'text-gray-700'}`}>
                                  {displayProgress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${displayProgress >= 100 ? 'bg-green-500' :
                                    displayProgress > 80 ? 'bg-orange-500' :
                                      'bg-blue-600'
                                    }`}
                                  style={{ width: `${Math.min(displayProgress, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex justify-between items-center pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Voulez-vous vraiment supprimer le chantier "${chantier.ref_chantier}" ?\nCette action est irréversible et sera enregistrée.`)) {
                                deleteChantier(chantier.id_chantier);
                              }
                            }}
                            className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer ce chantier"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 group-hover:bg-red-700 group-hover:text-white transition-colors">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Réf</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Budget Prévu</th>
                      <th className="px-6 py-4">Coût Réel</th>
                      <th className="px-6 py-4">Marge / Solde</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredChantiers.map(chantier => {
                       // Formule identique à SiteDetail
                       const costs = lignesCouts.filter(c => c.id_chantier === chantier.id_chantier);
                       const totalFraisReels  = costs.reduce((sum, c) => sum + Number(c.montant_reel  || 0), 0);
                       const totalFraisPrevus = costs.reduce((sum, c) => sum + Number(c.montant_prevu || 0), 0);

                       const affectationsChantier = affectations.filter(a => a.id_chantier === chantier.id_chantier);
                       const MGMT_LIST = [100, 101, 102, 103, 104, 157];
                       // Les salaires des CDI ne sont pas comptés
                       const salPermanents = 0;
                       const salLocaux = (chantier.monteurs_locaux || []).reduce((sum, ml) => {
                         const days = Math.max(0, countWorkDays(
                           ml.date_debut || chantier.date_debut || new Date().toISOString().split('T')[0],
                           ml.date_fin   || chantier.date_fin   || new Date().toISOString().split('T')[0]
                         ));
                         return sum + (Number(ml.salaire_jour || 0) * days);
                       }, 0);
                       const totalSalaires = salPermanents + salLocaux;

                       const budgetPrevuCalcule = totalFraisReels + totalSalaires;
                       const salairesPointes = (globalLaborCost || {})[chantier.id_chantier] || 0;
                       const budgetReelChef = totalFraisReels + salairesPointes;
                       const hasPointageList = salairesPointes > 0 || totalFraisReels > 0;

                       return (
                         <tr key={chantier.id_chantier} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 group">
                           <td className="px-6 py-4">
                             <div className="flex flex-col">
                               <span className="font-black text-gray-900 group-hover:text-red-700 transition-colors">{chantier.ref_chantier}</span>
                               <span className="text-xs text-gray-500 font-bold">{chantier.nom_client}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 font-semibold text-gray-600">{formatCurrency(budgetPrevuCalcule)}</td>
                           <td className="px-6 py-4">
                             <div className="font-bold text-gray-900">{hasPointageList ? formatCurrency(budgetReelChef) : '–'}</div>
                             <div className="text-[10px] text-indigo-500 font-bold mt-0.5">{hasPointageList ? 'POINTAGE CHEF' : 'EN ATTENTE'}</div>
                           </td>
                           <td className="px-6 py-4">
                             {hasPointageList ? (
                               <span className={cn(
                                 "px-3 py-1 rounded-full text-xs font-black uppercase",
                                 (budgetPrevuCalcule - budgetReelChef) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                               )}>
                                 {formatCurrency(budgetPrevuCalcule - budgetReelChef)}
                               </span>
                             ) : (
                               <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-gray-100 text-gray-400">–</span>
                             )}
                           </td>
                           <td className="px-6 py-4 text-right">
                            <button onClick={() => onSelectSite(chantier.id_chantier)} className="p-2 bg-slate-100 hover:bg-red-700 hover:text-white rounded-lg transition-all">
                              <ArrowRight size={18} />
                            </button>
                          </td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL PRINCIPALE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-xl text-gray-800">Démarrer un Chantier</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleCreateChantier} className="p-6 space-y-5 overflow-y-auto">
              {/* 1. Client & Ref */}
              <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">1. Client (Obligatoire)</label>
                  <select required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:border-red-500 outline-none transition-colors"
                    value={newChantier.id_client || ''}
                    onChange={e => setNewChantier({ ...newChantier, id_client: e.target.value })}
                  >
                    <option value="">Sélectionner un client...</option>
                    {clients.map(c => <option key={c.id_client} value={c.id_client}>{c.nom_client} ({c.code_client})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Référence Chantier (Auto)</label>
                  <div className="font-mono text-lg font-bold text-gray-800 bg-gray-200 px-4 py-3 rounded-xl border border-gray-300">
                    {newChantier.ref_chantier || 'En attente du client...'}
                  </div>
                </div>
              </div>

              {/* 2. Planification (Durée & Dates Optionnelles) */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <Calendar size={16} /> Planification
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Durée (Jours)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none"
                      value={newChantier.duree_prevue || 1}
                      onChange={e => setNewChantier({ ...newChantier, duree_prevue: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Démarrage Souhaité (Optionnel)</label>
                    <input
                      type="date"
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-blue-500 outline-none text-sm"
                      value={newChantier.date_debut || ''}
                      onChange={e => setNewChantier({ ...newChantier, date_debut: e.target.value })}
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Laisser vide pour planifier plus tard via le Planning.</p>
                  </div>
                </div>
              </div>

              {/* 3. Lieu & Equipe */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Adresse / Lieu</label>
                    <input type="text" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 outline-none"
                      value={newChantier.adresse || ''}
                      onChange={e => setNewChantier({ ...newChantier, adresse: e.target.value })}
                      placeholder="Ex: Hangar 3..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ville (Indicatif)</label>
                    <input type="text" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 outline-none"
                      value={newChantier.ville_code || (clients.find(c => c.id_client === newChantier.id_client)?.ville_code) || ''}
                      onChange={e => setNewChantier({ ...newChantier, ville_code: e.target.value })}
                      placeholder="Ex: 522, 528..."
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Par défaut: Ville du client</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Sous Chef de Chantier</label>
                    <input
                      list="responsables-list"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:border-red-500 outline-none"
                      value={newChantier.responsable_chantier || ''}
                      onChange={e => setNewChantier({ ...newChantier, responsable_chantier: e.target.value })}
                      placeholder="Chercher..."
                    />
                    <datalist id="responsables-list">
                      {monteurs
                        .filter(m => [100, 101, 102, 103, 104, 157].includes(Number(m.matricule)))
                        .map(m => <option key={m.matricule} value={m.nom_monteur} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Chef de Chantier</label>
                    <input
                      list="chefs-list"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:border-red-500 outline-none"
                      value={newChantier.chef_chantier || ''}
                      onChange={e => setNewChantier({ ...newChantier, chef_chantier: e.target.value })}
                      placeholder="Chercher..."
                    />
                    <datalist id="chefs-list">
                      {monteurs
                        .filter(m => [100, 101, 102, 103, 104, 157].includes(Number(m.matricule)))
                        .map(m => <option key={m.matricule} value={m.nom_monteur} />)}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* 4. Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Commentaire / Notes</label>
                <textarea
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none h-24 resize-none"
                  value={newChantier.commentaire || ''}
                  onChange={e => setNewChantier({ ...newChantier, commentaire: e.target.value })}
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 shadow-lg transition-transform hover:scale-[1.02]">
                  Créer (En Instance)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// --- BUDGET CALCULATOR COMPONENT ---

export default SiteList;
