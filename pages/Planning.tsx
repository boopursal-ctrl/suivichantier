
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragEndEvent,
    DragStartEvent,
    UniqueIdentifier,
    pointerWithin,
    rectIntersection,
    closestCenter,
    closestCorners,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    parseISO,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    isWeekend,
    differenceInDays,
    isWithinInterval,
    isBefore,
    isAfter
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Calendar as CalendarIcon,
    Clock,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    MapPin,
    CheckCircle2,
    TrendingUp,
    Users,
    Wallet,
    User,
    X
} from 'lucide-react';
import { Chantier } from '../types';
import { cn } from '../utils';
import { motion } from 'framer-motion';
import { getCityName } from '../utils';

// --- Types ---

interface DraggableChantierProps {
    chantier: Chantier;
    isOverlay?: boolean;
}

const SidebarDroppable = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'backlog-zone',
    });

    return (
        <div ref={setNodeRef} className={cn(
            "flex-1 p-4 space-y-3 transition-all duration-200",
            isOver ? "bg-slate-800/70 ring-2 ring-inset ring-amber-400/50" : ""
        )}>
            {children}
        </div>
    );
}

// --- Components ---

const DateEditModal = ({ isOpen, onClose, onSave, chantier }: { isOpen: boolean, onClose: () => void, onSave: (start: string, end: string) => void, chantier: Chantier }) => {
    const [start, setStart] = useState(chantier.date_debut);
    const [end, setEnd] = useState(chantier.date_fin);

    // Update state when chantier changes if modal is open (optional but good practice)
    React.useEffect(() => {
        setStart(chantier.date_debut);
        setEnd(chantier.date_fin);
    }, [chantier]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col pointer-events-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-lg text-gray-800">Modifier Dates</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="space-y-4">
                    <p className="font-bold text-slate-700">{chantier.nom_client} <span className="text-sm font-normal text-slate-500">({chantier.ref_chantier})</span></p>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Date Début</label>
                        <input type="date" className="w-full border rounded-xl px-4 py-3 bg-gray-50" value={start} onChange={e => setStart(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Date Fin</label>
                        <input type="date" className="w-full border rounded-xl px-4 py-3 bg-gray-50" value={end} onChange={e => setEnd(e.target.value)} />
                    </div>
                    <button
                        onClick={() => onSave(start, end)}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md transform active:scale-95"
                    >
                        Enregistrer
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-2 italic">
                        Cliquez sur Enregistrer pour valider les nouvelles dates.
                    </p>
                </div>
            </div>
        </div>
    );
};

interface DraggableChantierProps {
    chantier: Chantier;
    isOverlay?: boolean;
    onEdit?: (c: Chantier) => void;
    key?: string | number;
}

const DraggableChantier = ({ chantier, isOverlay, onEdit }: DraggableChantierProps) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
        id: chantier.id_chantier,
        data: { chantier },
        disabled: isOverlay
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative bg-gradient-to-br from-white via-slate-50 to-slate-100 group rounded-xl border-2 transition-all duration-200 overflow-hidden",
                isDragging ? "opacity-20 scale-95" : "opacity-100 hover:shadow-2xl hover:border-indigo-400 hover:scale-[1.02]",
                isOverlay ? "shadow-2xl ring-4 ring-indigo-400/50 z-50 cursor-grabbing" : "shadow-md border-slate-300",
                "p-4"
            )}
        >
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600" />

            <div className="pl-2 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{chantier.ref_chantier}</span>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-base leading-tight mt-0.5">{chantier.nom_client}</h4>
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(chantier); }}
                                    className="p-1 text-slate-300 hover:text-indigo-500 transition-colors"
                                    title="Modifier les dates"
                                >
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div
                        ref={setActivatorNodeRef}
                        {...listeners}
                        {...attributes}
                        className="p-2 -m-2 cursor-grab active:cursor-grabbing touch-none z-10"
                        title="Maintenir pour déplacer"
                    >
                        <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200">
                        <Clock className="w-4 h-4" />
                        <span className="font-bold text-sm">{chantier.duree_prevue || 1} jours</span>
                    </div>
                    {chantier.ville_code && (
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="font-medium">{getCityName(chantier.ville_code)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Rich Tooltip Component
const ChantierTooltip = ({ chantier, affectations, monteurs, lignesCouts }: {
    chantier: Chantier,
    affectations: any[],
    monteurs: any[],
    lignesCouts: any[]
}) => {
    const chantierAffectations = affectations.filter(a => a.id_chantier === chantier.id_chantier);
    const assignedMonteurs = chantierAffectations.map(a => monteurs.find(m => m.matricule === a.matricule)).filter(Boolean);
    const costs = lignesCouts.filter(c => c.id_chantier === chantier.id_chantier);
    const totalCosts = costs.reduce((sum, c) => sum + (c.montant_reel || 0), 0);

    return (
        <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 min-w-[320px] max-w-[400px] border border-slate-700">
            <div className="border-b border-slate-700 pb-3 mb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-white leading-tight">{chantier.nom_client}</h3>
                        <p className="text-slate-400 text-xs mt-1 font-mono">{chantier.ref_chantier}</p>
                    </div>
                    <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md text-xs font-bold uppercase">
                        Actif
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="font-medium">Début</span>
                    </div>
                    <p className="text-white font-bold text-sm">{format(parseISO(chantier.date_debut), 'd MMM yyyy', { locale: fr })}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">Durée</span>
                    </div>
                    <p className="text-white font-bold text-sm">{chantier.duree_prevue || 1} jours</p>
                </div>
            </div>

            {chantier.ville_code && (
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="font-medium">Localisation</span>
                    </div>
                    <p className="text-white font-semibold text-sm">{getCityName(chantier.ville_code)}</p>
                    {chantier.adresse && (
                        <p className="text-slate-400 text-xs mt-1">{chantier.adresse}</p>
                    )}
                </div>
            )}

            {assignedMonteurs.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium">Équipe ({assignedMonteurs.length})</span>
                    </div>
                    <div className="space-y-1">
                        {assignedMonteurs.slice(0, 3).map((m: any, i) => (
                            <div key={i} className="flex items-center gap-2 text-white text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                <span className="font-medium">{m.nom_monteur}</span>
                            </div>
                        ))}
                        {assignedMonteurs.length > 3 && (
                            <p className="text-slate-400 text-xs pl-3.5">+{assignedMonteurs.length - 3} autres</p>
                        )}
                    </div>
                </div>
            )}

            {chantier.responsable_chantier && (
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 mb-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-medium">Sous Chef de Chantier</span>
                    </div>
                    <p className="text-white font-semibold text-sm">{chantier.responsable_chantier}</p>
                </div>
            )}

            {totalCosts > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="font-medium">Coûts engagés</span>
                    </div>
                    <p className="text-emerald-400 font-bold text-base">{totalCosts.toLocaleString('fr-MA')} DH</p>
                </div>
            )}
        </div>
    );
};

// Timeline Bar with Fixed Tooltip
const ChantierTimelineBar = ({
    chantier,
    isStart,
    isEnd,
    totalDays,
    affectations,
    monteurs,
    lignesCouts,
    onEdit
}: {
    chantier: Chantier,
    isStart: boolean,
    isEnd: boolean,
    totalDays: number,
    affectations: any[],
    monteurs: any[],
    lignesCouts: any[],
    onEdit: (c: Chantier) => void
}) => {
    const [showTooltip, setShowTooltip] = useState(false);

    const colors = [
        'from-blue-500 via-blue-600 to-blue-700',
        'from-purple-500 via-purple-600 to-purple-700',
        'from-pink-500 via-pink-600 to-pink-700',
        'from-green-500 via-green-600 to-green-700',
        'from-orange-500 via-orange-600 to-orange-700',
        'from-teal-500 via-teal-600 to-teal-700',
    ];

    const colorIndex = parseInt(chantier.id_chantier.slice(-1), 16) % colors.length;
    const gradient = colors[colorIndex];

    return (
        <div className="relative group/timeline">
            <motion.div
                initial={{ opacity: 0, scaleY: 0.5 }}
                animate={{ opacity: 1, scaleY: 1 }}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => { e.stopPropagation(); onEdit(chantier); }}
                className={cn(
                    "h-12 w-full shadow-md border-y-[1px] border-white/20 backdrop-blur-sm cursor-pointer overflow-hidden transition-all duration-200",
                    "bg-gradient-to-r",
                    gradient,
                    "flex items-center px-2",
                    "hover:shadow-lg hover:brightness-110",
                    isStart && "rounded-l-lg border-l-[1px]",
                    isEnd && "rounded-r-lg border-r-[1px]",
                    !isStart && "-ml-[1px] w-[calc(100%+1px)]",
                    !isEnd && "-mr-[1px] w-[calc(100%+1px)]",
                    showTooltip ? "z-50 relative brightness-110 shadow-xl ring-2 ring-white/30" : "z-10"
                )}
            >
                {isStart && (
                    <div className="flex items-center gap-2 w-full pointer-events-none">
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate drop-shadow-md">{chantier.nom_client}</p>
                            <p className="text-white/90 text-xs truncate font-medium">{chantier.ref_chantier}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-sm px-2.5 py-1 rounded-lg shrink-0 border border-white/20">
                            <Clock className="w-3.5 h-3.5 text-white" />
                            <span className="text-white text-xs font-bold">{totalDays}j</span>
                        </div>
                    </div>
                )}

                {!isStart && (
                    <div className="w-full h-1 bg-white/20 rounded-full pointer-events-none">
                        <div className="h-full bg-white/40 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                )}
            </motion.div>

            {/* Tooltip - positioned outside calendar grid */}
            {showTooltip && isStart && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-[100] pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <ChantierTooltip
                            chantier={chantier}
                            affectations={affectations}
                            monteurs={monteurs}
                            lignesCouts={lignesCouts}
                        />
                    </motion.div>
                </div>
            )}
        </div>
    );
};

const CalendarDay = ({ date, isToday, isWeekendDay, children }: { date: Date, isToday: boolean, isWeekendDay: boolean, children?: React.ReactNode }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({
        id: dateStr,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[140px] p-0 transition-all relative group flex flex-col",
                "border-r border-b border-slate-200/60",
                isOver ? "bg-gradient-to-br from-indigo-50 to-blue-50 ring-2 ring-inset ring-indigo-400 shadow-inner" : "bg-white",
                isWeekendDay ? "bg-slate-50/80" : "",
                isToday ? "bg-gradient-to-br from-blue-50 to-indigo-50" : ""
            )}
        >
            <div className="p-2 flex justify-between items-center relative z-20">
                <span className={cn(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                    isToday ? "bg-blue-600 text-white shadow-lg" : "text-slate-400",
                    isOver ? "text-indigo-700 bg-indigo-100" : ""
                )}>
                    {format(date, 'd')}
                </span>
            </div>

            <div className="flex-1 relative">
                {children}
            </div>
        </div>
    );
};

