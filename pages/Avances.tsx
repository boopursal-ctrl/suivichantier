import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Calendar,
    Search,
    Plus,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Wallet,
    TrendingUp,
    Filter,
    ArrowRight,
    Users,
    Save,
    Trash2,
    Clock
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { mysqlService } from '../services/mysqlService';
import { formatCurrency, cn } from '../utils';

// Constantes
const PERMANENT_MANAGEMENT_MATRICULES = [100, 101, 102, 103, 104, 157];
const MAX_ADVANCE_PERCENTAGE = 0.75;

interface AdvanceRequest {
    id: string;
    chantier_id: string;
    matricule: string;
    nom: string;
    demande_date: string;
    montant: number;
    mois: number;
    annee: number;
    statut: 'en_attente' | 'valide' | 'refuse';
    commentaire?: string;
    valide_par?: string;
    date_validation?: string;
}

const Avances = () => {
    const { user } = useAuth();
    const { chantiers, monteurs, affectations } = useData();

    // State
    const [selectedAllowedDate, setSelectedAllowedDate] = useState(new Date());
    const [selectedChantierId, setSelectedChantierId] = useState<string>('');
    const [avancesList, setAvancesList] = useState<AdvanceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMatricule, setFormMatricule] = useState('');
    const [formMontant, setFormMontant] = useState('');
    const [formCommentaire, setFormCommentaire] = useState('');

    // Data for validation
    const [currentPointages, setCurrentPointages] = useState<any[]>([]);

    // Derived state
    const currentMonth = selectedAllowedDate.getMonth() + 1;
    const currentYear = selectedAllowedDate.getFullYear();

    const activeChantiers = useMemo(() => chantiers.filter(c => c.statut === 'actif'), [chantiers]);

    // Formatage de date sécurisé
    const safeFormatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return isValid(date) ? format(date, 'dd MMM yyyy', { locale: fr }) : 'Date invalide';
        } catch (e) {
            return 'Date invalide';
        }
    };

    // Fetch Avances - Hybride Supabase / LocalStorage
    useEffect(() => {
        if (selectedChantierId) {
            fetchAvances();
            fetchPointages();
        } else {
            setAvancesList([]);
        }
    }, [selectedChantierId, currentMonth, currentYear]);

    const fetchAvances = async () => {
        setIsLoading(true);
        try {
            const data = await mysqlService.query('get_avances', {
                id_chantier: selectedChantierId,
                mois: currentMonth.toString(),
                annee: currentYear.toString()
            });

            if (Array.isArray(data)) {
                setAvancesList(data);
            }
        } catch (error) {
            console.error('❌ Erreur Chargement Avances:', error);
            toast.error('Erreur lors du chargement des avances');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPointages = async () => {
        try {
            const data = await mysqlService.query('get_pointages', {
                id_chantier: selectedChantierId,
                mois: currentMonth.toString(),
                annee: currentYear.toString()
            });

            if (Array.isArray(data)) {
                setCurrentPointages(data);
            }
        } catch (error) {
            console.error('❌ Erreur Chargement Pointages:', error);
        }
    };

    const calculateLimit = (matricule: string) => {
        const pointage = currentPointages.find(p => p.matricule === matricule.toString());
        if (!pointage) return 0;

        let totalSalaire = 0;
        if (pointage.total_salaire) {
            totalSalaire = pointage.total_salaire;
        } else {
            const totalJours = pointage.total_jours || 0;
            const salaireJour = pointage.salaire_journalier || 120;
            totalSalaire = totalJours * salaireJour;
        }
        return totalSalaire * MAX_ADVANCE_PERCENTAGE;
    };

    const handleCreateAdvance = async () => {
        if (!selectedChantierId || !formMatricule || !formMontant) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        const montant = parseFloat(formMontant);
        const limit = calculateLimit(formMatricule);

        if (montant > limit) {
            toast.error(`ERREUR : Le montant (${formatCurrency(montant)}) dépasse le plafond de 75% (${formatCurrency(limit)})`);
            return;
        }

        const monteur = monteurs.find(m => m.matricule.toString() === formMatricule);
        const newAdvance = {
            id: crypto.randomUUID(),
            chantier_id: selectedChantierId,
            matricule: formMatricule,
            nom: monteur?.nom_monteur || 'Inconnu',
            demande_date: new Date().toISOString(),
            montant: montant,
            mois: currentMonth,
            annee: currentYear,
            statut: 'en_attente',
            commentaire: formCommentaire,
            created_by: user?.email
        };

        try {
            const response = await mysqlService.query('save_avance', {}, newAdvance);
            if (response.status === 'success') {
                toast.success('Demande d\'avance envoyée');
                fetchAvances();
                setIsFormOpen(false);
                setFormMatricule('');
                setFormMontant('');
                setFormCommentaire('');
            } else {
                throw new Error(response.message || "Erreur serveur MySQL");
            }
        } catch (error: any) {
            console.error('❌ Erreur Sauvegarde Avance:', error);
            toast.error('Erreur lors de l\'envoi de la demande');
        }
    };

    const handleUpdateStatus = async (id: string, statut: 'valide' | 'refuse') => {
        try {
            const response = await mysqlService.query('update_avance_status', {}, {
                id: id,
                statut: statut,
                valide_par: user?.email
            });

            if (response.status === 'success') {
                toast.success(`Demande ${statut === 'valide' ? 'acceptée' : 'refusée'}`);
                fetchAvances();
            } else {
                throw new Error(response.message || "Erreur MySQL");
            }
        } catch (error: any) {
            console.error('❌ Erreur Validation Avance:', error);
            toast.error('Erreur lors de la validation');
        }
    };

    const monteursOptions = useMemo(() => {
        if (!selectedChantierId) return [];
        return affectations
            .filter(a => a.id_chantier === selectedChantierId)
            .map(a => monteurs.find(mon => mon.matricule === a.matricule))
            .filter(Boolean);
    }, [selectedChantierId, affectations, monteurs]);

    return (
        <div className="flex flex-col gap-6 pb-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-indigo-600" />
                        Gestion des Avances
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Gérez les demandes d'acomptes et validez les paiements.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button onClick={() => setSelectedAllowedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-slate-600">
                        <ArrowRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="px-4 font-bold text-slate-800 min-w-[140px] text-center capitalize">
                        {format(selectedAllowedDate, 'MMMM yyyy', { locale: fr })}
                    </div>
                    <button onClick={() => setSelectedAllowedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-slate-600">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sélectionner un Chantier</label>
                    <div className="relative">
                        <select
                            value={selectedChantierId}
                            onChange={(e) => setSelectedChantierId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none transition-all"
                        >
                            <option value="">-- Choisir un chantier --</option>
                            {activeChantiers.map(c => (
                                <option key={c.id_chantier} value={c.id_chantier}>
                                    {c.nom_client} ({c.ref_chantier})
                                </option>
                            ))}
                        </select>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    </div>
                </div>

                <div className="md:col-span-2 flex items-end justify-end">
                    <button
                        onClick={() => setIsFormOpen(true)}
                        disabled={!selectedChantierId}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nouvelle Demande
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {!selectedChantierId ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Wallet className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">Aucun chantier sélectionné</h3>
                    <p className="text-slate-500">Veuillez sélectionner un chantier pour gérer les avances.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-500" />
                                    Historique du mois
                                </h3>
                                <span className="text-sm font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                                    {avancesList.length} demandes
                                </span>
                            </div>

                            {avancesList.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    Aucune avance demandée pour ce mois.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {avancesList.map((avance) => (
                                        <div key={avance.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-center">
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                                                    avance.statut === 'valide' ? "bg-emerald-100 text-emerald-600" :
                                                        avance.statut === 'refuse' ? "bg-red-100 text-red-600" :
                                                            "bg-amber-100 text-amber-600"
                                                )}>
                                                    {avance.nom?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{avance.nom}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span>Mat: {avance.matricule}</span>
                                                        <span>•</span>
                                                        <span>{safeFormatDate(avance.demande_date)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                                <div className="text-right">
                                                    <div className="text-lg font-extrabold text-slate-900">{formatCurrency(avance.montant)}</div>
                                                    <div className={cn(
                                                        "text-xs font-bold uppercase tracking-wider text-center px-2 py-0.5 rounded",
                                                        avance.statut === 'valide' ? "bg-emerald-100 text-emerald-700" :
                                                            avance.statut === 'refuse' ? "bg-red-100 text-red-700" :
                                                                "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {avance.statut.replace('_', ' ')}
                                                    </div>
                                                </div>

                                                {avance.statut === 'en_attente' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(avance.id, 'valide')}
                                                            className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                                            title="Valider"
                                                        >
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(avance.id, 'refuse')}
                                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                                            title="Refuser"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        {isFormOpen ? (
                            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6 sticky top-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-lg text-slate-900">Nouvelle Demande</h3>
                                    <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-sm font-bold text-slate-700">Collaborateur</label>
                                    <select
                                        value={formMatricule}
                                        onChange={(e) => setFormMatricule(e.target.value)}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    >
                                        <option value="">Choisir...</option>
                                        {monteursOptions.map((m: any) => (
                                            <option key={m.matricule} value={m.matricule}>{m.nom_monteur}</option>
                                        ))}
                                    </select>

                                    {formMatricule && (
                                        <div className="bg-indigo-50 p-3 rounded-lg text-sm">
                                            <span className="text-indigo-700 font-bold">Plafond (75%): </span>
                                            <span className="font-bold">{formatCurrency(calculateLimit(formMatricule))}</span>
                                        </div>
                                    )}

                                    <label className="block text-sm font-bold text-slate-700">Montant (DH)</label>
                                    <input
                                        type="number"
                                        value={formMontant}
                                        onChange={(e) => setFormMontant(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none"
                                        placeholder="0.00"
                                    />
                                    <button
                                        onClick={handleCreateAdvance}
                                        disabled={!formMatricule || !formMontant || parseFloat(formMontant) > calculateLimit(formMatricule)}
                                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {parseFloat(formMontant) > calculateLimit(formMatricule)
                                            ? `Limite dépassée (${formatCurrency(calculateLimit(formMatricule))})`
                                            : "Enregistrer"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl">
                                <h3 className="text-xl font-bold mb-2">Plafond 75%</h3>
                                <p className="text-indigo-100 text-sm mb-6">Les avances sont limitées à 75% du salaire acquis.</p>
                                <div className="bg-white/10 rounded-xl p-4">
                                    <span className="block text-sm">Total du mois</span>
                                    <span className="text-2xl font-bold">
                                        {formatCurrency(avancesList.filter(a => a.statut === 'valide').reduce((sum, a) => sum + (Number(a.montant) || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Avances;
