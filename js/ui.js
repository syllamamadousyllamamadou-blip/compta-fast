// js/ui.js

// --- IMPORTS ---
import { db } from './db.js';
import { formatCurrency, formatCurrencyPDF } from './utils.js';
// On importe la date depuis main.js (nécessaire pour le dashboard)
import { currentDisplayDate } from './main.js'; 
// On importe les éléments DOM spécifiques que ce fichier va modifier
import {
    journalList,
    creancesList,
    dettesList,
    portefeuillesSettingsList,
    categoriesSettingsList,
    stockList,
    dashboardStockValue,
    dashboardPeriod,
    dashboardBenefice,
    dashboardPortefeuilles,
    dashboardCreances,
    dashboardDettes
} from './dom.js';

// --- FONCTIONS DE RENDU ---
export const renderJournal = () => {
    journalList.innerHTML = '';
    if (db.transactions.length === 0) {
        journalList.innerHTML = `<p class="text-center text-gray-500">Aucune opération pour le moment.</p>`;
        return;
    }
    const sorted = [...db.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(tx => {
        const isVente = tx.type === 'vente';
        const amountClass = isVente ? 'text-green-600' : 'text-red-600';
        const sign = isVente ? '+' : '-';
        const isImpaye = tx.statut === 'Impayé (à crédit)';
        const portefeuilleDisplay = tx.portefeuille_details || tx.portefeuille;

        const element = document.createElement('div');
        element.className = 'flex justify-between items-center bg-gray-50 p-3 rounded-md';
        
        let descHtml = `<p class="font-medium">${tx.description || 'Opération'}</p>`;
        let subText = '';
        if (isVente) {
            subText = isImpaye ? `Client: <span class="font-semibold">${tx.client || 'N/A'}</span> (à crédit)` : `Reçu sur <span class="font-semibold">${portefeuilleDisplay}</span>`;
        } else {
            const categorieDisplay = tx.categorie_details || tx.categorie;
            subText = isImpaye ? `Fournisseur: <span class="font-semibold">${tx.fournisseur || 'N/A'}</span> (à crédit)` : `Payé depuis <span class="font-semibold">${portefeuilleDisplay}</span> | Cat: ${categorieDisplay}`;
        }
        descHtml += `<p class="text-xs ${isImpaye ? 'text-orange-500' : 'text-gray-500'}">${subText}</p>`;
        
        // =================== MODIFICATION ===================
        // Ajout du bouton Supprimer
        element.innerHTML = `
            <div>${descHtml}</div>
            <div class="text-right">
                <p class="font-bold ${amountClass}">${sign} ${formatCurrency(tx.montant)}</p>
                <div class="mt-1">
                    <button class="edit-tx-btn text-xs text-blue-500" data-id="${tx.id}"><i class="fas fa-pen mr-1"></i>Modifier</button>
                    <button class="delete-tx-btn text-xs text-red-500 ml-2" data-id="${tx.id}"><i class="fas fa-trash mr-1"></i>Suppr.</button>
                </div>
            </div>`;
        // ================= FIN MODIFICATION =================
        journalList.appendChild(element);
    });
};

export const renderDettesPage = () => {
    creancesList.innerHTML = '';
    dettesList.innerHTML = '';
    const creances = db.transactions.filter(tx => tx.type === 'vente' && tx.statut === 'Impayé (à crédit)');
    const dettes = db.transactions.filter(tx => tx.type === 'depense' && tx.statut === 'Impayé (à crédit)');
    
    if (creances.length === 0) creancesList.innerHTML = '<p class="text-sm text-gray-500">Aucune créance client.</p>';
    creances.forEach(tx => {
        const telHtml = tx.client_tel ? `<p class="text-xs text-gray-500">${tx.client_tel}</p>` : '';
        creancesList.innerHTML += `<div class="flex justify-between items-center bg-green-50 p-3 rounded-md">
            <div>
                <p class="font-semibold">${tx.client || tx.description}</p>
                ${telHtml}
                <p class="text-xs text-gray-500">${new Date(tx.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <div class="flex items-center space-x-2"><span class="font-bold">${formatCurrency(tx.montant)}</span><button data-id="${tx.id}" class="paye-btn bg-green-500 text-white text-xs px-2 py-1 rounded-md">Payé</button></div>
        </div>`;
    });

    if (dettes.length === 0) dettesList.innerHTML = '<p class="text-sm text-gray-500">Aucune dette fournisseur.</p>';
    dettes.forEach(tx => {
        dettesList.innerHTML += `<div class="flex justify-between items-center bg-red-50 p-3 rounded-md">
            <div><p class="font-semibold">${tx.fournisseur || tx.description}</p><p class="text-xs text-gray-500">${new Date(tx.date).toLocaleDateString('fr-FR')}</p></div>
            <div class="flex items-center space-x-2"><span class="font-bold">${formatCurrency(tx.montant)}</span><button data-id="${tx.id}" class="rembourse-btn bg-red-500 text-white text-xs px-2 py-1 rounded-md">Remboursé</button></div>
        </div>`;
    });
};

export const renderParametres = () => {
    portefeuillesSettingsList.innerHTML = (db.settings.portefeuilles || []).map(p => `
        <div class="flex justify-between items-center bg-gray-50 p-2 rounded-md">
            <span>${p}</span>
            ${p !== 'Autre' ? `
            <div>
                <button class="edit-portefeuille-btn text-blue-500 px-2" data-name="${p}"><i class="fas fa-pen"></i></button>
                <button class="delete-portefeuille-btn text-red-500 px-2" data-name="${p}"><i class="fas fa-trash"></i></button>
            </div>` : ''}
        </div>
    `).join('');
    categoriesSettingsList.innerHTML = (db.settings.categories || []).map(c => `
        <div class="flex justify-between items-center bg-gray-50 p-2 rounded-md">
            <span>${c}</span>
            ${c !== 'Autre' ? `
            <div>
                <button class="edit-categorie-btn text-blue-500 px-2" data-name="${c}"><i class="fas fa-pen"></i></button>
                <button class="delete-categorie-btn text-red-500 px-2" data-name="${c}"><i class="fas fa-trash"></i></button>
            </div>` : ''}
        </div>
    `).join('');
};

export const renderStockPage = () => {
    stockList.innerHTML = '';
    if (db.stock.length === 0) {
        stockList.innerHTML = `<p class="text-center text-gray-500">Aucun produit en stock.</p>`;
        return;
    }
    db.stock.forEach(product => {
        const stockValue = product.quantity * product.cost;
        stockList.innerHTML += `
        <div class="bg-gray-50 p-3 rounded-md">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-semibold">${product.name}</p>
                    <p class="text-xs text-gray-500">Coût: ${formatCurrency(product.cost)} | Valeur: ${formatCurrency(stockValue)}</p>
                </div>
                <p class="font-bold text-lg">${product.quantity} <span class="text-sm font-normal">unités</span></p>
            </div>
             <div class="text-right mt-1">
                <button class="edit-product-btn text-xs text-blue-500" data-id="${product.id}"><i class="fas fa-pen mr-1"></i>Modifier</button>
                <button class="delete-product-btn text-xs text-red-500 ml-2" data-id="${product.id}"><i class="fas fa-trash mr-1"></i>Supprimer</button>
            </div>
        </div>`;
    });
};

export const renderDashboard = () => {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    dashboardPeriod.textContent = currentDisplayDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const transactionsDuMois = db.transactions.filter(tx => new Date(tx.date).getFullYear() === year && new Date(tx.date).getMonth() === month);

    let totalBenefice = 0;
    let totalDepensesHorsStock = 0;

    transactionsDuMois.forEach(tx => {
        if (tx.statut !== 'Impayé (à crédit)') {
            if (tx.type === 'vente' && tx.productId) {
                totalBenefice += (tx.montant - (tx.costOfGoodSold || 0));
            } else if (tx.type === 'vente') {
                totalBenefice += tx.montant;
            } else if (tx.type === 'depense' && tx.categorie !== 'Achat de stock') {
                totalDepensesHorsStock += tx.montant;
            }
        }
    });
    dashboardBenefice.textContent = formatCurrency(totalBenefice - totalDepensesHorsStock);
    
    const stockValue = db.stock.reduce((sum, p) => sum + (p.quantity * p.cost), 0);
    dashboardStockValue.innerHTML = `
        <div class="flex justify-between items-center bg-blue-50 p-3 rounded-md mt-2">
            <span>Valeur du Stock</span><span class="font-semibold">${formatCurrency(stockValue)}</span>
        </div>`;

    const portefeuilles = {};
    (db.settings.portefeuilles || []).forEach(p => portefeuilles[p] = 0);
    db.transactions.forEach(tx => {
        if (tx.statut === 'Payé') {
            const portefeuille = tx.portefeuille_details || tx.portefeuille;
             if (tx.type === 'vente') {
                if (!portefeuilles.hasOwnProperty(portefeuille)) portefeuilles[portefeuille] = 0;
                portefeuilles[portefeuille] += tx.montant;
            } else if (tx.type === 'depense') {
                if (!portefeuilles.hasOwnProperty(portefeuille)) portefeuilles[portefeuille] = 0;
                portefeuilles[portefeuille] -= tx.montant;
            }
        }
    });
    dashboardPortefeuilles.innerHTML = Object.entries(portefeuilles).map(([nom, solde]) => `<div class="flex justify-between items-center bg-gray-50 p-3 rounded-md"><span>${nom}</span><span class="font-semibold">${formatCurrency(solde)}</span></div>`).join('');
    const creances = db.transactions.filter(tx => tx.type === 'vente' && tx.statut === 'Impayé (à crédit)').reduce((sum, tx) => sum + (tx.montant || 0), 0);
    const dettes = db.transactions.filter(tx => tx.type === 'depense' && tx.statut === 'Impayé (à crédit)').reduce((sum, tx) => sum + (tx.montant || 0), 0);
    dashboardCreances.textContent = formatCurrency(creances);
    dashboardDettes.textContent = formatCurrency(dettes);
};

export const populateSelects = () => {
    const portefeuillesSelects = document.querySelectorAll('select[name^="portefeuille"]');
    const portefeuillesOptions = (db.settings.portefeuilles || []).map(p => `<option>${p}</option>`).join('');
    portefeuillesSelects.forEach(s => s.innerHTML = portefeuillesOptions);
    
    const categorieSelect = document.querySelector('select[name="categorie_depense"]');
    const categorieOptions = (db.settings.categories || []).map(c => `<option>${c}</option>`).join('');
    if (categorieSelect) categorieSelect.innerHTML = categorieOptions;

    const productSelects = document.querySelectorAll('select[name="product_id"], select[name="product_bought_id"]');
    const productOptions = db.stock.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    productSelects.forEach(select => {
        const firstOption = select.querySelector('option');
        select.innerHTML = (firstOption ? firstOption.outerHTML : '') + productOptions;
    });
};

// Fonction 'Render All' qui appelle toutes les autres
export const renderAll = () => {
    populateSelects();
    renderJournal();
    renderDashboard();
    renderDettesPage();
    renderStockPage();
    renderParametres();
};