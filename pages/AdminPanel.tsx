
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { User, UserRole, AppModule } from '../types';
import { Shield, UserPlus, Trash2, Mail, CheckCircle, XCircle, Edit, Save, X } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { users, addUser, updateUser, deleteUser } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Default new user state
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'USER',
    isActive: true,
    allowedModules: ['dashboard']
  });

  const availableModules: {id: AppModule, label: string}[] = [
    { id: 'dashboard', label: 'Tableau de Bord' },
    { id: 'chantiers', label: 'Gestion Chantiers' },
    { id: 'stock', label: 'Stock & Matériel' },
    { id: 'clients', label: 'Clients' },
    { id: 'monteurs', label: 'Ressources Humaines' },
    { id: 'rapports', label: 'Rapports Financiers' },
    { id: 'admin', label: 'Administration' },
  ];

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'USER',
        isActive: true,
        allowedModules: ['dashboard', 'chantiers'] // Default modules for new user
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingUser) {
      updateUser({ ...editingUser, ...formData } as User);
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        password: '123', // Default
        name: formData.name!,
        email: formData.email!,
        role: formData.role as UserRole,
        isActive: formData.isActive || false,
        allowedModules: formData.allowedModules || []
      };
      addUser(newUser);
    }
    setIsModalOpen(false);
  };

  const toggleModule = (moduleId: AppModule) => {
    const currentModules = formData.allowedModules || [];
    if (currentModules.includes(moduleId)) {
      setFormData({
        ...formData,
        allowedModules: currentModules.filter(m => m !== moduleId)
      });
    } else {
      setFormData({
        ...formData,
        allowedModules: [...currentModules, moduleId]
      });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      case 'MANAGER': return 'bg-blue-100 text-blue-700';
      case 'COMPTABILITE': return 'bg-green-100 text-green-700';
      case 'TECHNIQUE': return 'bg-orange-100 text-orange-700';
      case 'ADMINISTRATIF': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Administration SaaS</h2>
          <p className="text-gray-500">Gestion des accès et permissions par module</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 shadow-sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter Utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
          <Shield className="w-5 h-5 text-red-700 mr-2" />
          <h3 className="font-bold text-gray-700">Utilisateurs ({users.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Utilisateur</th>
                <th className="px-6 py-3">Rôle</th>
                <th className="px-6 py-3">Modules Activés</th>
                <th className="px-6 py-3 text-center">Statut</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold mr-3 text-xs border border-slate-200">
                        {(user.name || user.email || '?').substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name || 'Utilisateur sans nom'}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                       {(user.allowedModules || []).map(mod => (
                         <span key={mod} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-600">
                           {availableModules.find(m => m.id === mod)?.label.split(' ')[0] || mod}
                         </span>
                       ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3 mr-1" /> Bloqué
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="text-gray-400 hover:text-blue-600 p-2 bg-gray-50 hover:bg-blue-50 rounded"
                        title="Configurer Permissions"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => { if(confirm('Supprimer définitivement cet utilisateur ?')) deleteUser(user.id) }}
                        className="text-gray-400 hover:text-red-600 p-2 bg-gray-50 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-lg text-gray-800">
                 {editingUser ? 'Configurer Utilisateur' : 'Inviter un collaborateur'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Infos Base */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
                  <input 
                    type="text" required
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white transition-colors"
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="email" required
                      className="w-full pl-9 border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white transition-colors"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle Principal</label>
                  <select 
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:bg-white"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  >
                    <option value="USER">Utilisateur Standard</option>
                    <option value="MANAGER">Manager / Chef</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="COMPTABILITE">Service Comptabilité</option>
                    <option value="TECHNIQUE">Directeur Technique</option>
                    <option value="ADMINISTRATIF">Service Administratif/RH</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 my-4"></div>

              {/* Account Status */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Statut du Compte</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-green-50 w-full transition-colors">
                    <input 
                      type="radio" 
                      name="status"
                      checked={formData.isActive === true}
                      onChange={() => setFormData({...formData, isActive: true})}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Actif (Autoriser connexion)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-red-50 w-full transition-colors">
                    <input 
                      type="radio" 
                      name="status"
                      checked={formData.isActive === false}
                      onChange={() => setFormData({...formData, isActive: false})}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Désactivé (Bloquer accès)</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-gray-100 my-4"></div>

              {/* Module Permissions */}
              <div>
                 <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                   <span>Modules Autorisés</span>
                   <span className="text-xs font-normal text-gray-500 bg-yellow-50 px-2 py-1 rounded text-yellow-700 border border-yellow-200">
                     Cochez pour activer
                   </span>
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableModules.map(mod => (
                      <label 
                        key={mod.id} 
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.allowedModules?.includes(mod.id) 
                            ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={formData.allowedModules?.includes(mod.id)}
                          onChange={() => toggleModule(mod.id)}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">{mod.label}</span>
                      </label>
                    ))}
                 </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-medium flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
