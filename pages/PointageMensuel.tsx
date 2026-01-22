import React, { useState, useMemo, useEffect } from 'react';
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
import { supabase } from '../services/supabaseClient';

interface PointageData {
    [matricule: string]: {
        [date: string]: number;
    };
}

const PointageMensuel = () => {
    const { chantiers, monteurs, affectations } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedChantier, setSelectedChantier] = useState<string | null>(null);
    const [pointages, setPointages] = useState<PointageData>({});
    const [salaires, setSalaires] = useState<Record<string, number>>({});

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

    const loadPointages = async () => {
        if (!selectedChantier) return;

        try {
            const mois = currentDate.getMonth() + 1;
            const annee = currentDate.getFullYear();

            const { data, error } = await supabase
                .from('pointages_mensuels')
                .select('*')
                .eq('id_chantier', selectedChantier)
                .eq('mois', mois)
                .eq('annee', annee);

            if (error) throw error;

            if (data) {
                const newPointages: PointageData = {};
                const newSalaires: Record<string, number> = {};
                const newAvances: Record<string, number> = {};
                const newTransport: Record<string, number> = {};
                const newRepas: Record<string, number> = {};
                const newLoyer: Record<string, number> = {};
                const newGasoil: Record<string, number> = {};

                data.forEach((p: any) => {
                    // Parse jours_travailles if string or object
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

        // Initialiser salaires pour nouveaux monteurs
        allMonteurs.forEach(m => {
            if (!salaires[m.matricule]) {
                setSalaires(prev => ({ ...prev, [m.matricule]: 120 }));
            }
        });

        return allMonteurs;
    }, [selectedChantier, affectations, monteurs, chantiers, salaires]);

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

    const handleSave = async () => {
        if (!selectedChantier) {
            toast.error("Veuillez sélectionner un chantier");
            return;
        }

        try {
            const mois = currentDate.getMonth() + 1;
            const annee = currentDate.getFullYear();
            const updates = [];

            // Préparer les données pour chaque monteur affiché
            for (const m of monteursChantier) {
                const matricule = m.matricule;

                // Calculs sécurisés avec typage strict
                const jours_data = pointages[matricule] || {};
                const total_jours = Number(getMonthTotal(matricule));
                const salaire_journalier = Number(salaires[matricule] || 120);
                const total_salaire = total_jours * salaire_journalier;

                const frais_t = Number(fraisTransport[matricule] || 0);
                const frais_r = Number(fraisRepas[matricule] || 0);
                const frais_l = Number(fraisLoyer[matricule] || 0);
                const frais_g = Number(fraisGasoil[matricule] || 0);
                const montant_avances = Number(avances[matricule] || 0);

                const total_charges = frais_t + frais_r + frais_l + frais_g;
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
                    frais_transport: frais_t,
                    frais_repas: frais_r,
                    frais_loyer: frais_l,
                    frais_gasoil: frais_g,
                    total_charges: total_charges,
                    net_a_payer: net_a_payer,
                    updated_at: new Date().toISOString()
                });
            }

            // Upsert (insert or update)
            const { error } = await supabase
                .from('pointages_mensuels')
                .upsert(updates, { onConflict: 'id_chantier,matricule,mois,annee' });

            if (error) throw error;

            toast.success("Pointage enregistré avec succès !");

        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            toast.error("Erreur lors de la sauvegarde");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] gap-6 max-w-[1920px] mx-auto">

            {/* Header */}
            <div className="flex justify-between items-center pb-6 border-b-2 border-slate-200">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                        Pointage Mensuel
                    </h1>

                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedChantier || ''}
                        onChange={e => setSelectedChantier(e.target.value)}
                        className="px-4 py-2 border-2 border-slate-300 rounded-xl font-bold text-slate-800 focus:border-emerald-500 outline-none"
                    >
                        <option value="">Sélectionner un chantier</option>
                        {chantiersActifs.map(c => (
                            <option key={c.id_chantier} value={c.id_chantier}>
                                {c.ref_chantier} - {c.nom_client}
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center bg-white border-2 border-slate-300 rounded-xl p-1">
                        <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-4 font-bold text-slate-800 min-w-[140px] text-center capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: fr })}
                        </div>
                        <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
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
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 shadow-lg flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Enregistrer
                        </button>
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
                                        const s = Number(salaires[m.matricule] || 120);
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
                ) : (
                    <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-2xl border-2 border-slate-200">
                        <div className="min-w-max">

                            {/* En-tête Excel-style */}
                            <div className="sticky top-0 z-20 bg-white border-b-4 border-slate-400">

                                {/* Ligne 1: Noms des monteurs */}
                                <div className="flex border-b-2 border-slate-300">
                                    <div className="sticky left-0 z-30 w-48 bg-blue-100 border-r-2 border-slate-400 p-3 flex items-center justify-center">
                                        <span className="text-sm font-bold text-slate-700">%</span>
                                    </div>
                                    <div className="w-32 bg-slate-100 border-r-2 border-slate-300 p-3 flex items-center justify-center">
                                        <span className="text-xs font-bold text-slate-600">Salaire</span>
                                    </div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`name-${m.matricule}`} className="w-28 bg-blue-200 border-r border-slate-300 p-2">
                                            <div className="text-center space-y-1">
                                                <p className="text-xs font-bold text-slate-900 uppercase leading-tight">{m.nom_monteur}</p>
                                                <p className="text-[10px] text-slate-600 font-mono">{m.matricule || m.cin}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Ligne 2: Salaires */}
                                <div className="flex border-b-2 border-slate-300">
                                    <div className="sticky left-0 z-30 w-48 bg-white border-r-2 border-slate-400 p-3">
                                        <div className="text-xs font-bold text-slate-700">CHANTIERS</div>
                                    </div>
                                    <div className="w-32 bg-slate-100 border-r-2 border-slate-300 p-3 flex items-center justify-center">
                                        <span className="text-xs font-bold text-slate-600">MATRICULE</span>
                                    </div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`salary-${m.matricule}`} className="w-28 bg-white border-r border-slate-300 p-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={salaires[m.matricule] || 120}
                                                onChange={e => setSalaires(prev => ({ ...prev, [m.matricule]: parseFloat(e.target.value) || 120 }))}
                                                className="w-full text-center text-sm font-bold text-slate-900 bg-transparent border border-slate-300 rounded px-1 py-1"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Ligne 3: Chantiers */}
                                <div className="flex border-b-2 border-slate-400">
                                    <div className="sticky left-0 z-30 w-48 bg-white border-r-2 border-slate-400 p-2">
                                        <div className="text-[10px] text-slate-500">Début :</div>
                                        <div className="text-[10px] text-slate-500">Fin :</div>
                                    </div>
                                    <div className="w-32 bg-slate-100 border-r-2 border-slate-300 p-3 flex items-center justify-center">
                                        <span className="text-xs font-bold text-slate-600">EVALUATION</span>
                                    </div>
                                    {monteursChantier.map((m: any) => {
                                        const chantiersList = getMonteursChantiers(m.matricule);
                                        return (
                                            <div key={`chantiers-${m.matricule}`} className="w-28 bg-slate-50 border-r border-slate-300 p-1">
                                                <div className="text-[9px] text-slate-700 text-center space-y-0.5">
                                                    {chantiersList.slice(0, 3).map((ref, idx) => (
                                                        <div key={idx} className="font-medium">{ref}</div>
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
                                                <div className="sticky left-0 z-10 w-48 bg-white border-r-2 border-slate-400 border-b border-slate-200 p-2">
                                                    {isFirstOfWeek && (
                                                        <div className="text-xs font-bold text-slate-900 mb-1">{format(week[0], 'dd/MM/yyyy')}</div>
                                                    )}
                                                    <div className="text-sm text-slate-700 capitalize">{dayName}</div>
                                                </div>

                                                {/* Colonne vide */}
                                                <div className="w-32 bg-slate-100 border-r-2 border-slate-300 border-b border-slate-200"></div>

                                                {/* Pointages */}
                                                {monteursChantier.map((m: any) => {
                                                    const value = pointages[m.matricule]?.[dateStr] || 0;

                                                    return (
                                                        <button
                                                            key={`${m.matricule}-${dateStr}`}
                                                            onClick={() => togglePointage(m.matricule, dateStr)}
                                                            className={cn(
                                                                "w-28 border-r border-b border-slate-200 p-2 text-center transition-all h-10 flex items-center justify-center font-bold",
                                                                value === 0 && "bg-white hover:bg-slate-50",
                                                                value === 1 && "bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-600 border-emerald-200 hover:from-emerald-100",
                                                                value === 0.5 && "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                                            )}
                                                        >
                                                            {value === 1 && <Check size={18} strokeWidth={3} />}
                                                            {value === 0.5 && <span className="text-sm">½</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}

                                    {/* Total semaine */}
                                    <div className="flex bg-slate-100 border-b-2 border-slate-400">
                                        <div className="sticky left-0 z-10 w-48 bg-slate-200 border-r-2 border-slate-400 p-2">
                                            <span className="text-sm font-bold text-slate-900">∑</span>
                                        </div>
                                        <div className="w-32 bg-slate-200 border-r-2 border-slate-300"></div>
                                        {monteursChantier.map((m: any) => (
                                            <div key={`week-total-${m.matricule}-${weekIndex}`} className="w-28 bg-slate-200 border-r border-slate-300 p-2 text-center">
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
                                <div className="sticky left-0 z-10 w-48 bg-emerald-200 border-r-2 border-emerald-600 p-3">
                                    <span className="text-base font-bold text-emerald-900">∑ TOTAL</span>
                                </div>
                                <div className="w-32 bg-emerald-200 border-r-2 border-emerald-600"></div>
                                {monteursChantier.map((m: any) => {
                                    const total = getMonthTotal(m.matricule);
                                    const salaire = total * (salaires[m.matricule] || 120);
                                    return (
                                        <div key={`month-total-${m.matricule}`} className="w-28 bg-emerald-100 border-r border-emerald-400 p-2 text-center">
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
                                    <div className="sticky left-0 z-10 w-48 bg-amber-100 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-amber-900">Avance</span>
                                    </div>
                                    <div className="w-32 bg-amber-100 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`avance-${m.matricule}`} className="w-28 bg-white border-r border-slate-300 p-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={avances[m.matricule] || 0}
                                                onChange={e => setAvances(prev => ({ ...prev, [m.matricule]: parseFloat(e.target.value) || 0 }))}
                                                className="w-full text-center text-sm font-bold text-amber-900 bg-transparent border border-amber-300 rounded px-1 py-1"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Total Travail (Salaire brut) */}
                                <div className="flex bg-blue-50 border-b-2 border-blue-300">
                                    <div className="sticky left-0 z-10 w-48 bg-blue-100 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-blue-900">Total Travail</span>
                                    </div>
                                    <div className="w-32 bg-blue-100 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => {
                                        const total = getMonthTotal(m.matricule);
                                        const salaire = total * (salaires[m.matricule] || 120);
                                        return (
                                            <div key={`total-travail-${m.matricule}`} className="w-28 bg-blue-50 border-r border-blue-300 p-2 text-center">
                                                <span className="text-base font-bold text-blue-900">{salaire.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Reste à payer (après avances) */}
                                <div className="flex bg-green-50 border-b-2 border-green-400">
                                    <div className="sticky left-0 z-10 w-48 bg-green-100 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-green-900">Reste à payer</span>
                                    </div>
                                    <div className="w-32 bg-green-100 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => {
                                        const total = getMonthTotal(m.matricule);
                                        const salaire = total * (salaires[m.matricule] || 120);
                                        const reste = salaire - (avances[m.matricule] || 0);
                                        return (
                                            <div key={`reste-${m.matricule}`} className="w-28 bg-green-50 border-r border-green-300 p-2 text-center">
                                                <span className="text-base font-bold text-green-900">{reste.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Séparateur */}
                                <div className="flex bg-slate-200 border-b border-slate-400">
                                    <div className="sticky left-0 z-10 w-48 bg-slate-200 border-r-2 border-slate-400 p-2">
                                        <span className="text-xs font-bold text-slate-600">ETAT</span>
                                    </div>
                                    <div className="w-32 bg-slate-200 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`etat-${m.matricule}`} className="w-28 bg-slate-100 border-r border-slate-300 p-2 text-center">
                                            <span className="text-[10px] text-slate-600 font-medium">EN ACTIVITE</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Frais de Transport */}
                                <div className="flex bg-white border-b border-slate-300">
                                    <div className="sticky left-0 z-10 w-48 bg-slate-50 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-slate-700">FRAIS DE TRANSPORT</span>
                                    </div>
                                    <div className="w-32 bg-slate-50 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`transport-${m.matricule}`} className="w-28 bg-white border-r border-slate-300 p-1">
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
                                    <div className="sticky left-0 z-10 w-48 bg-slate-100 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-slate-700">FRAIS DE REPAS</span>
                                    </div>
                                    <div className="w-32 bg-slate-100 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`repas-${m.matricule}`} className="w-28 bg-slate-50 border-r border-slate-300 p-1">
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
                                    <div className="sticky left-0 z-10 w-48 bg-slate-50 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-slate-700">FRAIS DE LOYER</span>
                                    </div>
                                    <div className="w-32 bg-slate-50 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`loyer-${m.matricule}`} className="w-28 bg-white border-r border-slate-300 p-1">
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
                                    <div className="sticky left-0 z-10 w-48 bg-slate-100 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-slate-700">FRAIS DE GASOIL</span>
                                    </div>
                                    <div className="w-32 bg-slate-100 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => (
                                        <div key={`gasoil-${m.matricule}`} className="w-28 bg-slate-50 border-r border-slate-300 p-1">
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
                                    <div className="sticky left-0 z-10 w-48 bg-red-200 border-r-2 border-slate-400 p-3">
                                        <span className="text-sm font-bold text-red-900">Total charges</span>
                                    </div>
                                    <div className="w-32 bg-red-200 border-r-2 border-slate-300"></div>
                                    {monteursChantier.map((m: any) => {
                                        const totalCharges =
                                            (fraisTransport[m.matricule] || 0) +
                                            (fraisRepas[m.matricule] || 0) +
                                            (fraisLoyer[m.matricule] || 0) +
                                            (fraisGasoil[m.matricule] || 0);
                                        return (
                                            <div key={`charges-${m.matricule}`} className="w-28 bg-red-100 border-r border-red-300 p-2 text-center">
                                                <span className="text-base font-bold text-red-900">{totalCharges.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Dépenses du mois (Total général) */}
                                <div className="flex bg-gradient-to-r from-purple-100 to-indigo-100 border-t-4 border-purple-600">
                                    <div className="sticky left-0 z-10 w-48 bg-purple-200 border-r-2 border-purple-600 p-4">
                                        <span className="text-base font-bold text-purple-900">Dépenses du mois</span>
                                    </div>
                                    <div className="w-32 bg-purple-200 border-r-2 border-purple-600 p-4 text-center">
                                        <span className="text-lg font-bold text-purple-900">
                                            {monteursChantier.reduce((sum: number, m: any) => {
                                                const total = getMonthTotal(m.matricule);
                                                const salaire = total * (salaires[m.matricule] || 120);
                                                const totalCharges =
                                                    (fraisTransport[m.matricule] || 0) +
                                                    (fraisRepas[m.matricule] || 0) +
                                                    (fraisLoyer[m.matricule] || 0) +
                                                    (fraisGasoil[m.matricule] || 0);
                                                return sum + salaire + totalCharges;
                                            }, 0).toFixed(2)} DH
                                        </span>
                                    </div>
                                    {monteursChantier.map((m: any) => {
                                        const total = getMonthTotal(m.matricule);
                                        const salaire = total * (salaires[m.matricule] || 120);
                                        const totalCharges =
                                            (fraisTransport[m.matricule] || 0) +
                                            (fraisRepas[m.matricule] || 0) +
                                            (fraisLoyer[m.matricule] || 0) +
                                            (fraisGasoil[m.matricule] || 0);
                                        const depensesTotales = salaire + totalCharges;
                                        return (
                                            <div key={`depenses-${m.matricule}`} className="w-28 bg-purple-100 border-r border-purple-300 p-3 text-center">
                                                <div className="text-lg font-bold text-purple-900">{depensesTotales.toFixed(2)}</div>
                                                <div className="text-xs text-purple-700">DH</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default PointageMensuel;
