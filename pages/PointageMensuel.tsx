import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Save,
    FileSpreadsheet,
    Users,
    Wand2,
    Check,
    X,
    Clock,
    Printer,
    Calculator,
    MapPin
} from 'lucide-react';
import { cn, formatDate } from '../utils';
import { toast } from 'sonner';
import { mysqlService } from '../services/mysqlService';

interface PointageData {
    [matricule: string]: {
        [date: string]: number;
    };
}

const PERMANENT_MANAGEMENT_MATRICULES = [100, 101, 102, 103, 104, 157];

const PointageMensuel = () => {

    const { chantiers, monteurs, affectations, refreshData } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedChantier, setSelectedChantier] = useState<string | null>(null);
    const [pointages, setPointages] = useState<PointageData>({});
    const [salaires, setSalaires] = useState<Record<string, number>>({});
    const [isMobileView, setIsMobileView] = useState(false);
    const [selectedMonteurMobile, setSelectedMonteurMobile] = useState<string | null>(null);

    // Frais et avances par monteur
    const [avances, setAvances] = useState<Record<string, number>>({});
    const [fraisTransport, setFraisTransport] = useState<Record<string, number>>({});
    const [fraisRepas, setFraisRepas] = useState<Record<string, number>>({});
    const [fraisLoyer, setFraisLoyer] = useState<Record<string, number>>({});
    const [fraisGasoil, setFraisGasoil] = useState<Record<string, number>>({});

    // Chargement des pointages depuis Supabase
    useEffect(() => {
        if (selectedChantier) {
            loadPointages();
        } else {
            // Reset si pas de chantier
            setPointages({});
            setAvances({});
            setFraisTransport({});
            setFraisRepas({});
            setFraisLoyer({});
            setFraisGasoil({});
            setSalaires({});
        }
    }, [selectedChantier, currentDate]);

    // Détection automatique de la vue mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const loadPointages = async () => {
        if (!selectedChantier) return;

        try {
            const mois = currentDate.getMonth() + 1;
            const annee = currentDate.getFullYear();

            const data = await mysqlService.query('get_pointages', {
                id_chantier: selectedChantier,
                mois: mois.toString(),
                annee: annee.toString()
            });

            if (Array.isArray(data)) {
                const newPointages: PointageData = {};
                const newSalaires: Record<string, number> = {};
                const newAvances: Record<string, number> = {};
                const newTransport: Record<string, number> = {};
                const newRepas: Record<string, number> = {};
                const newLoyer: Record<string, number> = {};
                const newGasoil: Record<string, number> = {};

                data.forEach((p: any) => {
                    let jours = p.jours_travailles;
                    if (typeof jours === 'string') {
                        try { jours = JSON.parse(jours); } catch (e) { jours = {}; }
                    }

                    newPointages[p.matricule] = jours || {};
                    newSalaires[p.matricule] = p.salaire_journalier || 120;
                    newAvances[p.matricule] = p.avances || 0;
                    newTransport[p.matricule] = p.frais_transport || 0;
                    newRepas[p.matricule] = p.frais_repas || 0;
                    newLoyer[p.matricule] = p.frais_loyer || 0;
                    newGasoil[p.matricule] = p.frais_gasoil || 0;
                });

                setPointages(newPointages);
                setSalaires(prev => ({ ...prev, ...newSalaires }));
                setAvances(newAvances);
                setFraisTransport(newTransport);
                setFraisRepas(newRepas);
                setFraisLoyer(newLoyer);
                setFraisGasoil(newGasoil);
            }
        } catch (error) {
            console.error('Erreur chargement pointages:', error);
            toast.error("Erreur lors du chargement des pointages");
        }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const chantiersActifs = useMemo(() =>
        chantiers.filter(c => c.statut === 'actif'),
        [chantiers]);

    const chantierSelectionne = useMemo(() =>
        chantiers.find(c => c.id_chantier === selectedChantier),
        [chantiers, selectedChantier]);

    // Monteurs du chantier (permanents + locaux) - VERSION SIMPLIFIÉE
    const monteursChantier = useMemo(() => {
        if (!selectedChantier) return [];

        const chantier = chantiers.find(c => c.id_chantier === selectedChantier);
        if (!chantier) return [];

        const allMonteurs: any[] = [];
        const seenMatricules = new Set<string>();

        // 1. Monteurs permanents (via affectations)
        affectations
            .filter(a => a.id_chantier === selectedChantier)
            .forEach(a => {
                if (!seenMatricules.has(a.matricule)) {
                    const monteur = monteurs.find(m => m.matricule === a.matricule);
                    if (monteur) {
                        allMonteurs.push(monteur);
                        seenMatricules.add(a.matricule);
                    }
                }
            });

        // 2. Monteurs locaux/prévus
        if (chantier.monteurs_locaux && Array.isArray(chantier.monteurs_locaux)) {
            chantier.monteurs_locaux.forEach((local: any) => {
                const matricule = local.matricule || local.cin;

                if (!seenMatricules.has(matricule)) {
                    // Essayer tous les champs possibles pour le nom, par ordre de priorité
                    // Le champ 'collaborateur' est souvent utilisé dans l'interface d'ajout
                    const nom = local.collaborateur ||
                        local.nom ||
                        local.nom_monteur ||
                        local.nom_complet ||
                        local.name ||
                        local.full_name ||
                        `Monteur ${matricule}`;

                    allMonteurs.push({
                        matricule: matricule,
                        nom_monteur: nom,
                        type: 'local',
                        cin: local.cin
                    });
                    seenMatricules.add(matricule);
                }
            });
        }


        return allMonteurs;
    }, [selectedChantier, affectations, monteurs, chantiers]);

    // Initialiser les salaires pour les nouveaux monteurs
    useEffect(() => {
        if (monteursChantier.length === 0) return;

        setSalaires(prev => {
            const next = { ...prev };
            let hasChanges = false;

            monteursChantier.forEach(m => {
                if (next[m.matricule] === undefined) {
                    next[m.matricule] = 120;
                    hasChanges = true;
                }
            });

            return hasChanges ? next : prev;
        });
    }, [monteursChantier]);

    // Grouper par semaine
    const weeks = useMemo(() => {
        const result: Date[][] = [];
        let currentWeek: Date[] = [];

        daysInMonth.forEach((day, index) => {
            const dayOfWeek = getDay(day);

            if (dayOfWeek === 1 || index === 0) {
                if (currentWeek.length > 0) {
                    result.push(currentWeek);
                }
                currentWeek = [];
            }

            currentWeek.push(day);

            if (index === daysInMonth.length - 1) {
                result.push(currentWeek);
            }
        });

        return result;
    }, [daysInMonth]);

    // Récupérer chantiers d'un monteur
    const getMonteursChantiers = (matricule: string) => {
        return affectations
            .filter(a => a.matricule === matricule)
            .map(a => {
                const c = chantiers.find(ch => ch.id_chantier === a.id_chantier);
                return c?.ref_chantier;
            })
            .filter(Boolean);
    };

    // Toggle pointage
    const togglePointage = (matricule: string, date: string) => {
        setPointages(prev => {
            const current = prev[matricule]?.[date] || 0;
            const next = current === 0 ? 1 : current === 1 ? 0.5 : 0;

            return {
                ...prev,
                [matricule]: {
                    ...(prev[matricule] || {}),
                    [date]: next
                }
            };
        });
    };

    // Calculer total semaine
    const getWeekTotal = (matricule: string, week: Date[]) => {
        return week.reduce((sum, day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const val = pointages[matricule]?.[dateStr];
            return sum + (typeof val === 'number' ? val : 0);
        }, 0);
    };

    // Calculer total mois
    const getMonthTotal = (matricule: string) => {
        const p = pointages[matricule] || {};
        return Object.values(p).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
    };

    // --- PREMIUM FEATURES ---

    const handleAutoFill = () => {
        if (!confirm("Voulez-vous remplir automatiquement les jours ouvrables (Lun-Sam) avec une présence complète ?\nCela n'affectera que les cases vides.")) return;

        setPointages(prev => {
            const next = { ...prev };
            daysInMonth.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isWorkDay = getDay(day) !== 0; // Pas Dimanche

                if (isWorkDay) {
                    monteursChantier.forEach(m => {
                        const currentVal = next[m.matricule]?.[dateStr];
                        if (currentVal === undefined || currentVal === null) {
                            if (!next[m.matricule]) next[m.matricule] = {};
                            next[m.matricule][dateStr] = 1;
                        }
                    });
                }
            });
            return next;
        });
        toast.success("Remplissage automatique effectué");
    };

    const handleExportPDF = () => {
        if (!selectedChantier) return;

        const doc = new jsPDF('l', 'mm', 'a4');
        const chantier = chantiers.find(c => c.id_chantier === selectedChantier);

        doc.setFontSize(18);
        doc.text(`Pointage Mensuel: ${chantier?.nom_client}`, 14, 15);
        doc.setFontSize(11);
        doc.text(`Période: ${format(currentDate, 'MMMM yyyy', { locale: fr })}`, 14, 22);

        const tableHead = [['Monteur', 'Total Jours', 'Salaire/J', 'Salaire Brut', 'Avances', 'Net à Payer']];
        const tableBody = monteursChantier.map(m => {
            const total = Number(getMonthTotal(m.matricule)); // Explicit conversion
            const salJ = Number(salaires[m.matricule] || 120);
            const totalSal = total * salJ;
            const av = Number(avances[m.matricule] || 0);
            // Quick naive net calculation
            const net = totalSal - av;

            return [
                m.nom_monteur,
                total.toFixed(2),
                salJ.toFixed(2),
                totalSal.toFixed(2),
                av.toFixed(2),
                net.toFixed(2) + ' DH'
            ];
        });

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        // Add detailed calendar view if needed (simplified here for brevity)

        doc.save(`Pointage_${chantier?.ref_chantier}_${format(currentDate, 'MM-yyyy')}.pdf`);
        toast.success("PDF téléchargé");
    };

    const handleSave = async (isAutoSave = false) => {
        if (!selectedChantier) {
            if (!isAutoSave) toast.error("Veuillez sélectionner un chantier");
            return;
        }

        try {
            const mois = currentDate.getMonth() + 1;
            const annee = currentDate.getFullYear();
            const updates = [];

            for (const m of monteursChantier) {
                const matricule = m.matricule;
                const jours_data = pointages[matricule] || {};
                const total_jours = Number(getMonthTotal(matricule));
                const salaire_journalier = Number(salaires[matricule] || 120);
                // Le salaire des chefs / sous-chefs (Management) n'est pas imputé au budget du chantier
                const isManagement = [100, 101, 102, 103, 104, 157].includes(Number(matricule));
                const total_salaire = isManagement ? 0 : (total_jours * salaire_journalier);
                const montant_avances = Number(avances[matricule] || 0);
                const net_a_payer = total_salaire - montant_avances;

                updates.push({
                    id_chantier: selectedChantier,
                    matricule: matricule,
                    nom_monteur: m.nom_monteur,
                    mois: mois,
                    annee: annee,
                    salaire_journalier: salaire_journalier,
                    jours_travailles: jours_data,
                    total_jours: total_jours,
                    total_salaire: total_salaire,
                    avances: montant_avances,
                    net_a_payer: net_a_payer
                });
            }

            const response = await mysqlService.query('save_pointages', {}, updates);
            if (response.status === 'success') {
                if (!isAutoSave) {
                    toast.success("Pointage enregistré avec succès !");
                    // Rafraîchir les données globales pour mettre à jour le Budget Réel
                    if (refreshData) refreshData();
                }
            } else {
                throw new Error(response.message || "Erreur MySQL");
            }

        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            if (!isAutoSave) {
                toast.error("Erreur lors de la sauvegarde");
            }
        }
    };

    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!selectedChantier || Object.keys(pointages).length === 0) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            handleSave(true).catch(err => {
                console.error("Erreur Autosave:", err);
            });
        }, 1500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [pointages, salaires]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-theme(spacing.24))] gap-4 md:gap-6 max-w-[1920px] mx-auto pb-10">

            {/* Header */}
            <div className="flex flex-col gap-4 pb-4 md:pb-6 border-b-2 border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                            <FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
                            Pointage Mensuel
                        </h1>
                    </div>

                    {/* Toggle vue mobile/desktop */}
                    <button
                        onClick={() => setIsMobileView(!isMobileView)}
                        className="md:hidden px-3 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 text-sm"
                    >
                        {isMobileView ? <FileSpreadsheet className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {isMobileView ? 'Tableau' : 'Liste'}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <select
                        value={selectedChantier || ''}
                        onChange={e => setSelectedChantier(e.target.value)}
                        className="flex-1 sm:flex-none px-3 md:px-4 py-2 border-2 border-slate-300 rounded-xl font-bold text-sm md:text-base text-slate-800 focus:border-emerald-500 outline-none"
                    >
                        <option value="">Sélectionner un chantier</option>
                        {chantiersActifs.map(c => (
                            <option key={c.id_chantier} value={c.id_chantier}>
                                {c.ref_chantier} - {c.nom_client}
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border-2 border-slate-300 rounded-xl p-1">
                            <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg">
                                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <div className="px-3 md:px-4 font-bold text-slate-800 min-w-[100px] md:min-w-[140px] text-center capitalize text-sm md:text-base">
                                {format(currentDate, 'MMMM yyyy', { locale: fr })}
                            </div>
                            <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg">
                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAutoFill}
                                className="hidden md:flex px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all items-center gap-2"
                                title="Remplir automatiquement les jours vides"
                            >
                                <Wand2 className="w-4 h-4" />
                                <span className="hidden lg:inline">Auto-Remplir</span>
                            </button>

                            <button
                                onClick={handleExportPDF}
                                className="hidden md:flex px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl font-bold hover:shadow-lg transition-all items-center gap-2"
                                title="Télécharger PDF"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden lg:inline">PDF</span>
                            </button>

                            <button
                                onClick={handleSave}
                                className="px-3 md:px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 shadow-lg flex items-center gap-2 text-sm md:text-base"
                            >
                                <Save className="w-4 h-4" />
                                <span className="hidden sm:inline">Enregistrer</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chantier Info Card */}
            {chantierSelectionne && (
                <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-indigo-500 mb-2">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1 block">Chantier Sélectionné</span>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-slate-900">{chantierSelectionne.nom_client}</h2>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm font-mono border border-slate-200">
                                    {chantierSelectionne.ref_chantier}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-6 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="font-semibold text-slate-900">Resp: </span>
                                <span>{chantierSelectionne.responsable_chantier || 'Non défini'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span>{chantierSelectionne.ville_code || 'Ville non définie'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>Début: {formatDate(chantierSelectionne.date_debut)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
            {
                selectedChantier && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Effectif Total</p>
                                <p className="text-xl font-bold text-gray-800">{monteursChantier.length} <span className="text-xs font-normal">personnes</span></p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total Jours</p>
                                <p className="text-xl font-bold text-gray-800">
                                    {monteursChantier.reduce((sum, m) => sum + Number(getMonthTotal(m.matricule)), 0).toFixed(1)}
                                </p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                <Calculator size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Masse Salariale</p>
                                <p className="text-xl font-bold text-gray-800">
                                    {monteursChantier.reduce((sum, m) => {
                                        const t = Number(getMonthTotal(m.matricule));
                                        const isManagement = [100, 101, 102, 103, 104, 157].includes(Number(m.matricule));
                                        const s = isManagement ? 0 : Number(salaires[m.matricule] || 120);
                                        return sum + (t * s);
                                    }, 0).toLocaleString()} <span className="text-xs font-normal">DH</span>
                                </p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                <Printer size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Statut</p>
                                <p className="text-sm font-bold text-amber-600">Brouillon</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                !selectedChantier ? (
                    <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-300">
                        <div className="text-center">
                            <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">Sélectionnez un chantier</h3>
                            <p className="text-slate-500">Choisissez un chantier pour afficher le pointage</p>
                        </div>
                    </div>
                ) : monteursChantier.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-amber-300">
                        <div className="text-center max-w-md">
                            <Users className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-amber-600 mb-2">Aucun monteur trouvé</h3>
                            <p className="text-slate-600 mb-4">
                                Le chantier <strong>{chantierSelectionne?.ref_chantier}</strong> n'a pas encore de monteurs affectés.
                            </p>
                            <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg text-left">
                                <p className="font-bold mb-2">Pour ajouter des monteurs :</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Allez dans <strong>Chantiers</strong></li>
                                    <li>Sélectionnez le chantier</li>
                                    <li>Onglet <strong>Équipe & RH</strong></li>
                                    <li>Cliquez sur <strong>Ajouter</strong></li>
                                </ol>
                            </div>
                        </div>
                    </div>
                ) : isMobileView && monteursChantier.length > 0 ? (
                    // Vue Mobile Optimisée
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border-2 border-slate-200 p-2">
                        {!selectedMonteurMobile ? (
                            // Liste des monteurs en cartes compactes
                            <div className="space-y-2">
                                <div className="bg-white p-2 rounded-lg border border-indigo-200 mb-2">
                                    <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Monteurs ({monteursChantier.length})
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {monteursChantier.map(m => {
                                        const total = Number(getMonthTotal(m.matricule));
                                        const isPermanentManagement = PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule));
                                        const rawSalaire = Number(salaires[m.matricule] || 120);
                                        const displaySalaireJ = isPermanentManagement ? 0 : rawSalaire;
                                        const totalSalaire = isPermanentManagement ? 0 : (total * rawSalaire);

                                        return (
                                            <button
                                                key={m.matricule}
                                                onClick={() => setSelectedMonteurMobile(m.matricule)}
                                                className="bg-white p-2.5 rounded-lg border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all text-left active:scale-98"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">{m.nom_monteur}</h4>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{m.matricule}</p>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-emerald-500 to-green-500 text-white px-2 py-1 rounded-md ml-2 flex-shrink-0">
                                                        <p className="text-[9px] font-medium leading-tight">Total</p>
                                                        <p className="text-base font-bold leading-tight">{total.toFixed(1)}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <div className="bg-blue-50 p-1.5 rounded">
                                                        <p className="text-[9px] text-blue-600 font-medium mb-0.5">Salaire/J</p>
                                                        <p className="text-xs font-bold text-blue-900">{displaySalaireJ} DH</p>
                                                    </div>
                                                    <div className="bg-purple-50 p-1.5 rounded">
                                                        <p className="text-[9px] text-purple-600 font-medium mb-0.5">Total</p>
                                                        <p className="text-xs font-bold text-purple-900">{totalSalaire.toFixed(0)} DH</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            // Détail du monteur sélectionné
                            <div className="space-y-4">
                                {/* Bouton retour */}
                                <button
                                    onClick={() => setSelectedMonteurMobile(null)}
                                    className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    Retour à la liste
                                </button>

                                {(() => {
                                    const monteur = monteursChantier.find(m => m.matricule === selectedMonteurMobile);
                                    if (!monteur) return null;

                                    const total = Number(getMonthTotal(monteur.matricule));
                                    const salaire = total * Number(salaires[monteur.matricule] || 120);
                                    const avance = Number(avances[monteur.matricule] || 0);
                                    const reste = salaire - avance;

                                    return (
                                        <>
                                            {/* Info monteur */}
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                                                <h3 className="text-lg font-bold text-slate-900 mb-2">{monteur.nom_monteur}</h3>
                                                <p className="text-sm text-slate-600 font-mono">{monteur.matricule}</p>

                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                    <div className="bg-white p-3 rounded-lg">
                                                        <p className="text-xs text-slate-500 mb-1">Salaire/Jour</p>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={salaires[monteur.matricule] || 120}
                                                            onChange={e => setSalaires(prev => ({ ...prev, [monteur.matricule]: parseFloat(e.target.value) || 0 }))}
                                                            className="w-full text-base font-bold text-slate-900 border border-slate-300 rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <div className="bg-emerald-50 p-3 rounded-lg">
                                                        <p className="text-xs text-emerald-600 mb-1">Total Jours</p>
                                                        <p className="text-xl font-bold text-emerald-700">{total.toFixed(1)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Calendrier mensuel */}
                                            <div className="space-y-2">
                                                <h4 className="font-bold text-slate-700 mb-3">Pointage du mois</h4>
                                                {weeks.map((week, weekIndex) => (
                                                    <div key={weekIndex} className="bg-white rounded-xl p-3 border-2 border-slate-200 shadow-sm">
                                                        <p className="text-xs font-bold text-slate-500 mb-2">Semaine {weekIndex + 1}</p>
                                                        <div className="grid grid-cols-7 gap-1">
                                                            {week.map(day => {
                                                                const dateStr = format(day, 'yyyy-MM-dd');
                                                                const value = pointages[monteur.matricule]?.[dateStr] || 0;
                                                                const dayName = format(day, 'EEE', { locale: fr });
                                                                const isWeekend = getDay(day) === 0;

                                                                return (
                                                                    <div key={dateStr} className="flex flex-col items-center">
                                                                        <span className="text-[10px] text-slate-500 mb-1">{dayName}</span>
                                                                        <button
                                                                            onClick={() => togglePointage(monteur.matricule, dateStr)}
                                                                            className={cn(
                                                                                "w-10 h-10 rounded-lg font-bold text-sm transition-all flex items-center justify-center",
                                                                                value === 0 && "bg-white border-2 border-slate-200 text-slate-400",
                                                                                value === 1 && "bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md",
                                                                                value === 0.5 && "bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-md",
                                                                                isWeekend && "opacity-50"
                                                                            )}
                                                                        >
                                                                            {value === 1 && <Check size={16} strokeWidth={3} />}
                                                                            {value === 0.5 && <span>½</span>}
                                                                            {value === 0 && format(day, 'd')}
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-center">
                                                            <span className="text-xs text-slate-600">Total semaine:</span>
                                                            <span className="text-sm font-bold text-slate-900">{getWeekTotal(monteur.matricule, week).toFixed(1)} j</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Résumé financier */}
                                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl border-2 border-slate-300 space-y-3">
                                                <h4 className="font-bold text-slate-700 mb-3">Résumé Financier</h4>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Avance:</span>
                                                        <div className="flex flex-col items-end">
                                                            <input
                                                                type="number"
                                                                value={avances[monteur.matricule] || 0}
                                                                readOnly
                                                                disabled
                                                                className="w-24 text-right text-sm font-bold text-amber-900 bg-gray-50 border border-amber-200 rounded px-2 py-1 cursor-not-allowed"
                                                            />
                                                            <span className="text-[10px] text-gray-500">Voir module Avances</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                                                        <span className="text-sm font-bold text-slate-700">Salaire Brut:</span>
                                                        <span className="text-base font-bold text-blue-700">{salaire.toFixed(2)} DH</span>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-400 bg-emerald-50 -mx-4 px-4 py-2 rounded-b-xl">
                                                        <span className="text-base font-bold text-emerald-900">Net à Payer:</span>
                                                        <span className="text-xl font-bold text-emerald-700">{reste.toFixed(2)} DH</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                ) : !isMobileView && monteursChantier.length > 0 ? (
                    <div className="flex-1 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 flex flex-col">
                        <div className="w-full overflow-x-auto">
                            <div className="min-w-max"> {/* Container to force width */}

                                {/* En-tête Excel-style */}
                                <div className="sticky top-0 z-20 bg-white shadow-md border-b-4 border-slate-400">

                                    {/* Ligne 1: Noms des monteurs */}
                                    <div className="flex border-b-2 border-slate-300">
                                        <div className="sticky left-0 z-30 w-56 bg-blue-100 border-r-2 border-slate-400 p-2 md:p-3 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs md:text-sm font-bold text-slate-700">%</span>
                                        </div>
                                        <div className="w-32 bg-slate-100 border-r-2 border-slate-300 p-2 md:p-3 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] md:text-xs font-bold text-slate-600">Salaire</span>
                                        </div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`name-${m.matricule}`} className="w-40 bg-blue-200 border-r border-slate-300 p-2 flex-shrink-0">
                                                <div className="text-center space-y-1">
                                                    <p className="text-xs font-bold text-slate-900 uppercase leading-tight truncate px-1" title={m.nom_monteur}>{m.nom_monteur}</p>
                                                    <p className="text-[10px] text-slate-600 font-mono truncate">{m.matricule || m.cin}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Ligne 2: Salaires */}
                                    <div className="flex border-b-2 border-slate-300">
                                        <div className="sticky left-0 z-30 w-56 bg-white border-r-2 border-slate-400 p-2 md:p-3 flex-shrink-0">
                                            <div className="text-[10px] md:text-xs font-bold text-slate-700">CHANTIERS</div>
                                        </div>
                                        <div className="w-32 bg-slate-100 border-r-2 border-slate-300 p-2 md:p-3 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] md:text-xs font-bold text-slate-600">MATRICULE</span>
                                        </div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`salary-${m.matricule}`} className="w-40 bg-white border-r border-slate-300 p-1 flex-shrink-0">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule)) ? 0 : (salaires[m.matricule] || 120)}
                                                    onChange={e => setSalaires(prev => ({ ...prev, [m.matricule]: parseFloat(e.target.value) || 0 }))}
                                                    disabled={PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule))}
                                                    className="w-full text-center text-xs md:text-sm font-bold text-slate-900 bg-transparent border border-slate-300 rounded px-1 py-1 disabled:bg-gray-100 disabled:text-gray-400"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Ligne 3: Chantiers */}
                                    <div className="flex border-b-2 border-slate-400">
                                        <div className="sticky left-0 z-30 w-56 bg-white border-r-2 border-slate-400 p-2 flex-shrink-0">
                                            <div className="text-[8px] md:text-[10px] text-slate-500">Début :</div>
                                            <div className="text-[8px] md:text-[10px] text-slate-500">Fin :</div>
                                        </div>
                                        <div className="w-32 bg-slate-100 border-r-2 border-slate-300 p-2 md:p-3 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] md:text-xs font-bold text-slate-600">EVALUATION</span>
                                        </div>
                                        {monteursChantier.map((m: any) => {
                                            const chantiersList = getMonteursChantiers(m.matricule);
                                            return (
                                                <div key={`chantiers-${m.matricule}`} className="w-40 bg-slate-50 border-r border-slate-300 p-1 flex-shrink-0">
                                                    <div className="text-[8px] md:text-[9px] text-slate-700 text-center space-y-0.5">
                                                        {chantiersList.slice(0, 3).map((ref, idx) => (
                                                            <div key={idx} className="font-medium truncate">{ref}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Corps du tableau - Par semaine */}
                                {weeks.map((week, weekIndex) => (
                                    <div key={weekIndex}>

                                        {/* Jours de la semaine */}
                                        {week.map((day, dayIndex) => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const dayName = format(day, 'EEEE', { locale: fr });
                                            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                                            const isFirstOfWeek = dayIndex === 0;

                                            return (
                                                <div key={dateStr} className={cn("flex", isWeekend && "bg-slate-50")}>
                                                    {/* Date */}
                                                    <div className="sticky left-0 z-10 w-56 bg-white border-r-2 border-slate-400 border-b border-slate-200 p-2 flex-shrink-0">
                                                        {isFirstOfWeek && (
                                                            <div className="text-xs font-bold text-slate-900 mb-1">{format(week[0], 'dd/MM/yyyy')}</div>
                                                        )}
                                                        <div className="text-sm text-slate-700 capitalize">{dayName}</div>
                                                    </div>

                                                    {/* Colonne vide */}
                                                    <div className="w-32 bg-slate-100 border-r-2 border-slate-300 border-b border-slate-200 flex-shrink-0"></div>

                                                    {/* Pointages */}
                                                    {monteursChantier.map((m: any) => {
                                                        const value = pointages[m.matricule]?.[dateStr] || 0;

                                                        return (
                                                            <div key={`${m.matricule}-${dateStr}`} className="w-40 border-r border-b border-slate-200 flex-shrink-0">
                                                                <button
                                                                    onClick={() => togglePointage(m.matricule, dateStr)}
                                                                    className={cn(
                                                                        "w-full h-10 flex items-center justify-center font-bold transition-all",
                                                                        value === 0 && "hover:bg-slate-100",
                                                                        value === 1 && "bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-600 hover:from-emerald-100",
                                                                        value === 0.5 && "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                                                    )}
                                                                >
                                                                    {value === 1 && <Check size={18} strokeWidth={3} />}
                                                                    {value === 0.5 && <span className="text-sm">½</span>}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}

                                        {/* Total semaine */}
                                        <div className="flex bg-slate-100 border-b-2 border-slate-400">
                                            <div className="sticky left-0 z-10 w-56 bg-slate-200 border-r-2 border-slate-400 p-2 flex-shrink-0">
                                                <span className="text-sm font-bold text-slate-900">∑ Semaine {weekIndex + 1}</span>
                                            </div>
                                            <div className="w-32 bg-slate-200 border-r-2 border-slate-300 flex-shrink-0"></div>
                                            {monteursChantier.map((m: any) => (
                                                <div key={`week-total-${m.matricule}-${weekIndex}`} className="w-40 bg-slate-200 border-r border-slate-300 p-2 text-center flex-shrink-0">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {getWeekTotal(m.matricule, week).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Total mois */}
                                <div className="flex bg-emerald-100 border-t-4 border-emerald-600">
                                    <div className="sticky left-0 z-10 w-56 bg-emerald-200 border-r-2 border-emerald-600 p-3 flex-shrink-0">
                                        <span className="text-base font-bold text-emerald-900">∑ TOTAL MOIS</span>
                                    </div>
                                    <div className="w-32 bg-emerald-200 border-r-2 border-emerald-600 flex-shrink-0"></div>
                                    {monteursChantier.map((m: any) => {
                                        const total = Number(getMonthTotal(m.matricule));
                                        const isPermanentManagement = PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule));
                                        const salaire = isPermanentManagement ? 0 : (total * (Number(salaires[m.matricule]) || 120));
                                        return (
                                            <div key={`month-total-${m.matricule}`} className="w-40 bg-emerald-100 border-r border-emerald-400 p-2 text-center flex-shrink-0">
                                                <div className="text-lg font-bold text-emerald-900">{total.toFixed(2)}</div>
                                                <div className="text-xs text-emerald-700">{salaire.toFixed(0)} DH</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Section Frais et Avances */}
                                <div className="border-t-4 border-slate-400">

                                    {/* Avances */}
                                    <div className="flex bg-amber-50 border-b border-slate-300">
                                        <div className="sticky left-0 z-10 w-56 bg-amber-100 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-amber-900">Avance</span>
                                        </div>
                                        <div className="w-32 bg-amber-100 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`avance-${m.matricule}`} className="w-40 bg-white border-r border-slate-300 p-1 flex-shrink-0">
                                                <div className="relative group/avance">
                                                    <input
                                                        type="number"
                                                        value={avances[m.matricule] || 0}
                                                        readOnly
                                                        disabled
                                                        className="w-full text-center text-sm font-bold text-amber-900 bg-gray-50 border border-amber-200 rounded px-1 py-1 cursor-not-allowed opacity-70"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avance:opacity-100 bg-black/50 text-white text-[10px] rounded pointer-events-none transition-opacity">
                                                        Voir module Avances
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total Travail (Salaire brut) */}
                                    <div className="flex bg-blue-50 border-b-2 border-blue-300">
                                        <div className="sticky left-0 z-10 w-56 bg-blue-100 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-blue-900">Total Travail</span>
                                        </div>
                                        <div className="w-32 bg-blue-100 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => {
                                            const total = Number(getMonthTotal(m.matricule));
                                            const isPermanentManagement = PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule));
                                            const salaire = isPermanentManagement ? 0 : (total * (Number(salaires[m.matricule]) || 120));
                                            return (
                                                <div key={`total-travail-${m.matricule}`} className="w-40 bg-blue-50 border-r border-blue-300 p-2 text-center flex-shrink-0">
                                                    <span className="text-base font-bold text-blue-900">{salaire.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Reste à payer (après avances) */}
                                    <div className="flex bg-green-50 border-b-2 border-green-400">
                                        <div className="sticky left-0 z-10 w-56 bg-green-100 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-green-900">Reste à payer</span>
                                        </div>
                                        <div className="w-32 bg-green-100 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => {
                                            const total = Number(getMonthTotal(m.matricule));
                                            const isPermanentManagement = PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule));
                                            const salaire = isPermanentManagement ? 0 : (total * (Number(salaires[m.matricule]) || 120));
                                            const reste = salaire - (Number(avances[m.matricule]) || 0);
                                            return (
                                                <div key={`reste-${m.matricule}`} className="w-40 bg-green-50 border-r border-green-300 p-2 text-center flex-shrink-0">
                                                    <span className="text-base font-bold text-green-900">{reste.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Séparateur */}
                                    <div className="flex bg-slate-200 border-b border-slate-400">
                                        <div className="sticky left-0 z-10 w-56 bg-slate-200 border-r-2 border-slate-400 p-2 flex-shrink-0">
                                            <span className="text-xs font-bold text-slate-600">ETAT</span>
                                        </div>
                                        <div className="w-32 bg-slate-200 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`etat-${m.matricule}`} className="w-40 bg-slate-100 border-r border-slate-300 p-2 text-center flex-shrink-0">
                                                <span className="text-[10px] text-slate-600 font-medium">EN ACTIVITE</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Frais de Transport */}
                                    <div className="flex bg-white border-b border-slate-300">
                                        <div className="sticky left-0 z-10 w-56 bg-slate-50 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-slate-700">FRAIS DE TRANSPORT</span>
                                        </div>
                                        <div className="w-32 bg-slate-50 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`transport-${m.matricule}`} className="w-40 bg-white border-r border-slate-300 p-1 flex-shrink-0">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={fraisTransport[m.matricule] || 0}
                                                    onChange={e => setFraisTransport(prev => ({ ...prev, [m.matricule]: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full text-center text-sm font-bold text-slate-700 bg-transparent border border-slate-300 rounded px-1 py-1"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Frais de Repas */}
                                    <div className="flex bg-slate-50 border-b border-slate-300">
                                        <div className="sticky left-0 z-10 w-56 bg-slate-100 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-slate-700">FRAIS DE REPAS</span>
                                        </div>
                                        <div className="w-32 bg-slate-100 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`repas-${m.matricule}`} className="w-40 bg-slate-50 border-r border-slate-300 p-1 flex-shrink-0">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={fraisRepas[m.matricule] || 0}
                                                    onChange={e => setFraisRepas(prev => ({ ...prev, [m.matricule]: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full text-center text-sm font-bold text-slate-700 bg-transparent border border-slate-300 rounded px-1 py-1"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Frais de Loyer */}
                                    <div className="flex bg-white border-b border-slate-300">
                                        <div className="sticky left-0 z-10 w-56 bg-slate-50 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-slate-700">FRAIS DE LOYER</span>
                                        </div>
                                        <div className="w-32 bg-slate-50 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`loyer-${m.matricule}`} className="w-40 bg-white border-r border-slate-300 p-1 flex-shrink-0">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={fraisLoyer[m.matricule] || 0}
                                                    onChange={e => setFraisLoyer(prev => ({ ...prev, [m.matricule]: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full text-center text-sm font-bold text-slate-700 bg-transparent border border-slate-300 rounded px-1 py-1"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Frais de Gasoil */}
                                    <div className="flex bg-slate-50 border-b border-slate-300">
                                        <div className="sticky left-0 z-10 w-56 bg-slate-100 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-slate-700">FRAIS DE GASOIL</span>
                                        </div>
                                        <div className="w-32 bg-slate-100 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`gasoil-${m.matricule}`} className="w-40 bg-slate-50 border-r border-slate-300 p-1 flex-shrink-0">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={fraisGasoil[m.matricule] || 0}
                                                    onChange={e => setFraisGasoil(prev => ({ ...prev, [m.matricule]: parseFloat(e.target.value) || 0 }))}
                                                    className="w-full text-center text-sm font-bold text-slate-700 bg-transparent border border-slate-300 rounded px-1 py-1"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total Charges */}
                                    <div className="flex bg-red-100 border-t-2 border-red-400 border-b-2 border-red-400">
                                        <div className="sticky left-0 z-10 w-56 bg-red-200 border-r-2 border-slate-400 p-3 flex-shrink-0">
                                            <span className="text-sm font-bold text-red-900">Total charges</span>
                                        </div>
                                        <div className="w-32 bg-red-200 border-r-2 border-slate-300 flex-shrink-0"></div>
                                        {monteursChantier.map((m: any) => {
                                            const totalCharges =
                                                (fraisTransport[m.matricule] || 0) +
                                                (fraisRepas[m.matricule] || 0) +
                                                (fraisLoyer[m.matricule] || 0) +
                                                (fraisGasoil[m.matricule] || 0);
                                            return (
                                                <div key={`charges-${m.matricule}`} className="w-40 bg-red-100 border-r border-red-300 p-2 text-center flex-shrink-0">
                                                    <span className="text-base font-bold text-red-900">{totalCharges.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Dépenses du mois (Total général) */}
                                    <div className="flex bg-gradient-to-r from-purple-100 to-indigo-100 border-t-4 border-purple-600">
                                        <div className="sticky left-0 z-10 w-56 bg-purple-200 border-r-2 border-purple-600 p-4 flex-shrink-0">
                                            <span className="text-base font-bold text-purple-900">Dépenses du mois</span>
                                        </div>
                                        <div className="w-32 bg-purple-200 border-r-2 border-purple-600 p-4 text-center flex-shrink-0">
                                            <span className="text-lg font-bold text-purple-900">
                                                {monteursChantier.reduce((sum: number, m: any) => {
                                                    const total = Number(getMonthTotal(m.matricule));
                                                    const isPermanentManagement = PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule));
                                                    const salaire = isPermanentManagement ? 0 : (total * (Number(salaires[m.matricule]) || 120));
                                                    const totalCharges =
                                                        (Number(fraisTransport[m.matricule]) || 0) +
                                                        (Number(fraisRepas[m.matricule]) || 0) +
                                                        (Number(fraisLoyer[m.matricule]) || 0) +
                                                        (Number(fraisGasoil[m.matricule]) || 0);
                                                    return sum + salaire + totalCharges;
                                                }, 0).toFixed(2)} DH
                                            </span>
                                        </div>
                                        {monteursChantier.map((m: any) => {
                                            const total = Number(getMonthTotal(m.matricule));
                                            const isPermanentManagement = PERMANENT_MANAGEMENT_MATRICULES.includes(Number(m.matricule));
                                            const salaire = isPermanentManagement ? 0 : (total * (Number(salaires[m.matricule]) || 120));
                                            const totalCharges =
                                                (Number(fraisTransport[m.matricule]) || 0) +
                                                (Number(fraisRepas[m.matricule]) || 0) +
                                                (Number(fraisLoyer[m.matricule]) || 0) +
                                                (Number(fraisGasoil[m.matricule]) || 0);
                                            const depensesTotales = salaire + totalCharges;
                                            return (
                                                <div key={`depenses-${m.matricule}`} className="w-40 bg-purple-100 border-r border-purple-300 p-3 text-center flex-shrink-0">
                                                    <div className="text-lg font-bold text-purple-900">{depensesTotales.toFixed(2)}</div>
                                                    <div className="text-xs text-purple-700">DH</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null
            }
        </div >
    );
};

export default PointageMensuel;
