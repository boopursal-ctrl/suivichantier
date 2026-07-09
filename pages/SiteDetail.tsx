




import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { LigneCout, AffectationMonteur, Versement, TypeCout, Chantier, MonteurLocal, StadeAvancement } from '../types';
import { formatCurrency, formatDate, countDays, countWorkDays, cn, getCityName } from '../utils';
import { ArrowLeft, Box, Truck, Plus, Trash2, Edit2, Wallet, Users, Banknote, Calendar, MapPin, CheckCircle2, AlertTriangle, X, FileText, Car, HardHat, Save, MessageSquare, Minus, Search, UserPlus, ArrowRight, Utensils, Home, TrendingUp, BarChart3, ShieldAlert } from 'lucide-react';
import { createContratAutomatique } from '../services/contratService';
import { useAuth } from '../contexts/AuthContext';
import AnalyseChantierPage from './AnalyseChantier';
import { mysqlService } from '../services/mysqlService';


interface SiteDetailProps {
  chantierId: string;
  onBack: () => void;
}



const SiteDetail: React.FC<SiteDetailProps> = ({ chantierId, onBack }) => {
  const { user } = useAuth();
  const {
    chantiers, lignesCouts, affectations, versements, monteurs, updateChantier,
    addAffectation, removeAffectation, updateAffectation, updateMonteur,
    addCout, deleteCout,
    addVersement, deleteVersement,
    interimaires, addInterimaire,
    stock, addMouvement, mouvements, articles, refreshData
  } = useData();

  // Data Fetching Helpers (Moved up for Unified view access)
  const chantier = chantiers.find(c => c.id_chantier === chantierId);
  const costs = lignesCouts.filter(c => c.id_chantier === chantierId);
  const workers = affectations.filter(a => a.id_chantier === chantierId);
  // We need to return early if no chantier, BUT hooks must run first.
  // UnifiedWorkers logic depends on valid chantier.
  // So we will handle the "if (!chantier)" check later or use optional chaining.

  const [activeTab, setActiveTab] = useState<'infos' | 'avancement' | 'equipe' | 'depenses' | 'paiements' | 'materiel'>('infos');
  const [showAnalyse, setShowAnalyse] = useState(false);

  // Avancement Modal State
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressForm, setProgressForm] = useState({
    stade: 'démarrage',
    pourcentage: 0,
    commentaire: ''
  });

  const [pointagesReels, setPointagesReels] = useState<any[]>([]);

  React.useEffect(() => {
    if (chantierId) {
      const loadData = async () => {
        try {
          const res = await mysqlService.query('get_all_pointages_chantier', { id_chantier: chantierId });
          if (Array.isArray(res)) setPointagesReels(res);
        } catch (e) {
          console.error("Erreur chargement pointages reels", e);
        }
      };
      loadData();
    }
  }, [chantierId]);

  // --- PERMANENT STAFF TO IGNORE IN CONTRACTS & DAILY WAGES ---
  const PERMANENT_MANAGEMENT_MATRICULES = [100, 101, 102, 103, 104, 157];

  // --- UNIFIED WORKER LOGIC START ---

  type WorkerType = 'PERMANENT' | 'INTERIMAIRE' | 'PREVU';

  interface UnifiedWorker {
    id: string; // unique key for list
    originalId: string; // real ID in db (matricule or uuid)
    type: WorkerType;
    matricule?: string | number;
    nom: string;
    cin?: string;
    cout_jour: number;
    date_debut: string;
    date_fin?: string;
    jours_prevus?: number; // pour interim
    jours_pointes?: number; // reel du terrain
    total_cost: number;
    relatedCosts?: number; // Pour affichage séparé
    originalObject: any; // Keep reference for actions
    ville_residence?: string;
  }

  // Merging Data for the Table
  const unifiedWorkers: UnifiedWorker[] = chantier ? [
    // 1. Permanent Staff (Affectations)
    ...workers.map(w => {
      const end = w.date_sortie || chantier.date_fin || new Date().toISOString().split('T')[0];
      const days = countWorkDays(w.date_entree, end);
      const relatedCosts = costs.filter(c => c.related_monteur_id === String(w.matricule)).reduce((s, c) => s + Number(c.montant_reel || 0), 0);

      // Find the monteur to get ville_residence
      const monteur = monteurs.find(m => m.matricule === w.matricule);

      return {
        id: `perm-${w.id_affectation}`,
        originalId: String(w.matricule),
        type: 'PERMANENT' as WorkerType,
        matricule: w.matricule,
        nom: w.nom_monteur,
        cout_jour: w.salaire_jour,
        date_debut: w.date_entree,
        date_fin: w.date_sortie,
        jours_prevus: days,
        jours_pointes: pointagesReels.filter(p => String(p.matricule) === String(w.matricule)).reduce((s, p) => s + Number(p.total_jours || 0), 0),
        total_cost: (PERMANENT_MANAGEMENT_MATRICULES.includes(Number(w.matricule)) ? 0 : (days * w.salaire_jour)) + relatedCosts,
        relatedCosts,
        originalObject: w,
        ville_residence: monteur?.ville_residence
      };
    }),
    // 2. Local/Interim (Monteurs Locaux)
    ...(chantier.monteurs_locaux || []).map(ml => {
      // Calculate expenses for this local worker
      const relatedCosts = costs.filter(c => c.related_monteur_id === ml.id).reduce((s, c) => s + Number(c.montant_reel || 0), 0);

      const startDate = ml.date_debut || chantier.date_debut || new Date().toISOString().split('T')[0];
      const endDate = ml.date_fin || chantier.date_fin || new Date().toISOString().split('T')[0];
      const days = Math.max(0, countWorkDays(startDate, endDate));

      return {
        id: ml.id,
        originalId: ml.id,
        type: (ml.type || (ml.cin ? 'INTERIMAIRE' : 'PREVU')) as WorkerType,
        matricule: undefined,
        nom: ml.nom_complet,
        cin: ml.cin,
        cout_jour: ml.salaire_jour,
        date_debut: startDate,
        date_fin: endDate,
        jours_prevus: days,
        jours_pointes: pointagesReels.filter(p => String(p.matricule) === String(ml.matricule || ml.cin)).reduce((s, p) => s + Number(p.total_jours || 0), 0),
        total_cost: (days * ml.salaire_jour) + relatedCosts,
        relatedCosts,
        originalObject: ml,
        ville_residence: ml.ville_residence // Pass through
      };
    })
  ] : [];

  // Unified Add Modal State
  const [isUnifiedAddModalOpen, setIsUnifiedAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null); // Found Monteur or Interimaire
  const [selectedWorkerType, setSelectedWorkerType] = useState<WorkerType>('INTERIMAIRE');
  const [newWorkerForm, setNewWorkerForm] = useState({
    nom: '',
    cin: '',
    salaire: 120,
    ville: '',
    matricule: 0 // For permanent selection
  });

  // Worker Detail Modal State
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<UnifiedWorker | null>(null);
  const [workerExpFilterStartDate, setWorkerExpFilterStartDate] = useState('');
  const [workerExpFilterEndDate, setWorkerExpFilterEndDate] = useState('');
  const [workerExpFilterSiteId, setWorkerExpFilterSiteId] = useState('ALL');
  const [workerExpFilterType, setWorkerExpFilterType] = useState('ALL');


  const resetUnifiedModal = () => {
    setAddStep(1);
    setSearchQuery('');
    setSearchResult(null);
    setSelectedWorkerType('INTERIMAIRE');
    setNewWorkerForm({ nom: '', cin: '', salaire: 120, matricule: 0 });
    setIsUnifiedAddModalOpen(false);
  };

  const handleSearchWorker = () => {
    const q = searchQuery.toUpperCase().trim();
    if (!q) return;

    // 1. Check Permanent (Loose matching for Matricule)
    const foundPerm = monteurs.find(m =>
      String(m.matricule) === q ||
      (m.cin && m.cin.toUpperCase() === q) ||
      (m.nom_monteur && m.nom_monteur.toUpperCase().includes(q)) // Added name search for convenience
    );

    if (foundPerm) {
      setSearchResult({ type: 'PERMANENT', data: foundPerm });
      setNewWorkerForm({ ...newWorkerForm, nom: foundPerm.nom_monteur, matricule: foundPerm.matricule, salaire: foundPerm.salaire_jour });
      return;
    }

    // 2. Check Interim List (Global)
    const foundInterim = interimaires.find(i =>
      i.cin.toUpperCase() === q ||
      i.nom_complet.toUpperCase().includes(q)
    );

    if (foundInterim) {
      if (foundInterim.is_blacklisted) {
        alert(`⛔️ ALERTE: ${foundInterim.nom_complet} est BLACKLISTÉ.\nMotif: ${foundInterim.blacklist_reason}`);
        return;
      }
      setSearchResult({ type: 'INTERIMAIRE', data: foundInterim });
      setNewWorkerForm({ ...newWorkerForm, nom: foundInterim.nom_complet, cin: foundInterim.cin, salaire: 120 });
      return;
    }

    // 3. Not Found
    setSearchResult(null);
  };

  const [isAddingWorker, setIsAddingWorker] = useState(false);

  const handleConfirmAddWorker = async () => {
    if (isAddingWorker) return;
    if (!chantier) return;

    setIsAddingWorker(true);

    try {
      // A. CAS PERMANENT
      if (selectedWorkerType === 'PERMANENT' || (searchResult && searchResult.type === 'PERMANENT')) {
        const matricule = searchResult ? searchResult.data.matricule : newWorkerForm.matricule;
        const monteur = monteurs.find(m => m.matricule == matricule);

        if (!monteur) {
          alert("❌ Collaborateur introuvable.");
          return;
        }

        const alreadyHere = unifiedWorkers.find(w => w.type === 'PERMANENT' && w.matricule === monteur.matricule);
        if (alreadyHere) {
          alert(`⛔️ ${monteur.nom_monteur} est DÉJÀ présent sur ce chantier.`);
          return;
        }

        const isBusy = affectations.some(a => a.matricule === monteur.matricule && (!a.date_sortie || a.date_sortie >= (chantier.date_debut || '')));
        if (isBusy && !confirm(`⚠️ ${monteur.nom_monteur} est déjà affecté ailleurs. Réaffecter ?`)) {
          return;
        }

        const startDate = chantier.date_debut || new Date().toISOString().split('T')[0];
        await addAffectation({
          id_affectation: `aff-${Date.now()}`,
          id_chantier: chantierId,
          matricule: monteur.matricule,
          nom_monteur: monteur.nom_monteur,
          salaire_jour: monteur.salaire_jour,
          zone_travail: chantier.ville_code,
          date_entree: startDate,
          date_sortie: chantier.date_fin,
          jours_arret: 0
        });

        // Création automatique du contrat (silencieuse)
        try {
          await createContratAutomatique(monteur, chantier, user?.email);
        } catch (e) {
          console.warn("Contrat non créé:", e);
        }

        alert(`✅ ${monteur.nom_monteur} ajouté avec succès !`);
        resetUnifiedModal();

      // B. CAS INTERIMAIRE / PREVU
      } else {
        const cin = newWorkerForm.cin?.toUpperCase().trim() || '';
        const name = newWorkerForm.nom;

        if (!name) {
          alert("Le nom est obligatoire");
          return;
        }

        if (cin) {
          const already = unifiedWorkers.find(w => w.cin === cin);
          if (already) {
            alert(`⛔️ CIN ${cin} déjà présent.`);
            return;
          }
          const interimToCheck = searchResult?.type === 'INTERIMAIRE' ? searchResult.data : interimaires.find(i => i.cin.toUpperCase() === cin);
          if (interimToCheck?.is_blacklisted) {
            alert(`❌ ${interimToCheck.nom_complet} est BLACKLISTÉ.\nMotif: ${interimToCheck.blacklist_reason}`);
            return;
          }
          if (!interimToCheck && selectedWorkerType === 'INTERIMAIRE') {
            try {
              await addInterimaire({ id: crypto.randomUUID(), cin, nom_complet: name, is_blacklisted: false });
            } catch (e) { console.warn("Création interim échouée", e); }
          }
        } else {
          const already = unifiedWorkers.find(w => w.nom.toUpperCase() === name.toUpperCase());
          if (already && !confirm(`⚠️ "${name}" existe déjà. Continuer ?`)) return;
        }

        const startDate = chantier.date_debut || new Date().toISOString().split('T')[0];
        const endDate = chantier.date_fin;
        const initialDays = countWorkDays(startDate, endDate || new Date().toISOString().split('T')[0]);

        const newLocal: MonteurLocal = {
          id: `ml-${Date.now()}`,
          nom_complet: name,
          cin: cin,
          salaire_jour: Number(newWorkerForm.salaire) || 120,
          jours_travailles: initialDays,
          date_debut: startDate,
          date_fin: endDate,
          ville_residence: newWorkerForm.ville || '',
          type: selectedWorkerType === 'PREVU' ? 'PREVU' : 'INTERIMAIRE'
        };

        await updateChantier({ ...chantier, monteurs_locaux: [...(chantier.monteurs_locaux || []), newLocal] });
        alert(`✅ ${name} ajouté avec succès !`);
        resetUnifiedModal();
      }
    } catch (err: any) {
      console.error("Erreur handleConfirmAddWorker:", err);
      alert("Erreur: " + err.message);
    } finally {
      setIsAddingWorker(false);
    }
  };


  // ACTIONS
  // ACTIONS
  const [adjustDaysModalState, setAdjustDaysModalState] = useState<{
    isOpen: boolean;
    worker: UnifiedWorker | null;
    amount: number;
    mode: 'STANDARD' | 'SPECIAL';
    customPrice: number;
    comment: string;
  }>({
    isOpen: false,
    worker: null,
    amount: 0,
    mode: 'STANDARD',
    customPrice: 0,
    comment: ''
  });

  // HANDLERS FOR DATES & DAYS
  const handleUpdateWorkerDate = async (worker: UnifiedWorker, field: 'start' | 'end', value: string) => {
    if (!chantier) return;

    if (worker.type === 'PERMANENT') {
      // Update Affectation
      const aff = worker.originalObject as AffectationMonteur;
      const updates: any = {};
      if (field === 'start') updates.date_entree = value;
      if (field === 'end') updates.date_sortie = value;

      await updateAffectation({ ...aff, ...updates });

    } else {
      // Update Local Worker
      const updatedList = (chantier.monteurs_locaux || []).map(ml => {
        if (ml.id === worker.originalId) {
          return {
            ...ml,
            date_debut: field === 'start' ? value : (ml.date_debut || chantier.date_debut),
            date_fin: field === 'end' ? value : (ml.date_fin || chantier.date_fin)
          };
        }
        return ml;
      });
      await updateChantier({ ...chantier, monteurs_locaux: updatedList });
    }
  };

  const handleModifyDays = (worker: UnifiedWorker, amount: number) => {
    if (!chantier) return;

    // Special Case: "Heures Supp" (via Modal) -> Still allow Price override, 
    // BUT we treat this as a separate Cost, not extending the dates.
    // Use SHIFT key or specific UI for "Extend Mission" vs "Add Overtime Expense"?
    // The user requirement says: "La durée d'un monteur est prolongée suite à un retard".
    // AND "Adjust individually".
    // So +/- buttons should primarily adjust DATES (Extend End Date).

    // If amount is positive and we want "Overtime Cost" specifically (not days), 
    // we should probably keep a separate "+ HS" button or similar.
    // User requested: "Actions: Boutons "+" / "-" Jours pour ajuster rapidement la durée".

    // New Logic: +/- modifies the End Date.
    // Use fallback to chantier date if worker date is missing
    const currentEndStr = worker.date_fin || chantier.date_fin || new Date().toISOString().split('T')[0];
    const currentEnd = new Date(currentEndStr);
    currentEnd.setDate(currentEnd.getDate() + amount);
    const newDateStr = currentEnd.toISOString().split('T')[0];

    handleUpdateWorkerDate(worker, 'end', newDateStr);

    // If needed, we can keep the "Special / HS" modal on a separate "frais" button or check if user wants HS.
    // For now, simple date extension is the requested "Duration Adjustment".
  };

  // Keep the Modal for explicit "Special Rate" / "Overtime" addition separate if needed.
  // Actually, let's add a specialized button for "HS/Prime" in the actions column instead of hijacking +/-.
  // Placeholder to avoiding actual replace until I view.
  // ... (Adjusted below) ...



  const confirmAdjustDays = () => {
    const { worker, amount, mode, customPrice, comment } = adjustDaysModalState;
    if (!worker || !chantier) return;

    if (mode === 'STANDARD') {
      const newDays = (worker.jours_prevus || 0) + amount;
      const updatedList = (chantier.monteurs_locaux || []).map(ml => ml.id === worker.originalId ? { ...ml, jours_travailles: newDays } : ml);
      updateChantier({ ...chantier, monteurs_locaux: updatedList });
    } else {
      // Special Rate -> Add Cost
      try {
        addCout({
          id_cout: `cout-hs-${Date.now()}`,
          id_chantier: chantierId,
          // Use 'autre' or 'sous_traitant' to avoid DB constraint issues if 'main_doeuvre_extra' is not in enum
          type_cout: 'autre',
          cout_unitaire: Number(customPrice),
          quantite: amount,
          montant_reel: Number(customPrice) * amount,
          montant_prevu: Number(customPrice) * amount,
          commentaire: `[HS] ${comment} (${worker.nom})`,
          related_monteur_id: worker.type === 'PERMANENT' ? String(worker.matricule) : worker.id,
          statut: 'validé'
        });
        alert("✅ Frais supplémentaire ajouté avec succès !");
      } catch (err: any) {
        console.error(err);
        alert("❌ Erreur lors de l'ajout du frais : " + (err.message || "Erreur inconnue"));
      }
    }
    setAdjustDaysModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleUpdateWorkerSalary = async (worker: UnifiedWorker, newSalary: number) => {
    if (!chantier) return;

    if (worker.type === 'PERMANENT') {
      const monteur = monteurs.find(m => m.matricule === worker.matricule);
      if (monteur) {
        await updateMonteur({ ...monteur, salaire_base: newSalary });
      }
    } else {
      const updatedList = (chantier.monteurs_locaux || []).map(ml => {
        if (ml.id === worker.originalId) {
          return { ...ml, salaire_jour: newSalary };
        }
        return ml;
      });
      await updateChantier({ ...chantier, monteurs_locaux: updatedList });

      // Update globally if CIN exists
      if (worker.cin) {
        const interimaire = interimaires.find(i => i.cin === worker.cin);
        if (interimaire) {
          // You might have a way to update interimaire salary globally here if needed
        }
      }
    }
  };

  // --- UNIFIED WORKER LOGIC END ---

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
    documents_at_rc: false,
    date_debut: '',
    date_fin: '',
    responsable_chantier: '',
    chef_chantier: '',
    budget_prevu: 0
  });

  // Local Worker Form
  const [localWorkerForm, setLocalWorkerForm] = useState<Partial<MonteurLocal>>({
    nom_complet: '',
    cin: '',
    salaire_jour: 120, // Default Default Value for Interim
    jours_travailles: chantier?.duree_prevue || 0
  });

  const [expenseFormData, setExpenseFormData] = useState({
    type_cout: 'transport_local' as TypeCout,
    montant_reel: 0,
    cout_unitaire: 0,
    quantite: 1,
    commentaire: '',
    related_monteur_id: ''
  });

  // Tool Assignment Modal State
  const [isToolAssignModalOpen, setIsToolAssignModalOpen] = useState(false);
  const [toolAssignForm, setToolAssignForm] = useState({
    worker_id: '',
    worker_name: '',
    tool_id: '',
    tool_name: '',
    quantity: 1,
    comment: ''
  });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    workerId: '', // id_affectation OR local_id
    workerType: 'PERMANENT' as WorkerType,
    monteurName: '',
    matricule: 0,
    targetChantierId: '',
    dateTransfert: new Date().toISOString().split('T')[0],
    originalWorkerData: null as any
  });

  // INDEMNITIES STATE
  const [isIndemnityModalOpen, setIsIndemnityModalOpen] = useState(false);
  const [indemnityForm, setIndemnityForm] = useState({
    workerId: '',
    workerName: '',
    days: 0,
    transportRate: 20,
    transportTotal: 0,
    transportVoyageTotal: 0,
    repasRate: 70,
    repasTotal: 0,
    hebergementRate: 100,
    hebergementTotal: 0,
    isSameCity: false,
    city: ''
  });

  const handleOpenIndemnities = (worker: UnifiedWorker) => {
    if (!chantier) return;

    // Normalize Cities
    const workerCity = (worker.ville_residence || '').trim().toLowerCase();
    const siteCityRaw = chantier.ville_code || '';
    const siteCityName = getCityName(siteCityRaw).toLowerCase();

    const isSameCity = workerCity === siteCityRaw.toLowerCase() || workerCity === siteCityName;

    // Determine Days (Work days only)
    const startDate = worker.date_debut || chantier.date_debut || new Date().toISOString().split('T')[0];
    const endDate = worker.date_fin || chantier.date_fin || new Date().toISOString().split('T')[0];
    const days = worker.jours_prevus || countWorkDays(startDate, endDate);

    // Rates
    // Transport: 50 if different city, 25 if same
    // Hebergement: 100 if diff, 0 if same (Rule applied strictly for ALL types)
    const transportLocalRate = isSameCity ? 0 : 20;
    const transportVoyageRate = isSameCity ? 0 : 120;
    const repasRate = isSameCity ? 0 : 70;
    const hebergementRate = isSameCity ? 0 : 100;

    setIndemnityForm({
      workerId: worker.type === 'PERMANENT' ? String(worker.matricule) : worker.id,
      workerName: worker.nom,
      days: days,
      transportRate: transportLocalRate,
      transportTotal: days * transportLocalRate,
      transportVoyageTotal: transportVoyageRate,
      repasRate: repasRate,
      repasTotal: days * repasRate,
      hebergementRate: hebergementRate,
      hebergementTotal: days * hebergementRate,
      isSameCity,
      city: worker.ville_residence || '?'
    });
    setIsIndemnityModalOpen(true);
  };

  const handleConfirmIndemnities = async () => {
    // Create Expenses
    const commonData = {
      id_chantier: chantierId,
      related_monteur_id: String(indemnityForm.workerId),
      date_cout: new Date().toISOString().split('T')[0]
    };

    // 1. Transport Local
    if (indemnityForm.transportTotal > 0) {
      await addCout({
        ...commonData,
        id_cout: `ind-tr-${crypto.randomUUID()}`,
        type_cout: 'transport_local',
        montant_prevu: indemnityForm.transportTotal,
        montant_reel: indemnityForm.transportTotal,
        cout_unitaire: indemnityForm.transportRate,
        quantite: indemnityForm.days,
        commentaire: `Indemnité Transport Local (${indemnityForm.days}j)`,
        statut: 'validé'
      });
    }

    // 1b. Transport Voyage (En commun)
    if (indemnityForm.transportVoyageTotal > 0) {
      await addCout({
        ...commonData,
        id_cout: `ind-trv-${crypto.randomUUID()}`,
        type_cout: 'transport_commun',
        montant_prevu: indemnityForm.transportVoyageTotal,
        montant_reel: indemnityForm.transportVoyageTotal,
        cout_unitaire: 120,
        quantite: 1,
        commentaire: `Transport en Commun (Voyage)`,
        statut: 'validé'
      });
    }

    // 2. Repas
    if (indemnityForm.repasTotal > 0) {
      await addCout({
        ...commonData,
        id_cout: `ind-rep-${crypto.randomUUID()}`,
        type_cout: 'repas',
        montant_prevu: indemnityForm.repasTotal,
        montant_reel: indemnityForm.repasTotal,
        cout_unitaire: indemnityForm.repasRate,
        quantite: indemnityForm.days,
        commentaire: `Indemnité Repas (${indemnityForm.days}j)`,
        statut: 'validé'
      });
    }

    // 3. Hébergement
    if (indemnityForm.hebergementTotal > 0) {
      await addCout({
        ...commonData,
        id_cout: `ind-heb-${crypto.randomUUID()}`,
        type_cout: 'hebergement',
        montant_prevu: indemnityForm.hebergementTotal,
        montant_reel: indemnityForm.hebergementTotal,
        cout_unitaire: indemnityForm.hebergementRate,
        quantite: indemnityForm.days,
        commentaire: `Indemnité Hébergement (${indemnityForm.days}j)`,
        statut: 'validé'
      });
    }

    setIsIndemnityModalOpen(false);
    toast.success("✅ Indemnités enregistrées.");
    
    // Refresh data properly
    await refreshData();
  };

  const openAddExtrasModal = (worker: UnifiedWorker) => {
    setExpenseFormData({
      type_cout: 'heures_supp',
      montant_reel: 0,
      cout_unitaire: 0,
      quantite: 1,
      commentaire: `HS pour ${worker.nom}`,
      related_monteur_id: worker.type === 'PERMANENT' ? String(worker.matricule) : worker.id
    });
    setIsExpenseModalOpen(true);
  };

  const handleOpenToolAssign = (worker: UnifiedWorker) => {
    setToolAssignForm({
      worker_id: worker.type === 'PERMANENT' ? String(worker.matricule) : worker.id,
      worker_name: worker.nom,
      tool_id: '',
      tool_name: '',
      quantity: 1,
      comment: `Outillage affecté à ${worker.nom}`
    });
    setIsToolAssignModalOpen(true);
  };

  const [paymentFormData, setPaymentFormData] = useState({
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    numero: 1
  });

  // Data Fetching
  // chantier, costs, workers are moved to top
  const siteVersements = versements.filter(v => v.id_chantier === chantierId);

  if (!chantier) return <div>Chantier introuvable</div>;

  // Calculations Refondus

  // 1. Dépenses par Catégorie (Basé sur 'costs')
  const totalTransport = costs
    .filter(c => ['transport', 'transport_local', 'indemnite_deplacement'].includes(c.type_cout))
    .reduce((sum, c) => sum + Number(c.montant_reel || 0), 0);

  const totalRepas = costs
    .filter(c => ['repas', 'indemnite_repas'].includes(c.type_cout))
    .reduce((sum, c) => sum + Number(c.montant_reel || 0), 0);

  const totalHebergement = costs
    .filter(c => ['hebergement', 'indemnite_logement'].includes(c.type_cout))
    .reduce((sum, c) => sum + Number(c.montant_reel || 0), 0);

  const totalAutresFrais = costs
    .filter(c => !['transport', 'transport_local', 'indemnite_deplacement',
      'repas', 'indemnite_repas',
      'hebergement', 'indemnite_logement'].includes(c.type_cout))
    .reduce((sum, c) => sum + Number(c.montant_reel || 0), 0);

  const totalDepensesDirectes = totalTransport + totalRepas + totalHebergement + totalAutresFrais;

  // 2. Main d'Oeuvre (Via UnifiedWorkers)
  // FIXED: Avoid Double Counting! UnifiedWorkers.total_cost includes related costs. 
  // We want ONLY SALARIES here because costs are already summed in totalDepensesDirectes.
  const totalSalaires = unifiedWorkers.reduce((acc, worker) => {
    // total_cost = (days * rate) + relatedCosts
    const salaryPart = (worker.total_cost || 0) - (worker.relatedCosts || 0);
    return acc + salaryPart;
  }, 0);

  // 3. Stock Cost (Opérationnel plus tard)
  const totalStockCost = 0;

  // BUDGET GLOBAL
  const budgetDepense = totalDepensesDirectes + totalSalaires + totalStockCost;

  // Pour rétro-compatibilité si variables utilisées ailleurs (même si on nettoie)
  const totalMainDoeuvreAffectee = 0;
  const totalMainDoeuvreLocale = 0;
  const totalFraisHebergementAuto = 0; // Removed feature

  const totalVersements = siteVersements.reduce((sum, v) => sum + Number(v.montant || 0), 0);
  const soldeNet = totalVersements - budgetDepense; // Solde Trésorerie

  // Handlers
  const handleEditInfoOpen = () => {
    setInfoFormData({
      plan_reference: chantier.plan_reference || '',
      vehicule_utilise: chantier.vehicule_utilise,
      documents_at_rc: chantier.documents_at_rc,
      date_debut: chantier.date_debut || '',
      date_fin: chantier.date_fin || '',
      responsable_chantier: chantier.responsable_chantier || '',
      chef_chantier: chantier.chef_chantier || '',
      budget_prevu: chantier.budget_prevu || 0
    });
    setIsEditInfoModalOpen(true);
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();

    // Recalculate duration if dates provided
    let newDuree = chantier.duree_prevue;
    if (infoFormData.date_debut && infoFormData.date_fin) {
      newDuree = countWorkDays(infoFormData.date_debut, infoFormData.date_fin);
    }

    // Auto-activate if dates are set and it was instance
    let newStatut = chantier.statut;
    if (infoFormData.date_debut && infoFormData.date_fin && newStatut === 'en_instance') {
      newStatut = 'actif';
    }

    updateChantier({
      ...chantier,
      ...infoFormData,
      duree_prevue: newDuree,
      statut: newStatut
    });
    setIsEditInfoModalOpen(false);
  };

  const handleOpenProgressModal = () => {
    if (!chantier) return;
    setProgressForm({
      stade: chantier.stade_avancement || 'démarrage',
      pourcentage: chantier.taux_avancement || 0,
      commentaire: ''
    });
    setIsProgressModalOpen(true);
  };

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chantier) return;

    const newHistory = [
      {
        date: new Date().toISOString().split('T')[0],
        pourcentage: progressForm.pourcentage,
        stade: progressForm.stade as any,
        commentaire: progressForm.commentaire
      },
      ...(chantier.historique_avancement || [])
    ];

    updateChantier({
      ...chantier,
      taux_avancement: progressForm.pourcentage,
      stade_avancement: progressForm.stade as any,
      historique_avancement: newHistory
    });
    setIsProgressModalOpen(false);
  };

  const handleAddLocalWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localWorkerForm.nom_complet || !localWorkerForm.salaire_jour) return;

    const cin = localWorkerForm.cin?.toUpperCase().trim() || '';

    // 1. Check Blacklist / Existence Logic if CIN provided
    if (cin) {
      const existingInterim = interimaires.find(i => i.cin.toUpperCase() === cin);

      if (existingInterim) {
        if (existingInterim.is_blacklisted) {
          alert(`⛔️ ATTENTION : Cet intérimaire est blacklisté!\nMotif : ${existingInterim.blacklist_reason}\n\nAjout impossible.`);
          return;
        }
      } else {
        // New Profile -> Register in global DB
        try {
          await addInterimaire({
            id: crypto.randomUUID(),
            cin: cin,
            nom_complet: localWorkerForm.nom_complet || '',
            is_blacklisted: false
          });
        } catch (err) {
          console.error("Failed to register new interim globally", err);
          // Verify if duplicate error, if so ignore
        }
      }
    }

    // 2. Add to Chantier Local List
    const newWorker: MonteurLocal = {
      id: `ml - ${Date.now()}`,
      nom_complet: localWorkerForm.nom_complet || '',
      cin: cin,
      salaire_jour: localWorkerForm.salaire_jour || 120,
      jours_travailles: localWorkerForm.jours_travailles || chantier.duree_prevue || 0
    };

    const updatedList = [...(chantier.monteurs_locaux || []), newWorker];
    updateChantier({
      ...chantier,
      monteurs_locaux: updatedList
    });
    setIsLocalWorkerModalOpen(false);
    setLocalWorkerForm({ nom_complet: '', cin: '', salaire_jour: 120, jours_travailles: 0 });
  };

  const handleDeleteLocalWorker = (id: string) => {
    // Confirmation handled by caller
    const updatedList = (chantier.monteurs_locaux || []).filter(ml => ml.id !== id);
    updateChantier({
      ...chantier,
      monteurs_locaux: updatedList
    });
  };

  const handleAdjustLocalWorkerDays = (id: string, amount: number) => {
    const updatedList = (chantier.monteurs_locaux || []).map(ml => {
      if (ml.id === id) {
        const newDays = Math.max(0, ml.jours_travailles + amount);
        return { ...ml, jours_travailles: newDays };
      }
      return ml;
    });

    updateChantier({
      ...chantier,
      monteurs_locaux: updatedList
    });
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignMatricule || !assignDateEntree) return; // Date Sortie not required initially
    const monteur = monteurs.find(m => m.matricule === Number(assignMatricule));
    if (!monteur) return;

    // --- CHECK DOUBLE AFFECTATION ---
    // Trouver si ce monteur a déjà une affectation active ou qui chevauche
    const existingAssigns = affectations.filter(a => a.matricule === Number(assignMatricule) && a.id_chantier !== chantierId);

    const hasConflict = existingAssigns.some(existing => {
      const exStart = new Date(existing.date_entree).getTime();
      const exEnd = existing.date_sortie ? new Date(existing.date_sortie).getTime() : Infinity; // Active = Infinity

      const newStart = new Date(assignDateEntree).getTime();
      const newEnd = assignDateSortie ? new Date(assignDateSortie).getTime() : Infinity;

      // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
      return (exStart <= newEnd) && (exEnd >= newStart);
    });

    if (hasConflict) {
      alert("⚠️ Ce collaborateur est déjà affecté sur un autre chantier pendant cette période !");
      return;
    }
    // --------------------------------

    addAffectation({
      id_affectation: `aff - ${Date.now()}`,
      id_chantier: chantierId,
      matricule: monteur.matricule,
      nom_monteur: monteur.nom_monteur,
      salaire_jour: monteur.salaire_jour,
      zone_travail: chantier.ville_code,
      date_entree: assignDateEntree,
      date_sortie: assignDateSortie || undefined,
      jours_arret: 0
    });
    setIsAssignModalOpen(false);
  };

  const handleEndMission = (affectation: any) => {
    const dateFin = prompt("Date de fin de mission (YYYY-MM-DD) :", new Date().toISOString().split('T')[0]);
    if (dateFin) {
      updateAffectation({
        ...affectation,
        date_sortie: dateFin
      });
    }
  };

  const handleOpenTransfer = (worker: UnifiedWorker) => {
    setTransferData({
      workerId: worker.id, // We use the unified ID or original ID? Used for lookup.
      workerType: worker.type,
      monteurName: worker.nom,
      matricule: Number(worker.matricule) || 0,
      targetChantierId: '',
      dateTransfert: new Date().toISOString().split('T')[0],
      originalWorkerData: worker.originalObject
    });
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.targetChantierId || !transferData.dateTransfert) return;

    if (transferData.workerType === 'PERMANENT') {
      // PERMANENT LOGIC
      const currentAff = affectations.find(a => String(a.id_affectation) === String(transferData.workerId) || String(a.id_affectation) === String(transferData.originalWorkerData.id_affectation));

      if (currentAff) {
        // 1. Close current
        await updateAffectation({
          ...currentAff,
          date_sortie: transferData.dateTransfert
        });
      }

      // 2. Create new
      addAffectation({
        id_affectation: `aff - ${Date.now()}`, // Generate new ID for new affectation
        id_chantier: transferData.targetChantierId,
        matricule: transferData.matricule,
        nom_monteur: transferData.monteurName,
        role_monteur: currentAff?.role_monteur || 'Autre', // Fallback
        salaire_jour: currentAff?.salaire_jour || 120, // Fallback
        zone_travail: chantiers.find(c => c.id_chantier === transferData.targetChantierId)?.ville_code || '', // Get target chantier's city code
        date_entree: transferData.dateTransfert,
        jours_arret: 0
      });

    } else {
      // LOCAL / INTERIM LOGIC
      // 1. Remove from current chantier
      await handleDeleteLocalWorker(transferData.originalWorkerData.id);

      // 2. Add to target Chantier
      const targetChantier = chantiers.find(c => c.id_chantier === transferData.targetChantierId);
      if (targetChantier) {
        const newLocal: MonteurLocal = {
          ...transferData.originalWorkerData,
          id: `ml - trans - ${Date.now()}`, // New ID to avoid conflicts
          date_debut: transferData.dateTransfert,
          date_fin: targetChantier.date_fin || transferData.dateTransfert, // Reset dates to target defaults
          jours_travailles: 0 // Reset days
        };

        const updatedLocals = [...(targetChantier.monteurs_locaux || []), newLocal];
        await updateChantier({ ...targetChantier, monteurs_locaux: updatedLocals });
      }
    }

    setIsTransferModalOpen(false);
    alert(`Transfert de ${transferData.monteurName} effectué avec succès!`);
  };

  /*
  const handleOpenTransfer = (aff: AffectationMonteur) => { ... } 
  REMOVED - Superseded by new Transfer Logic above
  */

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto calculate montant reel if not manually set but unit/qty are there
    const calculatedTotal = expenseFormData.cout_unitaire * expenseFormData.quantite;

    addCout({
      id_cout: `cout - ${Date.now()}`,
      id_chantier: chantierId,
      type_cout: expenseFormData.type_cout,
      cout_unitaire: expenseFormData.cout_unitaire,
      quantite: expenseFormData.quantite,
      montant_reel: calculatedTotal,
      montant_prevu: calculatedTotal, // Assuming forecast = real for ad-hoc adds
      commentaire: expenseFormData.commentaire,
      related_monteur_id: expenseFormData.related_monteur_id || undefined,
      statut: 'validé'
    });
    setIsExpenseModalOpen(false);
    setExpenseFormData({ type_cout: 'transport_local', montant_reel: 0, cout_unitaire: 0, quantite: 1, commentaire: '', related_monteur_id: '' });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    addVersement({
      id_versement: `v - ${Date.now()}`,
      id_chantier: chantierId,
      montant: paymentFormData.montant,
      date: paymentFormData.date,
      numero: paymentFormData.numero
    });
    setIsPaymentModalOpen(false);
  };

  // Si on affiche l'analyse, on affiche uniquement cette page
  if (showAnalyse) {
    return (
      <AnalyseChantierPage
        chantierId={chantierId}
        onBack={() => setShowAnalyse(false)}
      />
    );
  }

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
        <div className="ml-auto flex items-center gap-3">
          {(chantier.statut?.toLowerCase() === 'terminé' || chantier.taux_avancement === 100) && (
            <button
              onClick={() => setShowAnalyse(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              Générer Analyse
            </button>
          )}
          <span className={`px-4 py-2 rounded-full font-bold text-sm ${(chantier.statut?.toLowerCase() === 'terminé' || chantier.taux_avancement === 100) ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
            {(chantier.statut?.toLowerCase() === 'terminé' || chantier.taux_avancement === 100) ? 'TERMINÉ' : chantier.statut.toUpperCase()}
          </span>
        </div>
      </div>

      {/* LIVE FINANCIAL DASHBOARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 relative overflow-hidden">
        {/* Background Accent - Blue for neutral accumulation */}
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Wallet className="mr-2 text-blue-700" /> Coût Actuel du Chantier
            </h2>
            <p className="text-gray-500 text-sm mt-1">Cumul des dépenses et charges à ce jour</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Démarré le</span>
            <span className="text-lg font-bold text-gray-700">{formatDate(chantier.date_debut)}</span>
          </div>
        </div>

        {/* Total Cost Section */}
        <div className="mb-8 flex items-end gap-4">
          <div>
            <span className="text-4xl font-black text-gray-900 tracking-tight block">
              {formatCurrency(budgetDepense)}
            </span>
            <span className="text-xs font-bold text-gray-500 uppercase">Total Coûts Engagés</span>
          </div>
          {totalVersements > 0 && (
            <div className="mb-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
              Couvert à {Math.round((totalVersements / (budgetDepense || 1)) * 100)}% par les encaissements
            </div>
          )}
        </div>

        {/* Detailed Breakdown */}
        {/* Detailed Breakdown - New Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

          {/* 1. Main d'oeuvre */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-blue-800 uppercase font-black">Main d'œuvre</p>
              <Users size={14} className="text-blue-400" />
            </div>
            <p className="text-base font-bold text-slate-800">{formatCurrency(totalSalaires)}</p>
            <p className="text-[9px] text-blue-600/70 mt-0.5">Salaires cumulés</p>
          </div>

          {/* 2. Transport */}
          <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-orange-800 uppercase font-black">Transport</p>
              <Car size={14} className="text-orange-400" />
            </div>
            <p className="text-base font-bold text-slate-800">{formatCurrency(totalTransport)}</p>
            <p className="text-[9px] text-orange-600/70 mt-0.5">Carburant, Indemnités</p>
          </div>

          {/* 3. Restauration */}
          <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-red-800 uppercase font-black">Restauration</p>
              <Utensils size={14} className="text-red-400" />
            </div>
            <p className="text-base font-bold text-slate-800">{formatCurrency(totalRepas)}</p>
            <p className="text-[9px] text-red-600/70 mt-0.5">Repas, Indemnités</p>
          </div>

          {/* 4. Hébergement */}
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-indigo-800 uppercase font-black">Hébergement</p>
              <Home size={14} className="text-indigo-400" />
            </div>
            <p className="text-base font-bold text-slate-800">{formatCurrency(totalHebergement)}</p>
            <p className="text-[9px] text-indigo-600/70 mt-0.5">Loyers, Hôtels</p>
          </div>

          {/* 5. ACOMPTE & ARGENT DEHORS (NOUVEAU) */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 relative overflow-hidden">
             <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-emerald-800 uppercase font-black">Total Acompte</p>
              <Banknote size={14} className="text-emerald-400" />
            </div>
            <p className="text-base font-bold text-emerald-900">{formatCurrency(totalVersements)}</p>
            <div className="mt-2 pt-2 border-t border-emerald-100">
              <p className="text-[9px] text-emerald-600 uppercase font-black">
                {(totalVersements - totalDepensesDirectes) >= 0 ? 'Argent "Dehors"' : 'Solde Négatif (À rembourser)'}
              </p>
              <p className={cn("text-sm font-black", (totalVersements - totalDepensesDirectes) >= 0 ? "text-emerald-700" : "text-red-600")}>
                {formatCurrency(totalVersements - totalDepensesDirectes)}
              </p>
            </div>
          </div>
        </div>

        {/* RISK ANALYSIS SECTION */}
        {(() => {
          if (!chantier.budget_prevu || chantier.budget_prevu <= 0) return null;

          const budgetConsommationPercent = (budgetDepense / chantier.budget_prevu) * 100;
          const physicalProgress = chantier.taux_avancement || 0;
          const riskFactor = budgetConsommationPercent - physicalProgress;
          
          if (riskFactor > 10) {
            return (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 animate-pulse">
                <div className="bg-red-500 text-white p-2 rounded-xl">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <p className="text-red-800 font-bold text-sm uppercase">Alerte Risque Critique</p>
                  <p className="text-red-600 text-xs font-medium">
                    La consommation budgétaire ({budgetConsommationPercent.toFixed(0)}%) dépasse largement l'avancement physique ({physicalProgress}%). 
                    Écart de risque : <span className="font-black">+{riskFactor.toFixed(1)}%</span>
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Autres Frais (s'il y en a) */}
        {totalAutresFrais > 0 && (
          <div className="mt-4 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-xs text-gray-500">
            <span>+ Autres Frais (Matériel, Divers, Primes, HS...)</span>
            <span className="font-bold text-gray-700">{formatCurrency(totalAutresFrais)}</span>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-1 mb-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {[
          { id: 'infos', label: 'Infos', icon: CheckCircle2 },
          { id: 'avancement', label: 'Avancement', icon: TrendingUp },
          { id: 'equipe', label: 'Équipe & RH', icon: Users },
          { id: 'materiel', label: 'Matériel', icon: Box },
          { id: 'depenses', label: 'Dépenses', icon: Wallet },
          { id: 'paiements', label: 'Acomptes', icon: Banknote }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center px-6 py-4 font-bold text-sm rounded-t-xl transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-white text-red-700 border-t border-x border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] translate-y-[1px]'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }
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
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold text-gray-800">Détails & Logistique du Projet</h3>
              <button
                onClick={handleEditInfoOpen}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 font-bold flex items-center"
              >
                <Edit2 size={16} className="mr-2" /> Modifier les informations
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Period Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group">
                <div className="flex items-center gap-3 text-blue-600">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Calendar size={20} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Période du Projet</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatDate(chantier.date_debut)} — {formatDate(chantier.date_fin)}</p>
                  <p className="text-sm font-medium text-gray-500 mt-1">{countWorkDays(chantier.date_debut, chantier.date_fin)} Jours de prestation (Hormis Weekend)</p>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group">
                <div className="flex items-center gap-3 text-emerald-600">
                  <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <MapPin size={20} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Localisation</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{getCityName(chantier.ville_code)}</p>
                  <p className="text-sm font-medium text-gray-500 mt-1">{chantier.adresse || 'Ville: ' + chantier.ville_code}</p>
                </div>
              </div>

              {/* Responsible Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group">
                <div className="flex items-center gap-3 text-purple-600">
                  <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Users size={20} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Sous Chef de Chantier</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{chantier.responsable_chantier}</p>
                  <p className="text-sm font-medium text-gray-500 mt-1">Sous chef de chantier affecté</p>
                </div>
              </div>

              {/* Reference Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group">
                <div className="flex items-center gap-3 text-amber-600">
                  <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                    <FileText size={20} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Référence Technique</span>
                </div>
                <div>
                  <p className="font-mono text-lg font-black text-slate-800 break-all">{chantier.plan_reference || 'N/A'}</p>
                  <p className="text-sm font-medium text-gray-500 mt-1">Identifiant plan / dossier</p>
                </div>
              </div>

              {/* Vehicle Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                    <Car size={20} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Moyens Logistiques</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{chantier.vehicule_utilise ? 'Véhicule Société' : 'Pas de véhicule'}</p>
                  <p className="text-sm font-medium text-gray-500 mt-1">Affectation de transport</p>
                </div>
              </div>

              {/* Documents Card */}
              <div className={cn(
                "p-5 rounded-2xl border shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 group",
                chantier.documents_at_rc ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
              )}>
                <div className={cn("flex items-center gap-3", chantier.documents_at_rc ? 'text-green-600' : 'text-red-600')}>
                  <div className={cn("p-2 rounded-lg transition-colors", chantier.documents_at_rc ? 'bg-white group-hover:bg-green-100' : 'bg-white group-hover:bg-red-100')}>
                    {chantier.documents_at_rc ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Habilitations AT/RC</span>
                </div>
                <div>
                  <p className={cn("text-lg font-bold", chantier.documents_at_rc ? 'text-green-700' : 'text-red-700')}>
                    {chantier.documents_at_rc ? 'Documents Validés' : 'Dossier Incomplet'}
                  </p>
                  <p className={cn("text-sm font-medium mt-1", chantier.documents_at_rc ? 'text-green-600/70' : 'text-red-600/70')}>
                    Statut administratif d'ouverture
                  </p>
                </div>
              </div>
            </div>

            {chantier.commentaire && (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MessageSquare size={120} />
                </div>
                <div className="relative z-10">
                  <h4 className="text-slate-900 font-black text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <MessageSquare size={14} className="text-slate-400" /> Observation / Consignes Particulières
                  </h4>
                  <p className="text-slate-600 leading-relaxed font-serif italic text-lg line-clamp-4 group-hover:line-clamp-none transition-all duration-500">
                    "{chantier.commentaire}"
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB AVANCEMENT --- */}
        {activeTab === 'avancement' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg text-gray-800">Progression Globale</h3>
                  <span className="font-black text-2xl text-blue-600">{chantier.taux_avancement || 0}%</span>
                </div>
                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000 ease-out"
                    style={{ width: `${chantier.taux_avancement || 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>Démarrage</span>
                  <span>En Cours</span>
                  <span>Finitions</span>
                  <span>Terminé</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 items-end min-w-[200px]">
                <div className="px-4 py-2 bg-blue-50 text-blue-800 rounded-lg font-bold border border-blue-100 text-center w-full">
                  Stade : {(chantier.stade_avancement || 'non_defini').replace('_', ' ').toUpperCase()}
                </div>
                <button
                  onClick={handleOpenProgressModal}
                  className="px-4 py-2 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 transition-colors w-full flex items-center justify-center"
                >
                  <Edit2 size={16} className="mr-2" /> Mettre à jour
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">Historique des Mises à jour</h3>
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pl-6 py-2">
                {(chantier.historique_avancement || []).length === 0 && (
                  <p className="text-gray-400 italic text-sm">Aucun historique disponible.</p>
                )}
                {(chantier.historique_avancement || []).map((h, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-gray-900 text-lg mr-2">{h.pourcentage}%</span>
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase">{h.stade.replace('_', ' ')}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">{formatDate(h.date)}</span>
                      </div>
                      {h.commentaire && (
                        <p className="text-gray-600 text-sm mt-1">{h.commentaire}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB EQUIPE (UNIFIED RESTORED) --- */}
        {activeTab === 'equipe' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Effectif Chantier</h3>
                <p className="text-sm text-gray-500">{unifiedWorkers.length} collaborateurs actifs</p>
              </div>
              <button
                onClick={() => setIsUnifiedAddModalOpen(true)}
                className="bg-red-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-red-800 font-bold flex items-center transition-all active:scale-95"
              >
                <UserPlus className="w-5 h-5 mr-2" /> Ajouter
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Collaborateur</th>
                    <th className="px-6 py-4 text-center">Dates</th>
                    <th className="px-6 py-4 text-center">Jours / Coût</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unifiedWorkers.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {w.type === 'PERMANENT' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">Permanent</span>}
                        {w.type === 'INTERIMAIRE' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700">Intérimaire</span>}
                        {w.type === 'PREVU' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600">Prévu / Extra</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          {w.nom}
                          {(() => {
                            const isHorsVille = (w.ville_residence || '').trim() !== (chantier?.ville_code || '').trim();
                            return isHorsVille ? (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded border border-orange-200">HORS VILLE</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded border border-green-200">VILLE</span>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {w.matricule ? `Mat: ${w.matricule} ` : (w.cin ? `CIN: ${w.cin} ` : 'Sans ID')}
                          {w.ville_residence && <span className="ml-2 opacity-60">• {getCityName(w.ville_residence)}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-2">
                          <input
                            type="date"
                            className="border rounded px-2 py-1 text-xs"
                            value={w.date_debut || ''}
                            onChange={(e) => handleUpdateWorkerDate(w, 'start', e.target.value)}
                          />
                          <input
                            type="date"
                            className="border rounded px-2 py-1 text-xs"
                            value={w.date_fin || ''}
                            onChange={(e) => handleUpdateWorkerDate(w, 'end', e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className='font-bold text-gray-800'>{formatCurrency(w.cout_jour)} <span className="text-xs text-gray-400 font-normal">/j</span></div>

                          <div className="flex items-center bg-gray-100 rounded-lg p-1 mt-1">
                            <button onClick={() => handleModifyDays(w, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded hover:shadow-sm text-gray-600"><Minus size={12} /></button>
                            <span className="w-12 text-center font-mono font-bold text-sm bg-white mx-1 rounded shadow-sm" title="Jours ouvrés calculés">
                              {w.jours_prevus}j
                            </span>
                            <button onClick={() => handleModifyDays(w, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded hover:shadow-sm text-gray-600"><Plus size={12} /></button>
                          </div>

                          {/* Affichage du Réel (Pointage) */}
                          <div className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 flex items-center gap-1",
                            (w.jours_pointes || 0) > (w.jours_prevus || 0)
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          )}>
                            {(w.jours_pointes || 0) > (w.jours_prevus || 0) && <AlertTriangle size={10} />}
                            RÉEL: {w.jours_pointes || 0}j
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-lg text-gray-800">{formatCurrency(w.total_cost)}</span>
                          {w.relatedCosts ? (
                            <span className="text-xs text-orange-600 font-medium" title="Frais / Heures Supp">+ {formatCurrency(w.relatedCosts)} frais</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* VIEW EXPENSES BUTTON */}
                          <button
                            title="📊 Voir dépenses & détails"
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            onClick={() => setSelectedWorkerDetail(w)}
                          >
                            <span className="text-sm font-bold">📊</span>
                          </button>

                          {/* TRANSFER BUTTON FOR ALL */}
                          <button title="Transférer vers un autre chantier" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            onClick={() => handleOpenTransfer(w)}
                          >
                            <ArrowRight size={16} />
                          </button>

                          <button title="Calculer Indemnités (Trajet/Repas/Hébergement)" className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            onClick={() => handleOpenIndemnities(w)}
                          >
                            <span className="text-xs font-bold font-mono text-green-700">IND</span>
                          </button>

                          <button title="Ajouter Heures Supp / Primes" className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                            onClick={() => openAddExtrasModal(w)}
                          >
                            <span className="text-xs font-bold font-mono">+HS</span>
                          </button>

                          <button title="Affecter Outillage" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                            onClick={() => handleOpenToolAssign(w)}
                          >
                            <HardHat size={16} />
                          </button>

                          <button title="Supprimer / Fin" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            onClick={async (e) => {
                              e.stopPropagation();
                              console.log("Requete suppression:", w);

                              if (w.type === 'PERMANENT') {
                                const affId = (w.originalObject as any)?.id_affectation;
                                if (!affId) {
                                  alert("Erreur: ID permanent introuvable");
                                  return;
                                }
                                // REMOVED BLOCKING CONFIRM
                                console.log("Deleting Permanent ID:", affId);
                                try {
                                  await removeAffectation(affId);
                                  alert("✅ Suppression effectuée (Permanent)");
                                } catch (err) {
                                  console.error("Delete failed", err);
                                  alert("Erreur suppression: " + err);
                                }
                              } else {
                                const localId = (w.originalObject as any)?.id || w.id;
                                console.log("Deleting Local ID:", localId);
                                if (!localId) {
                                  alert("Erreur: ID local introuvable");
                                  return;
                                }
                                // REMOVED BLOCKING CONFIRM (Already removed but ensuring consistency)
                                handleDeleteLocalWorker(localId);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {unifiedWorkers.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400 italic">Aucun personnel enregistré.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- UNIFIED ADD MODAL --- */}
        {/* --- UNIFIED ADD MODAL MOVED TO ROOT --- */}

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
                        {cost.quantite} x {formatCurrency(Number(cost.cout_unitaire || 0))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="text-center bg-green-50 p-6 rounded-2xl border border-green-100">
                <p className="text-green-800 font-medium text-sm">Total Acomptes donnés</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalVersements)}</p>
                <div className="w-full bg-green-200 h-2 rounded-full mt-3">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min((totalVersements / (chantier.budget_prevu || 1)) * 100, 100)}%` }}></div>
                </div>
              </div>

              <div className={cn(
                "text-center p-6 rounded-2xl border",
                (totalVersements - totalDepensesDirectes) > (chantier.budget_prevu * 0.5) ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
              )}>
                <p className={cn("font-medium text-sm", (totalVersements - totalDepensesDirectes) > (chantier.budget_prevu * 0.5) ? "text-red-800" : "text-blue-800")}>
                  Argent "Dehors" (Solde Chef)
                </p>
                <p className={cn("text-3xl font-bold", (totalVersements - totalDepensesDirectes) > (chantier.budget_prevu * 0.5) ? "text-red-600" : "text-blue-600")}>
                  {formatCurrency(totalVersements - totalDepensesDirectes)}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold">Total Avances - Dépenses Justifiées</p>
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
              <Plus className="mr-2" /> Enregistrer un Acompte
            </button>
          </div>
        )}


        {/* --- TAB: MATERIEL (MOVED INSIDE) --- */}
        {activeTab === 'materiel' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Matériel & Colisage Affecté</h3>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Article</th>
                    <th className="px-6 py-4 text-center">Quantité</th>
                    <th className="px-6 py-4 text-left">Type / Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mouvements
                    .filter(m => m.id_chantier === chantierId && m.type === 'SORTIE' && m.motif?.toLowerCase().includes('colisage'))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(m => {
                      const article = articles.find(a => a.id_article === m.id_article);

                      return (
                        <tr key={m.id_mouvement} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">
                            {new Date(m.date).toLocaleDateString()} <span className="text-gray-400 text-xs">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{article?.nom || 'Article inconnu'}</div>
                            <div className="text-xs text-gray-400 font-mono">{article?.reference}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-lg text-slate-800">{m.quantite}</span>
                            <span className="text-xs text-gray-500 ml-1">{article?.unite}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                              <Truck size={12} className="mr-1" /> Colisage
                            </span>
                            {m.motif && <div className="text-xs text-gray-400 mt-1">{m.motif}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  {mouvements.filter(m => m.id_chantier === chantierId && m.type === 'SORTIE' && m.motif?.toLowerCase().includes('colisage')).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                        Aucun colisage affecté.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADJUST DAYS */}
      {
        adjustDaysModalState.isOpen && adjustDaysModalState.worker && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="font-bold text-lg mb-4">Ajout de Jours : {adjustDaysModalState.worker.nom}</h3>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAdjustDaysModalState(prev => ({ ...prev, mode: 'STANDARD' }))}
                  className={`flex - 1 py - 2 rounded - lg font - bold text - sm border ${adjustDaysModalState.mode === 'STANDARD' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'} `}
                >
                  Standard ({adjustDaysModalState.worker.cout_jour} DH)
                </button>
                <button
                  onClick={() => setAdjustDaysModalState(prev => ({ ...prev, mode: 'SPECIAL' }))}
                  className={`flex - 1 py - 2 rounded - lg font - bold text - sm border ${adjustDaysModalState.mode === 'SPECIAL' ? 'bg-orange-600 text-white border-orange-600' : 'bg-gray-50 text-gray-600 border-gray-200'} `}
                >
                  Spécial / HS
                </button>
              </div>

              {adjustDaysModalState.mode === 'SPECIAL' && (
                <div className="space-y-3 mb-4 bg-orange-50 p-3 rounded-lg">
                  <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">Prix Spécial (DH)</label>
                    <input type="number" className="w-full border p-2 rounded text-sm"
                      value={adjustDaysModalState.customPrice}
                      onChange={e => setAdjustDaysModalState(prev => ({ ...prev, customPrice: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-800 mb-1">Motif / Commentaire</label>
                    <input type="text" className="w-full border p-2 rounded text-sm"
                      value={adjustDaysModalState.comment}
                      onChange={e => setAdjustDaysModalState(prev => ({ ...prev, comment: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setAdjustDaysModalState(prev => ({ ...prev, isOpen: false }))} className="text-gray-500 font-bold text-sm">Annuler</button>
                <button onClick={confirmAdjustDays} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700">Appliquer</button>
              </div>
            </div>
          </div>
        )
      }

      {/* --- MODALS --- */}

      {/* Modal Progress Update */}
      {
        isProgressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-lg text-gray-800">Mise à jour Avancement</h3>
                <button onClick={() => setIsProgressModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleUpdateProgress} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Stade du Chantier</label>
                  <select
                    className="w-full border rounded-xl px-4 py-3 bg-gray-50"
                    value={progressForm.stade}
                    onChange={e => {
                      const newStade = e.target.value;
                      let newPercent = progressForm.pourcentage;
                      // Auto-set percentage based on user rules
                      if (newStade === 'démarrage') newPercent = 10;
                      if (newStade === 'en_cours') newPercent = 50;
                      if (newStade === 'avancé') newPercent = 75;
                      if (newStade === 'presque_terminé') newPercent = 90;
                      if (newStade === 'finalisé') newPercent = 100;

                      setProgressForm({ ...progressForm, stade: newStade, pourcentage: newPercent });
                    }}
                  >
                    <option value="démarrage">Démarrage (10%)</option>
                    <option value="en_cours">Travaux Principaux (50%)</option>
                    <option value="avancé">Finitions (75%)</option>
                    <option value="presque_terminé">Presque Terminé (90%)</option>
                    <option value="finalisé">Terminé (100%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Pourcentage Avancement (%)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min="0" max="100" step="5"
                      className="w-full accent-blue-600"
                      value={progressForm.pourcentage}
                      onChange={e => setProgressForm({ ...progressForm, pourcentage: Number(e.target.value) })}
                    />
                    <span className="font-bold text-lg text-blue-700 w-12 text-right">{progressForm.pourcentage}%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Commentaire / Observation</label>
                  <textarea
                    className="w-full border rounded-xl px-4 py-3 h-24 resize-none"
                    placeholder="Ex: Fin du gros œuvre, début peinture..."
                    value={progressForm.commentaire}
                    onChange={e => setProgressForm({ ...progressForm, commentaire: e.target.value })}
                  />
                </div>

                <button type="submit" className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center hover:bg-blue-800 transition-colors">
                  <Save size={18} className="mr-2" /> Enregistrer la mise à jour
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Edition Infos */}
      {
        isEditInfoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-lg text-gray-800">Modifier Infos Chantier</h3>
                <button onClick={() => setIsEditInfoModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleUpdateInfo} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Référence Plan</label>
                  <input type="text" className="w-full border rounded-xl px-4 py-3"
                    value={infoFormData.plan_reference}
                    onChange={e => setInfoFormData({ ...infoFormData, plan_reference: e.target.value })}
                    placeholder="Ex: 882-02..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Sous Chef de Chantier</label>
                    <input
                      list="responsables-list-edit"
                      className="w-full border rounded-xl px-4 py-3 bg-white"
                      value={infoFormData.responsable_chantier || ''}
                      onChange={e => setInfoFormData({ ...infoFormData, responsable_chantier: e.target.value })}
                      placeholder="Chercher..."
                    />
                    <datalist id="responsables-list-edit">
                      {monteurs
                        .filter(m => [100, 101, 102, 103, 104, 157].includes(m.matricule))
                        .map(m => <option key={m.matricule} value={m.nom_monteur} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Chef de Chantier</label>
                    <input
                      list="chefs-list-edit"
                      className="w-full border rounded-xl px-4 py-3 bg-white"
                      value={infoFormData.chef_chantier || ''}
                      onChange={e => setInfoFormData({ ...infoFormData, chef_chantier: e.target.value })}
                      placeholder="Chercher..."
                    />
                    <datalist id="chefs-list-edit">
                      {monteurs
                        .filter(m => [100, 101, 102, 103, 104, 157].includes(m.matricule))
                        .map(m => <option key={m.matricule} value={m.nom_monteur} />)}
                    </datalist>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date Démarrage</label>
                    <input type="date" required className="w-full border rounded-xl px-4 py-3"
                      value={infoFormData.date_debut}
                      onChange={e => setInfoFormData({ ...infoFormData, date_debut: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date Fin Prévue</label>
                    <input type="date" required className="w-full border rounded-xl px-4 py-3"
                      value={infoFormData.date_fin}
                      onChange={e => setInfoFormData({ ...infoFormData, date_fin: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Budget Prévu (Contrat)</label>
                  <div className="relative">
                    <input type="number" className="w-full border rounded-xl px-4 py-3 pr-12 font-bold text-blue-700"
                      value={infoFormData.budget_prevu}
                      onChange={e => setInfoFormData({ ...infoFormData, budget_prevu: Number(e.target.value) })}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">DH</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="text-sm font-bold text-gray-700">Documents AT/RC Validés</label>
                  <input type="checkbox" className="w-5 h-5 accent-red-600"
                    checked={infoFormData.documents_at_rc}
                    onChange={e => setInfoFormData({ ...infoFormData, documents_at_rc: e.target.checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="text-sm font-bold text-gray-700">Véhicule Société Utilisé</label>
                  <input type="checkbox" className="w-5 h-5 accent-red-600"
                    checked={infoFormData.vehicule_utilise}
                    onChange={e => setInfoFormData({ ...infoFormData, vehicule_utilise: e.target.checked })}
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-red-700 text-white rounded-xl font-bold flex items-center justify-center">
                  <Save size={18} className="mr-2" /> Enregistrer
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Monteurs Locaux (New Detailed) */}
      {
        isLocalWorkerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">Ajouter Intérimaire</h3>
                <button onClick={() => setIsLocalWorkerModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddLocalWorker} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nom Complet</label>
                  <input type="text" required className="w-full border rounded-xl px-4 py-3"
                    value={localWorkerForm.nom_complet}
                    onChange={e => setLocalWorkerForm({ ...localWorkerForm, nom_complet: e.target.value })}
                    placeholder="Ex: Mohamed Alami"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">CIN (Optionnel)</label>
                  <input type="text" className="w-full border rounded-xl px-4 py-3 uppercase"
                    value={localWorkerForm.cin}
                    onChange={e => setLocalWorkerForm({ ...localWorkerForm, cin: e.target.value })}
                    placeholder="Ex: J123456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Salaire/Jour</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3"
                      value={localWorkerForm.salaire_jour}
                      onChange={e => setLocalWorkerForm({ ...localWorkerForm, salaire_jour: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Jours</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3"
                      value={localWorkerForm.jours_travailles}
                      onChange={e => setLocalWorkerForm({ ...localWorkerForm, jours_travailles: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-md">
                  Ajouter à la liste
                </button>
              </form>
            </div>
          </div>
        )
      }



      {/* Modal Affectation */}
      {
        isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">Ajouter un Collaborateur</h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
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
                    <label className="block text-xs font-bold text-gray-500 mb-1">Date Sortie (Optionnel)</label>
                    <input type="date" className="border rounded-xl px-4 py-3 w-full" value={assignDateSortie} onChange={e => setAssignDateSortie(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800">Valider Affectation</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Dépense */}
      {
        isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">
                  {expenseFormData.type_cout === 'heures_supp' ? 'Ajout Heures Supplémentaires' : 'Nouvelle Dépense'}
                </h3>
                <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4 overflow-y-auto">
                {/* Show Type selector only if NOT heures_supp */}
                {expenseFormData.type_cout !== 'heures_supp' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Type de dépense</label>
                    <select className="w-full border rounded-xl px-4 py-3" value={expenseFormData.type_cout} onChange={e => setExpenseFormData({ ...expenseFormData, type_cout: e.target.value as TypeCout })}>
                      <option value="transport_commun">Transport Commun (Car/Train)</option>
                      <option value="transport_local">Transport Local (Taxi/Navette)</option>
                      <option value="hebergement">Hébergement</option>
                      <option value="restauration">Restauration</option>
                      <option value="outillage_affecte">Outillage / Matériel</option>
                      <option value="sous_traitant">Sous-traitance</option>
                      <option value="heures_supp">Heures Supplémentaires</option>
                      <option value="prime">Prime exceptionnelle</option>
                      <option value="main_doeuvre_extra">Main d'oeuvre Extra</option>
                      <option value="autre">Autre frais</option>
                    </select>
                  </div>
                )}

                {/* Show info banner for HS */}
                {expenseFormData.type_cout === 'heures_supp' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-orange-800">📋 Heures Supplémentaires</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Pour : {unifiedWorkers.find(w =>
                        (w.type === 'PERMANENT' ? String(w.matricule) : w.id) === expenseFormData.related_monteur_id
                      )?.nom || 'Collaborateur'}
                    </p>
                  </div>
                )}

                {/* Selecteur de monteur concerné (optionnel) - Disabled if already set for HS */}
                {expenseFormData.type_cout !== 'heures_supp' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Lier à un collaborateur (Optionnel)</label>
                    <select
                      className="w-full border rounded-xl px-4 py-3"
                      value={expenseFormData.related_monteur_id || ''}
                      onChange={e => setExpenseFormData({ ...expenseFormData, related_monteur_id: e.target.value })}
                    >
                      <option value="">-- Dépense Chantier Générale --</option>
                      <optgroup label="Permanents">
                        {workers.map(w => (
                          <option key={w.matricule} value={String(w.matricule)}>{w.nom_monteur} (Mat: {w.matricule})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Locaux / Intérimaires">
                        {(chantier.monteurs_locaux || []).map(ml => (
                          <option key={ml.id} value={ml.id}>{ml.nom_complet}</option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Sélectionnez si cette dépense concerne spécifiquement une personne (ex: Avance, EPI individuel...)</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Coût Unitaire</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3" value={expenseFormData.cout_unitaire} onChange={e => setExpenseFormData({ ...expenseFormData, cout_unitaire: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Quantité</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3" value={expenseFormData.quantite} onChange={e => setExpenseFormData({ ...expenseFormData, quantite: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Commentaire (Optionnel)</label>
                  <input type="text" className="w-full border rounded-xl px-4 py-3" placeholder="Ex: Achat urgence..." value={expenseFormData.commentaire} onChange={e => setExpenseFormData({ ...expenseFormData, commentaire: e.target.value })} />
                </div>
                <div className="bg-gray-100 p-3 rounded-lg text-center font-bold text-gray-700">
                  Total: {formatCurrency(expenseFormData.cout_unitaire * expenseFormData.quantite)}
                </div>
                <button type="submit" className="w-full py-3 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800">Enregistrer Dépense</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Transfert */}
      {
        isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-lg text-gray-800">Transférer {transferData.monteurName}</h3>
                <button onClick={() => setIsTransferModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>

              <form onSubmit={handleExecuteTransfer} className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-2">
                  Ce transfert va clore la mission actuelle et en créer une nouvelle sur le chantier cible.
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vers quel Chantier ?</label>
                  <select
                    required
                    className="w-full border rounded-xl px-4 py-3"
                    value={transferData.targetChantierId}
                    onChange={e => setTransferData({ ...transferData, targetChantierId: e.target.value })}
                  >
                    <option value="">Sélectionner le chantier de destination...</option>
                    {chantiers
                      .filter(c => c.statut === 'actif' && c.id_chantier !== chantierId) // Exclure chantier actuel et terminés
                      .map(c => (
                        <option key={c.id_chantier} value={c.id_chantier}>{c.ref_chantier} - {c.nom_client}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date du Transfert</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded-xl px-4 py-3"
                    value={transferData.dateTransfert}
                    onChange={e => setTransferData({ ...transferData, dateTransfert: e.target.value })}
                  />
                </div>

                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-2 rotate-180" /> Confirmer le Transfert
                </button>
              </form>
            </div>
          </div>
        )
      }
      {/* Modal Paiement */}
      {
        isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">Encaisser Acompte</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddPayment} className="space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Montant (DH)</label>
                  <input type="number" required className="w-full border rounded-xl px-4 py-3 text-lg font-bold text-green-700" value={paymentFormData.montant} onChange={e => setPaymentFormData({ ...paymentFormData, montant: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <input type="date" required className="w-full border rounded-xl px-4 py-3" value={paymentFormData.date} onChange={e => setPaymentFormData({ ...paymentFormData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Numéro de versement</label>
                  <input type="number" required className="w-full border rounded-xl px-4 py-3" value={paymentFormData.numero} onChange={e => setPaymentFormData({ ...paymentFormData, numero: parseInt(e.target.value) })} />
                </div>
                <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">Confirmer Acompte</button>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Affectation Outillage */}
      {
        isToolAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Affecter Outillage</h3>
                  <p className="text-sm text-gray-500">Pour : {toolAssignForm.worker_name}</p>
                </div>
                <button onClick={() => setIsToolAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!toolAssignForm.tool_id) {
                  alert("Veuillez sélectionner un outil");
                  return;
                }

                const selectedTool = (stock || []).find(s => s.id_article === toolAssignForm.tool_id);
                if (!selectedTool) return;

                // Check if enough stock available
                if (selectedTool.quantite < toolAssignForm.quantity) {
                  alert(`❌ Stock insuffisant!\n\nStock disponible: ${selectedTool.quantite} ${selectedTool.unite}\nQuantité demandée: ${toolAssignForm.quantity}`);
                  return;
                }

                try {
                  // 1. Create stock movement for traceability (SORTIE vers chantier)
                  await addMouvement({
                    id_mouvement: `mvt-${Date.now()}`,
                    id_article: toolAssignForm.tool_id,
                    type: 'SORTIE',
                    quantite: toolAssignForm.quantity,
                    date: new Date().toISOString().split('T')[0],
                    id_chantier: chantierId,
                    beneficiaire_id: toolAssignForm.worker_id, // Link to worker
                    motif: `Affectation à ${toolAssignForm.worker_name} - ${toolAssignForm.comment}`
                  });

                  // 2. Create expense entry for tool assignment
                  await addCout({
                    id_cout: `cout-${Date.now()}`,
                    id_chantier: chantierId,
                    type_cout: 'outillage_affecte',
                    cout_unitaire: 0, // Tools don't have cost in current system
                    quantite: toolAssignForm.quantity,
                    montant_reel: 0,
                    montant_prevu: 0,
                    commentaire: `${selectedTool.nom} (${selectedTool.reference}) - ${toolAssignForm.comment}`,
                    related_monteur_id: toolAssignForm.worker_id,
                    statut: 'validé'
                  });

                  setIsToolAssignModalOpen(false);
                  alert(`✅ Outillage affecté avec succès!\n\n${selectedTool.nom} (${toolAssignForm.quantity} ${selectedTool.unite})\nà ${toolAssignForm.worker_name}\n\n📋 Mouvement de stock enregistré`);
                } catch (error) {
                  console.error("Error assigning tool:", error);
                  alert("❌ Erreur lors de l'affectation de l'outillage");
                }
              }} className="space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Outil / Équipement</label>
                  <select
                    required
                    className="w-full border rounded-xl px-4 py-3"
                    value={toolAssignForm.tool_id}
                    onChange={e => {
                      const tool = (stock || []).find(s => s.id_article === e.target.value);
                      setToolAssignForm({
                        ...toolAssignForm,
                        tool_id: e.target.value,
                        tool_name: tool?.nom || ''
                      });
                    }}
                  >
                    <option value="">Sélectionner un article...</option>

                    {/* Group by category */}
                    {['EPI', 'OUTILLAGE', 'CONSOMMABLE', 'MATERIEL'].map(categorie => {
                      const items = (stock || []).filter(s => s.categorie === categorie && s.quantite > 0);
                      if (items.length === 0) return null;

                      return (
                        <optgroup key={categorie} label={`📦 ${categorie}`}>
                          {items.map(tool => (
                            <option key={tool.id_article} value={tool.id_article}>
                              {tool.nom} ({tool.reference}) - Stock: {tool.quantite} {tool.unite}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  {(stock || []).filter(s => s.quantite > 0).length === 0 && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Aucun article disponible en stock</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Quantité</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border rounded-xl px-4 py-3"
                    value={toolAssignForm.quantity}
                    onChange={e => setToolAssignForm({ ...toolAssignForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Commentaire</label>
                  <input
                    type="text"
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="Ex: Pour travaux en hauteur..."
                    value={toolAssignForm.comment}
                    onChange={e => setToolAssignForm({ ...toolAssignForm, comment: e.target.value })}
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 flex items-center justify-center">
                  <HardHat className="mr-2" size={18} />
                  Affecter l'Outillage
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* MODAL INDEMNITES */}
      {
        isIndemnityModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-green-900">Calcul Indemnités</h3>
                  <p className="text-xs text-green-700">Pour {indemnityForm.workerName} ({indemnityForm.days} jours)</p>
                </div>
                <button onClick={() => setIsIndemnityModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-4">
                {/* Transport */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <p className="font-bold text-gray-700 flex items-center gap-2">
                      <Car size={16} /> Transport Local
                    </p>
                    <p className="text-xs text-gray-500">
                      Base: 20 DH/j
                    </p>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      className="w-full border rounded p-1 text-right font-bold"
                      value={indemnityForm.transportTotal}
                      onChange={(e) => setIndemnityForm({ ...indemnityForm, transportTotal: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Transport Commun */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <p className="font-bold text-gray-700 flex items-center gap-2">
                      <Truck size={16} /> Transport Commun (Voyage)
                    </p>
                    <p className="text-xs text-gray-500">Base: 120 DH</p>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      className="w-full border rounded p-1 text-right font-bold"
                      value={indemnityForm.transportVoyageTotal}
                      onChange={(e) => setIndemnityForm({ ...indemnityForm, transportVoyageTotal: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Repas */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <p className="font-bold text-gray-700 flex items-center gap-2">
                      <Utensils size={16} /> Restauration
                    </p>
                    <p className="text-xs text-gray-500">Base: 70 DH/j</p>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      className="w-full border rounded p-1 text-right font-bold"
                      value={indemnityForm.repasTotal}
                      onChange={(e) => setIndemnityForm({ ...indemnityForm, repasTotal: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Hébergement */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <p className="font-bold text-gray-700 flex items-center gap-2">
                      <Home size={16} /> Hébergement
                    </p>
                    <p className="text-xs text-gray-500">
                      {indemnityForm.hebergementRate === 0 ?
                        <span className="text-red-600 font-bold">Non éligible (Même ville)</span> :
                        `Base: 100 DH / j`
                      }
                    </p>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      className="w-full border rounded p-1 text-right font-bold"
                      value={indemnityForm.hebergementTotal}
                      onChange={(e) => setIndemnityForm({ ...indemnityForm, hebergementTotal: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="font-bold text-lg">Total à ajouter:</p>
                  <p className="font-bold text-xl text-green-700">
                    {formatCurrency(indemnityForm.transportTotal + indemnityForm.transportVoyageTotal + indemnityForm.repasTotal + indemnityForm.hebergementTotal)}
                  </p>
                </div>

                <button
                  onClick={handleConfirmIndemnities}
                  className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 shadow-md"
                >
                  Valider et Ajouter aux Dépenses
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL DÉTAIL COLLABORATEUR & DÉPENSES */}
      {
        selectedWorkerDetail && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedWorkerDetail.nom}</h2>
                  <div className="flex items-center gap-3 mt-1 text-blue-100 text-sm">
                    <span className="px-2 py-0.5 bg-white/20 rounded font-mono">
                      {selectedWorkerDetail.matricule ? `Mat: ${selectedWorkerDetail.matricule}` : (selectedWorkerDetail.cin ? `CIN: ${selectedWorkerDetail.cin}` : 'Sans ID')}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{selectedWorkerDetail.type.toLowerCase()}</span>
                    <span>•</span>
                    <span>{formatCurrency(selectedWorkerDetail.cout_jour)}/jour</span>
                  </div>
                </div>
                <button onClick={() => setSelectedWorkerDetail(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Période
                    </h3>
                    <div className="space-y-1 text-sm">
                      {chantier && (
                        <div className="mb-2 pb-2 border-b border-slate-100">
                          <div className="text-xs text-slate-500">Chantier</div>
                          <div className="font-bold text-slate-800 text-xs leading-tight">
                            {chantier.nom_client || 'Client'} - {chantier.ref_chantier}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-600">Début</span>
                        <span className="font-medium">{formatDate(selectedWorkerDetail.date_debut)}</span>
                      </div>
                      {selectedWorkerDetail.date_fin && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Fin</span>
                          <span className="font-medium">{formatDate(selectedWorkerDetail.date_fin)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Coût Total
                    </h3>
                    <div className="text-2xl font-bold text-slate-800">{formatCurrency(selectedWorkerDetail.total_cost)}</div>
                    {selectedWorkerDetail.relatedCosts ? (
                      <div className="text-xs text-orange-600 mt-1">dont {formatCurrency(selectedWorkerDetail.relatedCosts)} de frais</div>
                    ) : null}
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Ville d'origine
                    </h3>
                    <div className="text-sm">
                      {selectedWorkerDetail.ville_residence ? (
                        <div className="font-bold text-slate-800">{selectedWorkerDetail.ville_residence}</div>
                      ) : (
                        <div className="text-slate-400 italic">Non renseignée</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Localisation actuelle
                    </h3>
                    <div className="text-sm">
                      {chantier ? (
                        <div>
                          <div className="font-bold text-slate-800">
                            {getCityName(chantier.ville_code)}
                            <span className="font-normal text-gray-400 text-xs ml-1">({chantier.ville_code})</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">Sur chantier</div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Non affecté</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mes Dépenses Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-green-600" /> Mes Dépenses
                      </h3>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Total Filtré</div>
                        <div className="text-xl font-bold text-green-700">
                          {formatCurrency(
                            costs
                              .filter(c => {
                                const workerId = selectedWorkerDetail.type === 'PERMANENT' ? String(selectedWorkerDetail.matricule) : selectedWorkerDetail.id;
                                if (c.related_monteur_id !== workerId) return false;

                                const cDate = c.created_at ? new Date(c.created_at) : null;
                                if (workerExpFilterStartDate && (!cDate || cDate < new Date(workerExpFilterStartDate))) return false;
                                if (workerExpFilterEndDate) {
                                  if (!cDate) return false;
                                  const endDate = new Date(workerExpFilterEndDate);
                                  endDate.setHours(23, 59, 59);
                                  if (cDate > endDate) return false;
                                }
                                if (workerExpFilterSiteId !== 'ALL' && c.id_chantier !== workerExpFilterSiteId) return false;
                                if (workerExpFilterType !== 'ALL' && c.type_cout !== workerExpFilterType) return false;
                                return true;
                              })
                              .reduce((sum, c) => sum + (c.montant_reel || 0), 0)
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Du</label>
                        <input
                          type="date"
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                          value={workerExpFilterStartDate}
                          onChange={(e) => setWorkerExpFilterStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Au</label>
                        <input
                          type="date"
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                          value={workerExpFilterEndDate}
                          onChange={(e) => setWorkerExpFilterEndDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Chantier</label>
                        <select
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                          value={workerExpFilterSiteId}
                          onChange={(e) => setWorkerExpFilterSiteId(e.target.value)}
                        >
                          <option value="ALL">Tous</option>
                          {chantiers.map(ch => (
                            <option key={ch.id_chantier} value={ch.id_chantier}>
                              {ch.ref_chantier} - {ch.nom_client}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                        <select
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                          value={workerExpFilterType}
                          onChange={(e) => setWorkerExpFilterType(e.target.value)}
                        >
                          <option value="ALL">Tous</option>
                          <option value="prime">Prime</option>
                          <option value="heures_supp">Heures Supp.</option>
                          <option value="main_doeuvre_extra">Main d'œuvre Extra</option>
                          <option value="indemnite_deplacement">Indemnité Déplacement</option>
                          <option value="indemnite_repas">Indemnité Repas</option>
                          <option value="indemnite_logement">Indemnité Logement</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Expenses Table */}
                  {(() => {
                    const workerId = selectedWorkerDetail.type === 'PERMANENT' ? String(selectedWorkerDetail.matricule) : selectedWorkerDetail.id;
                    const filteredWorkerExpenses = costs
                      .filter(c => {
                        if (c.related_monteur_id !== workerId) return false;

                        const cDate = c.created_at ? new Date(c.created_at) : null;
                        if (workerExpFilterStartDate && (!cDate || cDate < new Date(workerExpFilterStartDate))) return false;
                        if (workerExpFilterEndDate) {
                          if (!cDate) return false;
                          const endDate = new Date(workerExpFilterEndDate);
                          endDate.setHours(23, 59, 59);
                          if (cDate > endDate) return false;
                        }
                        if (workerExpFilterSiteId !== 'ALL' && c.id_chantier !== workerExpFilterSiteId) return false;
                        if (workerExpFilterType !== 'ALL' && c.type_cout !== workerExpFilterType) return false;
                        return true;
                      })
                      .sort((a, b) => {
                        if (b.created_at && a.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        return (b.montant_reel || 0) - (a.montant_reel || 0);
                      });

                    return filteredWorkerExpenses.length > 0 ? (
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Chantier</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">Montant</th>
                              <th className="p-3">Détail</th>
                              <th className="p-3">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredWorkerExpenses.map((cout, i) => {
                              const expChantier = chantiers.find(c => c.id_chantier === cout.id_chantier);
                              return (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-3 text-slate-600 whitespace-nowrap">
                                    {cout.created_at ? formatDate(cout.created_at) : '-'}
                                  </td>
                                  <td className="p-3 font-medium text-slate-700">
                                    {expChantier?.ref_chantier || 'N/A'}
                                  </td>
                                  <td className="p-3 capitalize font-medium text-slate-700">
                                    {cout.type_cout?.replace('_', ' ')}
                                  </td>
                                  <td className="p-3 font-bold text-green-700">{formatCurrency(cout.montant_reel)}</td>
                                  <td className="p-3 text-slate-600 text-xs">{cout.commentaire || '-'}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${cout.statut === 'validé' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {cout.statut}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 italic">
                        {costs.filter(c => c.related_monteur_id === workerId).length === 0
                          ? "Aucune dépense enregistrée pour ce collaborateur."
                          : "Aucune dépense ne correspond aux filtres sélectionnés."}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedWorkerDetail(null)}
                  className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* --- MODAL AFFECTATION PERMANENT (RESTORED) --- */}
      {
        isAssignModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-lg text-blue-900">Affecter un Permanent</h3>
                <button onClick={() => setIsAssignModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleAddAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Collaborateur</label>
                  <select
                    required
                    className="w-full border rounded-xl px-4 py-3"
                    value={assignMatricule}
                    onChange={e => setAssignMatricule(Number(e.target.value))}
                  >
                    <option value="">Sélectionner...</option>
                    {monteurs.filter(m => m.actif).map(m => (
                      <option key={m.matricule} value={m.matricule}>{m.nom_monteur} (Mat: {m.matricule})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date Début</label>
                    <input type="date" required className="w-full border rounded-xl px-4 py-3" value={assignDateEntree} onChange={e => setAssignDateEntree(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date Fin (Opt)</label>
                    <input type="date" className="w-full border rounded-xl px-4 py-3" value={assignDateSortie} onChange={e => setAssignDateSortie(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md">
                  Confirmer Affectation
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* --- MODAL AJOUT INTERIMAIRE LOCAL (RESTORED) --- */}
      {
        isLocalWorkerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-lg text-orange-900">Nouvelle Recrue Locale</h3>
                <button onClick={() => setIsLocalWorkerModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleAddLocalWorker} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nom Complet</label>
                  <input required className="w-full border rounded-xl px-4 py-3" placeholder="Nom Prénom" value={localWorkerForm.nom_complet} onChange={e => setLocalWorkerForm({ ...localWorkerForm, nom_complet: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">CIN (Optionnel)</label>
                  <input className="w-full border rounded-xl px-4 py-3" placeholder="AB123456" value={localWorkerForm.cin} onChange={e => setLocalWorkerForm({ ...localWorkerForm, cin: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Salaire Journalier</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3" value={localWorkerForm.salaire_jour} onChange={e => setLocalWorkerForm({ ...localWorkerForm, salaire_jour: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Jours Travaillés</label>
                    <input type="number" required className="w-full border rounded-xl px-4 py-3" value={localWorkerForm.jours_travailles} onChange={e => setLocalWorkerForm({ ...localWorkerForm, jours_travailles: Number(e.target.value) })} />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-md">
                  Ajouter au Chantier
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* --- UNIFIED ADD MODAL (MOVED HERE TO FIX VISIBILITY) --- */}
      {
        isUnifiedAddModalOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            style={{ display: 'flex' }}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">Ajouter Personnel</h3>
                <button onClick={resetUnifiedModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto">
                {/* STEP 1: SEARCH */}
                {addStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Rechercher (Matricule ou CIN)</label>
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
                          placeholder="Ex: J123456 ou 102"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSearchWorker()}
                        />
                        <button onClick={handleSearchWorker} className="bg-gray-800 text-white px-4 rounded-lg font-bold hover:bg-gray-900">
                          <Search size={20} />
                        </button>
                      </div>
                    </div>

                    {/* RESULT DISPLAY */}
                    {searchResult && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-green-800 text-lg">
                            {searchResult.type === 'PERMANENT' ? searchResult.data.nom_monteur : searchResult.data.nom_complet}
                          </p>
                          <p className="text-sm text-green-700 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {searchResult.type === 'PERMANENT' ? 'Permanent (Staff)' : 'Intérimaire connu'}
                          </p>
                        </div>
                        <button
                          onClick={() => { setSelectedWorkerType(searchResult.type); setAddStep(2); }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-sm"
                        >
                          Sélectionner
                        </button>
                      </div>
                    )}

                    {!searchResult && searchQuery && (
                      <div className="text-center py-4">
                        <p className="text-gray-500 mb-4">Aucun résultat trouvé pour "{searchQuery}"</p>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => { setSelectedWorkerType('INTERIMAIRE'); setAddStep(2); }} className="w-full border border-gray-300 hover:bg-gray-50 p-3 rounded-lg font-bold text-gray-700 text-left flex justify-between items-center group">
                            <div>
                              <span className="block text-sm text-gray-500 font-normal">Créer Nouveau</span>
                              <span className="block">Intérimaire / Local</span>
                            </div>
                            <ArrowRight className="text-gray-300 group-hover:text-gray-600" />
                          </button>
                          <button onClick={() => { setSelectedWorkerType('PREVU'); setAddStep(2); }} className="w-full border border-gray-300 hover:bg-gray-50 p-3 rounded-lg font-bold text-gray-700 text-left flex justify-between items-center group">
                            <div>
                              <span className="block text-sm text-gray-500 font-normal">Planifier</span>
                              <span className="block">Prévu (Externe)</span>
                            </div>
                            <ArrowRight className="text-gray-300 group-hover:text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: CONFIRM / FILL */}
                {addStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-gray-800">
                        {selectedWorkerType === 'PERMANENT' ? 'Confirmer Affectation' : 'Nouveau Collaborateur'}
                      </h4>
                      <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">{selectedWorkerType}</span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                      <input
                        className="w-full border rounded-lg p-2 bg-gray-50"
                        value={newWorkerForm.nom}
                        onChange={e => setNewWorkerForm({ ...newWorkerForm, nom: e.target.value })}
                        disabled={selectedWorkerType === 'PERMANENT'} // Readonly for Perm
                      />
                    </div>

                    {selectedWorkerType !== 'PERMANENT' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CIN {selectedWorkerType === 'PREVU' && '(Optionnel)'}</label>
                        <input
                          className="w-full border rounded-lg p-2"
                          value={newWorkerForm.cin}
                          onChange={e => setNewWorkerForm({ ...newWorkerForm, cin: e.target.value })}
                          placeholder="AA12345"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coût Journalier (DH)</label>
                      <input
                        type="number"
                        className="w-full border rounded-lg p-2"
                        value={newWorkerForm.salaire}
                        onChange={e => setNewWorkerForm({ ...newWorkerForm, salaire: Number(e.target.value) })}
                        disabled={selectedWorkerType === 'PERMANENT'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Ville de résidence</label>
                      <input
                        type="text"
                        className="w-full border rounded-lg p-2"
                        value={newWorkerForm.ville}
                        onChange={e => setNewWorkerForm({ ...newWorkerForm, ville: e.target.value })}
                        placeholder="Ex: Tanger"
                        disabled={selectedWorkerType === 'PERMANENT'}
                      />
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button type="button" onClick={() => setAddStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Retour</button>
                      <button
                        type="button"
                        onClick={handleConfirmAddWorker}
                        disabled={isAddingWorker}
                        className={`flex-1 py-2 rounded-lg font-bold text-white transition-colors ${isAddingWorker ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-700 hover:bg-red-800'}`}
                      >
                        {isAddingWorker ? 'En cours...' : 'Valider'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default SiteDetail;
