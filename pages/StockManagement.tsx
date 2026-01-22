
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';
import { articleSchema } from '../schemas';
import { MouvementStock, ArticleStock, TypeMouvement } from '../types';
import {
  Package, ArrowRightLeft, AlertTriangle, Search, Plus, ArrowUpRight,
  Box, Hammer, Shield, Zap, LayoutGrid, List, History, Filter, MapPin, Truck, PlusCircle, Save, FileText
} from 'lucide-react';
import { generateBonMouvement } from '../services/pdfService';
import { formatDate } from '../utils';
import type { Chantier } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Composant pour l'historique des colisages avec expansion
const ColisageHistoryView: React.FC<{
  mouvements: MouvementStock[];
  articles: ArticleStock[];
  chantiers: Chantier[];
}> = ({ mouvements, articles, chantiers }) => {
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());

  const toggleBatch = (idx: number) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedBatches(newExpanded);
  };

  // Grouper les mouvements de colisage par batch
  const colisageBatches = mouvements
    .filter(m => m.motif?.includes('Colisage') && m.type === 'ENTREE')
    .reduce((acc: any[], m) => {
      const existingBatch = acc.find(b =>
        Math.abs(new Date(b.date).getTime() - new Date(m.date).getTime()) < 5000
      );
      if (existingBatch) {
        existingBatch.items.push(m);
      } else {
        // Attempt to find chantier from current movement (ENTRE) or look for a paired SORTIE
        let targetChantierId = m.id_chantier;
        if (!targetChantierId) {
          const linkedSortie = mouvements.find(out =>
            out.type === 'SORTIE' &&
            out.id_chantier &&
            Math.abs(new Date(out.date).getTime() - new Date(m.date).getTime()) < 2000
          );
          if (linkedSortie) targetChantierId = linkedSortie.id_chantier;
        }

        acc.push({
          date: m.date,
          motif: m.motif,
          id_chantier: targetChantierId,
          items: [m]
        });
      }
      return acc;
    }, [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-indigo-50 flex items-center justify-between">
        <h3 className="font-bold text-indigo-900 flex items-center">
          <Truck className="mr-2" /> Historique des Réceptions Colisage
        </h3>
        <span className="text-sm text-indigo-600 font-medium">
          {colisageBatches.length} réception(s)
        </span>
      </div>

      {colisageBatches.length === 0 ? (
        <div className="p-8 text-center text-gray-400 italic">
          Aucun historique de colisage trouvé.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {colisageBatches.map((batch, idx) => {
            const isExpanded = expandedBatches.has(idx);
            const chantier = chantiers.find(c => c.id_chantier === batch.id_chantier);
            const totalQty = batch.items.reduce((sum: number, item: any) => sum + item.quantite, 0);

            return (
              <div key={idx} className="hover:bg-gray-50/50 transition-colors">
                {/* Ligne principale - Cliquable */}
                <div
                  onClick={() => toggleBatch(idx)}
                  className="px-6 py-4 cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Icône d'expansion */}
                    <div className="text-indigo-600">
                      {isExpanded ? (
                        <ChevronDown size={20} className="transition-transform" />
                      ) : (
                        <ChevronRight size={20} className="transition-transform" />
                      )}
                    </div>

                    {/* Date */}
                    <div className="min-w-[140px]">
                      <div className="text-sm font-bold text-gray-900">
                        {new Date(batch.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(batch.date).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Chantier */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-indigo-500" />
                        <span className="font-bold text-indigo-900">
                          {chantier?.ref_chantier || 'Chantier inconnu'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {chantier?.nom_client}
                      </div>
                      {chantier && (
                        <div className="text-[10px] text-gray-400 mt-1 font-mono">
                          Du {new Date(chantier.date_debut).toLocaleDateString()} au {new Date(chantier.date_fin).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Résumé */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{batch.items.length}</div>
                        <div className="text-xs text-gray-500">Articles</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-indigo-600">{totalQty}</div>
                        <div className="text-xs text-gray-500">Quantité totale</div>
                      </div>
                    </div>

                    {/* Badge statut */}
                    <div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        ✓ Traitée
                      </span>
                    </div>
                  </div>
                </div>

                {/* Détails expandables */}
                {isExpanded && (
                  <div className="px-6 pb-4 bg-gray-50/50 animate-in fade-in slide-in-from-top-2">
                    <div className="ml-9 border-l-2 border-indigo-200 pl-6">
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                                Référence
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                                Article
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                                Quantité
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                                Catégorie
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {batch.items.map((item: any, itemIdx: number) => {
                              const article = articles.find(a => a.id_article === item.id_article);
                              return (
                                <tr key={itemIdx} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-bold text-gray-700">
                                      {article?.reference || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-gray-900">
                                      {article?.nom || 'Article inconnu'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                                      {item.quantite}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${article?.categorie === 'EPI' ? 'bg-purple-100 text-purple-700' :
                                      article?.categorie === 'OUTILLAGE' ? 'bg-blue-100 text-blue-700' :
                                        article?.categorie === 'CONSOMMABLE' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-gray-100 text-gray-700'
                                      }`}>
                                      {article?.categorie || 'N/A'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Composant pour les Mouvements Internes (Excluant Colisage)
const InternalMovementsView: React.FC<{
  mouvements: MouvementStock[];
  articles: ArticleStock[];
  chantiers: Chantier[];
}> = ({ mouvements, articles, chantiers }) => {
  // Filtrer pour exclure les mouvements liés au Colisage
  const internalMovements = mouvements
    .filter(m => !m.motif?.includes('Colisage'))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center">
          <ArrowRightLeft className="mr-2 text-gray-500" /> Mouvements Internes & Achats
        </h3>
        <button className="text-xs text-slate-500 font-bold hover:text-slate-800 border border-transparent hover:border-slate-200 px-3 py-1 rounded transition-colors">
          Exporter Historique
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white text-gray-500 uppercase text-xs border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold w-40">Date</th>
              <th className="px-6 py-3 font-semibold w-32">Type</th>
              <th className="px-6 py-3 font-semibold">Article</th>
              <th className="px-6 py-3 font-semibold text-center w-24">Quantité</th>
              <th className="px-6 py-3 font-semibold">Destination / Motif</th>
              <th className="px-6 py-3 font-semibold text-center w-20">Doc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {internalMovements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                  Aucun mouvement interne enregistré pour le moment.
                </td>
              </tr>
            ) : (
              internalMovements.map(mvt => {
                const article = articles.find(a => a.id_article === mvt.id_article);
                const chantier = chantiers.find(c => c.id_chantier === mvt.id_chantier);

                return (
                  <tr key={mvt.id_mouvement} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      <div className="font-bold text-gray-700">{new Date(mvt.date).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">{new Date(mvt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4">
                      {mvt.type === 'ENTREE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Plus className="w-3 h-3 mr-1" /> ENTREE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          <ArrowUpRight className="w-3 h-3 mr-1" /> SORTIE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${article?.categorie === 'EPI' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                          {article?.categorie === 'EPI' ? <Shield size={14} /> : <Box size={14} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{article?.nom || 'Article supprimé'}</div>
                          <div className="text-xs text-slate-400 font-mono">{article?.reference || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold font-mono text-slate-700 text-center text-base">
                      {mvt.quantite}
                    </td>
                    <td className="px-6 py-4">
                      {mvt.type === 'SORTIE' && chantier ? (
                        <div className="flex items-center text-slate-700 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                          <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {chantier.ref_chantier}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic text-sm">{mvt.motif || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={async () => {
                          if (article) {
                            try {
                              await generateBonMouvement(mvt, article, chantier);
                              toast.success("Document téléchargé");
                            } catch (err: any) {
                              toast.error("Erreur PDF");
                            }
                          }
                        }}
                        className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors group-hover:text-gray-400"
                        title="Télécharger Bon"
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StockManagement: React.FC = () => {
  const { articles, mouvements, addMouvement, addArticle, chantiers } = useData();
  const [activeView, setActiveView] = useState<'inventory' | 'internal_history' | 'colisage_view' | 'colisage_reception'>('inventory');
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

    // SCENARIO 1: ACHAT DIRECT POUR CHANTIER (ENTREE + SORTIE)
    if (movementType === 'ENTREE' && chantierId && chantierId !== 'select_pending') {
      const selectedChantier = chantiers.find(c => c.id_chantier === chantierId);

      // 1. Mouvement d'ENTREE (Achat)
      const moveIn: MouvementStock = {
        id_mouvement: `m${Date.now()}-in`,
        id_article: selectedArticleId,
        type: 'ENTREE',
        quantite: qty,
        date: new Date().toISOString(),
        id_chantier: undefined,
        motif: `Achat direct pour ${selectedChantier?.ref_chantier || 'Chantier'} ` + (motif ? ` (${motif})` : '')
      };
      addMouvement(moveIn);

      // 2. Mouvement de SORTIE (Consommation immédiate)
      // On attend 10ms pour garantir l'ordre des ID/Dates si nécessaire, bien que Date.now() suffise souvent
      setTimeout(() => {
        const moveOut: MouvementStock = {
          id_mouvement: `m${Date.now()}-out`,
          id_article: selectedArticleId,
          type: 'SORTIE',
          quantite: qty,
          date: new Date(Date.now() + 100).toISOString(), // +100ms
          id_chantier: chantierId,
          motif: `Consommation directe (Achat) ${motif ? `- ${motif}` : ''}`
        };
        addMouvement(moveOut);
        toast.success(`Achat enregistré et affecté à ${selectedChantier?.ref_chantier}`);
      }, 50);

      setIsModalOpen(false);
      return;
    }

    // SCENARIO 2: MOUVEMENT STANDARD
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

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Préparer les données pour la validation
    const articleData = {
      nom: newArticle.nom,
      reference: newArticle.reference,
      categorie: newArticle.categorie,
      quantite: Number(newArticle.quantite) || 0,
      unite: newArticle.unite,
      seuil_alerte: Number(newArticle.seuil_alerte) || 0,
      emplacement: newArticle.emplacement
    };

    // --- VALIDATION ZOD ---
    const validation = articleSchema.safeParse(articleData);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(`Erreur: ${firstError.message}`);
      return;
    }
    // ---------------------

    const articleToAdd: ArticleStock = {
      id_article: `art-${Date.now()}`,
      nom: articleData.nom!, // Validé par Zod
      reference: articleData.reference!,
      categorie: articleData.categorie as any,
      quantite: articleData.quantite,
      unite: articleData.unite || 'pcs',
      seuil_alerte: articleData.seuil_alerte,
      emplacement: articleData.emplacement
    };

    try {
      await addArticle(articleToAdd);
      toast.success("Article ajouté au stock avec succès");
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
    } catch (error) {
      console.error("Erreur ajout article:", error);
      toast.error("Impossible d'ajouter l'article");
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'EPI': return <Shield className="w-5 h-5 text-purple-600" />;
      case 'OUTILLAGE': return <Hammer className="w-5 h-5 text-blue-600" />;
      case 'CONSOMMABLE': return <Zap className="w-5 h-5 text-yellow-600" />;
      default: return <Box className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'EPI': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'OUTILLAGE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CONSOMMABLE': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* HERO SECTION & STATS */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-200 p-8 mb-8">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Package size={300} strokeWidth={0.5} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
          <div>
            <h2 className="text-3xl font-bold mb-2 tracking-tight">Gestion du Stock</h2>
            <p className="text-slate-400 font-medium max-w-lg">
              Optimisez votre inventaire et suivez les mouvements de matériel sur vos chantiers en temps réel.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-w-[140px]">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Pièces</div>
              <div className="text-3xl font-bold">{totalItems}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-w-[140px]">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Références</div>
              <div className="text-3xl font-bold">{totalRefs}</div>
            </div>
            <div className={`backdrop-blur-sm border rounded-2xl p-4 min-w-[140px] ${lowStockItems.length > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10'}`}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center">
                {lowStockItems.length > 0 && <AlertTriangle size={12} className="mr-1.5" />} Alertes
              </div>
              <div className="text-3xl font-bold">{lowStockItems.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      {/* NAVIGATION & ACTIONS BAR */}
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md py-4 mb-6 space-y-4">

        {/* Row 1: Nav & Main Actions */}
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4">

          {/* Navigation Pills */}
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex items-center overflow-x-auto max-w-full no-scrollbar">
            <button
              onClick={() => setActiveView('inventory')}
              className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView === 'inventory'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              Inventaire
            </button>
            <button
              onClick={() => setActiveView('internal_history')}
              className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView === 'internal_history'
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              Mouvements
            </button>
            <button
              onClick={() => setActiveView('colisage_view')}
              className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView === 'colisage_view'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-indigo-600 hover:bg-indigo-50'}`}
            >
              <Truck size={16} className="mr-2" /> Colisage
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsArticleModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-slate-900 transition-colors" title="Nouveau Produit">
              <PlusCircle size={20} />
            </button>
            <button onClick={() => setActiveView('colisage_reception')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors" title="Réception Colisage">
              <Truck size={20} />
            </button>
            <div className="h-8 w-px bg-gray-300 mx-2"></div>
            <button onClick={() => openMovementModal('ENTREE')} className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all text-sm">
              <Plus size={18} className="mr-2" /> Entrée
            </button>
            <button onClick={() => openMovementModal('SORTIE')} className="flex items-center px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all text-sm">
              <ArrowUpRight size={18} className="mr-2" /> Sortie
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Filters (Inventory Only) */}
        {activeView === 'inventory' && (
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
              {['ALL', 'EPI', 'OUTILLAGE', 'CONSOMMABLE', 'MATERIEL'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${categoryFilter === cat
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-gray-200 hover:border-gray-300'}`}
                >
                  {cat === 'ALL' ? 'Tous' : cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all"
              />
            </div>

            <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-slate-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-slate-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- CONTENT AREA --- */}

      {activeView === 'inventory' && (
        <>
          {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArticles.map(article => {
                const isLow = article.quantite <= article.seuil_alerte;
                const percentage = Math.min((article.quantite / (article.seuil_alerte * 3)) * 100, 100);

                return (

                  <div key={article.id_article} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
                    {/* Top Bar Color based on Category */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${article.categorie === 'EPI' ? 'bg-purple-500' :
                      article.categorie === 'OUTILLAGE' ? 'bg-blue-500' :
                        article.categorie === 'CONSOMMABLE' ? 'bg-amber-500' : 'bg-slate-300'
                      }`}></div>

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${article.categorie === 'EPI' ? 'bg-purple-50 text-purple-600' :
                          article.categorie === 'OUTILLAGE' ? 'bg-blue-50 text-blue-600' :
                            article.categorie === 'CONSOMMABLE' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {getCategoryIcon(article.categorie)}
                        </div>

                        {/* Stock Badge */}
                        <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${isLow ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-green-50 text-green-600 border-green-100'
                          }`}>
                          {isLow ? 'Stock Bas' : 'En Stock'}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight group-hover:text-indigo-600 transition-colors">{article.nom}</h3>
                      <p className="text-xs text-slate-400 font-mono mb-6 bg-slate-50 inline-block self-start px-2 py-0.5 rounded border border-slate-100">{article.reference}</p>

                      <div className="mt-auto">
                        <div className="flex items-baseline justify-between mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900">{article.quantite}</span>
                            <span className="text-sm font-medium text-slate-400">{article.unite}</span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center">
                            <MapPin size={12} className="mr-1" />
                            {article.emplacement || 'N/A'}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-red-500' : percentage > 50 ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                          <button onClick={() => openMovementModal('ENTREE', article.id_article)} className="py-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 border border-emerald-100 transition-colors">
                            + Entrée
                          </button>
                          <button onClick={() => openMovementModal('SORTIE', article.id_article)} className="py-2 rounded-lg bg-slate-50 text-slate-700 font-bold text-xs hover:bg-slate-100 border border-slate-200 transition-colors">
                            → Sortie
                          </button>
                        </div>
                      </div>
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
      )}

      {activeView === 'internal_history' && (
        <InternalMovementsView mouvements={mouvements} articles={articles} chantiers={chantiers} />
      )}

      {activeView === 'colisage_view' && (
        <ColisageHistoryView mouvements={mouvements} articles={articles} chantiers={chantiers} />
      )}

      {/* --- MODAL NOUVEAU PRODUIT (NEW) --- */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800 flex items-center">
                <Package className="mr-2 text-slate-600" /> Nouveau Produit
              </h3>
              <button onClick={() => setIsArticleModalOpen(false)} className="text-gray-400 hover:text-gray-600"><Plus size={24} className="rotate-45" /></button>
            </div>

            <form onSubmit={handleArticleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Désignation (Nom)</label>
                <input
                  type="text" required
                  className="w-full border rounded-xl px-4 py-3 bg-gray-50 focus:bg-white"
                  value={newArticle.nom}
                  onChange={e => setNewArticle({ ...newArticle, nom: e.target.value })}
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
                    onChange={e => setNewArticle({ ...newArticle, reference: e.target.value })}
                    placeholder="REF-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Catégorie</label>
                  <select
                    className="w-full border rounded-xl px-4 py-3"
                    value={newArticle.categorie}
                    onChange={e => setNewArticle({ ...newArticle, categorie: e.target.value as any })}
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
                    onChange={e => setNewArticle({ ...newArticle, unite: e.target.value })}
                    placeholder="pcs, kg..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Seuil Alerte</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-4 py-3"
                    value={newArticle.seuil_alerte}
                    onChange={e => setNewArticle({ ...newArticle, seuil_alerte: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Stock Initial</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-4 py-3"
                    value={newArticle.quantite}
                    onChange={e => setNewArticle({ ...newArticle, quantite: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Emplacement (Rayon)</label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-4 py-3"
                  value={newArticle.emplacement}
                  onChange={e => setNewArticle({ ...newArticle, emplacement: e.target.value })}
                  placeholder="Ex: Rayon B, Armoire 2..."
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 flex items-center justify-center shadow-md">
                  <Save className="mr-2 w-5 h-5" /> Enregistrer Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL COLISAGE (NEW BULK) --- */}
      <PackingListModal
        isOpen={activeView === 'colisage_reception'}
        onClose={() => setActiveView('inventory')}
      />

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

              {/* OPTION: DIRECT PURCHASE FOR CHANTIER (Only for ENTREE) */}


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

              {/* 3. Destination (if Sortie STANDARD) */}
              {movementType === 'SORTIE' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Destination (Chantier)</label>
                  <select
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-red-500 focus:outline-none bg-white font-medium"
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
                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-transform hover:scale-[1.02] mt-4 flex items-center justify-center ${movementType === 'ENTREE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-700 hover:bg-red-800'
                  }`}
              >
                {movementType === 'ENTREE' ? (
                  chantierId ?
                    <><Zap className="mr-2" /> Réceptionner & Affecter Chantier</> :
                    <><Plus className="mr-2" /> Confirmer l'Entrée Stock</>
                ) : (
                  <><ArrowUpRight className="mr-2" /> Confirmer la Sortie</>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockManagement;

// --- DEDICATED COLISAGE COMPONENT ---
const PackingListModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { articles, chantiers, addMouvement, addArticle } = useData();
  const [selectedChantier, setSelectedChantier] = useState('');

  // Extended Line State
  type PackingLine = {
    id: string;
    articleId: string;
    qty: number;
    isNew?: boolean;
    newRef?: string;
    newName?: string;
    suggestion?: string;
  };

  const [lines, setLines] = useState<PackingLine[]>([
    { id: '1', articleId: '', qty: 1 }
  ]);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RAW TEXT PARSING STATE
  const [rawText, setRawText] = useState('');
  const [parsingMode, setParsingMode] = useState(false);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines([...lines, { id: `line-${Date.now()}`, articleId: '', qty: 1 }]);
  };

  const parseRawText = () => {
    if (!rawText.trim()) return;

    const parsedLines: PackingLine[] = [];
    const rows = rawText.split('\n');

    rows.forEach((row, idx) => {
      const trimmed = row.trim();
      if (!trimmed || trimmed.length < 5) return;

      let possibleQty = 1;
      let possibleRef = '';
      let possibleName = '';

      // STRATEGY 1: SEMICOLON DELIMITED (Excel/CSV style provided by user)
      // Format: Bundle No ; ITEM ; DESCRIPTION ; QUANTITY ; Del.not
      // Index:      0     ;  1   ;      2      ;    3     ;    4
      if (trimmed.includes(';')) {
        const columns = trimmed.split(';').map(c => c.trim());
        // We expect at least 4 columns for this specific format
        if (columns.length >= 4) {
          const rawRef = columns[1];
          const rawDesc = columns[2];
          const rawQty = parseInt(columns[3]);

          if (!isNaN(rawQty)) {
            possibleQty = rawQty;
            possibleRef = rawRef;
            possibleName = rawDesc;
          } else {
            // Likely a header row (QUANTITY is not a number)
            return;
          }
        }
      }
      // STRATEGY 2: EXISTING SPACE HEURISTIC (Fallback)
      else {
        const qtyMatch = trimmed.match(/(\d+)\s*$/);
        let textWithoutQty = trimmed;

        if (qtyMatch) {
          possibleQty = parseInt(qtyMatch[1]);
          textWithoutQty = trimmed.substring(0, qtyMatch.index).trim();
        }

        const parts = textWithoutQty.split(/\s+/);
        possibleRef = parts[0] || '';
        possibleName = parts.slice(1).join(' ') || possibleRef;
      }

      // Match Logic
      const matchedArticle = articles.find(a =>
        (possibleRef && a.reference.toUpperCase() === possibleRef.toUpperCase()) ||
        (a.reference.includes(possibleRef) && possibleRef.length > 3)
      );

      parsedLines.push({
        id: `parsed-${idx}-${Date.now()}`,
        articleId: matchedArticle ? matchedArticle.id_article : '',
        qty: possibleQty,
        isNew: !matchedArticle,
        newRef: possibleRef,
        newName: possibleName,
        suggestion: trimmed
      });
    });

    if (parsedLines.length > 0) {
      setLines(parsedLines);
      setParsingMode(false);
      toast.success(`${parsedLines.length} lignes analysées ! Vérifiez les nouveaux articles.`);
    } else {
      toast.error("Aucune ligne valide détectée.");
    }
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof PackingLine, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSubmit = async () => {
    if (!selectedChantier) {
      toast.error("Veuillez sélectionner un chantier destinataire.");
      return;
    }
    const validLines = lines.filter(l => (l.articleId || (l.isNew && l.newRef && l.newName)) && l.qty > 0);

    if (validLines.length === 0) {
      toast.error("Aucune ligne valide à traiter.");
      return;
    }

    setIsSubmitting(true);
    const chantier = chantiers.find(c => c.id_chantier === selectedChantier);

    try {
      // 1. CREATE NEW ARTICLES FIRST
      const linesToProcess = [...validLines];

      for (let i = 0; i < linesToProcess.length; i++) {
        const line = linesToProcess[i];
        if (line.isNew && !line.articleId) {
          const newArtId = `art-auto-${Date.now()}-${i}`;
          await addArticle({
            id_article: newArtId,
            nom: line.newName || 'Article Inconnu',
            reference: line.newRef || 'REF-?',
            categorie: 'MATERIEL',
            quantite: 0,
            unite: 'pcs',
            seuil_alerte: 5,
            emplacement: 'ENTREPOT'
          });
          linesToProcess[i].articleId = newArtId;
          await new Promise(r => setTimeout(r, 20));
        }
      }

      // 2. PROCESS MOVEMENTS
      for (const line of linesToProcess) {
        if (!line.articleId) continue;

        await addMouvement({
          id_mouvement: `m${Date.now()}-in-batch-${line.id}`,
          id_article: line.articleId,
          type: 'ENTREE',
          quantite: line.qty,
          date: new Date().toISOString(),
          id_chantier: selectedChantier,
          motif: `Colisage: ${line.suggestion || 'Import Auto'}`
        });

        await new Promise(r => setTimeout(r, 50));

        await addMouvement({
          id_mouvement: `m${Date.now()}-out-batch-${line.id}`,
          id_article: line.articleId,
          type: 'SORTIE',
          quantite: line.qty,
          date: new Date().toISOString(),
          id_chantier: selectedChantier,
          motif: `Affectation Chantier (Colisage)`
        });

        await new Promise(r => setTimeout(r, 50));
      }

      toast.success(`${linesToProcess.length} éléments traités !`);
      onClose();
      setLines([{ id: '1', articleId: '', qty: 1 }]);
      setStep(1);
      setSelectedChantier('');
      setRawText('');
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du traitement du colisage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">

        {/* HEADER */}
        <div className="px-8 py-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-indigo-700 rounded-lg"><Truck size={24} /></div>
              Réception Commande & Colisage
            </h2>
            <p className="text-indigo-200 mt-1 pl-12">Importez une liste complète et affectez-la directement à un chantier.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Plus className="rotate-45" size={28} /></button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden flex flex-col p-8 bg-gray-50">

          {/* STEP 1: CHANTIER */}
          <div className={`transition-all duration-300 ${step === 1 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="block text-sm font-bold text-slate-700 mb-2">1. Sélectionner le Chantier destinataire du Colisage</label>
            <select
              className="w-full max-w-xl text-lg border-2 border-indigo-100 rounded-xl px-6 py-4 font-bold text-slate-800 bg-white focus:border-indigo-500 focus:outline-none shadow-sm"
              value={selectedChantier}
              onChange={e => { setSelectedChantier(e.target.value); if (e.target.value) setStep(2); }}
            >
              <option value="">-- Choisir le Chantier --</option>
              {chantiers.filter(c => c.statut === 'actif').map(c => (
                <option key={c.id_chantier} value={c.id_chantier}>{c.ref_chantier} - {c.nom_client}</option>
              ))}
            </select>
          </div>

          <div className="w-full h-px bg-gray-200 my-8"></div>

          {/* STEP 2: LISTE */}
          {step >= 2 && (
            <div className="flex-1 flex flex-col overflow-y-auto pb-4 animate-in fade-in slide-in-from-bottom-4">

              {/* TOGGLE PARSE MODE */}
              {/* TOGGLE PARSE MODE */}
              <div className="flex justify-between items-end mb-4">
                <div className="flex items-center gap-4">
                  <label className="block text-sm font-bold text-slate-700">
                    {parsingMode ? '2. Importer le Texte (Copier-Coller)' : '2. Contenu du Colisage (Tableau)'}
                  </label>
                  <button
                    onClick={() => setParsingMode(!parsingMode)}
                    className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${parsingMode ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                  >
                    {parsingMode ? '← Retour au Tableau manuel' : 'Basculer en Mode Import Texte'}
                  </button>
                </div>
                {!parsingMode && (
                  <button onClick={handleAddLine} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-200 flex items-center gap-2">
                    <PlusCircle size={16} /> Ajouter Ligne
                  </button>
                )}
              </div>

              {parsingMode ? (
                /* RAW TEXT INPUT MODE */
                <div className="flex-1 flex flex-col gap-2">
                  <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-800 border border-orange-100">
                    <p className="font-bold mb-1">💡 Instructions:</p>
                    Copiez-collez le contenu de votre PDF / Excel ici. Le système tentera de détecter les quantités (chiffre en fin de ligne) et les références.
                  </div>
                  <textarea
                    className="h-64 w-full border border-gray-300 rounded-xl p-4 font-mono text-sm focus:border-indigo-500 focus:outline-none overflow-y-auto resize-none"
                    placeholder={`Exemple:\n202549 BEAMS PS-S I 1350/1000 25\nE2502440 POSTS SINGLE 220CM 26...`}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                  />
                  <button
                    onClick={parseRawText}
                    className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-indigo-700 transition-colors shadow-md mt-2 flex items-center justify-center gap-2 animate-pulse"
                  >
                    <Zap size={20} /> Etape 2: Analyser le Texte (Cliquez ici)
                  </button>
                </div>
              ) : (
                /* TABLE MODE */
                <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-sm p-2">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">#</th>
                        <th className="px-4 py-3 text-left">Article (Recherche)</th>
                        <th className="px-4 py-3 text-center w-32">Quantité</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, idx) => (
                        <tr key={line.id} className={`group hover:bg-gray-50/80 ${!line.articleId ? 'bg-orange-50' : ''}`}>
                          <td className="px-4 py-3 text-gray-400 font-bold">{idx + 1}</td>
                          <td className="px-4 py-3">
                            {line.isNew ? (
                              <div className="flex gap-2 items-center">
                                <div className="flex-1 grid gap-1">
                                  <input
                                    type="text"
                                    className="w-full text-xs font-bold border border-orange-300 rounded p-1.5 bg-white text-orange-900 placeholder-orange-300"
                                    placeholder="Référence..."
                                    value={line.newRef || ''}
                                    onChange={e => handleUpdateLine(line.id, 'newRef', e.target.value)}
                                  />
                                  <input
                                    type="text"
                                    className="w-full text-xs border border-gray-200 rounded p-1.5"
                                    placeholder="Nom Article..."
                                    value={line.newName || ''}
                                    onChange={e => handleUpdateLine(line.id, 'newName', e.target.value)}
                                  />
                                </div>
                                <button
                                  onClick={() => handleUpdateLine(line.id, 'isNew', false)}
                                  className="text-[10px] text-blue-600 underline whitespace-nowrap self-start mt-1"
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <select
                                  className="w-full bg-transparent font-medium text-slate-800 focus:outline-none"
                                  value={line.articleId}
                                  onChange={e => handleUpdateLine(line.id, 'articleId', e.target.value)}
                                >
                                  <option value="">Sélectionner article...</option>
                                  {articles.map(a => (
                                    <option key={a.id_article} value={a.id_article}>{a.nom} ({a.reference})</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleUpdateLine(line.id, 'isNew', true)}
                                  className="text-[10px] text-orange-600 font-bold hover:underline text-left pl-1"
                                >
                                  + Nouveau Produit
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleUpdateLine(line.id, 'qty', Math.max(1, line.qty - 1))} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold">-</button>
                              <input
                                type="number" min="1"
                                className="w-12 text-center bg-gray-50 rounded border-none font-bold p-1"
                                value={line.qty}
                                onChange={e => handleUpdateLine(line.id, 'qty', parseInt(e.target.value) || 1)}
                              />
                              <button onClick={() => handleUpdateLine(line.id, 'qty', line.qty + 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold">+</button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleRemoveLine(line.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Plus className="rotate-45 block" size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lines.length === 0 && <div className="p-8 text-center text-gray-400 italic">Aucune ligne.</div>}

                  <button onClick={handleAddLine} className="w-full py-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 border-t border-dashed border-gray-200 transition-colors flex items-center justify-center gap-2 font-bold text-sm">
                    <Plus size={16} /> Ajouter une autre ligne
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Annuler</button>
          {/* Show 'Valider' ONLY if NOT in parsing mode. In parsing mode, user must click 'Analyser' first. */}
          {!parsingMode && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedChantier || lines.length === 0}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              {isSubmitting ? (
                <><div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> Traitement...</>
              ) : (
                <><Save size={20} /> Etape 3: Valider le Colisage ({lines.filter(l => l.articleId || l.isNew).length})</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
