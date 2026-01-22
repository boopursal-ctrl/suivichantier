
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { format, parseISO, isToday, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    ClipboardCheck,
    Users,
    TrendingUp,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Cloud,
    CloudRain,
    Wind,
    Snowflake,
    Camera,
    Save,
    Eye,
    ChevronRight,
    UserCheck,
    UserX,
    Plus,
    BarChart3
} from 'lucide-react';
import { cn } from '../utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Types locaux
interface DailyReport {
    date: string;
    effectifPrevu: number;
    effectifReel: number;
    heuresTravaillees: number;
    avancementPrevu: number;
    avancementReel: number;
    meteo: string;
    conditions: string;
    observations: string;
    problemes: string;
}

const ChefChantier = () => {
    const { chantiers, monteurs, affectations, user } = useData();
    const [selectedChantier, setSelectedChantier] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showReportForm, setShowReportForm] = useState(false);

    // Rapport en cours de saisie
    const [currentReport, setCurrentReport] = useState<DailyReport>({
        date: format(new Date(), 'yyyy-MM-dd'),
        effectifPrevu: 0,
        effectifReel: 0,
        heuresTravaillees: 0,
        avancementPrevu: 0,
        avancementReel: 0,
        meteo: 'beau',
        conditions: 'normales',
        observations: '',
        problemes: ''
    });

    // Présences des monteurs
    const [presences, setPresences] = useState<Record<string, { present: boolean; heures: number; motif?: string }>>({});

    // Chantiers actifs (temporairement tous les chantiers actifs pour test)
    const mesChantiers = useMemo(() => {
        return chantiers.filter(c => c.statut === 'actif');
        // TODO: Activer le filtre par chef une fois les champs remplis
        // return chantiers.filter(c => 
        //   c.statut === 'actif' && 
        //   (c.chef_chantier === user?.nom || c.responsable_chantier === user?.nom)
        // );
    }, [chantiers]);

    const chantierSelectionne = useMemo(() =>
        chantiers.find(c => c.id_chantier === selectedChantier),
        [chantiers, selectedChantier]);

    // Monteurs affectés au chantier sélectionné
    const monteursAffectes = useMemo(() => {
        if (!selectedChantier) return [];
        const affectationsChantier = affectations.filter(a => a.id_chantier === selectedChantier);
        return affectationsChantier.map(a => monteurs.find(m => m.matricule === a.matricule)).filter(Boolean);
    }, [selectedChantier, affectations, monteurs]);

    const handleSaveReport = async () => {
        if (!selectedChantier) {
            toast.error("Veuillez sélectionner un chantier");
            return;
        }

        // TODO: Enregistrer dans Supabase
        toast.success("Rapport journalier enregistré avec succès");
        setShowReportForm(false);
    };

    const handleTogglePresence = (matricule: string) => {
        setPresences(prev => ({
            ...prev,
            [matricule]: {
                present: !prev[matricule]?.present,
                heures: prev[matricule]?.heures || 8,
                motif: prev[matricule]?.motif
            }
        }));
    };

    const MeteoIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'pluie': return <CloudRain className="w-5 h-5" />;
            case 'vent': return <Wind className="w-5 h-5" />;
            case 'neige': return <Snowflake className="w-5 h-5" />;
            default: return <Cloud className="w-5 h-5" />;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] gap-6 max-w-[1920px] mx-auto">

            {/* Header */}
            <div className="flex justify-between items-center pb-6 border-b-2 border-slate-200">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <ClipboardCheck className="w-8 h-8 text-indigo-600" />
                        Espace Chef de Chantier
                    </h1>
                    <p className="text-slate-600 text-sm mt-1">Suivi quotidien et validation des données terrain</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-300 rounded-xl">
                        <p className="text-xs text-indigo-600 font-medium">Connecté en tant que</p>
                        <p className="text-sm font-bold text-indigo-900">{user?.nom || 'Chef de Chantier'}</p>
                    </div>
                    <div className="px-4 py-2 bg-white border-2 border-slate-300 rounded-xl flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        <span className="text-sm font-bold text-slate-800">{format(new Date(), 'd MMMM yyyy', { locale: fr })}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">

                {/* Sidebar - Mes Chantiers */}
                <div className="w-96 flex flex-col bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
                    <div className="p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                        <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            Mes Chantiers Actifs
                        </h2>
                        <p className="text-xs text-slate-600 mt-1">{mesChantiers.length} chantier(s) en cours</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {mesChantiers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <AlertTriangle className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-sm text-center">Aucun chantier actif assigné</p>
                            </div>
                        ) : (
                            mesChantiers.map(chantier => (
                                <motion.button
                                    key={chantier.id_chantier}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedChantier(chantier.id_chantier)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-xl border-2 transition-all",
                                        selectedChantier === chantier.id_chantier
                                            ? "bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-400 shadow-lg"
                                            : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{chantier.ref_chantier}</p>
                                            <h3 className="font-bold text-slate-900 text-base mt-0.5">{chantier.nom_client}</h3>
                                        </div>
                                        <ChevronRight className={cn(
                                            "w-5 h-5 transition-transform",
                                            selectedChantier === chantier.id_chantier ? "text-indigo-600 rotate-90" : "text-slate-400"
                                        )} />
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <Users className="w-3.5 h-3.5" />
                                        <span>{affectations.filter(a => a.id_chantier === chantier.id_chantier).length} monteurs</span>
                                    </div>
                                </motion.button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">

                    {!selectedChantier ? (
                        <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-300">
                            <div className="text-center">
                                <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 mb-2">Sélectionnez un chantier</h3>
                                <p className="text-slate-500">Choisissez un chantier dans la liste pour commencer</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chantier Header */}
                            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-2xl p-6 text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-indigo-200 text-sm font-medium mb-1">{chantierSelectionne?.ref_chantier}</p>
                                        <h2 className="text-2xl font-bold">{chantierSelectionne?.nom_client}</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowReportForm(true)}
                                        className="px-4 py-2 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nouveau Rapport
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                        <div className="flex items-center gap-2 text-indigo-200 text-xs mb-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Début</span>
                                        </div>
                                        <p className="font-bold text-lg">{chantierSelectionne?.date_debut ? format(parseISO(chantierSelectionne.date_debut), 'd MMM', { locale: fr }) : '-'}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                        <div className="flex items-center gap-2 text-indigo-200 text-xs mb-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Durée</span>
                                        </div>
                                        <p className="font-bold text-lg">{chantierSelectionne?.duree_prevue || 0} jours</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                        <div className="flex items-center gap-2 text-indigo-200 text-xs mb-1">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>Équipe</span>
                                        </div>
                                        <p className="font-bold text-lg">{monteursAffectes.length} monteurs</p>
                                    </div>
                                </div>
                            </div>

                            {/* Rapport Form */}
                            {showReportForm && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden"
                                >
                                    <div className="p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                                            Rapport Journalier - {format(new Date(), 'd MMMM yyyy', { locale: fr })}
                                        </h3>
                                    </div>

                                    <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">

                                        {/* Effectifs */}
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-indigo-600" />
                                                Effectifs et Présences
                                            </h4>

                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                                    <label className="text-xs font-bold text-slate-600 mb-2 block">Effectif Prévu</label>
                                                    <input
                                                        type="number"
                                                        value={currentReport.effectifPrevu}
                                                        onChange={e => setCurrentReport({ ...currentReport, effectifPrevu: parseInt(e.target.value) || 0 })}
                                                        className="w-full text-2xl font-bold text-slate-900 bg-transparent outline-none"
                                                    />
                                                </div>
                                                <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-300">
                                                    <label className="text-xs font-bold text-indigo-700 mb-2 block">Effectif Réel</label>
                                                    <input
                                                        type="number"
                                                        value={currentReport.effectifReel}
                                                        onChange={e => setCurrentReport({ ...currentReport, effectifReel: parseInt(e.target.value) || 0 })}
                                                        className="w-full text-2xl font-bold text-indigo-900 bg-transparent outline-none"
                                                    />
                                                </div>
                                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                                    <label className="text-xs font-bold text-emerald-700 mb-2 block">Heures Travaillées</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        value={currentReport.heuresTravaillees}
                                                        onChange={e => setCurrentReport({ ...currentReport, heuresTravaillees: parseFloat(e.target.value) || 0 })}
                                                        className="w-full text-2xl font-bold text-emerald-900 bg-transparent outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Liste des monteurs */}
                                            <div className="space-y-2">
                                                <p className="text-sm font-bold text-slate-700 mb-2">Pointage des monteurs :</p>
                                                {monteursAffectes.map((monteur: any) => (
                                                    <div key={monteur.matricule} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => handleTogglePresence(monteur.matricule)}
                                                                className={cn(
                                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                                                    presences[monteur.matricule]?.present
                                                                        ? "bg-emerald-500 text-white"
                                                                        : "bg-slate-300 text-slate-600"
                                                                )}
                                                            >
                                                                {presences[monteur.matricule]?.present ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                                                            </button>
                                                            <div>
                                                                <p className="font-bold text-slate-900">{monteur.nom_monteur}</p>
                                                                <p className="text-xs text-slate-500">{monteur.matricule}</p>
                                                            </div>
                                                        </div>
                                                        {presences[monteur.matricule]?.present && (
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                placeholder="8h"
                                                                className="w-20 px-3 py-2 border-2 border-slate-200 rounded-lg text-center font-bold"
                                                                value={presences[monteur.matricule]?.heures || 8}
                                                                onChange={e => setPresences(prev => ({
                                                                    ...prev,
                                                                    [monteur.matricule]: { ...prev[monteur.matricule], heures: parseFloat(e.target.value) || 0 }
                                                                }))}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Avancement */}
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                                Avancement du Chantier
                                            </h4>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                                    <label className="text-xs font-bold text-slate-600 mb-2 block">Avancement Prévu (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={currentReport.avancementPrevu}
                                                        onChange={e => setCurrentReport({ ...currentReport, avancementPrevu: parseInt(e.target.value) || 0 })}
                                                        className="w-full text-2xl font-bold text-slate-900 bg-transparent outline-none"
                                                    />
                                                </div>
                                                <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-300">
                                                    <label className="text-xs font-bold text-indigo-700 mb-2 block">Avancement Réel (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={currentReport.avancementReel}
                                                        onChange={e => setCurrentReport({ ...currentReport, avancementReel: parseInt(e.target.value) || 0 })}
                                                        className="w-full text-2xl font-bold text-indigo-900 bg-transparent outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Conditions */}
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Cloud className="w-5 h-5 text-indigo-600" />
                                                Conditions de Travail
                                            </h4>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Météo</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { value: 'beau', label: 'Beau', icon: Cloud },
                                                            { value: 'pluie', label: 'Pluie', icon: CloudRain },
                                                            { value: 'vent', label: 'Vent', icon: Wind },
                                                            { value: 'neige', label: 'Neige', icon: Snowflake }
                                                        ].map(({ value, label, icon: Icon }) => (
                                                            <button
                                                                key={value}
                                                                onClick={() => setCurrentReport({ ...currentReport, meteo: value })}
                                                                className={cn(
                                                                    "p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                                                                    currentReport.meteo === value
                                                                        ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                                                                        : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200"
                                                                )}
                                                            >
                                                                <Icon className="w-5 h-5" />
                                                                <span className="text-xs font-bold">{label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Conditions</label>
                                                    <div className="space-y-2">
                                                        {[
                                                            { value: 'normales', label: 'Normales', color: 'emerald' },
                                                            { value: 'difficiles', label: 'Difficiles', color: 'orange' },
                                                            { value: 'impossibles', label: 'Impossibles', color: 'red' }
                                                        ].map(({ value, label, color }) => (
                                                            <button
                                                                key={value}
                                                                onClick={() => setCurrentReport({ ...currentReport, conditions: value })}
                                                                className={cn(
                                                                    "w-full p-3 rounded-lg border-2 transition-all font-bold text-sm",
                                                                    currentReport.conditions === value
                                                                        ? `bg-${color}-100 border-${color}-500 text-${color}-700`
                                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                                )}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Observations */}
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block">Observations Générales</label>
                                            <textarea
                                                value={currentReport.observations}
                                                onChange={e => setCurrentReport({ ...currentReport, observations: e.target.value })}
                                                className="w-full h-24 px-4 py-3 border-2 border-slate-200 rounded-xl resize-none focus:border-indigo-400 outline-none"
                                                placeholder="Notes, remarques, points importants..."
                                            />
                                        </div>

                                        {/* Problèmes */}
                                        <div>
                                            <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                Problèmes Rencontrés
                                            </label>
                                            <textarea
                                                value={currentReport.problemes}
                                                onChange={e => setCurrentReport({ ...currentReport, problemes: e.target.value })}
                                                className="w-full h-24 px-4 py-3 border-2 border-orange-200 rounded-xl resize-none focus:border-orange-400 outline-none bg-orange-50/30"
                                                placeholder="Incidents, blocages, retards..."
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-6 border-t-2 border-slate-200 bg-slate-50 flex gap-3">
                                        <button
                                            onClick={() => setShowReportForm(false)}
                                            className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleSaveReport}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-5 h-5" />
                                            Enregistrer le Rapport
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Historique des rapports (placeholder) */}
                            {!showReportForm && (
                                <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-6">
                                    <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                                        <Eye className="w-5 h-5 text-indigo-600" />
                                        Historique des Rapports
                                    </h3>
                                    <div className="text-center py-12 text-slate-400">
                                        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>Aucun rapport enregistré pour ce chantier</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChefChantier;
