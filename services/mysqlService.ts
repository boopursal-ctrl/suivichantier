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
                const result = JSON.parse(text);
                
                // On retourne TOUJOURS le résultat JSON, qu'il soit 'success' ou 'error'
                // Cela permet à l'application de lire `result.message` (ex. "Identifiants incorrects")
                if (result && result.status === "error" && action !== 'login') {
                    console.error(`❌ API Error [${action}]:`, result.message);
                }
                
                return result;
            } catch (e: any) {
                console.error("❌ Format JSON invalide. Réponse brute :", text);
                throw new Error("Erreur serveur : format invalide.");
            }
        } catch (error) {
            console.error("❌ MySQL API Error:", error);
            throw error;
        }
    }
};
