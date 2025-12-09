import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Monteur, TypeContrat, RoleMonteur } from '../types';
import { Search, Plus, FileText, Camera, Printer, Trash2, Edit, Upload, Eye, HardHat, Hammer } from 'lucide-react';
import { formatDate } from '../utils';

const Monteurs: React.FC = () => {
  const { monteurs, addMonteur, updateMonteur, deleteMonteur, loadingData, refreshData } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingMonteur, setEditingMonteur] = useState<Monteur | null>(null);
  const [selectedMonteurForContract, setSelectedMonteurForContract] = useState<Monteur | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Monteur>>({
    actif: true,
    salaire_jour: 100,
    type_contrat: 'CDD',
    role_monteur: 'OUVRIER'
  });

  // Rafraîchir les données au chargement
  useEffect(() => {
    if (refreshData) {
      refreshData();
    }
  }, []);

  const filteredMonteurs = monteurs.filter(m => 
    m.nom_monteur.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.matricule.toString().includes(searchTerm) ||
    (m.cin && m.cin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (monteur?: Monteur) => {
    if (monteur) {
      setEditingMonteur(monteur);
      setFormData(monteur);
    } else {
      setEditingMonteur(null);
      
      // Générer un nouveau matricule
      const maxMatricule = monteurs.length > 0 
        ? Math.max(...monteurs.map(m => m.matricule))
        : 0;
      
      setFormData({
        matricule: maxMatricule + 1,
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
        nom_monteur: ''
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

    try {
      const monteurData: Monteur = {
        matricule: Number(formData.matricule),
        nom_monteur: formData.nom_monteur,
        telephone: formData.telephone || '',
        cin: formData.cin || '',
        date_naissance: formData.date_naissance || '',
        date_debut_contrat: formData.date_debut_contrat || new Date().toISOString().split('T')[0],
        type_contrat: formData.type_contrat || 'CDD',
        role_monteur: formData.role_monteur || 'OUVRIER',
        salaire_jour: Number(formData.salaire_jour) || 100,
        actif: formData.actif !== false,
        scan_cin_recto: formData.scan_cin_recto || '',
        scan_cin_verso: formData.scan_cin_verso || ''
      };

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
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      alert('Erreur lors de l\'enregistrement. Voir la console pour plus de détails.');
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
      if (refreshData) {
        await refreshData();
      }
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
                            <button 
                              onClick={() => handleGenerateContract(monteur)} 
                              className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded" 
                              title="Générer Contrat"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleOpenModal(monteur)} 
                              className="p-2 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded" 
                              title="Modifier"
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

      {/* Modal Ajout/Modif Monteur - La partie formulaire reste identique */}
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
                          type="number" 
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                          value={formData.matricule || ''}
                          onChange={e => setFormData({...formData, matricule: parseInt(e.target.value)})}
                          disabled={!!editingMonteur} // Empêche la modification du matricule en édition
                        />
                      </div>
                      {/* ... reste du formulaire inchangé ... */}
                   </div>
                </div>
                {/* ... reste du modal inchangé ... */}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contrat - inchangé */}
      {isContractModalOpen && selectedMonteurForContract && (
        {/* ... modal contrat inchangé ... */}
      )}
    </div>
  );
};

export default Monteurs;
