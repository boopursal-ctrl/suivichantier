




import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { LigneCout, AffectationMonteur, Versement, TypeCout, Chantier, MonteurLocal } from '../types';
import { formatCurrency, formatDate, countDays } from '../utils';
import { ArrowLeft, Plus, Trash2, Edit2, Wallet, Users, Banknote, Calendar, MapPin, CheckCircle2, AlertTriangle, X, FileText, Car, HardHat, Save, MessageSquare } from 'lucide-react';

interface SiteDetailProps {
  chantierId: string;
  onBack: () => void;
}

const SiteDetail: React.FC<SiteDetailProps> = ({ chantierId, onBack }) => {
  const { 
    chantiers, lignesCouts, affectations, versements, monteurs, updateChantier,
    addAffectation, removeAffectation, 
    addCout, deleteCout,
    addVersement, deleteVersement
  } = useData();

  const [activeTab, setActiveTab] = useState<'infos' | 'equipe' | 'depenses' | 'paiements'>('infos');
  
  // Modals States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLocalWorkerModalOpen, setIsLocalWorkerModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  
  // Forms States
  const [assignMatricule, setAssignMatricule] = useState<number | ''>('');
  const [assignDateEntree, setAssignDateEntree] = useState('');
  const [assignDateSortie, setAssignDateSortie] = useState('');

  // Info Form State
  const [infoFormData, setInfoFormData] = useState({
    plan_reference: '',
    vehicule_utilise: false,
    documents_at_rc: false
  });

  // Local Worker Form
  const [localWorkerForm, setLocalWorkerForm] = useState<Partial<MonteurLocal>>({
    nom_complet: '',
    cin: '',
    salaire_jour: 100,
    jours_travailles: 0
  });

  const [expenseFormData, setExpenseFormData] = useState({
    type_cout: 'transport_local' as TypeCout,
    montant_reel: 0,
    cout_unitaire: 0,
    quantite: 1,
    commentaire: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    numero: 1
  });

  // Data Fetching
  const chantier = chantiers.find(c => c.id_chantier === chantierId);
  const costs = lignesCouts.filter(c => c.id_chantier === chantierId);
  const workers = affectations.filter(a => a.id_chantier === chantierId);
  const siteVersements = versements.filter(v => v.id_chantier === chantierId);

  if (!chantier) return <div>Chantier introuvable</div>;

  // Calculations
  const totalDepensesDirectes = costs.reduce((sum, c) => sum + c.montant_reel, 0);
  
  // Calcul MO Affectée
  const totalMainDoeuvreAffectee = workers.reduce((acc, worker) => {
      const brutDays = countDays(worker.date_entree, worker.date_sortie);
      return acc + (worker.salaire_jour * brutDays);
  }, 0);

  // Calcul MO Locale (Détaillée)
  const monteursLocaux = chantier.monteurs_locaux || [];
  const totalMainDoeuvreLocale = monteursLocaux.reduce((acc, ml) => acc + (ml.salaire_jour * ml.jours_travailles), 0);
  const totalNombreMonteursLocaux = monteursLocaux.length;
  
  // Total MO Global
  const totalMainDoeuvre = totalMainDoeuvreAffectee + totalMainDoeuvreLocale;

  const budgetDepense = totalDepensesDirectes + totalMainDoeuvre;
  const budgetRestant = chantier.budget_prevu - budgetDepense;
  const pourcentageDepense = chantier.budget_prevu > 0 ? (budgetDepense / chantier.budget_prevu) * 100 : 0;
  const totalVersements = siteVersements.reduce((sum, v) => sum + v.montant, 0);

  // Handlers
  const handleEditInfoOpen = () => {
    setInfoFormData({
      plan_reference: chantier.plan_reference || '',
      vehicule_utilise: chantier.vehicule_utilise,
      documents_at_rc: chantier.documents_at_rc
    });
    setIsEditInfoModalOpen(true);
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateChantier({
      ...chantier,
      ...infoFormData
    });
    setIsEditInfoModalOpen(false);
  };

  const handleAddLocalWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localWorkerForm.nom_complet || !localWorkerForm.salaire_jour) return;

    const newWorker: MonteurLocal = {
      id: `ml-${Date.now()}`,
      nom_complet: localWorkerForm.nom_complet,
      cin: localWorkerForm.cin || '',
      salaire_jour: localWorkerForm.salaire_jour,
      jours_travailles: localWorkerForm.jours_travailles || 0
    };

    const updatedList = [...(chantier.monteurs_locaux || []), newWorker];
    updateChantier({
      ...chantier,
      monteurs_locaux: updatedList
    });
    setIsLocalWorkerModalOpen(false);
    setLocalWorkerForm({ nom_complet: '', cin: '', salaire_jour: 100, jours_travailles: 0 });
  };

  const handleDeleteLocalWorker = (id: string) => {
    if (!confirm('Supprimer cet intérimaire ?')) return;
    const updatedList = (chantier.monteurs_locaux || []).filter(ml => ml.id !== id);
    updateChantier({
      ...chantier,
      monteurs_locaux: updatedList
    });
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignMatricule || !assignDateEntree || !assignDateSortie) return;
    const monteur = monteurs.find(m => m.matricule === Number(assignMatricule));
    if (!monteur) return;

    addAffectation({
      id_affectation: `aff-${Date.now()}`,
      id_chantier: chantierId,
      matricule: monteur.matricule,
      nom_monteur: monteur.nom_monteur,
      salaire_jour: monteur.salaire_jour,
      zone_travail: chantier.ville_code,
      date_entree: assignDateEntree,
      date_sortie: assignDateSortie,
      jours_arret: 0
    });
    setIsAssignModalOpen(false);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto calculate montant reel if not manually set but unit/qty are there
    const calculatedTotal = expenseFormData.cout_unitaire * expenseFormData.quantite;
    
    addCout({
      id_cout: `cout-${Date.now()}`,
      id_chantier: chantierId,
      type_cout: expenseFormData.type_cout,
      cout_unitaire: expenseFormData.cout_unitaire,
      quantite: expenseFormData.quantite,
      montant_reel: calculatedTotal,
      montant_prevu: calculatedTotal, // Assuming forecast = real for ad-hoc adds
      commentaire: expenseFormData.commentaire,
      statut: 'validé'
    });
    setIsExpenseModalOpen(false);
    setExpenseFormData({ type_cout: 'transport_local', montant_reel: 0, cout_unitaire: 0, quantite: 1, commentaire: '' });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    addVersement({
      id_versement: `v-${Date.now()}`,
      id_chantier: chantierId,
      montant: paymentFormData.montant,
      date: paymentFormData.date,
      numero: paymentFormData.numero
    });
    setIsPaymentModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
           <h1 className="text-2xl font-bold text-gray-900">{chantier.nom_client}</h1>
           <p className="text-gray-500 font-mono text-sm">{chantier.ref_chantier}</p>
        </div>
        <div className="ml-auto">
          <span className={`px-4 py-2 rounded-full font-bold text-sm ${chantier.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {chantier.statut.toUpperCase()}
          </span>
        </div>
      </div>

      {/* BUDGET CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
         <div className="flex justify-between items-center mb-4">
           <h2 className="text-lg font-bold text-gray-700 flex items-center">
              <Wallet className="mr-2 text-red-700" /> Suivi Financier
           </h2>
           <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
             Mode: {chantier.trans_compta}
           </span>
         </div>
         
         <div className="mb-6">
           <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-gray-600">Dépensé: {formatCurrency(budgetDepense)}</span>
              <span className="text-gray-900">Budget (Prévu): {formatCurrency(chantier.budget_prevu)}</span>
           </div>
           <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-500 flex items-center justify-center text-xs text-white font-bold ${pourcentageDepense > 100 ? 'bg-red-500' : pourcentageDepense > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(pourcentageDepense, 100)}%` }}
              >
                {pourcentageDepense.toFixed(0)}%
              </div>
           </div>
           <p className="text-right text-sm text-gray-500 mt-2">
             {budgetRestant >= 0 ? (
               <span className="text-green-600 font-bold">Reste {formatCurrency(budgetRestant)}</span>
             ) : (
               <span className="text-red-600 font-bold">Dépassement {formatCurrency(Math.abs(budgetRestant))}</span>
             )}
           </p>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div className="p-3 bg-blue-50 rounded-xl">
               <p className="text-xs text-blue-600 uppercase font-bold">Main d'œuvre</p>
               <p className="text-lg font-bold text-gray-800">{formatCurrency(totalMainDoeuvre)}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
               <p className="text-xs text-orange-600 uppercase font-bold">Dépenses</p>
               <p className="text-lg font-bold text-gray-800">{formatCurrency(totalDepensesDirectes)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
               <p className="text-xs text-green-600 uppercase font-bold">Encaissé</p>
               <p className="text-lg font-bold text-gray-800">{formatCurrency(totalVersements)}</p>
            </div>
         </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-1">
        {[
          { id: 'infos', label: 'Infos', icon: CheckCircle2 },
          { id: 'equipe', label: 'Équipe & RH', icon: Users },
          { id: 'depenses', label: 'Dépenses', icon: Wallet },
          { id: 'paiements', label: 'Paiements', icon: Banknote }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center px-6 py-4 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-white text-red-700 border-t border-x border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] translate-y-[1px]' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}
            `}
          >
            <tab.icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-red-600' : 'text-gray-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-gray-200 border-t-0 p-6 min-h-[400px]">
        
        {/* --- TAB INFOS --- */}
        {activeTab === 'infos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Détails Opérationnels</h3>
                <ul className="space-y-4">
                  <li className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Période du chantier (Prévisionnelle)</p>
                      <p className="font-medium">{formatDate(chantier.date_debut)} — {formatDate(chantier.date_fin)}</p>
                      <p className="text-xs text-gray-400">{countDays(chantier.date_debut, chantier.date_fin)} Jours estimés</p>
                    </div>
                  </li>
                  <li className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Ville / Zone</p>
                      <p className="font-medium">Code {chantier.ville_code}</p>
                      {chantier.adresse && <p className="text-sm text-gray-600 mt-1">{chantier.adresse}</p>}
                    </div>
                  </li>
                  <li className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Users className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Responsable</p>
                      <p className="font-medium">{chantier.responsable_chantier}</p>
                    </div>
                  </li>
                  {chantier.commentaire && (
                     <li className="flex items-start p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <MessageSquare className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
                      <div>
                        <p className="text-xs text-yellow-700 font-bold">Observation / Note</p>
                        <p className="font-medium text-sm text-gray-700">{chantier.commentaire}</p>
                      </div>
                    </li>
                  )}
                </ul>
             </div>

             <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                   <h3 className="text-lg font-bold text-gray-800">Documents & Logistique</h3>
                   <button onClick={handleEditInfoOpen} className="text-sm text-red-700 hover:underline font-bold flex items-center">
                     <Edit2 size={14} className="mr-1"/> Modifier
                   </button>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Référence Plan</p>
                      <p className="font-medium font-mono">{chantier.plan_reference || 'Non spécifié'}</p>
                    </div>
                  </li>
                  <li className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Car className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Véhicule Utilisé</p>
                      <p className="font-medium">{chantier.vehicule_utilise ? 'Oui - Véhicule Société' : 'Non'}</p>
                    </div>
                  </li>
                  <li className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className={`w-5 h-5 mr-3 ${chantier.documents_at_rc ? 'text-green-500' : 'text-red-500'}`} />
                    <div>
                      <p className="text-xs text-gray-500">Documents d'ouverture (AT/RC)</p>
                      <p className="font-medium">{chantier.documents_at_rc ? 'Validés' : 'Manquants'}</p>
                    </div>
                  </li>
                </ul>
             </div>
          </div>
        )}

        {/* --- TAB EQUIPE --- */}
        {activeTab === 'equipe' && (
          <div className="space-y-8">
            
            {/* 1. Monteurs Locaux (Intérimaires) - LISTE DÉTAILLÉE */}
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="font-bold text-orange-800 flex items-center">
                   <HardHat className="w-5 h-5 mr-2"/> Main d'œuvre Locale (Intérim)
                 </h4>
                 <button 
                   onClick={() => setIsLocalWorkerModalOpen(true)}
                   className="flex items-center text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded shadow-sm"
                 >
                   <Plus size={14} className="mr-1"/> Ajouter Intérimaire
                 </button>
               </div>
               
               {/* Tableau des locaux */}
               <div className="bg-white rounded-lg overflow-hidden border border-orange-200 mb-3">
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-orange-100/50 text-orange-900 font-bold text-xs uppercase">
                       <tr>
                         <th className="px-4 py-3">Nom Complet</th>
                         <th className="px-4 py-3">CIN</th>
                         <th className="px-4 py-3 text-right">Jours</th>
                         <th className="px-4 py-3 text-right">Salaire/J</th>
                         <th className="px-4 py-3 text-right">Total</th>
                         <th className="px-4 py-3"></th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {monteursLocaux.map(ml => (
                         <tr key={ml.id} className="hover:bg-gray-50">
                           <td className="px-4 py-2 font-medium">{ml.nom_complet}</td>
                           <td className="px-4 py-2 font-mono text-xs text-gray-500">{ml.cin || '-'}</td>
                           <td className="px-4 py-2 text-right">{ml.jours_travailles}</td>
                           <td className="px-4 py-2 text-right">{ml.salaire_jour}</td>
                           <td className="px-4 py-2 text-right font-bold text-orange-700">{formatCurrency(ml.jours_travailles * ml.salaire_jour)}</td>
                           <td className="px-4 py-2 text-right">
                             <button onClick={() => handleDeleteLocalWorker(ml.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                           </td>
                         </tr>
                       ))}
                       {monteursLocaux.length === 0 && (
                         <tr><td colSpan={6} className="px-4 py-3 text-center text-gray-400 italic">Aucun intérimaire déclaré.</td></tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>

               <div className="flex items-center justify-between text-sm pt-2 border-t border-orange-200">
                 <span className="text-orange-700 font-medium">Effectif local: {totalNombreMonteursLocaux}</span>
                 <span className="text-orange-900 font-bold">Total Coût: {formatCurrency(totalMainDoeuvreLocale)}</span>
               </div>
            </div>

            {/* 2. Monteurs Affectés (Staff) */}
            <div>
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-gray-800">Collaborateurs Affectés ({workers.length})</h3>
                 <button 
                   onClick={() => setIsAssignModalOpen(true)}
                   className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold shadow-md"
                 >
                   <Plus className="w-5 h-5 mr-2" /> Affecter
                 </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {workers.map(worker => {
                  const jours = countDays(worker.date_entree, worker.date_sortie);
                  const total = jours * worker.salaire_jour;
                  return (
                    <div key={worker.id_affectation} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow gap-4">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                            {worker.matricule}
                          </div>
                          <div>
                             <p className="font-bold text-gray-900">{worker.nom_monteur}</p>
                             <p className="text-xs text-gray-500">Mat: {worker.matricule} • Zone: {worker.zone_travail}</p>
                          </div>
                       </div>
                       
                       <div className="flex flex-wrap gap-4 md:gap-8 text-sm">
                          <div className="bg-gray-50 px-3 py-1 rounded">
                             <p className="text-xs text-gray-500">Période</p>
                             <p className="font-medium">{formatDate(worker.date_entree)} → {formatDate(worker.date_sortie)}</p>
                          </div>
                          <div>
                             <p className="text-xs text-gray-500">Jours</p>
                             <p className="font-bold text-center">{jours}</p>
                          </div>
                          <div>
                             <p className="text-xs text-gray-500">Salaire/J</p>
                             <p className="font-medium text-right">{worker.salaire_jour}</p>
                          </div>
                          <div className="text-right min-w-[80px]">
                             <p className="text-xs text-gray-500">Total</p>
                             <p className="font-bold text-indigo-700">{formatCurrency(total)}</p>
                          </div>
                       </div>

                       <button 
                          onClick={() => { if(confirm('Retirer cet ouvrier ?')) removeAffectation(worker.id_affectation) }}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg self-end md:self-center"
                       >
                          <Trash2 size={18} />
                       </button>
                    </div>
                  );
                })}
                {workers.length === 0 && (
                   <p className="text-center py-6 text-gray-400 italic">Aucun collaborateur interne affecté.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB DEPENSES (DYNAMIC) --- */}
        {activeTab === 'depenses' && (
          <div>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-gray-800">Journal des Dépenses</h3>
               <button 
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-bold shadow-md"
               >
                 <Plus className="w-5 h-5 mr-2" /> Saisir Dépense
               </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-sm">
                    <th className="py-3 font-medium">Type</th>
                    <th className="py-3 font-medium">Détail</th>
                    <th className="py-3 font-medium text-right">Montant</th>
                    <th className="py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {costs.map(cost => (
                    <tr key={cost.id_cout} className="hover:bg-gray-50">
                      <td className="py-4 font-medium capitalize">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">{cost.type_cout.replace('_', ' ')}</span>
                      </td>
                      <td className="py-4 text-sm text-gray-500">
                        {cost.quantite} x {formatCurrency(cost.cout_unitaire)}
                        {cost.commentaire && <div className="text-xs italic text-gray-400 mt-1">{cost.commentaire}</div>}
                      </td>
                      <td className="py-4 text-right font-bold text-gray-900">{formatCurrency(cost.montant_reel)}</td>
                      <td className="py-4 text-right">
                        <button onClick={() => deleteCout(cost.id_cout)} className="text-gray-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {costs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 italic">Aucune dépense enregistrée.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB PAIEMENTS (DYNAMIC) --- */}
        {activeTab === 'paiements' && (
          <div className="max-w-2xl mx-auto">
             <div className="text-center mb-8 bg-green-50 p-6 rounded-2xl border border-green-100">
               <p className="text-green-800 font-medium">Total Encaissé</p>
               <p className="text-4xl font-bold text-green-600">{formatCurrency(totalVersements)}</p>
               <div className="w-full bg-green-200 h-2 rounded-full mt-3">
                 <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min((totalVersements/chantier.budget_prevu)*100, 100)}%` }}></div>
               </div>
             </div>

             <div className="space-y-4">
                {siteVersements.map(v => (
                  <div key={v.id_versement} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                     <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-full">
                           <Banknote className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                           <p className="font-bold text-gray-900">Versement N°{v.numero}</p>
                           <p className="text-xs text-gray-500">{formatDate(v.date)}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="font-bold text-lg text-green-700">+{formatCurrency(v.montant)}</span>
                       <button onClick={() => deleteVersement(v.id_versement)} className="text-gray-300 hover:text-red-500">
                         <Trash2 size={18} />
                       </button>
                     </div>
                  </div>
                ))}
             </div>
             
             <button 
               onClick={() => setIsPaymentModalOpen(true)}
               className="w-full mt-6 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50 hover:border-red-400 hover:text-red-600 transition-all flex items-center justify-center"
             >
                <Plus className="mr-2" /> Enregistrer un paiement
             </button>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Modal Edition Infos */}
      {isEditInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                 <h3 className="font-bold text-lg text-gray-800">Modifier Infos Chantier</h3>
                 <button onClick={() => setIsEditInfoModalOpen(false)}><X size={20} className="text-gray-400"/></button>
              </div>
              <form onSubmit={handleUpdateInfo} className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Référence Plan</label>
                    <input type="text" className="w-full border rounded-xl px-4 py-3" 
                       value={infoFormData.plan_reference}
                       onChange={e => setInfoFormData({...infoFormData, plan_reference: e.target.value})}
                       placeholder="Ex: 882-02..."
                    />
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="text-sm font-bold text-gray-700">Documents AT/RC Validés</label>
                    <input type="checkbox" className="w-5 h-5 accent-red-600" 
                       checked={infoFormData.documents_at_rc}
                       onChange={e => setInfoFormData({...infoFormData, documents_at_rc: e.target.checked})}
                    />
                 </div>
                 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="text-sm font-bold text-gray-700">Véhicule Société Utilisé</label>
                    <input type="checkbox" className="w-5 h-5 accent-red-600" 
                       checked={infoFormData.vehicule_utilise}
                       onChange={e => setInfoFormData({...infoFormData, vehicule_utilise: e.target.checked})}
                    />
                 </div>
                 <button type="submit" className="w-full py-3 bg-red-700 text-white rounded-xl font-bold flex items-center justify-center">
                    <Save size={18} className="mr-2"/> Enregistrer
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Monteurs Locaux (New Detailed) */}
      {isLocalWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-800">Ajouter Intérimaire</h3>
               <button onClick={() => setIsLocalWorkerModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddLocalWorker} className="space-y-4">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Nom Complet</label>
                   <input type="text" required className="w-full border rounded-xl px-4 py-3" 
                     value={localWorkerForm.nom_complet} 
                     onChange={e => setLocalWorkerForm({...localWorkerForm, nom_complet: e.target.value})} 
                     placeholder="Ex: Mohamed Alami"
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">CIN (Optionnel)</label>
                   <input type="text" className="w-full border rounded-xl px-4 py-3 uppercase" 
                     value={localWorkerForm.cin} 
                     onChange={e => setLocalWorkerForm({...localWorkerForm, cin: e.target.value})} 
                     placeholder="Ex: J123456"
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Salaire/Jour</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3" 
                      value={localWorkerForm.salaire_jour} 
                      onChange={e => setLocalWorkerForm({...localWorkerForm, salaire_jour: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Jours</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3" 
                      value={localWorkerForm.jours_travailles} 
                      onChange={e => setLocalWorkerForm({...localWorkerForm, jours_travailles: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-md">
                   Ajouter à la liste
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Modal Affectation */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-800">Ajouter un Collaborateur</h3>
               <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddAssignment} className="space-y-4 overflow-y-auto">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Collaborateur (Base RH)</label>
                   <select required className="w-full border rounded-xl px-4 py-3" value={assignMatricule} onChange={e => setAssignMatricule(Number(e.target.value))}>
                     <option value="">Sélectionner...</option>
                     {monteurs.map(m => <option key={m.matricule} value={m.matricule}>{m.nom_monteur} ({m.role_monteur === 'CHEF_CHANTIER' ? 'Chef' : 'Monteur'})</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Date Entrée</label>
                    <input type="date" required className="border rounded-xl px-4 py-3 w-full" value={assignDateEntree} onChange={e => setAssignDateEntree(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Date Sortie</label>
                    <input type="date" required className="border rounded-xl px-4 py-3 w-full" value={assignDateSortie} onChange={e => setAssignDateSortie(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800">Valider Affectation</button>
             </form>
          </div>
        </div>
      )}

      {/* Modal Dépense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-800">Nouvelle Dépense</h3>
               <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddExpense} className="space-y-4 overflow-y-auto">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Type de dépense</label>
                   <select className="w-full border rounded-xl px-4 py-3" value={expenseFormData.type_cout} onChange={e => setExpenseFormData({...expenseFormData, type_cout: e.target.value as TypeCout})}>
                     <option value="transport_commun">Transport Commun (Car/Train)</option>
                     <option value="transport_local">Transport Local (Taxi/Navette)</option>
                     <option value="hebergement">Hébergement</option>
                     <option value="restauration">Restauration</option>
                     <option value="outillage_affecte">Outillage / Matériel</option>
                     <option value="sous_traitant">Sous-traitance</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Coût Unitaire</label>
                     <input type="number" required className="w-full border rounded-xl px-4 py-3" value={expenseFormData.cout_unitaire} onChange={e => setExpenseFormData({...expenseFormData, cout_unitaire: parseFloat(e.target.value)})} />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1">Quantité</label>
                     <input type="number" required className="w-full border rounded-xl px-4 py-3" value={expenseFormData.quantite} onChange={e => setExpenseFormData({...expenseFormData, quantite: parseFloat(e.target.value)})} />
                   </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Commentaire (Optionnel)</label>
                  <input type="text" className="w-full border rounded-xl px-4 py-3" placeholder="Ex: Achat urgence..." value={expenseFormData.commentaire} onChange={e => setExpenseFormData({...expenseFormData, commentaire: e.target.value})} />
                </div>
                <div className="bg-gray-100 p-3 rounded-lg text-center font-bold text-gray-700">
                   Total: {formatCurrency(expenseFormData.cout_unitaire * expenseFormData.quantite)}
                </div>
                <button type="submit" className="w-full py-3 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800">Enregistrer Dépense</button>
             </form>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-800">Encaisser Paiement</h3>
               <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddPayment} className="space-y-4 overflow-y-auto">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Montant (DH)</label>
                   <input type="number" required className="w-full border rounded-xl px-4 py-3 text-lg font-bold text-green-700" value={paymentFormData.montant} onChange={e => setPaymentFormData({...paymentFormData, montant: parseFloat(e.target.value)})} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                   <input type="date" required className="w-full border rounded-xl px-4 py-3" value={paymentFormData.date} onChange={e => setPaymentFormData({...paymentFormData, date: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Numéro de versement</label>
                   <input type="number" required className="w-full border rounded-xl px-4 py-3" value={paymentFormData.numero} onChange={e => setPaymentFormData({...paymentFormData, numero: parseInt(e.target.value)})} />
                </div>
                <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">Confirmer Paiement</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SiteDetail;
