// Service de communication avec l'API MySQL/PHP (Heberjahiz)
const API_URL = "https://3findustrie.com/api/connect.php"; // À adapter selon l'URL réelle sur votre serveur

export const mysqlService = {
    async query(action: string, params: Record<string, string> = {}, data: any = null) {
        const url = new URL(API_URL);
        url.searchParams.append("action", action);
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

        const options: RequestInit = {
            method: data ? "POST" : "GET",
            headers: {
                "Content-Type": "application/json",
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url.toString(), options);
            const text = await response.text();

            if (response.status === 500) {
                console.error("❌ Erreur Serveur (500). Réponse :", text);
            }

            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("❌ Format JSON invalide. Réponse brute :", text);
                throw new Error("Le serveur n'a pas renvoyé de JSON valide.");
            }
        } catch (error) {
            console.error("❌ MySQL API Error:", error);
            throw error;
        }
    }
};
