// js/db.js

// On importe notre client Supabase
import { supabaseClient } from './supabaseClient.js';

// L'état local de l'application. 
// Il sera rempli par Supabase au démarrage.
export let db = {
    transactions: [],
    stock: [],
    settings: {
        id: null, // On va stocker l'ID de la ligne de settings ici
        portefeuilles: [],
        categories: []
    }
};

// L'ancienne fonction loadData est remplacée par celle-ci
export const loadData = async () => {
    try {
        // On lance 3 requêtes en parallèle pour charger les données
        const [transactionsRes, stockRes, settingsRes] = await Promise.all([
            supabaseClient.from('transactions').select('*'), // 1. Charger les transactions
            supabaseClient.from('stock').select('*'),         // 2. Charger le stock
            supabaseClient.from('settings').select('*').limit(1) // 3. Charger la ligne de paramètres
        ]);

        // On vérifie s'il y a des erreurs
        if (transactionsRes.error) throw transactionsRes.error;
        if (stockRes.error) throw stockRes.error;
        if (settingsRes.error) throw settingsRes.error;

        // Tout va bien, on remplit notre 'db' locale
        db.transactions = transactionsRes.data;
        db.stock = stockRes.data;

        // On charge les paramètres (settings)
        if (settingsRes.data && settingsRes.data.length > 0) {
            // === CAS 1: Les paramètres existent ===
            const settingsData = settingsRes.data[0];
            db.settings.id = settingsData.id;
            db.settings.portefeuilles = settingsData.portefeuilles;
            db.settings.categories = settingsData.categories;
        
        } else {
            // === CAS 2: La table 'settings' est vide ===
            console.warn('Aucun paramètre trouvé. Création des paramètres par défaut...');
            
            // On définit les valeurs par défaut
            const defaultPortefeuilles = ['Caisse (Espèces)', 'Wave', 'Orange Money', 'Autre'];
            const defaultCategories = ['Transport', 'Achat de stock', 'Loyer', 'Autre'];

            // On les insère dans Supabase
            const { data: newSettings, error: insertError } = await supabaseClient
                .from('settings')
                .insert({
                    portefeuilles: defaultPortefeuilles,
                    categories: defaultCategories
                    // l'id (uuid) est généré par défaut par la BDD
                })
                .select() // On demande à Supabase de nous renvoyer la ligne créée
                .single(); // On sait qu'il n'y en a qu'une

            if (insertError) throw insertError;

            // On met à jour notre db locale avec les nouvelles données
            db.settings.id = newSettings.id;
            db.settings.portefeuilles = newSettings.portefeuilles;
            db.settings.categories = newSettings.categories;
        }

        console.log('Données chargées depuis Supabase !', db);

    } catch (error) {
        console.error("Erreur lors du chargement des données depuis Supabase:", error);
        alert("Impossible de charger les données. Vérifiez votre connexion ou contactez l'administrateur.");
    }
};

// Les anciennes fonctions saveData et updateDB (pour localStorage) sont supprimées.