// --- Main Component ---

const Planning = () => {
    const { chantiers, monteurs, affectations, updateChantier, lignesCouts } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);

    // Edit Modal State
    const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);

    // Helper to add working days (excluding Sat/Sun)
    const addWorkingDays = (startDate: Date, duration: number): Date => {
        let temp = new Date(startDate);
        if (duration <= 0) return temp;
        let daysAdded = isWeekend(temp) ? 0 : 1;
        while (daysAdded < duration) {
            temp = addDays(temp, 1);
            if (!isWeekend(temp)) daysAdded++;
        }
        return temp;
    };

    // Helper to count working days between two dates
    const countWorkingDays = (start: Date, end: Date): number => {
        try {
            const days = eachDayOfInterval({ start, end });
            return days.filter(d => !isWeekend(d)).length;
        } catch (e) { return 0; }
    };

    const handleSaveDates = async (newStart: string, newEnd: string) => {
        if (!editingChantier) return;
        try {
            const start = parseISO(newStart);
            const end = parseISO(newEnd);
            // Count only weekdays for the internal duration
            const newDuration = countWorkingDays(start, end);

            await updateChantier({
                ...editingChantier,
                date_debut: newStart,
                date_fin: newEnd,
                duree_prevue: Math.max(1, newDuration),
                statut: (newStart && newEnd) ? 'actif' : editingChantier.statut
            });
            toast.success("Planning mis à jour !");
            setEditingChantier(null);
        } catch (e) {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const backlogChantiers = useMemo(() =>
        chantiers.filter(c => c.statut === 'en_instance' || (!c.date_debut && c.statut !== 'terminé' && c.statut !== 'archivé')),
        [chantiers]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = useMemo(() =>
        eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
        [calendarStart, calendarEnd]);

    const activeChantiers = useMemo(() => {
        const filtered = chantiers.filter(c => {
            if (c.statut === 'en_instance' || !c.date_debut || !c.date_fin) return false;
            try {
                const start = parseISO(c.date_debut);
                const end = parseISO(c.date_fin);
                return isWithinInterval(start, { start: calendarStart, end: calendarEnd }) ||
                    isWithinInterval(end, { start: calendarStart, end: calendarEnd }) ||
                    (isBefore(start, calendarStart) && isAfter(end, calendarEnd));
            } catch (e) { return false; }
        });

        // Compute lanes with stable sort and normalized dates
        const sorted = [...filtered].map(c => ({
            ...c,
            // Normalize dates to YYYY-MM-DD strings for consistent comparison
            _startStr: format(parseISO(c.date_debut), 'yyyy-MM-dd'),
            _endStr: format(parseISO(c.date_fin), 'yyyy-MM-dd')
        })).sort((a, b) =>
            a._startStr.localeCompare(b._startStr) ||
            a.id_chantier.localeCompare(b.id_chantier)
        );

        const lanes: { [id: string]: number } = {};
        const laneEnds: { [lane: number]: string } = {};

        sorted.forEach(c => {
            let laneIndex = 0;
            // Find first available lane where the previous project ends before this one starts
            while (laneEnds[laneIndex] && laneEnds[laneIndex] >= c._startStr) {
                laneIndex++;
            }
            lanes[c.id_chantier] = laneIndex;
            laneEnds[laneIndex] = c._endStr;
        });

        return { list: filtered, lanes };
    }, [chantiers, calendarStart, calendarEnd]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
        setShowSidebar(false);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const chantierId = active.id as string;
        const targetId = over.id as string;

        const chantier = chantiers.find(c => c.id_chantier === chantierId);
        if (!chantier) return;

        if (targetId === 'backlog-zone') {
            if (chantier.statut === 'en_instance') return;
            try {
                await updateChantier({
                    ...chantier,
                    date_debut: '',
                    date_fin: '',
                    statut: 'en_instance'
                });
                toast.success("Chantier remis en attente");
            } catch (e) {
                toast.error("Erreur lors de la mise à jour");
            }
            return;
        }

        const newStartDate = parseISO(targetId);
        const duration = chantier.duree_prevue || 1;
        // Calculate end date by skipping weekends
        const newEndDate = addWorkingDays(newStartDate, duration);

        const validationErrors: string[] = [];
        const chantierAssignments = affectations.filter(a => a.id_chantier === chantierId);

        for (const aff of chantierAssignments) {
            const monteur = monteurs.find(m => m.matricule === aff.matricule);
            if (!monteur) continue;

            if (monteur.is_blacklisted) {
                validationErrors.push(`${monteur.nom_monteur} (Blacklisté)`);
            }

            const otherAffectations = affectations.filter(a => a.matricule === monteur.matricule && a.id_chantier !== chantierId);
            for (const otherAff of otherAffectations) {
                const otherChantier = chantiers.find(c => c.id_chantier === otherAff.id_chantier);
                if (otherChantier && (otherChantier.statut === 'actif' || otherChantier.statut === 'terminé')) {
                    try {
                        const otherStart = parseISO(otherChantier.date_debut);
                        const otherEnd = parseISO(otherChantier.date_fin);
                        if (newStartDate <= otherEnd && newEndDate >= otherStart) {
                            validationErrors.push(`${monteur.nom_monteur} (Déjà planifié: ${otherChantier.ref_chantier})`);
                        }
                    } catch (e) { console.error(e); }
                }
            }
        }

        if (validationErrors.length > 0) {
            toast.error("Conflits détectés", {
                description: (
                    <div className="space-y-1 mt-1">
                        <p>Impossible de planifier ce chantier :</p>
                        <ul className="list-disc pl-4 text-xs text-red-600">
                            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                    </div>
                ),
                duration: 5000
            });
            return;
        }

        try {
            await updateChantier({
                ...chantier,
                date_debut: format(newStartDate, 'yyyy-MM-dd'),
                date_fin: format(newEndDate, 'yyyy-MM-dd'),
                statut: 'actif'
            });
            toast.success(
                <div className="flex flex-col gap-1">
                    <span className="font-bold">✓ Planification réussie</span>
                    <span className="text-xs">Du {format(newStartDate, 'd MMM', { locale: fr })} au {format(newEndDate, 'd MMM', { locale: fr })}</span>
                </div>
            );
        } catch (e) {
            toast.error("Erreur système lors de la mise à jour");
        }
    };

    const activeChantier = useMemo(() =>
        chantiers.find(c => c.id_chantier === activeId),
        [activeId, chantiers]);

    const stats = useMemo(() => ({
        enAttente: backlogChantiers.length,
        enCours: chantiers.filter(c => c.statut === 'actif').length,
    }), [backlogChantiers, chantiers]);


    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] gap-6 max-w-[1920px] mx-auto">

                {/* Header */}
                <div className="flex flex-col gap-4 pb-6 border-b-2 border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Planification Opérationnelle</h1>
                            <p className="text-slate-600 text-sm mt-1 hidden sm:block">Organisez vos chantiers et visualisez les durées</p>
                        </div>

                        {/* Bouton toggle sidebar mobile */}
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="lg:hidden px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" />
                            {stats.enAttente}
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                        {/* Stats - visible sur toutes tailles */}
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl flex items-center gap-2 shadow-sm flex-shrink-0">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                                <span className="text-xs sm:text-sm font-bold text-amber-800">{stats.enAttente} en attente</span>
                            </div>
                            <div className="px-3 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-xl flex items-center gap-2 shadow-sm flex-shrink-0">
                                <TrendingUp className="w-4 h-4 text-emerald-700" />
                                <span className="text-xs sm:text-sm font-bold text-emerald-800">{stats.enCours} actifs</span>
                            </div>
                        </div>

                        {/* Navigation mois */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-white border-2 border-slate-300 rounded-xl p-1 shadow-md">
                                <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 hover:text-slate-900">
                                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <div className="px-3 sm:px-6 font-bold text-slate-800 min-w-[120px] sm:min-w-[160px] text-center capitalize text-sm sm:text-lg">
                                    {format(currentDate, 'MMMM yyyy', { locale: fr })}
                                </div>
                                <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700 hover:text-slate-900">
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                            <button onClick={() => setCurrentDate(new Date())} className="hidden sm:block px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl text-sm font-bold hover:from-slate-700 hover:to-slate-800 shadow-lg transition-all hover:shadow-xl">
                                Aujourd'hui
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 gap-6 overflow-hidden relative">

                    {/* Backdrop mobile */}
                    {showSidebar && (
                        <div
                            className="lg:hidden fixed inset-0 bg-black/50 z-40"
                            onClick={() => setShowSidebar(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <div className={cn(
                        "w-80 sm:w-96 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl text-slate-50 border-2 border-slate-700 overflow-y-auto",
                        "lg:relative lg:translate-x-0",
                        "fixed top-0 left-0 bottom-0 z-50 transition-transform duration-300",
                        showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    )}>
                        <div className="p-6 border-b-2 border-slate-700 bg-slate-900/50 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse"></div>
                                    En Instance
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-800 text-slate-200 text-sm font-bold px-3 py-1.5 rounded-lg border-2 border-slate-700 shadow-inner">
                                        {backlogChantiers.length}
                                    </span>
                                    {/* Bouton fermer mobile */}
                                    <button
                                        onClick={() => setShowSidebar(false)}
                                        className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">Glissez vers le calendrier pour planifier</p>
                        </div>
                        <SidebarDroppable>
                            {backlogChantiers.map(chantier => (
                                <DraggableChantier key={chantier.id_chantier} chantier={chantier} onEdit={setEditingChantier} />
                            ))}
                        </SidebarDroppable>
                    </div>

                    <div id="calendar-view" className="flex-1 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col min-w-0">
                        <div className="flex-1 overflow-auto bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                            <div className="grid grid-cols-7 bg-slate-200 gap-px">
                                {calendarDays.map((day, dayIndex) => {
                                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                                    const dayStr = format(day, 'yyyy-MM-dd');

                                    const overlappingChantiers = activeChantiers.list.filter(c => {
                                        const isWeekendDay = isWeekend(day);
                                        return !isWeekendDay && dayStr >= c.date_debut && dayStr <= c.date_fin;
                                    }).sort((a, b) => activeChantiers.lanes[a.id_chantier] - activeChantiers.lanes[b.id_chantier]);

                                    return (
                                        <div
                                            key={dayStr}
                                            className={cn(
                                                "relative transition-all duration-200",
                                                !isCurrentMonth && "opacity-40",
                                                "hover:z-30" // Elevation on hover to ensure tooltip won't be cut by neighboring cell
                                            )}
                                        >
                                            <CalendarDay
                                                date={day}
                                                isToday={isSameDay(day, new Date())}
                                                isWeekendDay={isWeekend(day)}
                                            >
                                                <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none z-10">
                                                    {overlappingChantiers.map((chantier) => {
                                                        const isStart = chantier.date_debut === dayStr;
                                                        const start = parseISO(chantier.date_debut);
                                                        const end = parseISO(chantier.date_fin);
                                                        const workingDaysCount = countWorkingDays(start, end);
                                                        const lane = activeChantiers.lanes[chantier.id_chantier];

                                                        return (
                                                            <div
                                                                key={chantier.id_chantier}
                                                                className="pointer-events-auto h-12 w-full absolute left-0 right-0 px-0.5"
                                                                style={{ top: `${lane * 52}px` }}
                                                            >
                                                                <ChantierTimelineBar
                                                                    chantier={chantier}
                                                                    isStart={isStart}
                                                                    isEnd={chantier.date_fin === dayStr}
                                                                    totalDays={workingDaysCount}
                                                                    affectations={affectations}
                                                                    monteurs={monteurs}
                                                                    lignesCouts={lignesCouts}
                                                                    onEdit={setEditingChantier}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CalendarDay>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay dropAnimation={{
                duration: 300,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
                {activeChantier ? (
                    <div className="z-50 shadow-2xl">
                        <DraggableChantier chantier={activeChantier} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>

            {/* EDIT MODAL */}
            {editingChantier && (
                <DateEditModal
                    isOpen={!!editingChantier}
                    chantier={editingChantier}
                    onClose={() => setEditingChantier(null)}
                    onSave={handleSaveDates}
                />
            )}
        </DndContext>
    );
};

export default Planning;
