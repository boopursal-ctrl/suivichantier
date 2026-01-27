import React, { useState, useMemo } from 'react';
import {
    Users, Calendar, MapPin, Search, Filter, Briefcase,
    Clock, CheckCircle, AlertCircle, ChevronRight, UserPlus,
    FileText, Download, Phone, MoreHorizontal, User,
    X, Save, AlertTriangle, History, Euro, HardHat, Award, BarChart3
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Monteur, Chantier, AffectationMonteur, Interimaire } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types unifiés pour l'affichage
// Types unifiés pour l'affichage (Updated)
type UserType = 'CDI' | 'CDD' | 'INTERIM' | 'FREELANCE' | 'ANAPEC' | 'PREVU';
type UserStatus = 'ACTIF' | 'DISPONIBLE' | 'PLANIFIÉ' | 'ABSENT' | 'MALADIE' | 'BLACKLISTÉ';

interface ResourceRow {
    id: string; // P-123 or I-UUID
    originalId: string;
    name: string;
    type: UserType;
    role: string;
    status: UserStatus;
    currentSite?: {
        id: string;
        name: string;
        city: string;
    };
    dates?: {
        start: string;
        end?: string;
    };
    contact?: string;
    matricule?: string | number;
}

const ResourceMatrix: React.FC = () => {
    const {
        monteurs, chantiers, affectations, interimaires,
        lignesCouts, mouvements, articles,
        addAffectation, updateChantier
    } = useData();

    const [filterType, setFilterType] = useState<'ALL' | 'PERMANENT' | 'INTERIM'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PLANNED' | 'AVAILABLE'>('ALL');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null); // For detail view

    // Expense Filters State for Detail View
    const [expFilterStartDate, setExpFilterStartDate] = useState('');
    const [expFilterEndDate, setExpFilterEndDate] = useState('');
    const [expFilterSiteId, setExpFilterSiteId] = useState('ALL');
    const [expFilterType, setExpFilterType] = useState('ALL');

    const [assignmentType, setAssignmentType] = useState<'PERMANENT' | 'INTERIM'>('PERMANENT');
    const [selectedResourceId, setSelectedResourceId] = useState('');
    const [selectedChantierId, setSelectedChantierId] = useState('');
    const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
    const [dateFin, setDateFin] = useState('');
    const [salaryOverride, setSalaryOverride] = useState('');

    // 1. Unification des données (Permanents + Intérimaires) - STRICT DEDUPLICATION
    const allResources: ResourceRow[] = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
        const resources: ResourceRow[] = [];
        const processedCINs = new Set<string>(); // To prevent duplicates across sets

        // A. Traitement des Monteurs Permanents (CDI/CDD...)
        monteurs.forEach(m => {
            if (m.cin) processedCINs.add(m.cin.toUpperCase().trim());

            // Trouver l'affectation active ou future
            const sortedAffectations = affectations
                .filter(a => String(a.matricule) === String(m.matricule))
                .sort((a, b) => new Date(b.date_entree).getTime() - new Date(a.date_entree).getTime());

            // Active = starts before or on today AND (no end date OR end date >= today)
            let activeAff = sortedAffectations.find(a => {
                const start = new Date(a.date_entree);
                const end = a.date_sortie ? new Date(a.date_sortie) : null;
                return start <= today && (!end || end >= today);
            });

            // Planned = starts in future
            let futureAff = !activeAff ? sortedAffectations.find(a => new Date(a.date_entree) > today) : null;

            let status: UserStatus = 'DISPONIBLE';
            let currentSite = undefined;
            let dates = undefined;

            const displayAff = activeAff || futureAff;

            if (displayAff) {
                const startDate = new Date(displayAff.date_entree);
                const chantier = chantiers.find(c => c.id_chantier === displayAff.id_chantier);

                if (startDate > today) {
                    status = 'PLANIFIÉ';
                } else {
                    status = 'ACTIF';
                }

                if (chantier) {
                    currentSite = {
                        id: chantier.id_chantier,
                        name: chantier.nom_client || chantier.ref_chantier,
                        city: chantier.ville_code
                    };
                    dates = {
                        start: displayAff.date_entree,
                        end: displayAff.date_sortie
                    };
                }
            }

            if (m.is_blacklisted) status = 'BLACKLISTÉ';
            else if (!m.actif) status = 'ABSENT';

            resources.push({
                id: `P-${m.matricule}`,
                originalId: String(m.matricule),
                name: m.nom_monteur,
                type: m.type_contrat as UserType,
                role: m.role_monteur,
                status,
                currentSite,
                dates,
                contact: m.telephone || '-',
                matricule: m.matricule
            });
        });

        // B. Traitement des Intérimaires / Locaux sur Chantiers (ACTIFS)
        chantiers.forEach(c => {
            if (c.monteurs_locaux && (c.statut === 'actif' || c.statut === 'en_cours')) {
                c.monteurs_locaux.forEach((ml, index) => {
                    const cleanCIN = ml.cin ? ml.cin.toUpperCase().trim() : '';

                    // DEDUPLICATION 1: If CIN already processed (is Permanent or already found on another site), SKIP.
                    if (cleanCIN && processedCINs.has(cleanCIN)) return;

                    // If valid CIN, mark as processed
                    if (cleanCIN) processedCINs.add(cleanCIN);

                    // Check Global Blacklist Status for this CIN
                    const globalInterim = interimaires.find(i => i.cin === ml.cin);
                    const isBlacklisted = globalInterim?.is_blacklisted || false;

                    // Determine Type
                    const workerType = ml.type === 'PREVU' ? 'PREVU' : 'INTERIM';

                    // Row ID
                    const rowId = ml.id ? `I-${ml.id}` : `I-${cleanCIN || 'UNKNOWN'}-${c.id_chantier}-${index}`;

                    resources.push({
                        id: rowId,
                        originalId: ml.id || cleanCIN,
                        name: ml.nom_complet,
                        type: workerType,
                        role: 'OUVRIER',
                        status: isBlacklisted ? 'BLACKLISTÉ' : 'ACTIF',
                        currentSite: {
                            id: c.id_chantier,
                            name: c.nom_client || c.ref_chantier,
                            city: c.ville_code
                        },
                        dates: {
                            start: ml.date_debut || c.date_debut,
                            end: ml.date_fin || c.date_fin
                        },
                        contact: '-',
                        matricule: ml.cin || 'N/A'
                    });
                });
            }
        });

        // C. Traitement des Intérimaires (DISPONIBLES GLOBAL)
        interimaires.forEach(i => {
            const cleanCIN = i.cin ? i.cin.toUpperCase().trim() : '';

            // DEDUPLICATION 2: Only add if NOT seen yet (not Permanent, not Active on site)
            if (cleanCIN && processedCINs.has(cleanCIN)) return;

            // Mark processed (though end of logic)
            if (cleanCIN) processedCINs.add(cleanCIN);

            resources.push({
                id: `I-${i.cin}`,
                originalId: i.id,
                name: i.nom_complet,
                type: 'INTERIM',
                role: 'OUVRIER',
                status: i.is_blacklisted ? 'BLACKLISTÉ' : 'DISPONIBLE',
                contact: i.telephone || '-',
                matricule: i.cin
            });
        });

        return resources;
    }, [monteurs, chantiers, affectations, interimaires]);


    // ... DETAIL & HISTORY ... (skipping lines 182-250 for replace target match)
    // Actually, I cannot skip large chunks in replace if they are contiguous. 
    // I will do two separate replaces. One for the loop logic (above), one for getStatusColor.
    // Wait, the previous tool failed because I tried to match too much.
    // I will just return the loop logic here.

    // BUT 'getStatusColor' is further down. I'll split into 2 calls if needed, but I can't do parallel calls on same file.
    // I'll do this one first.


    // --- DETAIL & HISTORY LOGIC ---
    const selectedResourceDetail = useMemo(() => {
        if (!selectedDetailId) return null;
        return allResources.find(r => r.id === selectedDetailId);
    }, [selectedDetailId, allResources]);

    const resourceHistory = useMemo(() => {
        if (!selectedResourceDetail) return { affectations: [], couts: [], equipements: [] };

        const res = selectedResourceDetail;
        // Identify Match ID 
        // For PERMANENT: use originalId (matricule)
        // For INTERIM: use originalId (UUID from monteurs_locaux.id)
        const idToMatch = res.originalId;

        // 1. Affectations History (only for permanents)
        const histAffectations = res.type !== 'INTERIM'
            ? affectations
                .filter(a => String(a.matricule) === String(idToMatch))
                .sort((a, b) => new Date(b.date_entree).getTime() - new Date(a.date_entree).getTime())
            : [];

        // 2. Finance (Primes, Heures Supp, Indemnities, Tools) linked via related_monteur_id
        const financeItems = lignesCouts
            .filter(c => c.related_monteur_id === String(idToMatch))
            .sort((a, b) => {
                // Sort by Created At if available, else Amount
                if (b.created_at && a.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                return (b.montant_reel || 0) - (a.montant_reel || 0)
            });

        // 3. Equipements (EPI) linked via beneficiaire_id
        const equipItems = mouvements
            .filter(m => m.beneficiaire_id === String(idToMatch) && m.type === 'SORTIE')
            .map(m => {
                const art = articles.find(a => a.id_article === m.id_article);
                return { ...m, articleName: art?.nom || 'Article Inconnu' };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { affectations: histAffectations, couts: financeItems, equipements: equipItems };
    }, [selectedResourceDetail, affectations, lignesCouts, mouvements, articles]);

    // Enhanced Expense Filtering for Detail View
    const filteredExpenses = useMemo(() => {
        return resourceHistory.couts.filter(c => {
            // Use created_at as date source, fallback to null (or maybe handle missing date)
            // If created_at is missing, we might assume it passes date filters or fails? 
            // Let's assume fails if strict filter, passes if no filter.
            const cDate = c.created_at ? new Date(c.created_at) : null;

            if (expFilterStartDate) {
                if (!cDate) return false;
                if (cDate < new Date(expFilterStartDate)) return false;
            }
            if (expFilterEndDate) {
                if (!cDate) return false;
                // Add 1 day to include the end date fully or use setHours
                const endDate = new Date(expFilterEndDate);
                endDate.setHours(23, 59, 59);
                if (cDate > endDate) return false;
            }

            if (expFilterSiteId !== 'ALL' && c.id_chantier !== expFilterSiteId) return false;
            if (expFilterType !== 'ALL' && c.type_cout !== expFilterType) return false;

            return true;
        });
    }, [resourceHistory.couts, expFilterStartDate, expFilterEndDate, expFilterSiteId, expFilterType]);

    const totalExpenseAmount = useMemo(() => filteredExpenses.reduce((sum, c) => sum + (c.montant_reel || 0), 0), [filteredExpenses]);


    // 2. Filtrage
    const filteredResources = allResources.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(r.matricule).toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'ALL'
            ? true
            : filterType === 'PERMANENT'
                ? r.type !== 'INTERIM'
                : r.type === 'INTERIM';

        const matchesStatus = statusFilter === 'ALL'
            ? true
            : statusFilter === 'ACTIVE'
                ? r.status === 'ACTIF'
                : statusFilter === 'PLANNED'
                    ? r.status === 'PLANIFIÉ'
                    : r.status === 'DISPONIBLE';

        return matchesSearch && matchesType && matchesStatus;
    });

    // Stats
    const stats = {
        total: filteredResources.length,
        active: filteredResources.filter(r => r.status === 'ACTIF').length,
        planned: filteredResources.filter(r => r.status === 'PLANIFIÉ').length,
        available: filteredResources.filter(r => r.status === 'DISPONIBLE').length
    };

    const getStatusColor = (status: UserStatus) => {
        switch (status) {
            case 'ACTIF': return 'bg-green-100 text-green-700 border-green-200';
            case 'PLANIFIÉ': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'DISPONIBLE': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'ABSENT': return 'bg-red-100 text-red-700 border-red-200';
            case 'BLACKLISTÉ': return 'bg-gray-900 text-white border-gray-700 font-bold';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getTypeBadge = (type: UserType) => {
        if (type === 'INTERIM') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">INTÉRIM</span>;
        if (type === 'PREVU') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">PRÉVU</span>;
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A365D]/10 text-[#1A365D] border border-[#1A365D]/20">{type}</span>;
    };

    const handleExport = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setTextColor(26, 54, 93);
        doc.text("Matrice de Suivi Ressources", 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 30);

        const tableColumn = ["Matricule", "Nom", "Type", "Statut", "Chantier Actuel", "Dates"];
        const tableRows: any[] = [];
        filteredResources.forEach(resource => {
            tableRows.push([
                resource.matricule,
                resource.name,
                resource.type,
                resource.status,
                resource.currentSite ? `${resource.currentSite.name} (${resource.currentSite.city})` : '-',
                resource.dates ? `${new Date(resource.dates.start).toLocaleDateString()} -> ${resource.dates.end ? new Date(resource.dates.end).toLocaleDateString() : '...'}` : '-'
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });
        doc.save("matrice_ressources.pdf");
    };

    const handleSaveAssignment = async () => {
        if (!selectedChantierId || !selectedResourceId || !dateDebut) return;

        try {
            if (assignmentType === 'PERMANENT') {
                const monteur = monteurs.find(m => String(m.matricule) === selectedResourceId);
                if (!monteur) return;

                const newAff: AffectationMonteur = {
                    id_affectation: crypto.randomUUID(),
                    id_chantier: selectedChantierId,
                    matricule: monteur.matricule,
                    nom_monteur: monteur.nom_monteur,
                    salaire_jour: monteur.salaire_jour,
                    zone_travail: "Standard", // Default
                    date_entree: dateDebut,
                    date_sortie: dateFin || undefined,
                    jours_arret: 0
                };

                // CRITICAL BLACKLIST CHECK FOR PERMANENT
                if (monteur.is_blacklisted) {
                    alert(`❌ AFFECTATION REFUSÉE\n\n${monteur.nom_monteur} est BLACKLISTÉ.\nMotif: ${monteur.blacklist_reason || 'Raison inconnue'}`);
                    return;
                }

                await addAffectation(newAff);
            } else {
                const chantier = chantiers.find(c => c.id_chantier === selectedChantierId);
                const interimaire = interimaires.find(i => i.id === selectedResourceId);
                if (!chantier || !interimaire) return;

                // CRITICAL: Block blacklisted interim workers
                if (interimaire.is_blacklisted) {
                    alert(`❌ AFFECTATION REFUSÉE\n\n${interimaire.nom_complet} est BLACKLISTÉ.\n\nMotif: ${interimaire.blacklist_reason || 'Non spécifié'}\n\nCe collaborateur ne peut pas être affecté tant qu'il reste blacklisté.`);
                    closeModal();
                    return;
                }

                const newLocalMonteur = {
                    id: crypto.randomUUID(),
                    nom_complet: interimaire.nom_complet,
                    cin: interimaire.cin,
                    salaire_jour: salaryOverride ? Number(salaryOverride) : 100,
                    jours_travailles: 0,
                    date_debut: dateDebut,
                    date_fin: dateFin || undefined,
                    ville_residence: chantier.ville_code
                };
                const updatedLocaux = [...(chantier.monteurs_locaux || []), newLocalMonteur];
                await updateChantier({ ...chantier, monteurs_locaux: updatedLocaux });
            }
            closeModal();
        } catch (e) {
            console.error("Error saving assignment", e);
            alert("Erreur lors de l'enregistrement de l'affectation");
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedResourceId('');
        setSelectedChantierId('');
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 font-sans">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Users className="w-8 h-8 text-[#1A365D]" />
                        Matrice de Suivi Ressources
                    </h1>
                    <p className="text-slate-500 mt-1">Vue unifiée des équipes permanentes et intérimaires en temps réel.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Download className="w-4 h-4" /> Exporter PDF
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1A365D] text-white rounded-lg hover:bg-[#2a4a7f] transition-colors shadow-md shadow-blue-900/10 font-medium text-sm"
                    >
                        <UserPlus className="w-4 h-4" /> Nouvelle Affectation
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* ... (Same as before) ... */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 uppercase">Total Ressources</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
                    <div className="p-3 bg-green-50 rounded-lg text-green-600">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 uppercase">Actifs (Sur Site)</div>
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 uppercase">Planifiés</div>
                        <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg text-gray-500">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 uppercase">Disponibles</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.available}</div>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">

                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, matricule..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/20 focus:border-[#1A365D]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter Groups */}
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setFilterType('ALL')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            TOUS
                        </button>
                        <button
                            onClick={() => setFilterType('PERMANENT')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'PERMANENT' ? 'bg-white text-[#1A365D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            PERMANENTS
                        </button>
                        <button
                            onClick={() => setFilterType('INTERIM')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'INTERIM' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            INTÉRIMAIRES
                        </button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <select
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="ALL">Tous Statuts</option>
                        <option value="ACTIVE">⚡ Actifs</option>
                        <option value="PLANNED">📅 Planifiés</option>
                        <option value="AVAILABLE">✅ Disponibles</option>
                    </select>
                </div>
            </div>

            {/* Main Matrix Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4 w-16 text-center">#</th>
                                <th className="p-4">Ressource</th>
                                <th className="p-4">Role & Type</th>
                                <th className="p-4">Statut Actuel</th>
                                <th className="p-4">Affectation / Localisation</th>
                                <th className="p-4">Période</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredResources.map((resource) => (
                                <tr
                                    key={resource.id}
                                    onClick={() => setSelectedDetailId(resource.id)}
                                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                >
                                    <td className="p-4 text-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold border ${resource.type === 'INTERIM' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {resource.type === 'INTERIM' ? 'I' : 'P'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{resource.name}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">Mat: {resource.matricule}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col items-start gap-1">
                                            {getTypeBadge(resource.type)}
                                            <span className="text-xs text-slate-500">{resource.role}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(resource.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${resource.status === 'ACTIF' ? 'bg-green-500' : resource.status === 'PLANIFIÉ' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                                            {resource.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {resource.currentSite ? (
                                            <div>
                                                <div className="font-medium text-slate-700 flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {resource.currentSite.name}
                                                </div>
                                                <div className="text-xs text-slate-500 ml-5">{resource.currentSite.city}</div>
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 text-sm flex items-center gap-2">
                                                <Briefcase className="w-4 h-4" /> Non affecté
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {resource.dates ? (
                                            <div className="text-xs">
                                                <div className="font-medium text-slate-700">Du: {new Date(resource.dates.start).toLocaleDateString('fr-FR')}</div>
                                                {resource.dates.end && (
                                                    <div className="text-slate-500">Au: {new Date(resource.dates.end).toLocaleDateString('fr-FR')}</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                onClick={(e) => { e.stopPropagation(); setSelectedDetailId(resource.id); }}
                                                title="Voir dépenses & détails"
                                            >
                                                <BarChart3 className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-[#1A365D] hover:bg-slate-100 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedDetailId(resource.id); }}>
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
                    <div>Affichage de <span className="font-bold text-slate-800">{filteredResources.length}</span> ressources</div>
                </div>
            </div>

            {/* MODAL AFFECTATION */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-gray-800">Planifier une Affectation</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>

                        <div className="p-6 space-y-4">

                            {/* Type Selector */}
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button
                                    onClick={() => setAssignmentType('PERMANENT')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${assignmentType === 'PERMANENT' ? 'bg-white shadow text-[#1A365D]' : 'text-slate-500'}`}
                                >
                                    Permanent
                                </button>
                                <button
                                    onClick={() => setAssignmentType('INTERIM')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${assignmentType === 'INTERIM' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}
                                >
                                    Intérimaire
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Choisir la Ressource</label>
                                <select
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:border-[#1A365D] outline-none"
                                    value={selectedResourceId}
                                    onChange={(e) => setSelectedResourceId(e.target.value)}
                                >
                                    <option value="">Sélectionner...</option>
                                    {assignmentType === 'PERMANENT'
                                        ? monteurs.map(m => (
                                            <option key={m.matricule} value={String(m.matricule)}>{m.nom_monteur} (Mat: {m.matricule})</option>
                                        ))
                                        : interimaires.map(i => (
                                            <option key={i.id} value={i.id}>{i.nom_complet} (CIN: {i.cin})</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Choisir le Chantier</label>
                                <select
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:border-[#1A365D] outline-none"
                                    value={selectedChantierId}
                                    onChange={(e) => setSelectedChantierId(e.target.value)}
                                >
                                    <option value="">Sélectionner un chantier...</option>
                                    {chantiers.filter(c => c.statut === 'actif').map(c => (
                                        <option key={c.id_chantier} value={c.id_chantier}>{c.nom_client} - {c.ref_chantier}</option>
                                    ))}
                                </select>
                            </div>

                            {assignmentType === 'INTERIM' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Salaire Jour (DH)</label>
                                    <input
                                        type="number"
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#1A365D] outline-none"
                                        value={salaryOverride}
                                        placeholder="Ex: 100"
                                        onChange={(e) => setSalaryOverride(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Date Début</label>
                                    <input
                                        type="date"
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#1A365D] outline-none"
                                        value={dateDebut}
                                        onChange={(e) => setDateDebut(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Date Fin (Opt.)</label>
                                    <input
                                        type="date"
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#1A365D] outline-none"
                                        value={dateFin}
                                        onChange={(e) => setDateFin(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5" />
                                <p>
                                    Assurez-vous que la ressource est disponible sur cette période. Les conflits de planning ne sont pas bloquants mais seront signalés.
                                </p>
                            </div>

                            <button
                                onClick={handleSaveAssignment}
                                disabled={!selectedChantierId || !selectedResourceId || !dateDebut}
                                className="w-full py-3 bg-[#1A365D] text-white rounded-xl font-bold hover:bg-[#2a4a7f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Confirmer l'Affectation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: DETAILED PROFILE MODAL */}
            {selectedDetailId && selectedResourceDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedDetailId(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* Header Profile */}
                        <div className="bg-[#1A365D] p-6 text-white flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-bold border border-white/20">
                                    {selectedResourceDetail.type === 'INTERIM' ? 'I' : 'P'}
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold">{selectedResourceDetail.name}</h2>
                                    <div className="flex items-center gap-2 text-blue-200 text-sm">
                                        <span className="px-2 py-0.5 bg-white/20 rounded font-mono">{selectedResourceDetail.matricule}</span>
                                        <span>•</span>
                                        <span>{selectedResourceDetail.role}</span>
                                        <span>•</span>
                                        <span className="capitalize">{selectedResourceDetail.type.toLowerCase()}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDetailId(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content Tabs */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* Current Status */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> Situation Actuelle
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Statut</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(selectedResourceDetail.status)}`}>
                                                {selectedResourceDetail.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Chantier</span>
                                            <span className="font-medium text-slate-800 text-right">{selectedResourceDetail.currentSite?.name || 'Aucun'}</span>
                                        </div>
                                        {selectedResourceDetail.dates && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Depuis le</span>
                                                <span className="font-medium text-slate-800">{new Date(selectedResourceDetail.dates.start).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                        <Award className="w-4 h-4" /> Suivi Financier
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                                            <div className="text-xl font-bold text-orange-700">
                                                {resourceHistory.couts.reduce((sum, c) => sum + (c.montant_reel || 0), 0).toLocaleString()} DH
                                            </div>
                                            <div className="text-xs text-orange-600">Total Dépenses</div>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                                            <div className="text-xl font-bold text-purple-700">{resourceHistory.equipements.length}</div>
                                            <div className="text-xs text-purple-600">Équipements</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Lists */}
                            <div className="space-y-6">
                                {/* 1. History Timeline */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 font-bold text-slate-700">
                                        <History className="w-5 h-5" /> Historique des Affectations
                                    </div>
                                    {resourceHistory.affectations.length > 0 ? (
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="p-3">Période</th>
                                                    <th className="p-3">Chantier (REF)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {resourceHistory.affectations.map((aff, i) => {
                                                    const chantier = chantiers.find(c => c.id_chantier === aff.id_chantier);
                                                    return (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="p-3 text-slate-600">
                                                                {new Date(aff.date_entree).toLocaleDateString()}
                                                                {aff.date_sortie ? ` → ${new Date(aff.date_sortie).toLocaleDateString()}` : ' → ...'}
                                                            </td>
                                                            <td className="p-3 font-medium text-slate-800">
                                                                {chantier?.nom_client || 'Client Inconnu'} <span className="text-slate-400 font-normal">({chantier?.ref_chantier})</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-6 text-center text-slate-400 italic">Aucun historique d'affectation disponible pour les permanents (ou vide).</div>
                                    )}
                                </div>

                                {/* 2. Mes Dépenses (Enhanced with Filters) */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-slate-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                                <Euro className="w-5 h-5 text-green-600" /> Mes Dépenses
                                            </h3>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500">Total Filtré</div>
                                                <div className="text-xl font-bold text-green-700">{totalExpenseAmount.toLocaleString()} DH</div>
                                            </div>
                                        </div>

                                        {/* Filters */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Du</label>
                                                <input
                                                    type="date"
                                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                                                    value={expFilterStartDate}
                                                    onChange={(e) => setExpFilterStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Au</label>
                                                <input
                                                    type="date"
                                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                                                    value={expFilterEndDate}
                                                    onChange={(e) => setExpFilterEndDate(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Chantier</label>
                                                <select
                                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                                                    value={expFilterSiteId}
                                                    onChange={(e) => setExpFilterSiteId(e.target.value)}
                                                >
                                                    <option value="ALL">Tous</option>
                                                    {chantiers.map(ch => (
                                                        <option key={ch.id_chantier} value={ch.id_chantier}>
                                                            {ch.ref_chantier} - {ch.nom_client}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                                                <select
                                                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20"
                                                    value={expFilterType}
                                                    onChange={(e) => setExpFilterType(e.target.value)}
                                                >
                                                    <option value="ALL">Tous</option>
                                                    <option value="prime">Prime</option>
                                                    <option value="heures_supp">Heures Supp.</option>
                                                    <option value="main_doeuvre_extra">Main d'œuvre Extra</option>
                                                    <option value="indemnite_deplacement">Indemnité Déplacement</option>
                                                    <option value="indemnite_repas">Indemnité Repas</option>
                                                    <option value="indemnite_logement">Indemnité Logement</option>
                                                    <option value="outillage_affecte">Outillage Affecté</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {filteredExpenses.length > 0 ? (
                                        <div className="overflow-x-auto max-h-96">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0">
                                                    <tr>
                                                        <th className="p-3">Date</th>
                                                        <th className="p-3">Chantier</th>
                                                        <th className="p-3">Type</th>
                                                        <th className="p-3">Montant</th>
                                                        <th className="p-3">Détail</th>
                                                        <th className="p-3">Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredExpenses.map((cout, i) => {
                                                        const expChantier = chantiers.find(c => c.id_chantier === cout.id_chantier);
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50">
                                                                <td className="p-3 text-slate-600 whitespace-nowrap">
                                                                    {cout.created_at ? new Date(cout.created_at).toLocaleDateString('fr-FR') : '-'}
                                                                </td>
                                                                <td className="p-3 font-medium text-slate-700">
                                                                    {expChantier?.ref_chantier || 'N/A'}
                                                                </td>
                                                                <td className="p-3 capitalize font-medium text-slate-700">
                                                                    {cout.type_cout?.replace('_', ' ')}
                                                                </td>
                                                                <td className="p-3 font-bold text-green-700">{cout.montant_reel} DH</td>
                                                                <td className="p-3 text-slate-600 text-xs">{cout.commentaire || '-'}</td>
                                                                <td className="p-3">
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${cout.statut === 'validé' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                        {cout.statut}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 italic">
                                            {resourceHistory.couts.length === 0
                                                ? "Aucune dépense enregistrée pour ce collaborateur."
                                                : "Aucune dépense ne correspond aux filtres sélectionnés."}
                                        </div>
                                    )}
                                </div>

                                {/* 3. Equipment / EPI History */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 font-bold text-slate-700">
                                        <HardHat className="w-5 h-5" /> Matériel & Équipements (EPI / Vêtements)
                                    </div>
                                    {resourceHistory.equipements.length > 0 ? (
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="p-3">Date</th>
                                                    <th className="p-3">Article</th>
                                                    <th className="p-3">Quantité</th>
                                                    <th className="p-3">Motif</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {resourceHistory.equipements.map((mvt, i) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="p-3 text-slate-600">{new Date(mvt.date).toLocaleDateString()}</td>
                                                        <td className="p-3 font-bold text-slate-800">{mvt.articleName}</td>
                                                        <td className="p-3 text-slate-800">{mvt.quantite}</td>
                                                        <td className="p-3 text-slate-500 italic">{mvt.motif || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-6 text-center text-slate-400 italic">Aucun équipement attribué.</div>
                                    )}
                                </div>

                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button onClick={() => setSelectedDetailId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ResourceMatrix;
