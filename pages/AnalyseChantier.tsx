import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { AnalyseChantier, PrimeChantier, Chantier } from '../types';
import { formatCurrency, formatDate, countDays } from '../utils';
import {
    ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
    TrendingUp, TrendingDown, Calendar, DollarSign,
    FileText, Award, Save, X, Wand2, CheckSquare, LayoutList,
    Briefcase, History, Trash2, Paperclip, Upload, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { mysqlService } from '../services/mysqlService';

interface AnalyseChantierPageProps {
    chantierId: string;
    onBack: () => void;
}

const AnalyseChantierPage: React.FC<AnalyseChantierPageProps> = ({ chantierId, onBack }) => {
    const { user } = useAuth();
    const { chantiers, lignesCouts, affectations, versements, monteurs } = useData();

    const PERMANENT_MANAGEMENT_MATRICULES = [100, 101, 102, 103, 104, 157];

    const [analyse, setAnalyse] = useState<AnalyseChantier | null>(null);
    const [primes, setPrimes] = useState<PrimeChantier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Form state pour génération
    const [formData, setFormData] = useState({
        bl_cachete: false,
        bc_cachete: false,
        br_cachete: false,
        bl_url: '',
        bc_url: '',
        br_url: '',
        remarques: ''
    });

    // Form state pour primes
    const [primesForm, setPrimesForm] = useState<{
        chef_chantier_matricule: number | '';
        chef_chantier_montant: number;
        sous_chef_matricule: number | '';
        sous_chef_montant: number;
    }>({
        chef_chantier_matricule: '',
        chef_chantier_montant: 0,
        sous_chef_matricule: '',
        sous_chef_montant: 0
    });

    const chantier = chantiers.find(c => c.id_chantier === chantierId);

    const [hasCleaned, setHasCleaned] = useState(false);
    
    // Charger l'analyse existante
    useEffect(() => {
        loadAnalyse();
    }, [chantierId]);

    const loadAnalyse = async () => {
        try {
            setLoading(true);
            const data = await mysqlService.query('get_analyses', { id_chantier: chantierId });
            console.log("📥 Données reçues:", data);

            // Vérification sur id_chantier (string non vide) et pas id_analyse (peut être 0 = falsy)
            if (data && typeof data === 'object' && !Array.isArray(data) && data.id_chantier) {
                console.log('✅ [loadAnalyse] Analyse trouvée en MySQL:', data);
                setAnalyse(data);
                // Charger les primes avec l'id_chantier en fallback si id_analyse = 0
                const primeParams = data.id_analyse
                    ? { id_analyse: String(data.id_analyse) }
                    : { id_chantier: chantierId };
                const primesData = await mysqlService.query('get_primes', primeParams);
                if (Array.isArray(primesData)) {
                    setPrimes(primesData.map(p => ({
                        ...p,
                        id_prime: p.id_prime || p.id || `${p.matricule}-${p.nom_monteur}`
                    })));
                }
            } else {
                console.warn('⚠️ [loadAnalyse] Pas d\'analyse MySQL, data reçue:', data);
                // Repli sur LocalStorage uniquement si MySQL est vide
                const localAnalyse = localStorage.getItem(`analyse_${chantierId}`);
                if (localAnalyse) {
                    setAnalyse(JSON.parse(localAnalyse));
                    const localPrimes = localStorage.getItem(`primes_${chantierId}`);
                    if (localPrimes) setPrimes(JSON.parse(localPrimes));
                } else {
                    setAnalyse(null);
                    setPrimes([]);
                }
            }
        } catch (error: any) {
            console.error('❌ Erreur Chargement:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalyse = () => {
        if (!chantier) return null;

        // Calcul budget
        const costs = lignesCouts.filter(c => c.id_chantier === chantierId);
        const workers = affectations.filter(a => a.id_chantier === chantierId);

        // Budget réel = coûts + salaires
        const totalCouts = costs.reduce((sum, c) => sum + (c.montant_reel || 0), 0);

        const PERMANENT_MANAGEMENT_MATRICULES = [100, 101, 102, 103, 104, 157];
        const totalSalaires = workers.reduce((sum, w) => {
            if (PERMANENT_MANAGEMENT_MATRICULES.includes(w.matricule)) return sum;
            const end = w.date_sortie || new Date().toISOString().split('T')[0];
            const days = countDays(w.date_entree, end);
            return sum + (days * w.salaire_jour);
        }, 0);

        // Ajouter les monteurs locaux
        const localWorkersCost = (chantier.monteurs_locaux || []).reduce((sum, ml) => {
            const startDate = ml.date_debut || chantier.date_debut || new Date().toISOString().split('T')[0];
            const endDate = ml.date_fin || chantier.date_fin || new Date().toISOString().split('T')[0];
            const days = Math.max(0, countDays(startDate, endDate));
            return sum + (days * ml.salaire_jour);
        }, 0);

        const budget_reel = totalCouts + totalSalaires + localWorkersCost;
        const budget_prevu = chantier.budget_prevu || 0;
        const ecart_budget = budget_reel - budget_prevu;
        const pourcentage_ecart_budget = budget_prevu > 0 ? (ecart_budget / budget_prevu) * 100 : 0;

        // Tolérance ±5%
        const budget_respecte = Math.abs(pourcentage_ecart_budget) <= 5;

        // Calcul durée
        const duree_prevue = chantier.duree_prevue || 0;
        const date_debut = chantier.date_debut || new Date().toISOString().split('T')[0];
        const date_fin = chantier.date_fin || new Date().toISOString().split('T')[0];
        const duree_reelle = countDays(date_debut, date_fin);
        const ecart_duree = duree_reelle - duree_prevue;

        // Tolérance ±2 jours
        const duree_respectee = Math.abs(ecart_duree) <= 2;

        const results = {
            budget_prevu,
            budget_reel,
            budget_respecte,
            ecart_budget,
            pourcentage_ecart_budget,
            duree_prevue,
            duree_reelle,
            duree_respectee,
            ecart_duree
        };
        console.log("🧮 Résultats du calcul d'analyse:", results);
        return results;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'bl' | 'bc' | 'br') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);

            setFormData(prev => ({
                ...prev,
                [`${type}_url`]: url,
                [`${type}_cachete`]: true
            }));

            toast.success(`${type.toUpperCase()} joint avec succès`);
        }
    };

    const handleGenererAnalyse = async () => {
        if (!chantier || !user) return;

        const calculs = calculateAnalyse();
        if (!calculs) return;

        try {
            setIsGenerating(true);

            const tous_criteres_parfaits =
                calculs.budget_respecte &&
                calculs.duree_respectee &&
                formData.bl_cachete &&
                formData.bc_cachete &&
                formData.br_cachete;

            const nouvelleAnalyse: Partial<AnalyseChantier> = {
                id_chantier: chantierId,
                ...calculs,
                bl_cachete: formData.bl_cachete,
                bc_cachete: formData.bc_cachete,
                br_cachete: formData.br_cachete,
                bl_url: formData.bl_url,
                bc_url: formData.bc_url,
                br_url: formData.br_url,
                remarques: formData.remarques,
                tous_criteres_parfaits,
                date_analyse: new Date().toISOString(),
                genere_par: user.email
            };

            // Sauvegarde dans MySQL uniquement
            const response = await mysqlService.query('save_analyse', {}, {
                ...nouvelleAnalyse,
                genere_par: user?.email
            });

            console.log("💾 Réponse du serveur à save_analyse:", JSON.stringify(response));

            if (response.status === 'success') {
                toast.success('✅ Analyse enregistrée avec succès !');
                // On fixe l'analyse localement d'abord (ne pas dépendre de response.id qui peut être 0)
                const savedAnalyse = { ...nouvelleAnalyse, id_analyse: response.id || 0 } as AnalyseChantier;
                setAnalyse(savedAnalyse);
                // Recharger depuis MySQL pour avoir l'id_analyse réel (si différent de 0)
                // sans écraser l'état si le rechargement échoue
                try {
                    const freshData = await mysqlService.query('get_analyses', { id_chantier: chantierId });
                    if (freshData && typeof freshData === 'object' && !Array.isArray(freshData) && freshData.id_chantier) {
                        setAnalyse(freshData as AnalyseChantier);
                        const primeParams = freshData.id_analyse
                            ? { id_analyse: String(freshData.id_analyse) }
                            : { id_chantier: chantierId };
                        const primesData = await mysqlService.query('get_primes', primeParams);
                        if (Array.isArray(primesData)) {
                            setPrimes(primesData.map((p: any) => ({
                                ...p,
                                id_prime: p.id_prime || p.id || `${p.matricule}-${p.nom_monteur}`
                            })));
                        }
                    }
                    // Si freshData est null/invalide, on garde savedAnalyse déjà setté
                } catch (reloadError) {
                    console.warn('⚠️ Reload après save échoué, on garde l\'état local');
                }
            } else {
                throw new Error("Erreur serveur MySQL lors de la sauvegarde");
            }

        } catch (error: any) {
            console.error('❌ Erreur critique:', error);
            alert(`Erreur: ${error.message || 'Problème lors de la sauvegarde'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnregistrerPrimes = async () => {
        if (!analyse || !user) return;

        try {
            const generateId = () => {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
                return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            };

            const nouvelles_primes: Partial<PrimeChantier>[] = [];

            console.log('▶️ [Primes] handleEnregistrerPrimes appelé, form:', primesForm);
            console.log('▶️ [Primes] potentialBeneficiaries count:', potentialBeneficiaries.length);

            // Préparation des primes — comparaison en Number() pour éviter string vs number
            if (primesForm.chef_chantier_matricule && primesForm.chef_chantier_montant > 0) {
                const b = potentialBeneficiaries.find(p => Number(p.matricule) === Number(primesForm.chef_chantier_matricule));
                console.log('🔍 Chef trouvé:', b, 'pour matricule:', primesForm.chef_chantier_matricule);
                if (b) {
                    const id = generateId();
                    nouvelles_primes.push({
                        id_prime: id,
                        id_analyse: analyse.id_analyse,
                        id_chantier: chantierId,
                        matricule: b.matricule,
                        nom_monteur: b.nom,
                        role_chantier: 'Chef de Chantier',
                        montant_prime: primesForm.chef_chantier_montant,
                        statut: 'en_attente'
                    });
                } else {
                    toast.error(`Monteur matricule ${primesForm.chef_chantier_matricule} introuvable`);
                }
            }

            if (primesForm.sous_chef_matricule && primesForm.sous_chef_montant > 0) {
                const b = potentialBeneficiaries.find(p => Number(p.matricule) === Number(primesForm.sous_chef_matricule));
                console.log('🔍 Sous-chef trouvé:', b, 'pour matricule:', primesForm.sous_chef_matricule);
                if (b) {
                    const id = generateId();
                    nouvelles_primes.push({
                        id_prime: id,
                        id_analyse: analyse.id_analyse,
                        id_chantier: chantierId,
                        matricule: b.matricule,
                        nom_monteur: b.nom,
                        role_chantier: 'Sous Chef de Chantier',
                        montant_prime: primesForm.sous_chef_montant,
                        statut: 'en_attente'
                    });
                } else {
                    toast.error(`Monteur matricule ${primesForm.sous_chef_matricule} introuvable`);
                }
            }

            console.log('📋 [Primes] Primes à enregistrer:', nouvelles_primes);

            if (nouvelles_primes.length === 0) {
                toast.error('⚠️ Veuillez sélectionner au moins un bénéficiaire et saisir un montant supérieur à 0');
                return;
            }

            const response = await mysqlService.query('save_primes', {}, nouvelles_primes);
            if (response.status === 'success') {
                await loadAnalyse();
                toast.success('✅ Primes enregistrées avec succès !');
            } else {
                throw new Error("Erreur serveur MySQL lors de l'enregistrement des primes");
            }

        } catch (error: any) {
            console.error('❌ Erreur Primes:', error);
            alert('❌ Erreur lors de l\'enregistrement');
        }
    };

    const handleValiderPrime = async (primeId: string, statut: 'validee' | 'refusee', commentaire?: string) => {
        if (!user) return;
        if (!primeId) {
            console.error("❌ Impossible de valider : ID de prime manquant dans l'objet", { primeId, statut });
            toast.error("Erreur : Identifiant de prime introuvable. Veuillez recharger la page.");
            return;
        }

            const response = await mysqlService.query('update_prime_status', {}, {
                id_prime: primeId,
                statut: statut,
                validee_par: user.email,
                commentaire: commentaire || null
            });

            if (response.status === 'success') {
                toast.success(`✅ Prime mise à jour !`);
                await loadAnalyse();
            } else {
                throw new Error(response.message || "Erreur MySQL");
            }
    };

    if (!chantier) {
        return <div className="p-6">Chantier introuvable</div>;
    }

    const handleCleanup = async () => {
        try {
            await mysqlService.query('get_analyses', { id_chantier: chantierId, cleanup: 'true' });
            toast.success('Base de données réparée. Re-générez l\'analyse.');
            setAnalyse(null);
            loadAnalyse();
        } catch (error) {
            toast.error('Erreur lors de la réparation');
        }
    };

    if (loading) {
        return <div className="p-6">Chargement...</div>;
    }

    const calculs = calculateAnalyse();

    // Liste des bénéficiaires : tous les monteurs actifs (priorité aux permanents de direction)
    const potentialBeneficiaries = monteurs
        .filter(m => m.actif !== false && m.actif !== 0)
        .map(m => ({
            matricule: m.matricule,
            nom: m.nom_monteur,
            isPermanent: PERMANENT_MANAGEMENT_MATRICULES.includes(m.matricule)
        }))
        .sort((a, b) => {
            // Les permanents de direction en premier
            if (a.isPermanent && !b.isPermanent) return -1;
            if (!a.isPermanent && b.isPermanent) return 1;
            return a.nom.localeCompare(b.nom);
        });
    
    console.log('👥 [Primes] Bénéficiaires disponibles:', potentialBeneficiaries.length, potentialBeneficiaries.map(p => `${p.nom} (${p.matricule})`));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Analyse de Chantier</h1>
                            <p className="text-slate-600 mt-1">{chantier.ref_chantier} - {chantier.nom_client}</p>
                        </div>
                    </div>
                </div>

                {/* Analyse existante ou formulaire de génération */}
                {!analyse ? (
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Générer l'Analyse Finale</h2>

                        {calculs && (
                            <div className="space-y-6">
                                {/* Aperçu des calculs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Budget */}
                                    <div className="bg-slate-50 rounded-lg p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <DollarSign className="w-6 h-6 text-blue-600" />
                                            <h3 className="text-lg font-semibold text-slate-800">Budget</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Prévu:</span>
                                                <span className="font-semibold">{formatCurrency(calculs.budget_prevu)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Réel:</span>
                                                <span className="font-semibold">{formatCurrency(calculs.budget_reel)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <span className="text-slate-600">Écart:</span>
                                                <div className="flex items-center gap-2">
                                                    {calculs.ecart_budget < 0 ? (
                                                        <TrendingDown className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <TrendingUp className="w-4 h-4 text-red-600" />
                                                    )}
                                                    <span className={`font-bold ${calculs.ecart_budget < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(Math.abs(calculs.ecart_budget))} ({calculs.pourcentage_ecart_budget.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pt-2">
                                                {calculs.budget_respecte ? (
                                                    <>
                                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                        <span className="text-green-600 font-semibold">Budget respecté (±5%)</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-5 h-5 text-red-600" />
                                                        <span className="text-red-600 font-semibold">Budget non respecté</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Durée */}
                                    <div className="bg-slate-50 rounded-lg p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Calendar className="w-6 h-6 text-purple-600" />
                                            <h3 className="text-lg font-semibold text-slate-800">Durée</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Prévue:</span>
                                                <span className="font-semibold">{calculs.duree_prevue} jours</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Réelle:</span>
                                                <span className="font-semibold">{calculs.duree_reelle} jours</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <span className="text-slate-600">Écart:</span>
                                                <span className={`font-bold ${calculs.ecart_duree <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {calculs.ecart_duree > 0 ? '+' : ''}{calculs.ecart_duree} jours
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 pt-2">
                                                {calculs.duree_respectee ? (
                                                    <>
                                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                        <span className="text-green-600 font-semibold">Durée respectée (±2j)</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-5 h-5 text-red-600" />
                                                        <span className="text-red-600 font-semibold">Durée non respectée</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents cachetés */}
                                <div className="bg-slate-50 rounded-lg p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <FileText className="w-6 h-6 text-indigo-600" />
                                        <h3 className="text-lg font-semibold text-slate-800">Documents Cachetés</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {/* BL */}
                                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.bl_cachete}
                                                    onChange={(e) => setFormData({ ...formData, bl_cachete: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-slate-700 font-medium">BL (Bon de Livraison) cacheté</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {formData.bl_url && (
                                                    <a href={formData.bl_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir le document">
                                                        <Paperclip className="w-5 h-5" />
                                                    </a>
                                                )}
                                                <label className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors" title="Joindre un document">
                                                    <Upload className="w-5 h-5" />
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'bl')} accept="image/*,application/pdf" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* BC */}
                                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.bc_cachete}
                                                    onChange={(e) => setFormData({ ...formData, bc_cachete: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-slate-700 font-medium">BC (Bon de Commande) cacheté</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {formData.bc_url && (
                                                    <a href={formData.bc_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir le document">
                                                        <Paperclip className="w-5 h-5" />
                                                    </a>
                                                )}
                                                <label className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors" title="Joindre un document">
                                                    <Upload className="w-5 h-5" />
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'bc')} accept="image/*,application/pdf" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* BR */}
                                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.br_cachete}
                                                    onChange={(e) => setFormData({ ...formData, br_cachete: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                                <span className="text-slate-700 font-medium">BR (Bon de Réception) cacheté</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {formData.br_url && (
                                                    <a href={formData.br_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir le document">
                                                        <Paperclip className="w-5 h-5" />
                                                    </a>
                                                )}
                                                <label className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors" title="Joindre un document">
                                                    <Upload className="w-5 h-5" />
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'br')} accept="image/*,application/pdf" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Remarques */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Remarques
                                    </label>
                                    <textarea
                                        value={formData.remarques}
                                        onChange={(e) => setFormData({ ...formData, remarques: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Observations générales sur le chantier..."
                                    />
                                </div>

                                {/* Bouton générer */}
                                <button
                                    onClick={handleGenererAnalyse}
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    {isGenerating ? 'Génération...' : 'Générer l\'Analyse'}
                                </button>
                                
                                <button
                                    onClick={handleCleanup}
                                    className="w-full mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Problème d'affichage ? Réparer la base de données
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Résultat de l'analyse */}
                        <div className={`rounded-xl shadow-lg p-8 ${analyse.tous_criteres_parfaits
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300'
                            : 'bg-white'
                            }`}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Résultat de l'Analyse</h2>
                                {analyse.tous_criteres_parfaits && (
                                    <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full">
                                        <Award className="w-5 h-5" />
                                        <span className="font-semibold">PARFAIT</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Budget */}
                                <div className="bg-white rounded-lg p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <DollarSign className="w-6 h-6 text-blue-600" />
                                        <h3 className="text-lg font-semibold text-slate-800">Budget</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Prévu:</span>
                                            <span className="font-semibold">{formatCurrency(analyse.budget_prevu)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Réel:</span>
                                            <span className="font-semibold">{formatCurrency(analyse.budget_reel)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t">
                                            <span className="text-slate-600">Écart:</span>
                                            <span className={`font-bold ${Number(analyse.ecart_budget) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(Math.abs(Number(analyse.ecart_budget)))} ({Number(analyse.pourcentage_ecart_budget).toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            {analyse.budget_respecte ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    <span className="text-green-600 font-semibold">Respecté</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-5 h-5 text-red-600" />
                                                    <span className="text-red-600 font-semibold">Non respecté</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Durée */}
                                <div className="bg-white rounded-lg p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Calendar className="w-6 h-6 text-purple-600" />
                                        <h3 className="text-lg font-semibold text-slate-800">Durée</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Prévue:</span>
                                            <span className="font-semibold">{analyse.duree_prevue} jours</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Réelle:</span>
                                            <span className="font-semibold">{analyse.duree_reelle} jours</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t">
                                            <span className="text-slate-600">Écart:</span>
                                            <span className={`font-bold ${analyse.ecart_duree <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {analyse.ecart_duree > 0 ? '+' : ''}{analyse.ecart_duree} jours
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            {analyse.duree_respectee ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    <span className="text-green-600 font-semibold">Respectée</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-5 h-5 text-red-600" />
                                                    <span className="text-red-600 font-semibold">Non respectée</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <FileText className="w-6 h-6 text-indigo-600" />
                                    <h3 className="text-lg font-semibold text-slate-800">Documents</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            {analyse.bl_cachete ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-600" />
                                            )}
                                            <span className="text-slate-700 font-medium">BL Cacheté</span>
                                        </div>
                                        {analyse.bl_url && (
                                            <a href={analyse.bl_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Télécharger/Voir">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            {analyse.bc_cachete ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-600" />
                                            )}
                                            <span className="text-slate-700 font-medium">BC Cacheté</span>
                                        </div>
                                        {analyse.bc_url && (
                                            <a href={analyse.bc_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Télécharger/Voir">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            {analyse.br_cachete ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-600" />
                                            )}
                                            <span className="text-slate-700 font-medium">BR Cacheté</span>
                                        </div>
                                        {analyse.br_url && (
                                            <a href={analyse.br_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Télécharger/Voir">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Remarques */}
                            {analyse.remarques && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-amber-800 mb-2">Remarques:</p>
                                    <p className="text-slate-700">{analyse.remarques}</p>
                                </div>
                            )}

                            <div className="mt-4 text-sm text-slate-500">
                                Analyse générée le {formatDate(analyse.date_analyse)} par {analyse.genere_par}
                            </div>
                        </div>

                        {/* Section Primes - Visible si analyse existe (même si non parfaite) */}
                        {analyse && (
                            <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <Award className="w-6 h-6 text-yellow-600" />
                                        <h2 className="text-2xl font-bold text-slate-800">Primes de Performance</h2>
                                    </div>
                                    {!analyse.tous_criteres_parfaits && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                            <AlertTriangle className="w-4 h-4" />
                                            Critères non optimaux
                                        </div>
                                    )}
                                </div>

                                {primes.length === 0 ? (
                                    <div className="space-y-6">
                                        <p className="text-slate-600">
                                            {analyse.tous_criteres_parfaits
                                                ? '✅ Tous les critères sont parfaits ! Définissez les primes pour le chef de chantier et le sous-chef.'
                                                : '⚠️ Critères non optimaux. Vous pouvez néanmoins attribuer des primes manuellement.'}
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Chef de Chantier */}
                                            <div className="bg-slate-50 rounded-lg p-6">
                                                <h3 className="font-semibold text-slate-800 mb-4">Chef de Chantier</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Sélectionner
                                                        </label>
                                                        <select
                                                            value={primesForm.chef_chantier_matricule}
                                                            onChange={(e) => setPrimesForm({
                                                                ...primesForm,
                                                                chef_chantier_matricule: e.target.value ? Number(e.target.value) : ''
                                                            })}
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="">-- Choisir --</option>
                                                            {potentialBeneficiaries.map(w => (
                                                                <option key={`${w.matricule}-${w.nom}`} value={w.matricule}>
                                                                    {w.nom} (Mat. {w.matricule})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Montant Prime (DH)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={primesForm.chef_chantier_montant}
                                                            onChange={(e) => setPrimesForm({
                                                                ...primesForm,
                                                                chef_chantier_montant: Number(e.target.value)
                                                            })}
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sous Chef */}
                                            <div className="bg-slate-50 rounded-lg p-6">
                                                <h3 className="font-semibold text-slate-800 mb-4">Sous Chef de Chantier</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Sélectionner
                                                        </label>
                                                        <select
                                                            value={primesForm.sous_chef_matricule}
                                                            onChange={(e) => setPrimesForm({
                                                                ...primesForm,
                                                                sous_chef_matricule: e.target.value ? Number(e.target.value) : ''
                                                            })}
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="">-- Choisir --</option>
                                                            {potentialBeneficiaries.map(w => (
                                                                <option key={`${w.matricule}-${w.nom}`} value={w.matricule}>
                                                                    {w.nom} (Mat. {w.matricule})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Montant Prime (DH)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={primesForm.sous_chef_montant}
                                                            onChange={(e) => setPrimesForm({
                                                                ...primesForm,
                                                                sous_chef_montant: Number(e.target.value)
                                                            })}
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleEnregistrerPrimes}
                                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-5 h-5" />
                                            Enregistrer les Primes
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {primes.map((prime, idx) => (
                                            <div key={prime.id_prime || `${prime.matricule}-${idx}`} className="bg-slate-50 rounded-lg p-6 flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-slate-800">{prime.nom_monteur}</h3>
                                                    <p className="text-sm text-slate-600">{prime.role_chantier} - Mat. {prime.matricule}</p>
                                                    <p className="text-lg font-bold text-blue-600 mt-2">{formatCurrency(prime.montant_prime)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {prime.statut === 'en_attente' && user?.role === 'ADMIN' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleValiderPrime(prime.id_prime || (prime as any).id, 'validee')}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Valider
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const commentaire = prompt('Raison du refus:');
                                                                    if (commentaire) handleValiderPrime(prime.id_prime || (prime as any).id, 'refusee', commentaire);
                                                                }}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                                            >
                                                                <X className="w-4 h-4" />
                                                                Refuser
                                                            </button>
                                                        </>
                                                    )}
                                                    {prime.statut === 'validee' && (
                                                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                                                            ✅ Validée
                                                        </span>
                                                    )}
                                                    {prime.statut === 'refusee' && (
                                                        <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">
                                                            ❌ Refusée
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyseChantierPage;
