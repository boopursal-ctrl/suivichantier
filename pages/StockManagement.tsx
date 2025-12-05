
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { MouvementStock, ArticleStock, TypeMouvement } from '../types';
import { 
  Package, ArrowRightLeft, AlertTriangle, Search, Plus, ArrowUpRight, 
  Box, Hammer, Shield, Zap, LayoutGrid, List, History, Filter, MapPin, Truck, PlusCircle, Save
} from 'lucide-react';
import { formatDate } from '../utils';

const StockManagement: React.FC = () => {
  const { articles, mouvements, addMouvement, addArticle, chantiers } = useData();
  const [activeView, setActiveView] = useState<'inventory' | 'history'>('inventory');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false); // New Product Modal
  const [movementType, setMovementType] = useState<TypeMouvement>('SORTIE');
  const [selectedArticleId, setSelectedArticleId] = useState('');
  
  // Movement Form State
  const [qty, setQty] = useState(1);
  const [chantierId, setChantierId] = useState('');
  const [motif, setMotif] = useState('');

  // New Article Form State
  const [newArticle, setNewArticle] = useState<Partial<ArticleStock>>({
    nom: '',
    reference: '',
    categorie: 'MATERIEL',
    quantite: 0,
    unite: 'pcs',
    seuil_alerte: 5,
    emplacement: ''
  });

  // --- STATS CALCULATIONS ---
  const lowStockItems = articles.filter(a => a.quantite <= a.seuil_alerte);
  const totalItems = articles.reduce((acc, curr) => acc + curr.quantite, 0);
  const totalRefs = articles.length;

  // --- FILTERS ---
  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch = a.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            a.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || a.categorie === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchTerm, categoryFilter]);

  // --- HANDLERS ---
  const openMovementModal = (type: TypeMouvement, articleId?: string) => {
    setMovementType(type);
    if (articleId) setSelectedArticleId(articleId);
    setQty(1);
    setChantierId('');
    setMotif('');
    setIsModalOpen(true);
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticleId || qty <= 0) return;

    const newMove: MouvementStock = {
      id_mouvement: `m${Date.now()}`,
      id_article: selectedArticleId,
      type: movementType,
      quantite: qty,
      date: new Date().toISOString(),
      id_chantier: movementType === 'SORTIE' ? chantierId : undefined,
      motif: motif
    };

    addMouvement(newMove);
    setIsModalOpen(false);
  };

  const handleArticleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.nom || !newArticle.reference) return;

    const articleToAdd: ArticleStock = {
      id_article: `art-${Date.now()}`,
      nom: newArticle.nom,
      reference: newArticle.reference,
      categorie: newArticle.categorie as any,
      quantite: newArticle.quantite || 0,
      unite: newArticle.unite || 'pcs',
      seuil_alerte: newArticle.seuil_alerte || 5,
      emplacement: newArticle.emplacement
    };

    addArticle(articleToAdd);
    setIsArticleModalOpen(false);
    // Reset form
    setNewArticle({
      nom: '',
      reference: '',
      categorie: 'MATERIEL',
      quantite: 0,
      unite: 'pcs',
      seuil_alerte: 5,
      emplacement: ''
    });
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'EPI': return <Shield className="w-5 h-5 text-purple-600" />;
      case 'OUTILLAGE': return <Hammer className="w-5 h-5 text-blue-600" />;
      case 'CONSOMMABLE': return <Zap className="w-5 h-5 text-yellow-600" />;
      default: return <Box className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch(cat) {
      case 'EPI': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'OUTILLAGE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CONSOMMABLE': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
           <h2 className="text-2xl font-bold mb-1">Stock & Matériel</h2>
           <p className="text-slate-400 text-sm">Gestion du parc matériel</p>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
           <div>
             <p className="text-sm text-gray-500 font-medium">Références</p>
             <h3 className="text-2xl font-bold text-gray-800">{totalRefs}</h3>
           </div>
           <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
             <Box size={24} />
           </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
           <div>
             <p className="text-sm text-gray-500 font-medium">Total Pièces</p>
             <h3 className="text-2xl font-bold text-gray-800">{totalItems}</h3>
           </div>
           <div className="bg-green-50 p-3 rounded-xl text-green-600">
             <Package size={24} />
           </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
           <div>
             <p className="text-sm text-gray-500 font-medium">Alertes Stock</p>
             <h3 className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>
               {lowStockItems.length}
             </h3>
           </div>
           <div className={`${lowStockItems.length > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-50 text-gray-400'} p-3 rounded-xl`}>
             <AlertTriangle size={24} />
           </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        
        {/* Top Row: Tabs & Main Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 pb-4">
           <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
              <button 
                onClick={() => setActiveView('inventory')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'inventory' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Box className="w-4 h-4 mr-2" /> Inventaire
              </button>
              <button 
                onClick={() => setActiveView('history')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'history' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <History className="w-4 h-4 mr-2" /> Mouvements
              </button>
           </div>

           <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Bouton Nouveau Produit */}
              <button 
                onClick={() => setIsArticleModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold transition-colors shadow-sm"
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Créer Produit
              </button>
              
              <div className="w-px bg-gray-300 mx-2 hidden md:block"></div>

              <button 
                onClick={() => openMovementModal('ENTREE')}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Entrée Stock
              </button>
              <button 
                onClick={() => openMovementModal('SORTIE')}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-bold transition-colors shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" /> Sortie Chantier
              </button>
           </div>
        </div>

        {/* Bottom Row: Filters & View Toggle (Only for Inventory) */}
        {activeView === 'inventory' && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             {/* Category Filters */}
             <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar">
                {['ALL', 'EPI', 'OUTILLAGE', 'CONSOMMABLE', 'MATERIEL'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${
                      categoryFilter === cat 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {cat === 'ALL' ? 'Tout' : cat}
                  </button>
                ))}
             </div>

             {/* Search & View Toggle */}
             <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                   <input 
                     type="text" 
                     placeholder="Rechercher référence..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                   />
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                   <button 
                     onClick={() => setViewMode('grid')}
                     className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     <LayoutGrid size={18} />
                   </button>
                   <button 
                     onClick={() => setViewMode('list')}
                     className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     <List size={18} />
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* --- CONTENT AREA --- */}
      
      {activeView === 'inventory' ? (
        <>
          {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredArticles.map(article => {
                 const isLow = article.quantite <= article.seuil_alerte;
                 const percentage = Math.min((article.quantite / (article.seuil_alerte * 3)) * 100, 100);

                 return (
                   <div key={article.id_article} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all group">
                      <div className="p-5">
                         <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                              {getCategoryIcon(article.categorie)}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getCategoryBadge(article.categorie)}`}>
                              {article.categorie}
                            </span>
                         </div>
                         
                         <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{article.nom}</h3>
                         <p className="text-xs text-gray-400 font-mono mb-4">{article.reference}</p>
                         
                         <div className="flex items-end justify-between mb-2">
                            <div>
                               <span className="text-2xl font-bold text-gray-900">{article.quantite}</span>
                               <span className="text-sm text-gray-500 ml-1">{article.unite}</span>
                            </div>
                            {isLow && (
                              <span className="flex items-center text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Stock Bas
                              </span>
                            )}
                         </div>
                         
                         {/* Stock Level Bar */}
                         <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                           <div 
                             className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-blue-500'}`} 
                             style={{ width: `${percentage}%` }}
                           ></div>
                         </div>

                         <div className="flex items-center text-xs text-gray-500 mb-4">
                            <MapPin className="w-3 h-3 mr-1" />
                            {article.emplacement || 'Non assigné'}
                         </div>
                      </div>

                      {/* Quick Actions Footer */}
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex gap-2">
                         <button 
                           onClick={() => openMovementModal('ENTREE', article.id_article)}
                           className="flex-1 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors text-center"
                         >
                           + Entrée
                         </button>
                         <button 
                           onClick={() => openMovementModal('SORTIE', article.id_article)}
                           className="flex-1 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors text-center"
                         >
                           -> Sortie
                         </button>
                      </div>
                   </div>
                 );
               })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                     <tr>
                       <th className="px-6 py-4">Article</th>
                       <th className="px-6 py-4">Catégorie</th>
                       <th className="px-6 py-4">Emplacement</th>
                       <th className="px-6 py-4 text-center">Quantité</th>
                       <th className="px-6 py-4 text-center">Etat</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {filteredArticles.map(article => {
                       const isLow = article.quantite <= article.seuil_alerte;
                       return (
                         <tr key={article.id_article} className="hover:bg-gray-50 group">
                           <td className="px-6 py-4">
                             <div className="font-bold text-gray-900">{article.nom}</div>
                             <div className="text-xs text-gray-400 font-mono">{article.reference}</div>
                           </td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getCategoryBadge(article.categorie)}`}>
                                {article.categorie}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-gray-600">{article.emplacement || '-'}</td>
                           <td className="px-6 py-4 text-center font-bold text-gray-900">
                             {article.quantite} <span className="text-gray-400 font-normal text-xs">{article.unite}</span>
                           </td>
                           <td className="px-6 py-4 text-center">
                             {isLow ? (
                               <span className="inline-flex w-3 h-3 bg-red-500 rounded-full" title="Stock Bas"></span>
                             ) : (
                               <span className="inline-flex w-3 h-3 bg-green-500 rounded-full" title="OK"></span>
                             )}
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openMovementModal('ENTREE', article.id_article)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Entrée">
                                  <Plus size={16} />
                                </button>
                                <button onClick={() => openMovementModal('SORTIE', article.id_article)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Sortie">
                                  <ArrowUpRight size={16} />
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
          )}
        </>
      ) : (
        /* HISTORY VIEW */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
             <h3 className="font-bold text-gray-800">Journal des Mouvements</h3>
             <button className="text-xs text-blue-600 font-bold hover:underline">Exporter CSV</button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal">
               <thead className="bg-white text-gray-500 uppercase text-xs border-b border-gray-100">
                 <tr>
                   <th className="px-6 py-4">Date / Heure</th>
                   <th className="px-6 py-4">Type</th>
                   <th className="px-6 py-4">Article</th>
                   <th className="px-6 py-4">Quantité</th>
                   <th className="px-6 py-4">Destination / Motif</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {mouvements.map(mvt => {
                   const article = articles.find(a => a.id_article === mvt.id_article);
                   const chantier = chantiers.find(c => c.id_chantier === mvt.id_chantier);
                   return (
                     <tr key={mvt.id_mouvement} className="hover:bg-gray-50">
                       <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                         {new Date(mvt.date).toLocaleDateString()} <span className="text-gray-300">|</span> {new Date(mvt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </td>
                       <td className="px-6 py-4">
                          {mvt.type === 'ENTREE' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                              <Plus className="w-3 h-3 mr-1" /> ACHAT
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                              <Truck className="w-3 h-3 mr-1" /> CHANTIER
                            </span>
                          )}
                       </td>
                       <td className="px-6 py-4">
                         <span className="font-bold text-gray-900">{article?.nom || 'Article Inconnu'}</span>
                         <div className="text-xs text-gray-400 font-mono">{article?.reference}</div>
                       </td>
                       <td className="px-6 py-4 font-bold font-mono text-gray-800">
                         {mvt.quantite}
                       </td>
                       <td className="px-6 py-4">
                          {mvt.type === 'SORTIE' && chantier ? (
                            <div className="flex items-center text-red-800 font-medium">
                              <ArrowUpRight className="w-3 h-3 mr-1" />
                              {chantier.ref_chantier}
                            </div>
                          ) : (
                            <span className="text-gray-600 italic">{mvt.motif || 'Aucun motif'}</span>
                          )}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* --- MODAL NOUVEAU PRODUIT (NEW) --- */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-800 flex items-center">
                   <Package className="mr-2 text-slate-600"/> Nouveau Produit
                 </h3>
                 <button onClick={() => setIsArticleModalOpen(false)} className="text-gray-400 hover:text-gray-600"><Plus size={24} className="rotate-45"/></button>
              </div>
              
              <form onSubmit={handleArticleSubmit} className="p-6 space-y-4 overflow-y-auto">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Désignation (Nom)</label>
                    <input 
                      type="text" required
                      className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:bg-white"
                      value={newArticle.nom}
                      onChange={e => setNewArticle({...newArticle, nom: e.target.value})}
                      placeholder="Ex: Perceuse Bosch..."
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Référence</label>
                      <input 
                        type="text" required
                        className="w-full border rounded-xl px-4 py-3 uppercase"
                        value={newArticle.reference}
                        onChange={e => setNewArticle({...newArticle, reference: e.target.value})}
                        placeholder="REF-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Catégorie</label>
                      <select 
                        className="w-full border rounded-xl px-4 py-3"
                        value={newArticle.categorie}
                        onChange={e => setNewArticle({...newArticle, categorie: e.target.value as any})}
                      >
                        <option value="MATERIEL">Matériel</option>
                        <option value="OUTILLAGE">Outillage</option>
                        <option value="EPI">EPI (Sécurité)</option>
                        <option value="CONSOMMABLE">Consommable</option>
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Unité</label>
                      <input 
                        type="text"
                        className="w-full border rounded-xl px-4 py-3"
                        value={newArticle.unite}
                        onChange={e => setNewArticle({...newArticle, unite: e.target.value})}
                        placeholder="pcs, kg..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Seuil Alerte</label>
                      <input 
                        type="number"
                        className="w-full border rounded-xl px-4 py-3"
                        value={newArticle.seuil_alerte}
                        onChange={e => setNewArticle({...newArticle, seuil_alerte: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Stock Initial</label>
                       <input 
                        type="number"
                        className="w-full border rounded-xl px-4 py-3"
                        value={newArticle.quantite}
                        onChange={e => setNewArticle({...newArticle, quantite: parseInt(e.target.value) || 0})}
                      />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Emplacement (Rayon)</label>
                    <input 
                      type="text"
                      className="w-full border rounded-xl px-4 py-3"
                      value={newArticle.emplacement}
                      onChange={e => setNewArticle({...newArticle, emplacement: e.target.value})}
                      placeholder="Ex: Rayon B, Armoire 2..."
                    />
                 </div>

                 <div className="pt-4">
                   <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 flex items-center justify-center shadow-md">
                      <Save className="mr-2 w-5 h-5"/> Enregistrer Produit
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL MOUVEMENT (EXISTING) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className={`px-6 py-4 flex justify-between items-center ${movementType === 'ENTREE' ? 'bg-green-600' : 'bg-red-700'}`}>
                 <div>
                    <h3 className="font-bold text-xl text-white">
                      {movementType === 'ENTREE' ? 'Réception Matériel' : 'Sortie Matériel'}
                    </h3>
                    <p className="text-white/80 text-sm">Enregistrement mouvement de stock</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 text-white rounded-full p-1.5 transition-colors">
                    <ArrowRightLeft size={20} />
                 </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleMovementSubmit} className="p-6 space-y-5 overflow-y-auto">
                 
                 {/* 1. Article Selection */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Article concerné</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full border-2 border-gray-200 rounded-xl pl-4 pr-10 py-3 appearance-none focus:border-red-500 focus:outline-none bg-white font-medium text-gray-800"
                        value={selectedArticleId}
                        onChange={e => setSelectedArticleId(e.target.value)}
                      >
                        <option value="">Sélectionner un article...</option>
                        {articles.map(a => (
                          <option key={a.id_article} value={a.id_article}>
                            {a.nom} (Ref: {a.reference}) - Stock: {a.quantite}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                        <ArrowRightLeft size={16} className="rotate-90" />
                      </div>
                    </div>
                 </div>

                 {/* 2. Quantity Input */}
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Quantité à {movementType === 'ENTREE' ? 'ajouter' : 'sortir'}</label>
                    <div className="flex items-center justify-center gap-4">
                       <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-xl">-</button>
                       <input 
                         type="number" required min="1"
                         className="w-24 text-center text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900"
                         value={qty}
                         onChange={e => setQty(parseInt(e.target.value) || 1)}
                       />
                       <button type="button" onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-xl">+</button>
                    </div>
                 </div>

                 {/* 3. Destination (if Sortie) */}
                 {movementType === 'SORTIE' && (
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Destination (Chantier)</label>
                      <select 
                        required
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none bg-white"
                        value={chantierId}
                        onChange={e => setChantierId(e.target.value)}
                      >
                        <option value="">-- Sélectionner un chantier --</option>
                        {chantiers.filter(c => c.statut === 'actif').map(c => (
                          <option key={c.id_chantier} value={c.id_chantier}>
                            {c.ref_chantier} - {c.nom_client}
                          </option>
                        ))}
                      </select>
                   </div>
                 )}

                 {/* 4. Motif/Note */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Référence / Note</label>
                    <input 
                      type="text"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none"
                      placeholder={movementType === 'ENTREE' ? "Ex: Facture #1234..." : "Ex: Remplacement urgence..."}
                      value={motif}
                      onChange={e => setMotif(e.target.value)}
                    />
                 </div>

                 <button 
                   type="submit" 
                   className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-transform hover:scale-[1.02] mt-4 flex items-center justify-center ${
                     movementType === 'ENTREE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-700 hover:bg-red-800'
                   }`}
                 >
                   {movementType === 'ENTREE' ? <Plus className="mr-2" /> : <ArrowUpRight className="mr-2" />}
                   Confirmer le Mouvement
                 </button>

              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default StockManagement;
