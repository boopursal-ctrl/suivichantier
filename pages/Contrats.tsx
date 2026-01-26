import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Search, Filter, Calendar, User, Building2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Contrat } from '../types';
import { getAllContrats, getContratsByMonteur, getContratsByChantier, clotureContrat } from '../services/contratService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Contrats = () => {
    const { user } = useAuth();
    const [contrats, setContrats] = useState<Contrat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'clos' | 'suspendu'>('tous');
    const [selectedContrat, setSelectedContrat] = useState<Contrat | null>(null);
    const [showClotureModal, setShowClotureModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [motifCloture, setMotifCloture] = useState('');

    useEffect(() => {
        loadContrats();
    }, []);

    const loadContrats = async () => {
        setLoading(true);
        try {
            const data = await getAllContrats();
            setContrats(data);
        } catch (error) {
            console.error('Erreur chargement contrats:', error);
            toast.error('Erreur lors du chargement des contrats');
        } finally {
            setLoading(false);
        }
    };

    const contratsFiltres = useMemo(() => {
        return contrats.filter(c => {
            const matchSearch =
                c.nom_monteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.ref_chantier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.matricule.toString().includes(searchTerm);

            const matchStatut = filterStatut === 'tous' || c.statut === filterStatut;

            return matchSearch && matchStatut;
        });
    }, [contrats, searchTerm, filterStatut]);

    const stats = useMemo(() => ({
        total: contrats.length,
        actifs: contrats.filter(c => c.statut === 'actif').length,
        clos: contrats.filter(c => c.statut === 'clos').length,
        suspendus: contrats.filter(c => c.statut === 'suspendu').length
    }), [contrats]);

    const handleClotureContrat = async () => {
        if (!selectedContrat || !motifCloture.trim()) {
            toast.error('Veuillez saisir un motif de clôture');
            return;
        }

        try {
            const success = await clotureContrat(
                selectedContrat.id_contrat,
                new Date().toISOString().split('T')[0],
                motifCloture,
                user?.email
            );

            if (success) {
                toast.success('Contrat clôturé avec succès');
                setShowClotureModal(false);
                setSelectedContrat(null);
                setMotifCloture('');
                loadContrats();
            } else {
                toast.error('Erreur lors de la clôture du contrat');
            }
        } catch (error) {
            console.error('Erreur clôture:', error);
            toast.error('Erreur lors de la clôture du contrat');
        }
    };

    const getStatutBadge = (statut: string) => {
        const styles = {
            actif: 'bg-emerald-100 text-emerald-700 border-emerald-300',
            clos: 'bg-slate-100 text-slate-700 border-slate-300',
            suspendu: 'bg-amber-100 text-amber-700 border-amber-300'
        };

        const icons = {
            actif: <CheckCircle2 className="w-3 h-3" />,
            clos: <XCircle className="w-3 h-3" />,
            suspendu: <Clock className="w-3 h-3" />
        };

        return (
            <span className={cn('px-2 py-1 rounded-lg text-xs font-bold border-2 flex items-center gap-1', styles[statut as keyof typeof styles])}>
                {icons[statut as keyof typeof icons]}
                {statut.toUpperCase()}
            </span>
        );
    };


    const handleDownloadPDF = (contrat: Contrat) => {
        const doc = new jsPDF();

        // Titre
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CONTRAT DE TRAVAIL', 105, 15, { align: 'center' });

        // Intro
        let y = 25;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Monsieur,", 20, y);
        y += 3;
        doc.text("Nous avons le plaisir de vous préciser, ci-après, les conditions de votre recrutement au sein de notre société, et pour lesquelles nous vous demandons de nous marquer votre accord, en signant le double du présent contrat avec la mention manuscrite \"lu et approuvé\".", 20, y, { maxWidth: 170, align: 'justify' });

        // Article 1
        y += 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("ARTICLE 1 : ETAT CIVIL AU MOMENT DE L'EMBAUCHE ET DECLARATION DE PRINCIPE", 20, y);

        y += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("Nom", 20, y);
        doc.text(":", 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(contrat.nom_monteur.split(' ')[0] || '', 43, y);

        doc.setFont('helvetica', 'bold');
        doc.text("Prénom", 90, y);
        doc.text(":", 105, y);
        doc.setFont('helvetica', 'normal');
        doc.text(contrat.nom_monteur.split(' ').slice(1).join(' ') || '', 108, y);

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text("Date de naissance", 20, y);
        doc.text(":", 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(contrat.date_naissance ? format(new Date(contrat.date_naissance), 'dd/MM/yyyy') : '', 43, y);

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text("Nationalité", 20, y);
        doc.text(":", 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(contrat.nationalite || 'MAROCAINE', 43, y);

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text("Adresse", 20, y);
        doc.text(":", 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(contrat.adresse || '', 43, y);

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text("Ville", 20, y);
        doc.text(":", 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(contrat.ville_residence || '', 43, y);

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text("N° C.I.N", 20, y);
        doc.text(":", 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(contrat.cin || '', 43, y);

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text("Matricule", 20, y);
        doc.text(":", 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(contrat.matricule), 43, y);

        doc.setFont('helvetica', 'bold');
        doc.text("N° C.N.S.S", 90, y);
        doc.text(":", 105, y);

        y += 6;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text("Vous vous engagez à porter immédiatement à la connaissance de la société, tout changement qui pourrait affecter votre situation familiale ou le lieu de votre domicile. A défaut, toute notification à la dernière adresse figurant à votre dossier est réputée régulière et opposable à vous-même.", 20, y, { maxWidth: 170, align: 'justify' });

        y += 8;
        doc.text("La relation de travail que réglemente le présent contrat se base spécialement sur la confiance réciproque des parties, lesquelles soumettent l'exercice de leurs droits et obligations respectifs aux règles et exigences de la bonne foi, permettant au salarié d'assurer avec dévouement et savoir professionnel les fonctions qui lui seront dévolues par la société.", 20, y, { maxWidth: 170, align: 'justify' });

        // Article 2
        y += 12;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 2 : DATE D'EMBAUCHE", 20, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Date début chantier', 'Date de fin de chantier', 'Nom du chantier']],
            body: [[
                format(new Date(contrat.date_debut), 'dd/MM/yyyy'),
                contrat.date_fin ? format(new Date(contrat.date_fin), 'dd/MM/yyyy') : '………………….. Le …./…./….',
                contrat.ref_chantier
            ]],
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, lineColor: 0, fontStyle: 'bold', halign: 'center', fontSize: 8 },
            styles: { textColor: 0, lineWidth: 0.5, lineColor: 0, halign: 'center', fontSize: 8, cellPadding: 2 },
        });

        y = (doc as any).lastAutoTable.finalY + 6;

        // Article 3
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 3 : EMPLOI ET QUALIFICATION", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Vous êtes embauché(e) en qualité de ${contrat.role_monteur === 'CHEF_CHANTIER' ? 'Chef de Chantier' : 'Monteur / Manutentionnaire'}.`, 20, y, { maxWidth: 170, align: 'justify' });
        y += 3;
        doc.text("Votre contrat à durée déterminée pourrait être reconduit, dans le cadre de nos activités et de leurs expansions, en fonction de vos aptitudes et de votre engagement personnel. Vous acceptez d'ores et déjà et sans réserve, une modification de la fonction que nous pourrions décider en rapport avec la réalité de vos aptitudes.", 20, y, { maxWidth: 170, align: 'justify' });

        y += 10;

        // Article 4
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 4 : DUREE DU CONTRAT", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Le présent contrat est conclu pour toute la durée du chantier Susmentionné sans période d'essai.", 20, y, { maxWidth: 170, align: 'justify' });

        y += 7;

        // Article 5
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 5 : LIEU DE TRAVAIL ET MOBILITE GEOGRAPHIQUE", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("En raison de la nature de notre activité, vous acceptez d'ores et déjà toute mutation provisoire ou définitive chez nos clients pour lesquels notre société 3F industrie détiendrait des chantiers de travail qu'elles soient à Casablanca ou toute autre ville du Maroc.", 20, y, { maxWidth: 170, align: 'justify' });

        y += 10;

        // Article 6
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 6 : HORAIRES DE TRAVAIL", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Vos horaires de travail seront conformes aux nombres d'heures fixés par le code de travail.", 20, y, { maxWidth: 170, align: 'justify' });

        y += 7;

        // Article 7
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 7 : CONGES PAYES", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Conformément à la législation en vigueur.", 20, y);

        y += 7;

        // Article 8
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 8 : PONCTUALITE ET ASSIDUITE", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Nous convenons par le présent contrat que vous serez tout le temps ponctuel et assidu à votre poste de travail, cette ponctualité et assiduité ne souffrant d'aucune exception, ni de faille.", 20, y, { maxWidth: 170, align: 'justify' });

        y += 10;

        // Article 9 (Salaire)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 9 : APPOINTEMENTS", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`La rémunération citée ci-après, s'entend pour la bonne exécution des tâches qui vous seront confiées et a été calculée sur une base journalière, à savoir un montant de ${contrat.salaire_journalier} DH / Jours.`, 20, y, { maxWidth: 170, align: 'justify' });

        y += 10;

        // Article 11
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ARTICLE 11 : MATERIEL MIS A DISPOSITION", 20, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text("Dans le cadre de l'exercice de vos fonctions au sein de la société, il vous sera remis du matériel dont vous serez entièrement responsable. En cas de perte vous vous engagez, à travers un dépôt de garantie non déboursable, à le rembourser à la société. La valeur de ce matériel vous sera communiquée dans une note de service.", 20, y, { maxWidth: 170, align: 'justify' });

        // Footer Signatures
        y += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("LA DIRECTION", 20, y);
        doc.text(`Fait à Casablanca, le ${format(new Date(contrat.date_debut), 'dd/MM/yyyy')}`, 120, y);

        doc.save(`Contrat_${contrat.nom_monteur}_${contrat.ref_chantier}.pdf`);
        toast.success("Contrat téléchargé");
    };


    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] gap-6 max-w-[1920px] mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4 pb-6 border-b-2 border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <FileText className="w-8 h-8 text-indigo-600" />
                            Gestion des Contrats
                        </h1>
                        <p className="text-slate-600 text-sm mt-1">Contrats des monteurs par chantier</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Contrats</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border-2 border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Actifs</p>
                                <p className="text-2xl font-bold text-emerald-700">{stats.actifs}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Clôturés</p>
                                <p className="text-2xl font-bold text-slate-700">{stats.clos}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border-2 border-amber-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Suspendus</p>
                                <p className="text-2xl font-bold text-amber-700">{stats.suspendus}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par monteur, chantier, client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border-2 border-slate-300 rounded-xl focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <select
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value as any)}
                        className="px-4 py-2 border-2 border-slate-300 rounded-xl font-bold focus:border-indigo-500 outline-none"
                    >
                        <option value="tous">Tous les statuts</option>
                        <option value="actif">Actifs</option>
                        <option value="clos">Clôturés</option>
                        <option value="suspendu">Suspendus</option>
                    </select>
                </div>
            </div>

            {/* Liste des contrats */}
            <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-xl border-2 border-slate-200">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-slate-600">Chargement des contrats...</p>
                        </div>
                    </div>
                ) : contratsFiltres.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 mb-2">Aucun contrat trouvé</h3>
                            <p className="text-slate-500">Aucun contrat ne correspond à vos critères de recherche</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max">
                            <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[180px]">Monteur</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[140px]">Chantier</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[120px]">Client</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[80px]">Type</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[90px]">Rôle</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[100px] whitespace-nowrap">Salaire/J</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[110px]">Début</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[110px]">Fin</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[100px]">Statut</th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[180px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {contratsFiltres.map((contrat) => (
                                    <tr key={contrat.id_contrat} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="font-bold text-slate-900">{contrat.nom_monteur}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{contrat.matricule}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-700">{contrat.ref_chantier}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-slate-700">{contrat.nom_client}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{contrat.type_contrat}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-slate-700">{contrat.role_monteur === 'CHEF_CHANTIER' ? 'Chef' : 'Ouvrier'}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="font-bold text-slate-900 whitespace-nowrap">{contrat.salaire_journalier} DH</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1 text-sm text-slate-600">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(contrat.date_debut), 'dd/MM/yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {contrat.date_fin ? (
                                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(contrat.date_fin), 'dd/MM/yyyy')}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            {getStatutBadge(contrat.statut)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDownloadPDF(contrat)}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    title="Télécharger le contrat"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                {contrat.statut === 'actif' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedContrat(contrat);
                                                            setShowClotureModal(true);
                                                        }}
                                                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                                                    >
                                                        Clôturer
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSelectedContrat(contrat);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors"
                                                >
                                                    Détails
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Clôture */}
            {showClotureModal && selectedContrat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Clôturer le contrat</h3>

                        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">Monteur</p>
                            <p className="font-bold text-slate-900">{selectedContrat.nom_monteur}</p>
                            <p className="text-sm text-slate-600 mt-2 mb-1">Chantier</p>
                            <p className="font-bold text-slate-900">{selectedContrat.ref_chantier}</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Motif de clôture *
                            </label>
                            <textarea
                                value={motifCloture}
                                onChange={(e) => setMotifCloture(e.target.value)}
                                placeholder="Ex: Fin de chantier, Réaffectation, Démission..."
                                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-500 outline-none resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowClotureModal(false);
                                    setSelectedContrat(null);
                                    setMotifCloture('');
                                }}
                                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleClotureContrat}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                            >
                                Clôturer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Détails */}
            {showDetailsModal && selectedContrat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1">Détails du Contrat</h3>
                                    <p className="text-indigo-100 text-sm">Informations complètes</p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Informations du monteur */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-600" />
                                    Informations du Monteur
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Nom complet</p>
                                        <p className="font-bold text-slate-900">{selectedContrat.nom_monteur}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Matricule</p>
                                        <p className="font-bold text-slate-900 font-mono">{selectedContrat.matricule}</p>
                                    </div>
                                    {selectedContrat.cin && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">CIN</p>
                                            <p className="font-bold text-slate-900">{selectedContrat.cin}</p>
                                        </div>
                                    )}
                                    {selectedContrat.date_naissance && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Date de naissance</p>
                                            <p className="font-bold text-slate-900">{format(new Date(selectedContrat.date_naissance), 'dd/MM/yyyy', { locale: fr })}</p>
                                        </div>
                                    )}
                                    {selectedContrat.adresse && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-slate-500 mb-1">Adresse</p>
                                            <p className="font-bold text-slate-900">{selectedContrat.adresse}</p>
                                        </div>
                                    )}
                                    {selectedContrat.ville_residence && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Ville</p>
                                            <p className="font-bold text-slate-900">{selectedContrat.ville_residence}</p>
                                        </div>
                                    )}
                                    {selectedContrat.nationalite && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Nationalité</p>
                                            <p className="font-bold text-slate-900">{selectedContrat.nationalite}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Informations du contrat */}
                            <div className="bg-blue-50 rounded-xl p-4">
                                <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Informations du Contrat
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Type de contrat</p>
                                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">
                                            {selectedContrat.type_contrat}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Rôle</p>
                                        <p className="font-bold text-slate-900">
                                            {selectedContrat.role_monteur === 'CHEF_CHANTIER' ? 'Chef de Chantier' : 'Ouvrier'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Salaire journalier</p>
                                        <p className="font-bold text-slate-900 text-lg">{selectedContrat.salaire_journalier} DH</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Statut</p>
                                        {getStatutBadge(selectedContrat.statut)}
                                    </div>
                                </div>
                            </div>

                            {/* Informations du chantier */}
                            <div className="bg-emerald-50 rounded-xl p-4">
                                <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-emerald-600" />
                                    Informations du Chantier
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Référence chantier</p>
                                        <p className="font-bold text-slate-900">{selectedContrat.ref_chantier}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Client</p>
                                        <p className="font-bold text-slate-900">{selectedContrat.nom_client}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="bg-amber-50 rounded-xl p-4">
                                <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                    Période du Contrat
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Date de début</p>
                                        <p className="font-bold text-slate-900">{format(new Date(selectedContrat.date_debut), 'dd MMMM yyyy', { locale: fr })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Date de fin</p>
                                        <p className="font-bold text-slate-900">
                                            {selectedContrat.date_fin ? format(new Date(selectedContrat.date_fin), 'dd MMMM yyyy', { locale: fr }) : 'En cours'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Métadonnées */}
                            {(selectedContrat.motif_cloture || selectedContrat.created_by || selectedContrat.closed_by) && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h4 className="text-lg font-bold text-slate-900 mb-3">Informations complémentaires</h4>
                                    <div className="space-y-3">
                                        {selectedContrat.created_by && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Créé par</p>
                                                <p className="font-medium text-slate-700">{selectedContrat.created_by}</p>
                                            </div>
                                        )}
                                        {selectedContrat.motif_cloture && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Motif de clôture</p>
                                                <p className="font-medium text-slate-700">{selectedContrat.motif_cloture}</p>
                                            </div>
                                        )}
                                        {selectedContrat.closed_by && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Clôturé par</p>
                                                <p className="font-medium text-slate-700">{selectedContrat.closed_by}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 p-6 rounded-b-2xl flex gap-3">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    handleDownloadPDF(selectedContrat);
                                    setShowDetailsModal(false);
                                }}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Télécharger PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contrats;
