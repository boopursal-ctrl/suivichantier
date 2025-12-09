import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Monteur, TypeContrat, RoleMonteur } from '../types';
import { Search, Plus, FileText, Camera, Printer, Trash2, Edit, Upload, Eye, HardHat, Hammer } from 'lucide-react';
import { formatDate } from '../utils';

const Monteurs: React.FC = () => {
  const { monteurs, addMonteur, updateMonteur, deleteMonteur, affectations, chantiers } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingMonteur, setEditingMonteur] = useState<Monteur | null>(null);
  const [selectedMonteurForContract, setSelectedMonteurForContract] = useState<Monteur | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Monteur>>({
    actif: true,
    salaire_jour: 100,
    type_contrat: 'CDD',
    role_monteur: 'OUVRIER'
  });

  const filteredMonteurs = monteurs.filter(m => 
    m.nom_monteur.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.matricule.toString().includes(searchTerm)
  );

  const handleOpenModal = (monteur?: Monteur) => {
    if (monteur) {
      setEditingMonteur(monteur);
      setFormData(monteur);
    } else {
      setEditingMonteur(null);
      setFormData({
        matricule: Math.max(...monteurs.map(m => m.matricule)) + 1,
        actif: true,
        salaire_jour: 100,
        type_contrat: 'CDD',
        role_monteur: 'OUVRIER',
        cin: '',
        telephone: '',
        date_naissance: '',
        scan_cin_recto: '',
        scan_cin_verso: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.nom_monteur || !formData.matricule) {
    alert('Veuillez remplir le nom et le matricule');
    return;
  }

  setIsSaving(true);
  
  try {
    const monteurData: Monteur = {
      matricule: Number(formData.matricule),
      nom_monteur: formData.nom_monteur,
      telephone: formData.telephone || null, // ← NULL au lieu de chaîne vide
      cin: formData.cin || null, // ← NULL au lieu de chaîne vide
      date_naissance: formData.date_naissance || null, // ← NULL si vide
      date_debut_contrat: formData.date_debut_contrat || new Date().toISOString().split('T')[0],
      type_contrat: formData.type_contrat as TypeContrat || 'CDD',
      role_monteur: formData.role_monteur as RoleMonteur || 'OUVRIER',
      salaire_jour: Number(formData.salaire_jour) || 100,
      actif: formData.actif !== false,
      scan_cin_recto: formData.scan_cin_recto || null, // ← NULL
      scan_cin_verso: formData.scan_cin_verso || null // ← NULL
    };

    console.log('📝 Monteur data prepared:', monteurData);

    if (editingMonteur) {
      await updateMonteur(monteurData);
    } else {
      await addMonteur(monteurData);
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
    
    alert(`${errorMessage}\n\nDétails: ${error.message || 'Erreur inconnue'}`);
  } finally {
    setIsSaving(false);
  }
};

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'recto' | 'verso') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Create a fake URL for display purposes in this frontend-only app
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Équipe & RH</h2>
           <p className="text-sm text-gray-500">Gestion des monteurs et chefs de chantiers</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 shadow-sm transition-colors font-bold"
        >
          <Plus className="w-5 h-5 mr-2" />
          Ajouter Collaborateur
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, matricule ou CIN..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                {filteredMonteurs.map(monteur => {
                  const isChef = monteur.role_monteur === 'CHEF_CHANTIER';
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
                          <span className="text-xs text-gray-400 font-mono">Mat: {monteur.matricule}</span>
                          {monteur.cin && <span className="text-xs text-gray-500">CIN: {monteur.cin}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isChef ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            <HardHat className="w-3 h-3 mr-1" /> Chef de Chantier
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
                          <button onClick={() => handleGenerateContract(monteur)} className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded" title="Générer Contrat">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenModal(monteur)} className="p-2 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded" title="Modifier">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteMonteur(monteur.matricule)} className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Ajout/Modif Monteur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingMonteur ? 'Modifier Collaborateur' : 'Nouveau Collaborateur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
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
                          type="number" required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                          value={formData.matricule}
                          onChange={e => setFormData({...formData, matricule: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                        <input 
                          type="text" required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          value={formData.nom_monteur || ''}
                          onChange={e => setFormData({...formData, nom_monteur: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1 bg-yellow-50 px-2 py-0.5 rounded-md w-fit">Poste / Rôle</label>
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-medium"
                          value={formData.role_monteur || 'OUVRIER'}
                          onChange={e => setFormData({...formData, role_monteur: e.target.value as RoleMonteur})}
                        >
                          <option value="OUVRIER">👷 Monteur / Ouvrier</option>
                          <option value="CHEF_CHANTIER">👷‍♂️ Chef de Chantier</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                        <input 
                          type="text" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase"
                          value={formData.cin || ''}
                          onChange={e => setFormData({...formData, cin: e.target.value})}
                          placeholder="Ex: J12345"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <input 
                          type="tel" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          value={formData.telephone || ''}
                          onChange={e => setFormData({...formData, telephone: e.target.value})}
                          placeholder="06..."
                        />
                      </div>
                   </div>
                </div>

                {/* Section Documents (New) */}
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
                                onClick={() => setFormData({...formData, scan_cin_recto: ''})}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16}/>
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
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, 'recto')}
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
                                onClick={() => setFormData({...formData, scan_cin_verso: ''})}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16}/>
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
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, 'verso')}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salaire Journalier (DH)</label>
                      <input 
                        type="number" required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={formData.salaire_jour}
                        onChange={e => setFormData({...formData, salaire_jour: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type de Contrat</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={formData.type_contrat || 'CDD'}
                        onChange={e => setFormData({...formData, type_contrat: e.target.value as TypeContrat})}
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
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={formData.date_debut_contrat || ''}
                        onChange={e => setFormData({...formData, date_debut_contrat: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
                  <button type="submit" className="px-4 py-2 text-white bg-red-700 rounded-lg hover:bg-red-800">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contrat */}
      {isContractModalOpen && selectedMonteurForContract && (
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
                  <strong>1. La société 3F INDUSTRIE</strong>, sise à Casablanca, représentée par son Gérant.<br/>
                  Ci-après dénommée "L'Employeur".
                </p>

                <p className="mb-4">Et :</p>

                <p className="mb-4">
                  <strong>2. Monsieur {selectedMonteurForContract.nom_monteur}</strong><br/>
                  Titulaire de la CIN n° <strong>{selectedMonteurForContract.cin || '______________'}</strong><br/>
                  Demeurant à ________________________________________<br/>
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
      )}
    </div>
  );
};

export default Monteurs;
