import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { monteurSchema } from '../schemas';
import { Monteur, TypeContrat, RoleMonteur, AffectationMonteur } from '../types';
import { Search, Plus, FileText, Camera, Printer, Trash2, Edit, Upload, Eye, HardHat, Hammer, Loader2, MapPin, Calendar, LayoutList, X, Users, AlertTriangle, ShieldAlert, Ban, ShieldCheck } from 'lucide-react';
import { formatDate } from '../utils';

const Monteurs: React.FC = () => {
  const PERMANENT_MANAGEMENT_MATRICULES = [100, 101, 102, 103, 104, 157];
  const { monteurs, addMonteur, updateMonteur, deleteMonteur, loadingData, refreshData, affectations, chantiers, interimaires, updateInterimaire, addInterimaire } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingMonteur, setEditingMonteur] = useState<Monteur | null>(null);
  const [selectedMonteurForContract, setSelectedMonteurForContract] = useState<Monteur | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'tracking' | 'interim'>('list');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Blacklist State
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [selectedInterimForBlacklist, setSelectedInterimForBlacklist] = useState<any>(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Monteur>>({
    actif: true,
    salaire_jour: 100,
    type_contrat: 'CDD',
    role_monteur: 'OUVRIER'
  });

  // Rafraîchir les données au chargement
  useEffect(() => {
    refreshData();
  }, []);

  // --- UNIFIED LIST LOGIC ---
  const unifiedList = React.useMemo(() => {
    // 1. Permanents
    const perms = monteurs.map(m => ({
      ...m,
      type_unified: 'PERMANENT',
      uniqueId: `perm-${m.matricule}`,
      originalObject: m
    }));

    // 2. Interimaires (Global)
    const interims = interimaires.map(i => ({
      ...i,
      nom_monteur: i.nom_complet, // Normalize
      matricule: i.id.substring(0, 8), // Fake matricule for display
      role_monteur: 'INTERIMAIRE',
      type_unified: 'INTERIMAIRE',
      type_contrat: 'Mission',
      actif: !i.is_blacklisted,
      salaire_jour: 0, // Varies
      uniqueId: `int-${i.id}`,
      originalObject: i
    }));

    // 3. Locals / Prevu (From Chantiers)
    const prevus = chantiers.flatMap(c => (c.monteurs_locaux || [])).map(ml => {
      // deduplicate if already in Global Interim (by CIN or exact ID match)
      if (ml.cin && interimaires.find(i => i.cin === ml.cin)) return null;
      if (interimaires.find(i => i.id === ml.id)) return null;

      return {
        ...ml,
        nom_monteur: ml.nom_complet,
        matricule: 'LOC-' + ml.id.slice(-4),
        role_monteur: ml.type || 'PREVU',
        type_unified: ml.type || 'PREVU',
        type_contrat: 'Journalier',
        actif: true,
        uniqueId: `loc-${ml.id}`,
        originalObject: ml
      };
    }).filter(x => x !== null);

    return [...perms, ...interims, ...prevus];
  }, [monteurs, interimaires, chantiers]);

  const filteredMonteurs = unifiedList.filter(m =>
    m.nom_monteur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(m.matricule).includes(searchTerm) ||
    m.cin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (monteur?: Monteur) => {
    if (monteur) {
      setEditingMonteur(monteur);
      // Convertir NULL en chaîne vide pour les inputs
      setFormData({
        ...monteur,
        date_naissance: monteur.date_naissance || '',
        cin: monteur.cin || '',
        telephone: monteur.telephone || '',
        scan_cin_recto: monteur.scan_cin_recto || '',
        scan_cin_verso: monteur.scan_cin_verso || '',
        ville_residence: monteur.ville_residence || ''
      });
    } else {
      setEditingMonteur(null);

      // Générer un nouveau matricule
      const maxMatricule = monteurs.length > 0
        ? Math.max(...monteurs.map(m => m.matricule))
        : 0;

      setFormData({
        matricule: maxMatricule + 1,
        nom_monteur: '',
        actif: true,
        salaire_jour: 100,
        type_contrat: 'CDD',
        role_monteur: 'OUVRIER',
        cin: '',
        telephone: '',
        date_naissance: '',
        date_debut_contrat: new Date().toISOString().split('T')[0],
        scan_cin_recto: '',
        scan_cin_verso: '',
        ville_residence: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      const monteurData: Monteur = {
        matricule: Number(formData.matricule),
        nom_monteur: formData.nom_monteur || '',
        telephone: formData.telephone || null,
        cin: formData.cin || null,
        date_naissance: formData.date_naissance || null,
        date_debut_contrat: formData.date_debut_contrat || new Date().toISOString().split('T')[0],
        type_contrat: (formData.type_contrat as TypeContrat) || 'CDD',
        role_monteur: (formData.role_monteur as RoleMonteur) || 'OUVRIER',
        salaire_jour: Number(formData.salaire_jour) || 100,
        actif: formData.actif !== false,
        scan_cin_recto: formData.scan_cin_recto || null,
        scan_cin_verso: formData.scan_cin_verso || null,
        ville_residence: formData.ville_residence || null,
        is_blacklisted: editingMonteur?.is_blacklisted || false,
        blacklist_reason: editingMonteur?.blacklist_reason || null
      };

      console.log('📝 Monteur data prepared:', monteurData);

      // --- VALIDATION ZOD ---
      const validation = monteurSchema.safeParse(monteurData);

      if (!validation.success) {
        // Afficher la première erreur trouvée pour ne pas spammer
        const firstError = validation.error.issues[0];
        toast.error(`Erreur: ${firstError.message}`);
        console.error("Validation errors:", validation.error.format());
        setIsSaving(false);
        return;
      }
      // ---------------------

      if (editingMonteur) {
        await updateMonteur(monteurData);
        toast.success("Collaborateur mis à jour avec succès");
      } else {
        await addMonteur(monteurData);
        toast.success("Collaborateur ajouté avec succès");
      }

      setIsModalOpen(false);
      setFormData({
        actif: true,
        salaire_jour: 100,
        type_contrat: 'CDD',
        role_monteur: 'OUVRIER'
      });

      // Rafraîchir les données
      await refreshData();

    } catch (error: any) {
      console.error('❌ Erreur lors de l\'enregistrement:', error);

      // Message d'erreur plus précis
      let errorMessage = 'Erreur lors de l\'enregistrement.';
      if (error.code === '22007') {
        errorMessage = 'Format de date invalide. Veuillez vérifier les dates.';
      } else if (error.message.includes('date')) {
        errorMessage = 'Problème avec une date. Les dates ne peuvent pas être vides.';
      }

      toast.error(`${errorMessage} (${error.message})`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (matricule: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce collaborateur ?')) {
      return;
    }

    setIsDeleting(matricule);
    try {
      await deleteMonteur(matricule);
      // Rafraîchir les données
      await refreshData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression. Voir la console pour plus de détails.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'recto' | 'verso') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Note: En production, vous devrez uploader vers Supabase Storage
      const imageUrl = URL.createObjectURL(file);

      if (side === 'recto') {
        setFormData(prev => ({ ...prev, scan_cin_recto: imageUrl }));
      } else {
        setFormData(prev => ({ ...prev, scan_cin_verso: imageUrl }));
      }
    }
  };

  const handleGenerateContract = (monteur: Monteur) => {
    setSelectedMonteurForContract(monteur);
    setIsContractModalOpen(true);
  };

  const printContract = () => {
    window.print();
  };

  const handleBlacklistAction = (monteur: any) => {
    setSelectedInterimForBlacklist(monteur); // Use the unified wrapper to track type
    // determine current blacklist status
    const isBlacklisted = monteur.type_unified === 'PERMANENT'
      ? monteur.is_blacklisted
      : (monteur.originalObject?.is_blacklisted || false);

    // If Prevu, they are not blacklisted yet by definition unless linked, but here we assume new blacklist.

    setBlacklistReason(monteur.originalObject?.blacklist_reason || monteur.blacklist_reason || '');
    setBlacklistModalOpen(true);
  };

  const confirmBlacklist = async () => {
    if (!selectedInterimForBlacklist) return;

    const worker = selectedInterimForBlacklist;
    const currentStatus = worker.type_unified === 'PERMANENT'
      ? worker.is_blacklisted
      : worker.originalObject?.is_blacklisted;

    const newStatus = !currentStatus;

    try {
      if (worker.type_unified === 'PERMANENT') {
        await updateMonteur({
          ...worker.originalObject,
          is_blacklisted: newStatus,
          blacklist_reason: newStatus ? blacklistReason : null
        });
        toast.success(newStatus ? "Collaborateur blacklisté" : "Collaborateur réhabilité");
      }
      else if (worker.type_unified === 'INTERIMAIRE') {
        await updateInterimaire({
          ...worker.originalObject,
          is_blacklisted: newStatus,
          blacklist_reason: newStatus ? blacklistReason : null
        });
        toast.success(newStatus ? "Intérimaire blacklisté" : "Intérimaire réhabilité");
      }
      else if (worker.type_unified === 'PREVU') {
        if (!newStatus) return; // Cannot unban a Prevu who isn't banned (and if they were banned, they'd be Interim)

        // Promote to Global Blacklist
        await addInterimaire({
          id: crypto.randomUUID(),
          cin: worker.cin || 'NO-CIN-' + Date.now(),
          nom_complet: worker.nom_monteur,
          is_blacklisted: true,
          blacklist_reason: blacklistReason
        });
        toast.success("Ajouté à la Liste Noire Globale");
      }

      setBlacklistModalOpen(false);
      refreshData();
    } catch (e) {
      console.error("Error blacklisting", e);
      toast.error("Erreur lors de l'opération");
    }
  };

  // Afficher un loader pendant le chargement
  if (loadingData && monteurs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="loader border-4 border-gray-200 border-t-red-600 rounded-full w-12 h-12 animate-spin"></div>
        <p className="mt-4 text-gray-600">Chargement des collaborateurs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Équipe & RH</h2>
          <p className="text-sm text-gray-500">Gestion des monteurs et chefs de chantiers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            disabled={loadingData}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5 mr-2" />
            Importer Liste
          </button>
          <button
            onClick={() => handleOpenModal()}
            disabled={loadingData}
            className="flex items-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 shadow-sm transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter Collaborateur
          </button>
        </div>
      </div>

      {/* TABS HEADER */}
      {/* TABS HEADER */}
      {/* TABS HEADER REMOVED - SINGLE LIST VIEW */}

      {/* Import Handle logic */}
      {isImportModalOpen && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={async (importedData) => {
            if (!confirm(`Confirmer l'ajout de ${importedData.length} collaborateurs ?`)) return;

            let startMatricule = monteurs.length > 0 ? Math.max(...monteurs.map(m => m.matricule)) + 1 : 1;
            let count = 0;

            for (const m of importedData) {
              try {
                await addMonteur({
                  ...m,
                  matricule: startMatricule + count,
                  actif: true,
                  salaire_jour: 100, // Defaut Fixe
                  type_contrat: 'CDI', // Defaut
                  date_debut_contrat: new Date().toISOString().split('T')[0]
                });
                count++;
              } catch (e) {
                console.error(`Error importing ${m.nom_monteur}`, e);
              }
            }

            setIsImportModalOpen(false);
            refreshData();
            alert(`${count} collaborateurs importés avec succès !`);
          }}
        />
      )}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, matricule ou CIN..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            disabled={loadingData}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Profil</th>
                  <th className="px-6 py-4 font-semibold">Identité</th>
                  <th className="px-6 py-4 font-semibold">Poste</th>
                  <th className="px-6 py-4 font-semibold">Contrat</th>
                  <th className="px-6 py-4 font-semibold">Documents</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMonteurs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {loadingData ? 'Chargement...' : 'Aucun collaborateur trouvé'}
                    </td>
                  </tr>
                ) : (
                  filteredMonteurs.map(monteur => {
                    const isChef = monteur.role_monteur === 'CHEF_CHANTIER';
                    const isBeingDeleted = isDeleting === monteur.matricule;

                    return (
                      <tr key={monteur.matricule} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${isChef ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {monteur.nom_monteur.substring(0, 2)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{monteur.nom_monteur}</span>
                            {monteur.type_unified !== 'PREVU' && (
                              <span className="text-xs text-gray-400 font-mono">Mat: {monteur.matricule}</span>
                            )}
                            {monteur.cin && <span className="text-xs text-gray-500">CIN: {monteur.cin}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {monteur.role_monteur === 'CHEF_CHANTIER' && monteur.type_unified === 'PERMANENT' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              <HardHat className="w-3 h-3 mr-1" /> Chef de Chantier
                            </span>
                          ) : (monteur.role_monteur === 'INTERIMAIRE' || monteur.type_unified === 'INTERIMAIRE') ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              <HardHat className="w-3 h-3 mr-1" /> Intérimaire
                            </span>
                          ) : (monteur.role_monteur === 'PREVU' || monteur.type_unified === 'PREVU') ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              <Users className="w-3 h-3 mr-1" /> Prévu / Extra
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <Hammer className="w-3 h-3 mr-1" /> Monteur
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{monteur.type_contrat}</span>
                            <span className="text-xs text-gray-500">{monteur.salaire_jour} DH / Jour</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <div title="Recto" className={`w-3 h-3 rounded-full ${monteur.scan_cin_recto ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div title="Verso" className={`w-3 h-3 rounded-full ${monteur.scan_cin_verso ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {monteur.type_unified !== 'PREVU' && !PERMANENT_MANAGEMENT_MATRICULES.includes(Number(monteur.matricule)) && (
                              <button
                                onClick={() => handleGenerateContract(monteur)}
                                className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Générer Contrat"
                                disabled={isBeingDeleted}
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenModal(monteur)}
                              className="p-2 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Modifier"
                              disabled={isBeingDeleted}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(monteur.matricule)}
                              className={`p-2 ${isBeingDeleted ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-600 hover:bg-red-50'} text-gray-500 bg-gray-50 rounded`}
                              title="Supprimer"
                              disabled={isBeingDeleted}
                            >
                              {isBeingDeleted ? (
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>

                            {/* Blacklist Button for Everyone */}
                            <button
                              onClick={() => handleBlacklistAction(monteur)}
                              className={`p-2 rounded ${(monteur.is_blacklisted || monteur.originalObject?.is_blacklisted) ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50'}`}
                              title={(monteur.is_blacklisted || monteur.originalObject?.is_blacklisted) ? "Réhabiliter" : "Blacklister"}
                            >
                              {(monteur.is_blacklisted || monteur.originalObject?.is_blacklisted) ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>






      {/* Modal Ajout/Modif Monteur */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">
                  {editingMonteur ? 'Modifier Collaborateur' : 'Nouveau Collaborateur'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  disabled={isSaving}
                >
                  &times;
                </button>
              </div>

              <div className="p-6">
                <form onSubmit={handleSave} className="space-y-6">

                  {/* Section Identité */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide border-b pb-1">Identité & Rôle</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                        <input
                          type="number"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                          value={formData.matricule || ''}
                          disabled={true}
                        />
                        <p className="text-xs text-gray-400 mt-1">Généré automatiquement</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                        <input
                          type="text"
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                          value={formData.nom_monteur || ''}
                          onChange={e => setFormData({ ...formData, nom_monteur: e.target.value })}
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1 bg-yellow-50 px-2 py-0.5 rounded-md w-fit">Poste / Rôle</label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-medium disabled:bg-gray-100"
                          value={formData.role_monteur || 'OUVRIER'}
                          onChange={e => setFormData({ ...formData, role_monteur: e.target.value as RoleMonteur })}
                          disabled={isSaving}
                        >
                          <option value="OUVRIER">👷 Monteur / Ouvrier</option>
                          <option value="CHEF_CHANTIER">👷‍♂️ Chef de Chantier</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase disabled:bg-gray-100"
                          value={formData.cin || ''}
                          onChange={e => setFormData({ ...formData, cin: e.target.value })}
                          placeholder="Ex: J12345"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <input
                          type="tel"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                          value={formData.telephone || ''}
                          onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                          placeholder="06..."
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                          value={formData.date_naissance || ''}
                          onChange={e => setFormData({ ...formData, date_naissance: e.target.value })}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville de résidence</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                        value={formData.ville_residence || ''}
                        onChange={e => setFormData({ ...formData, ville_residence: e.target.value })}
                        placeholder="Ex: Casablanca"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  {/* Section Documents */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide border-b pb-1 flex items-center">
                      <Camera className="w-4 h-4 mr-2" /> Documents (Carte Nationale)
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Recto */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative group">
                        {formData.scan_cin_recto ? (
                          <div className="relative">
                            <img src={formData.scan_cin_recto} alt="CIN Recto" className="h-40 w-full object-cover rounded-md mb-2" />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, scan_cin_recto: '' })}
                              className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                              disabled={isSaving}
                            >
                              <Trash2 size={16} />
                            </button>
                            <span className="text-xs font-semibold text-green-600">CIN Recto chargée</span>
                          </div>
                        ) : (
                          <div className="h-40 flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">Ajouter CIN Recto</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                              onChange={(e) => handleFileUpload(e, 'recto')}
                              disabled={isSaving}
                            />
                          </div>
                        )}
                      </div>

                      {/* Verso */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative group">
                        {formData.scan_cin_verso ? (
                          <div className="relative">
                            <img src={formData.scan_cin_verso} alt="CIN Verso" className="h-40 w-full object-cover rounded-md mb-2" />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, scan_cin_verso: '' })}
                              className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                              disabled={isSaving}
                            >
                              <Trash2 size={16} />
                            </button>
                            <span className="text-xs font-semibold text-green-600">CIN Verso chargée</span>
                          </div>
                        ) : (
                          <div className="h-40 flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">Ajouter CIN Verso</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                              onChange={(e) => handleFileUpload(e, 'verso')}
                              disabled={isSaving}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section Contrat */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide border-b pb-1">Contrat & Salaire</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Salaire removed as requested - using default in background if needed */}
                      <div className="hidden">
                        <input type="number" value={formData.salaire_jour || 100} onChange={() => { }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type de Contrat</label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                          value={formData.type_contrat || 'CDD'}
                          onChange={e => setFormData({ ...formData, type_contrat: e.target.value as TypeContrat })}
                          disabled={isSaving}
                        >
                          <option value="CDD">CDD</option>
                          <option value="CDI">CDI</option>
                          <option value="ANAPEC">ANAPEC</option>
                          <option value="FREELANCE">Freelance / Journalier</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                          value={formData.date_debut_contrat || ''}
                          onChange={e => setFormData({ ...formData, date_debut_contrat: e.target.value })}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      disabled={isSaving}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        'Enregistrer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div >
        )
      }

      {/* Modal Contrat */}
      {
        isContractModalOpen && selectedMonteurForContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-bold text-lg">Aperçu du Contrat - {selectedMonteurForContract.nom_monteur}</h3>
                <div className="flex gap-2">
                  <button onClick={printContract} className="flex items-center px-3 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700">
                    <Printer className="w-4 h-4 mr-2" /> Imprimer
                  </button>
                  <button onClick={() => setIsContractModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-800">
                    &times;
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50 font-serif text-sm leading-relaxed" id="contract-print-area">
                <div className="max-w-2xl mx-auto bg-white p-12 shadow-sm min-h-full">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase underline mb-2">Contrat de Travail {selectedMonteurForContract.type_contrat}</h1>
                    <p className="text-gray-500">Société 3F INDUSTRIE</p>
                  </div>

                  <p className="mb-4">Entre les soussignés :</p>

                  <p className="mb-4">
                    <strong>1. La société 3F INDUSTRIE</strong>, sise à Casablanca, représentée par son Gérant.<br />
                    Ci-après dénommée "L'Employeur".
                  </p>

                  <p className="mb-4">Et :</p>

                  <p className="mb-4">
                    <strong>2. Monsieur {selectedMonteurForContract.nom_monteur}</strong><br />
                    Titulaire de la CIN n° <strong>{selectedMonteurForContract.cin || '______________'}</strong><br />
                    Demeurant à ________________________________________<br />
                    Ci-après dénommé "Le Salarié".
                  </p>

                  <p className="mb-6">Il a été convenu et arrêté ce qui suit :</p>

                  <h4 className="font-bold mb-2">Article 1 : Engagement</h4>
                  <p className="mb-4">Le Salarié est engagé en qualité de <strong>{selectedMonteurForContract.role_monteur === 'CHEF_CHANTIER' ? 'Chef de Chantier' : 'Monteur Qualifié'}</strong> à compter du <strong>{formatDate(selectedMonteurForContract.date_debut_contrat || new Date().toISOString())}</strong>.</p>

                  <h4 className="font-bold mb-2">Article 2 : Rémunération</h4>
                  <p className="mb-4">Le Salarié percevra un salaire journalier net de <strong>{selectedMonteurForContract.salaire_jour} DH</strong>.</p>

                  <h4 className="font-bold mb-2">Article 3 : Lieu de travail</h4>
                  <p className="mb-4">Le lieu de travail est mobile selon les chantiers de la société à travers le Royaume du Maroc.</p>

                  <div className="mt-12 flex justify-between">
                    <div className="text-center">
                      <p className="font-bold mb-8">L'Employeur</p>
                      <p className="text-xs text-gray-400">(Cachet et Signature)</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold mb-8">Le Salarié</p>
                      <p className="text-xs text-gray-400">(Lu et approuvé)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Modal Blacklist */}
      {blacklistModalOpen && selectedInterimForBlacklist && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              {selectedInterimForBlacklist.is_blacklisted || selectedInterimForBlacklist.originalObject?.is_blacklisted ? 'Réhabiliter Collaborateur' : 'Mettre en Blacklist'}
            </h3>

            {!(selectedInterimForBlacklist.is_blacklisted || selectedInterimForBlacklist.originalObject?.is_blacklisted) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif du blacklistage (Obligatoire)</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  rows={3}
                  value={blacklistReason}
                  onChange={e => setBlacklistReason(e.target.value)}
                  placeholder="Ex: Vol de matériel, Absentéisme, Comportement..."
                ></textarea>
                {selectedInterimForBlacklist.type_unified === 'PREVU' && (
                  <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded">
                    ⚠️ Ce collaborateur "Prévu" sera ajouté à la <strong>Liste Noire Globale</strong> des intérimaires pour empêcher toute affectation future.
                  </p>
                )}
              </div>
            )}

            {(selectedInterimForBlacklist.is_blacklisted || selectedInterimForBlacklist.originalObject?.is_blacklisted) && (
              <p className="text-gray-600 mb-6">Voulez-vous vraiment retirer <strong>{selectedInterimForBlacklist.nom_monteur}</strong> de la liste noire ?</p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setBlacklistModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button
                onClick={confirmBlacklist}
                disabled={!(selectedInterimForBlacklist.is_blacklisted || selectedInterimForBlacklist.originalObject?.is_blacklisted) && !blacklistReason.trim()}
                className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm ${(selectedInterimForBlacklist.is_blacklisted || selectedInterimForBlacklist.originalObject?.is_blacklisted) ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

const ImportModal: React.FC<{ isOpen: boolean; onClose: () => void; onImport: (data: any[]) => void }> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');

  const handleProcess = () => {
    // Parse CSV (Matricule is auto-generated so we expect: Nom, CIN, Tel, Ville, Poste)
    // Format: Nom, CIN, Tel, Ville (Poste optional defaults to OUVRIER)
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const data = lines.map(line => {
      const parts = line.split(/[;,]/).map(p => p.trim()); // Split by comma or semicolon
      if (parts.length < 1) return null;
      return {
        nom_monteur: parts[0],
        cin: parts[1] || '',
        telephone: parts[2] || '',
        ville_residence: parts[3] || '',
        role_monteur: (parts[4]?.toUpperCase().includes('CHEF') ? 'CHEF_CHANTIER' : 'OUVRIER') as RoleMonteur
      };
    }).filter(d => d !== null && d.nom_monteur);

    if (data.length === 0) {
      alert("Aucune donnée valide trouvée. Vérifiez le format.");
      return;
    }

    onImport(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 flex flex-col h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-800">Importer Collaborateurs (CSV)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800 border border-blue-100">
          <p className="font-bold mb-1">Format attendu (par ligne) :</p>
          <code className="bg-white px-2 py-1 rounded border border-blue-200 block mb-2">
            Nom Complet, CIN, Téléphone, Ville, Poste
          </code>
          <p className="text-xs">Exemple: <br />Ahmed Alami, J12345, 0611223344, Casablanca, Ouvrier<br />Karim Benani, JB98765, 0699887766, Tanger, Chef</p>
        </div>

        <textarea
          className="flex-1 w-full border rounded-xl p-4 font-mono text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="Collez votre liste ici..."
          value={text}
          onChange={e => setText(e.target.value)}
        />

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={handleProcess} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center">
            <Upload className="w-4 h-4 mr-2" /> Traiter {text.split('\n').filter(x => x.trim()).length > 0 ? `(${text.split('\n').filter(x => x.trim()).length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

interface MonteurTrackingProps {
  monteurs: Monteur[];
  affectations: AffectationMonteur[];
  chantiers: any[];
}

const MonteurTracking: React.FC<MonteurTrackingProps> = ({ monteurs, affectations, chantiers }) => {
  const [filter, setFilter] = useState<'tous' | 'actifs' | 'disponibles'>('tous');

  // Enrichir les données
  const enrichedMonteurs = monteurs.map(m => {
    // Trouver l'affectation active
    // Active si: date_entree <= today AND (date_sortie >= today OR date_sortie is null)
    const today = new Date().toISOString().split('T')[0];

    // Sort assignments by date desc to get latest
    const assignments = affectations
      .filter(a => a.matricule === m.matricule)
      .sort((a, b) => new Date(b.date_entree).getTime() - new Date(a.date_entree).getTime());

    const activeAssignment = assignments.find(a => {
      const start = a.date_entree;
      const end = a.date_sortie;
      return start <= today && (!end || end >= today);
    });

    const chantier = activeAssignment ? chantiers.find(c => c.id_chantier === activeAssignment.id_chantier) : null;

    return {
      ...m,
      status: activeAssignment ? 'ACTIF' : 'DISPONIBLE',
      chantier: chantier,
      assignment: activeAssignment
    };
  });

  const filteredList = enrichedMonteurs.filter(m => {
    if (filter === 'actifs') return m.status === 'ACTIF';
    if (filter === 'disponibles') return m.status === 'DISPONIBLE';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setFilter('tous')} className={`px-4 py-2 rounded-lg font-bold text-sm ${filter === 'tous' ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Tous</button>
        <button onClick={() => setFilter('actifs')} className={`px-4 py-2 rounded-lg font-bold text-sm ${filter === 'actifs' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>En Mission</button>
        <button onClick={() => setFilter('disponibles')} className={`px-4 py-2 rounded-lg font-bold text-sm ${filter === 'disponibles' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Disponibles</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Collaborateur</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
              <th className="px-6 py-4 font-semibold">Chantier Actuel</th>
              <th className="px-6 py-4 font-semibold">Période</th>
              <th className="px-6 py-4 font-semibold">Zone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredList.map(m => (
              <tr key={m.matricule} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${m.status === 'ACTIF' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                      {m.matricule}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{m.nom_monteur}</p>
                      <p className="text-xs text-gray-500">{m.role_monteur}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {m.status === 'ACTIF' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      En Mission
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Disponible
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {m.chantier ? (
                    <div>
                      <p className="font-bold text-gray-800">{m.chantier.nom_client}</p>
                      <p className="text-xs text-gray-500">{m.chantier.ref_chantier}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {m.assignment ? (
                    <span>Depuis le {formatDate(m.assignment.date_entree)}</span>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {m.assignment ? (
                    <span className="flex items-center"><MapPin size={14} className="mr-1" /> {m.assignment.zone_travail}</span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const InterimManagement: React.FC<{ interimaires: any[], onUpdate: (i: any) => Promise<void> }> = ({ interimaires, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [selectedInterim, setSelectedInterim] = useState<any>(null);
  const [reason, setReason] = useState('');

  const filtered = interimaires.filter(i =>
    i.nom_complet.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBlacklistAction = (interim: any) => {
    setSelectedInterim(interim);
    setReason(interim.blacklist_reason || '');
    setBlacklistModalOpen(true);
  };

  const confirmBlacklist = async () => {
    if (!selectedInterim) return;

    // Toggle status
    const newStatus = !selectedInterim.is_blacklisted;
    await onUpdate({
      ...selectedInterim,
      is_blacklisted: newStatus,
      blacklist_reason: newStatus ? reason : null
    });

    setBlacklistModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par Nom ou CIN..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Total: {filtered.length} intérimaires
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Identité</th>
              <th className="px-6 py-4 font-semibold">CIN</th>
              <th className="px-6 py-4 font-semibold">Statut Blacklist</th>
              <th className="px-6 py-4 font-semibold">Motif</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(i => (
              <tr key={i.id} className={`hover:bg-gray-50 ${i.is_blacklisted ? 'bg-red-50' : ''}`}>
                <td className="px-6 py-4 font-bold text-gray-900">{i.nom_complet}</td>
                <td className="px-6 py-4 font-mono text-gray-600">{i.cin}</td>
                <td className="px-6 py-4">
                  {i.is_blacklisted ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm">
                      <ShieldAlert className="w-3 h-3 mr-1" /> BLACKLISTÉ
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      OK
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-red-700 italic text-xs">
                  {i.is_blacklisted ? i.blacklist_reason : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleBlacklistAction(i)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${i.is_blacklisted ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                  >
                    {i.is_blacklisted ? 'Réhabiliter' : 'Blacklister'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Blacklist */}
      {blacklistModalOpen && selectedInterim && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              {selectedInterim.is_blacklisted ? 'Réhabiliter Intérimaire' : 'Mettre en Blacklist'}
            </h3>

            {!selectedInterim.is_blacklisted && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif du blacklistage (Obligatoire)</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: Vol de matériel, Absentéisme, Comportement..."
                ></textarea>
              </div>
            )}

            {selectedInterim.is_blacklisted && (
              <p className="text-gray-600 mb-6">Voulez-vous vraiment retirer <strong>{selectedInterim.nom_complet}</strong> de la liste noire ?</p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setBlacklistModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button
                onClick={confirmBlacklist}
                disabled={!selectedInterim.is_blacklisted && !reason.trim()}
                className={`px-4 py-2 text-white font-bold rounded-lg shadow-sm ${selectedInterim.is_blacklisted ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Monteurs;
