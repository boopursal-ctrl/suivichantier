
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency } from '../utils';
import { Chantier } from '../types';
import { Plus, Search, Grid, List, MapPin, Calendar, User, ArrowRight, X, Info } from 'lucide-react';

interface SiteListProps {
  onSelectSite: (id: string) => void;
}

const SiteList: React.FC<SiteListProps> = ({ onSelectSite }) => {
  const { chantiers, clients, addChantier, deleteChantier, monteurs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('actif'); // Par défaut on montre les actifs
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Par défaut vue Grille (plus simple)
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Chantier Form State
  const [newChantier, setNewChantier] = useState<Partial<Chantier>>({
    statut: 'actif',
    trans_compta: 'Auto',
    documents_at_rc: false,
    vehicule_utilise: false,
    budget_prevu: 0,
    commentaire: '',
    adresse: ''
  });

  const filteredChantiers = chantiers.filter(chantier => {
    const matchesSearch = 
      chantier.ref_chantier.toLowerCase().includes(searchTerm.toLowerCase()) || 
      chantier.nom_client.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || chantier.statut === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateChantier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChantier.ref_chantier || !newChantier.id_client) return;

    const client = clients.find(c => c.id_client === newChantier.id_client);
    
    const chantierToAdd: Chantier = {
      ...newChantier as Chantier,
      id_chantier: Date.now().toString(),
      numero_ordre: chantiers.length + 1,
      nom_client: client?.nom_client || '',
      code_client: client?.code_client || '',
      ville_code: client?.ville_code || '000',
    };

    addChantier(chantierToAdd);
    setIsModalOpen(false);
    setNewChantier({ statut: 'actif', trans_compta: 'Auto', documents_at_rc: false, vehicule_utilise: false, budget_prevu: 0, commentaire: '', adresse: '' });
  };

  return (
    <div className="space-y-8">
      {/* En-tête avec titre et bouton principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-800">Mes Chantiers</h2>
           <p className="text-gray-500 text-lg">Gérez vos projets en cours et terminés.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-6 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 shadow-md font-bold text-md transition-transform hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          Créer un Chantier
        </button>
      </div>

      {/* Barre de Filtres Simplifiée */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Onglets Statut (Plus visuel qu'un select) */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
           {['actif', 'terminé', 'all'].map(status => (
             <button
               key={status}
               onClick={() => setStatusFilter(status)}
               className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                 statusFilter === status 
                   ? 'bg-white text-gray-900 shadow-sm' 
                   : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               {status === 'all' ? 'Tout' : status === 'actif' ? 'En Cours' : 'Terminés'}
             </button>
           ))}
        </div>

        {/* Recherche */}
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

        {/* Toggle Vue (Grille/Liste) */}
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
            /* VUE GRILLE (CARTES SIMPLIFIÉES) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChantiers.map(chantier => (
                <div 
                  key={chantier.id_chantier} 
                  onClick={() => onSelectSite(chantier.id_chantier)}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-red-200 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-white rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 z-0`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                       <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                         chantier.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                       }`}>
                         {chantier.statut}
                       </span>
                       <span className="text-gray-400 font-mono text-sm">#{chantier.numero_ordre}</span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-1">{chantier.ref_chantier}</h3>
                    <p className="text-red-700 font-medium mb-4 flex items-center">
                      <MapPin size={14} className="mr-1" /> {chantier.nom_client}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                       <div className="flex items-center text-gray-500">
                          <Calendar size={14} className="mr-2" />
                          {formatDate(chantier.date_debut)}
                       </div>
                       <div className="flex items-center text-gray-500">
                          <User size={14} className="mr-2" />
                          {chantier.responsable_chantier}
                       </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                       <div>
                         <p className="text-xs text-gray-400 uppercase">Budget Prévu</p>
                         <p className="font-bold text-gray-900">{formatCurrency(chantier.budget_prevu)}</p>
                       </div>
                       <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 group-hover:bg-red-700 group-hover:text-white transition-colors">
                          <ArrowRight size={16} />
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VUE LISTE CLASSIQUE (Pour info seulement) */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                       <tr>
                          <th className="px-6 py-4">Réf</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Responsable</th>
                          <th className="px-6 py-4">Budget</th>
                          <th className="px-6 py-4 text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {filteredChantiers.map(chantier => (
                          <tr key={chantier.id_chantier} className="hover:bg-gray-50">
                             <td className="px-6 py-4 font-bold text-gray-900">{chantier.ref_chantier}</td>
                             <td className="px-6 py-4">{chantier.nom_client}</td>
                             <td className="px-6 py-4">{chantier.responsable_chantier}</td>
                             <td className="px-6 py-4">{formatCurrency(chantier.budget_prevu)}</td>
                             <td className="px-6 py-4 text-right">
                                <button onClick={() => onSelectSite(chantier.id_chantier)} className="text-red-700 font-medium hover:underline">
                                   Ouvrir
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}
        </>
      )}

      {/* MODAL SIMPLIFIÉE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-xl text-gray-800">Démarrer un Chantier</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
             </div>
             
             <div className="bg-yellow-50 p-4 border-b border-yellow-100 text-xs text-yellow-800 flex items-start">
               <Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
               <p>Les données initiales (budget, dates, adresse) sont <strong>prévisionnelles</strong> et peuvent être ajustées en cours de chantier selon la livraison du site.</p>
             </div>

             <form onSubmit={handleCreateChantier} className="p-6 space-y-5 overflow-y-auto">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Référence du Chantier</label>
                   <input type="text" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none" 
                     value={newChantier.ref_chantier || ''} 
                     onChange={e => setNewChantier({...newChantier, ref_chantier: e.target.value})}
                     placeholder="Ex: 13-CLIENT-DATE"
                   />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Client</label>
                    <select required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white"
                      value={newChantier.id_client || ''}
                      onChange={e => setNewChantier({...newChantier, id_client: e.target.value})}
                    >
                      <option value="">Choisir dans la liste...</option>
                      {clients.map(c => <option key={c.id_client} value={c.id_client}>{c.nom_client}</option>)}
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Date Début</label>
                    <input type="date" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3"
                      value={newChantier.date_debut || ''}
                      onChange={e => setNewChantier({...newChantier, date_debut: e.target.value})}
                    />
                   </div>
                   <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 truncate">Date Fin (Prévisionnelle)</label>
                    <input type="date" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-3"
                      value={newChantier.date_fin || ''}
                      onChange={e => setNewChantier({...newChantier, date_fin: e.target.value})}
                    />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Adresse du Chantier (Spécifique)</label>
                   <input type="text" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none" 
                     value={newChantier.adresse || ''} 
                     onChange={e => setNewChantier({...newChantier, adresse: e.target.value})}
                     placeholder="Ex: Hangar 3, Zone Sud..."
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Budget Prévu (DH)</label>
                    <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3"
                      value={newChantier.budget_prevu}
                      onChange={e => setNewChantier({...newChantier, budget_prevu: parseFloat(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Responsable</label>
                    <select className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white"
                      value={newChantier.responsable_chantier || ''}
                      onChange={e => setNewChantier({...newChantier, responsable_chantier: e.target.value})}
                    >
                      <option value="">Qui gère ?</option>
                      {monteurs.map(m => <option key={m.matricule} value={m.nom_monteur}>{m.nom_monteur}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Commentaire / Observations (Facultatif)</label>
                  <textarea 
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none h-20 resize-none"
                    value={newChantier.commentaire || ''}
                    onChange={e => setNewChantier({...newChantier, commentaire: e.target.value})}
                    placeholder="Contraintes d'accès, disponibilité des dalles, etc."
                  />
                </div>
                
                <div className="pt-4">
                  <button type="submit" className="w-full py-4 bg-red-700 text-white rounded-xl font-bold text-lg hover:bg-red-800 shadow-lg transition-transform hover:scale-[1.02]">
                    Créer le Chantier
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteList;
