// Exemple d'intégration de la gestion automatique des contrats
// dans la page d'affectation des monteurs

import { createContratAutomatique } from '../services/contratService';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';

/**
 * Exemple 1 : Affectation d'un monteur à un chantier
 * avec création automatique du contrat
 */
export const affecterMonteurAvecContrat = async (
    monteur: Monteur,
    chantier: Chantier,
    user: User,
    addAffectation: (a: AffectationMonteur) => Promise<void>
) => {
    try {
        // 1. Créer l'affectation
        const nouvelleAffectation: AffectationMonteur = {
            id_affectation: crypto.randomUUID(),
            id_chantier: chantier.id_chantier,
            matricule: monteur.matricule,
            nom_monteur: monteur.nom_monteur,
            salaire_jour: monteur.salaire_jour,
            zone_travail: chantier.ville_code,
            date_entree: new Date().toISOString().split('T')[0],
            jours_arret: 0
        };

        await addAffectation(nouvelleAffectation);

        // 2. Créer automatiquement le contrat
        const contrat = await createContratAutomatique(
            monteur,
            chantier,
            user.email
        );

        if (contrat) {
            toast.success(
                <div>
                    <p className="font-bold">✅ Affectation réussie</p>
                    <p className="text-xs mt-1">
                        Contrat généré automatiquement pour {monteur.nom_monteur}
                    </p>
                </div>
            );
        } else {
            toast.warning(
                'Affectation créée mais erreur lors de la génération du contrat'
            );
        }

    } catch (error) {
        console.error('Erreur affectation:', error);
        toast.error('Erreur lors de l\'affectation du monteur');
        throw error;
    }
};

/**
 * Exemple 2 : Composant React pour afficher le contrat actif d'un monteur
 */
export const ContratActifBadge = ({ matricule }: { matricule: number }) => {
    const [contratActif, setContratActif] = useState<Contrat | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContrat = async () => {
            const contrat = await getContratActif(matricule);
            setContratActif(contrat);
            setLoading(false);
        };
        loadContrat();
    }, [matricule]);

    if (loading) {
        return <span className="text-xs text-slate-400">Chargement...</span>;
    }

    if (!contratActif) {
        return (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                Aucun contrat actif
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                Contrat actif
            </span>
            <span className="text-xs text-slate-600">
                {contratActif.ref_chantier}
            </span>
        </div>
    );
};

/**
 * Exemple 3 : Hook personnalisé pour gérer les contrats d'un monteur
 */
export const useContratsMonteir = (matricule: number) => {
    const [contrats, setContrats] = useState<Contrat[]>([]);
    const [contratActif, setContratActif] = useState<Contrat | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContrats = async () => {
            setLoading(true);
            try {
                const [allContrats, actif] = await Promise.all([
                    getContratsByMonteur(matricule),
                    getContratActif(matricule)
                ]);
                setContrats(allContrats);
                setContratActif(actif);
            } catch (error) {
                console.error('Erreur chargement contrats:', error);
            } finally {
                setLoading(false);
            }
        };

        loadContrats();
    }, [matricule]);

    return {
        contrats,
        contratActif,
        loading,
        hasContratActif: contratActif !== null,
        nombreContrats: contrats.length
    };
};

/**
 * Exemple 4 : Intégration dans un formulaire d'affectation
 */
export const FormulaireAffectation = () => {
    const { user } = useAuth();
    const { monteurs, chantiers, addAffectation } = useData();
    const [monteurSelectionne, setMonteurSelectionne] = useState<Monteur | null>(null);
    const [chantierSelectionne, setChantierSelectionne] = useState<Chantier | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Charger le contrat actif du monteur sélectionné
    const { contratActif, loading: loadingContrat } = useContratsMonteur(
        monteurSelectionne?.matricule || 0
    );

    const handleAffecter = async () => {
        if (!monteurSelectionne || !chantierSelectionne || !user) return;

        try {
            await affecterMonteurAvecContrat(
                monteurSelectionne,
                chantierSelectionne,
                user,
                addAffectation
            );

            setShowConfirmation(false);
            setMonteurSelectionne(null);
            setChantierSelectionne(null);
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Affecter un Monteur</h2>

            {/* Sélection du monteur */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Monteur</label>
                <select
                    onChange={(e) => {
                        const m = monteurs.find(m => m.matricule === Number(e.target.value));
                        setMonteurSelectionne(m || null);
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                >
                    <option value="">Sélectionner un monteur</option>
                    {monteurs.map(m => (
                        <option key={m.matricule} value={m.matricule}>
                            {m.nom_monteur} ({m.matricule})
                        </option>
                    ))}
                </select>
            </div>

            {/* Affichage du contrat actif */}
            {monteurSelectionne && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    {loadingContrat ? (
                        <p className="text-sm text-slate-600">Vérification du contrat...</p>
                    ) : contratActif ? (
                        <div>
                            <p className="text-sm font-bold text-blue-900 mb-1">
                                ⚠️ Contrat actif détecté
                            </p>
                            <p className="text-xs text-blue-700">
                                Chantier actuel : {contratActif.ref_chantier}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                Ce contrat sera automatiquement clôturé lors de la nouvelle affectation.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-green-700">
                            ✅ Aucun contrat actif - Prêt pour affectation
                        </p>
                    )}
                </div>
            )}

            {/* Sélection du chantier */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Chantier</label>
                <select
                    onChange={(e) => {
                        const c = chantiers.find(c => c.id_chantier === e.target.value);
                        setChantierSelectionne(c || null);
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                >
                    <option value="">Sélectionner un chantier</option>
                    {chantiers.filter(c => c.statut === 'actif').map(c => (
                        <option key={c.id_chantier} value={c.id_chantier}>
                            {c.ref_chantier} - {c.nom_client}
                        </option>
                    ))}
                </select>
            </div>

            {/* Bouton d'affectation */}
            <button
                onClick={() => setShowConfirmation(true)}
                disabled={!monteurSelectionne || !chantierSelectionne}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
                Affecter et Générer le Contrat
            </button>

            {/* Modal de confirmation */}
            {showConfirmation && monteurSelectionne && chantierSelectionne && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md">
                        <h3 className="text-lg font-bold mb-4">Confirmer l'affectation</h3>

                        <div className="mb-4 space-y-2">
                            <p className="text-sm">
                                <span className="font-bold">Monteur :</span> {monteurSelectionne.nom_monteur}
                            </p>
                            <p className="text-sm">
                                <span className="font-bold">Chantier :</span> {chantierSelectionne.ref_chantier}
                            </p>

                            {contratActif && (
                                <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                                    <p className="text-xs font-bold text-amber-900 mb-1">
                                        Actions automatiques :
                                    </p>
                                    <ul className="text-xs text-amber-800 space-y-1">
                                        <li>• Clôture du contrat actuel ({contratActif.ref_chantier})</li>
                                        <li>• Création d'un nouveau contrat ({chantierSelectionne.ref_chantier})</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="flex-1 px-4 py-2 bg-slate-200 rounded-lg font-bold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAffecter}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
