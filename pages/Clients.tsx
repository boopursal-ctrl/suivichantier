import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Client } from '../types';
import { Search, Building2, MapPin, Phone, Plus, Mail, CreditCard, X, Edit, Trash2 } from 'lucide-react';
import { CHANTIERS } from '../services/mockData';

const Clients: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({
    ville_code: '000',
  });

  const filteredClients = clients.filter(c => 
    c.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code_client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({
        id_client: Date.now().toString(),
        ville_code: '',
        code_client: '',
        nom_client: '',
        contact_responsable: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom_client || !formData.code_client) return;

    if (editingClient) {
      updateClient(formData as Client);
    } else {
      addClient({ ...formData, id_client: Date.now().toString() } as Client);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Répertoire Clients</h2>
          <p className="text-sm text-gray-500">Gestion de la base commerciale</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Client
        </button>
      </div>

      {/* Recherche */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom ou code..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Grille de cartes Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => {
          const chantierCount = CHANTIERS.filter(c => c.id_client === client.id_client).length;
          
          return (
            <div key={client.id_client} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full group">
              {/* Header Carte */}
              <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                 <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg flex items-center justify-center text-red-600 border border-red-100">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1" title={client.nom_client}>{client.nom_client}</h3>
                      <p className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">
                        {client.code_client}
                      </p>
                    </div>
                 </div>
                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(client)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => {if(confirm('Supprimer ce client ?')) deleteClient(client.id_client)}} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                 </div>
              </div>

              {/* Body Carte */}
              <div className="p-6 space-y-3 flex-1">
                 {client.ice && (
                   <div className="flex items-center text-sm text-gray-600">
                     <CreditCard className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                     <span className="truncate">ICE: {client.ice}</span>
                   </div>
                 )}
                 <div className="flex items-center text-sm text-gray-600">
                   <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                   <span className="truncate">{client.adresse || `Code Ville: ${client.ville_code}`}</span>
                 </div>
                 
                 <div className="pt-3 mt-3 border-t border-dashed border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contact</p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-700 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                        {client.contact_responsable}
                      </div>
                      {client.telephone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          {client.telephone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              {/* Footer Carte */}
              <div className="px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100 flex justify-between items-center">
                 <span className="text-xs font-medium text-gray-500">
                    {chantierCount} chantiers réalisés
                 </span>
                 <button className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wide">
                    Historique
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Formulaire */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">
                  {editingClient ? 'Modifier Client' : 'Nouveau Client'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Raison Sociale / Nom *</label>
                       <input 
                         type="text" required
                         className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                         value={formData.nom_client || ''}
                         onChange={e => setFormData({...formData, nom_client: e.target.value})}
                         placeholder="Ex: STEEP PLASTIQUE SARL"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Code Client *</label>
                       <input 
                         type="text" required
                         className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                         value={formData.code_client || ''}
                         onChange={e => setFormData({...formData, code_client: e.target.value})}
                         placeholder="Ex: C001"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">ICE (Maroc)</label>
                       <input 
                         type="text"
                         className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                         value={formData.ice || ''}
                         onChange={e => setFormData({...formData, ice: e.target.value})}
                         placeholder="0001234560000..."
                       />
                    </div>
                 </div>

                 <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                       <MapPin className="w-4 h-4 mr-1 text-gray-500"/> Adresse & Localisation
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                       <div className="col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Code Ville</label>
                          <input 
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.ville_code || ''}
                            onChange={e => setFormData({...formData, ville_code: e.target.value})}
                          />
                       </div>
                       <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse Complète</label>
                          <input 
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.adresse || ''}
                            onChange={e => setFormData({...formData, adresse: e.target.value})}
                            placeholder="Zone Industrielle..."
                          />
                       </div>
                    </div>
                 </div>

                 <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                       <Phone className="w-4 h-4 mr-1 text-gray-500"/> Contact Principal
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nom Responsable</label>
                          <input 
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.contact_responsable || ''}
                            onChange={e => setFormData({...formData, contact_responsable: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                          <input 
                            type="tel"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.telephone || ''}
                            onChange={e => setFormData({...formData, telephone: e.target.value})}
                            placeholder="06..."
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input 
                            type="email"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.email || ''}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            placeholder="@..."
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
      )}
    </div>
  );
};

export default Clients;