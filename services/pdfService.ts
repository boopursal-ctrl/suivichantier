import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MouvementStock, ArticleStock, Chantier } from '../types';

export const generateBonMouvement = async (
    mouvement: MouvementStock,
    article: ArticleStock,
    chantier?: Chantier
) => {
    // Debug Alert (Temporary)
    // alert("Génération du PDF commencée...");

    try {
        const doc = new jsPDF();

        const isSortie = mouvement.type === 'SORTIE';
        const typeLabel = isSortie ? 'BON DE SORTIE' : "BON D'ENTRÉE";
        const dateStr = new Date(mouvement.date).toLocaleDateString('fr-FR');
        const timeStr = new Date(mouvement.date).toLocaleTimeString('fr-FR', {
            hour: '2-digit', minute: '2-digit'
        });

        // --- LOGO ---
        // alert("Chargement du logo...");
        try {
            // Add timeout for logo loading
            const imgPromise = loadImage('/logo.png');
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout loading logo")), 2000)
            );

            // Race between image load and 2s timeout
            const img = await Promise.race([imgPromise, timeoutPromise]) as HTMLImageElement;

            const imgProps = doc.getImageProperties(img);
            const imgWidth = 30;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            doc.addImage(img, 'PNG', 15, 10, imgWidth, imgHeight);
        } catch (e: any) {
            console.warn("Could not load logo (skipped):", e);
            // alert("Logo ignoré (erreur ou timeout).");
            doc.setFontSize(10);
            doc.text("BTP LOGO", 15, 25);
        }

        // --- HEADER ---
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.setFont("helvetica", "bold");
        doc.text(typeLabel, 105, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`N° Mouvement: ${mouvement.id_mouvement}`, 105, 32, { align: 'center' });
        doc.text(`Date: ${dateStr} à ${timeStr}`, 105, 37, { align: 'center' });

        // Company Info
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("3Findustrie", 195, 15, { align: 'right' });
        doc.text("Casablanca, Maroc", 195, 20, { align: 'right' });
        doc.text("contact@3findustrie.com", 195, 25, { align: 'right' });

        // --- DETAILS ---
        const details = [
            ["Référence Article", article.reference],
            ["Désignation", article.nom],
            ["Catégorie", article.categorie],
            ["Quantité", `${mouvement.quantite} ${article.unite}`],
            ["Emplacement Stock", article.emplacement || "-"],
        ];

        if (isSortie && chantier) {
            details.push(["Destination (Chantier)", `${chantier.ref_chantier} - ${chantier.nom_client}`]);
            if (chantier.adresse) details.push(["Adresse Chantier", chantier.adresse]);
        } else {
            details.push(["Motif / Source", mouvement.motif || "-"]);
        }

        // alert("Construction du tableau...");
        autoTable(doc, {
            startY: 50,
            head: [['Détail', 'Information']],
            body: details,
            theme: 'grid',
            headStyles: {
                fillColor: isSortie ? [185, 28, 28] : [22, 163, 74],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 70, fillColor: [245, 245, 245] },
                1: { cellWidth: 'auto' }
            },
            styles: {
                fontSize: 11,
                cellPadding: 6
            }
        });

        // --- SIGNATURES ---
        let finalY = 120;
        try {
            // @ts-ignore
            finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120;
        } catch (e) {
            console.warn(e);
        }

        doc.setTextColor(0);
        doc.setFontSize(11);
        doc.text("Le Magasinier", 40, finalY + 20, { align: 'center' });
        doc.text("Le Réceptionnaire", 160, finalY + 20, { align: 'center' });

        doc.setDrawColor(200);
        doc.rect(20, finalY + 25, 60, 30);
        doc.rect(130, finalY + 25, 60, 30);

        // --- FOOTER ---
        try {
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} sur ${pageCount} - Généré le ${new Date().toLocaleDateString()}`, 105, 290, { align: "center" });
            }
        } catch (e) { }

        // SAVE
        console.log("Sauvegarde du fichier...");
        // alert("Téléchargement du fichier...");
        doc.save(`${typeLabel.replace(/ /g, '_')}_${mouvement.id_mouvement}.pdf`);

    } catch (globalError: any) {
        console.error("FATAL PDF ERROR:", globalError);
        alert("Erreur Fatale PDF: " + globalError.message);
        throw globalError;
    }
};

// Helper to load image
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error("Image load failed"));
    });
}
