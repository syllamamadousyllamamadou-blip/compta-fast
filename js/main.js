// js/main.js

// --- IMPORTS ---
import { db, loadData } from './db.js'; 
import { supabaseClient } from './supabaseClient.js';
import { showSyncIndicator, openModal, closeModal, showSettingsModal, formatCurrencyPDF } from './utils.js';
import { renderAll, renderDashboard } from './ui.js';
import * as DOM from './dom.js'; 

// --- ÉTAT DE L'APPLICATION ---
export let currentDisplayDate = new Date();
let editingTxId = null;

// =================== FONCTIONS DE LOGIQUE STOCK (Inchangées) ===================
const revertStockChange = (tx) => {
    if (tx.type === 'vente' && tx.productId) {
        const product = db.stock.find(p => p.id === tx.productId);
        if (product) {
            product.quantity += tx.quantitySold || 1;
        }
    } else if (tx.type === 'depense' && tx.categorie === 'Achat de stock' && tx.productId) {
        const product = db.stock.find(p => p.id === tx.productId);
        if (product) {
            product.quantity -= tx.quantityBought || 0;
        }
    }
};

const applyStockChange = (tx) => {
    if (tx.type === 'vente' && tx.productId) {
        const product = db.stock.find(p => p.id === tx.productId);
        if (product) {
            product.quantity -= tx.quantitySold || 1;
        }
    } else if (tx.type === 'depense' && tx.categorie === 'Achat de stock' && tx.productId) {
        const product = db.stock.find(p => p.id === tx.productId);
        if (product) {
            product.quantity += tx.quantityBought || 0;
        }
    }
};
// =================== FIN DES FONCTIONS STOCK ===================


// --- FONCTION DE GÉNÉRATION PDF (Inchangée) ---
const generatePDF = (year, month) => {
    const doc = new window.jspdf.jsPDF();
    const period = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    doc.setFontSize(20);
    doc.text("Bilan Financier", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Période : ${period}`, 105, 28, { align: 'center' });
    const transactionsDuMois = db.transactions.filter(tx => new Date(tx.date).getFullYear() === year && new Date(tx.date).getMonth() === month);
    let totalVentes = transactionsDuMois.filter(t => t.type === 'vente' && t.statut === 'Payé' && !t.productId).reduce((sum, t) => sum + t.montant, 0);
    let totalVentesProduits = transactionsDuMois.filter(t => t.type === 'vente' && t.statut === 'Payé' && t.productId).reduce((sum, t) => sum + t.montant, 0);
    let totalCoutProduitsVendus = transactionsDuMois.filter(t => t.type === 'vente' && t.statut === 'Payé' && t.productId).reduce((sum, t) => sum + t.costOfGoodSold, 0);
    let totalDepenses = transactionsDuMois.filter(t => t.type === 'depense' && t.statut === 'Payé' && t.categorie !== 'Achat de stock').reduce((sum, t) => sum + t.montant, 0);
    let beneficeNet = (totalVentes + totalVentesProduits) - totalCoutProduitsVendus - totalDepenses;
    doc.autoTable({
        startY: 40,
        head: [['Indicateur', 'Montant']],
        body: [['Revenus (Ventes simples)', formatCurrencyPDF(totalVentes)], ['Revenus (Ventes de produits)', formatCurrencyPDF(totalVentesProduits)], ['Charges (Coût des produits vendus)', `-${formatCurrencyPDF(totalCoutProduitsVendus)}`], ['Charges (Autres dépenses)', `-${formatCurrencyPDF(totalDepenses)}`], ['BÉNÉFICE NET', formatCurrencyPDF(beneficeNet)],],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`Bilan_${period.replace(/\s/g, '_')}.pdf`);
};

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- CHARGEMENT INITIAL DES DONNÉES ---
    await loadData();
    renderAll();
    DOM.loadingOverlay.classList.add('hidden');
    
    // --- GESTION DES ÉVÉNEMENTS ---

    // Navigation (Inchangé)
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            DOM.pages.forEach(page => page.classList.toggle('active', page.id === pageId));
            DOM.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Modale de Transaction (Inchangé)
    DOM.showTransactionModalBtn.addEventListener('click', () => {
        closeModal(DOM.settleDebtModal);
        closeModal(DOM.settingsModal);
        editingTxId = null;
        DOM.transactionModalTitle.textContent = "Nouvelle Opération";
        DOM.transactionForm.reset();
        DOM.transactionForm.elements['id'].value = '';
        DOM.transactionForm.elements['date'].value = new Date().toISOString().split('T')[0];
        DOM.transactionTypeSelect.dispatchEvent(new Event('change'));
        DOM.transactionForm.elements['statut_vente'].dispatchEvent(new Event('change'));
        DOM.transactionForm.elements['statut_depense'].dispatchEvent(new Event('change'));
        const productSelect = DOM.transactionForm.elements['product_id'];
        if (productSelect) {
            productSelect.dispatchEvent(new Event('change'));
        }
        openModal(DOM.transactionModal);
    });
    DOM.closeModalBtns.forEach(btn => btn.addEventListener('click', () => closeModal(DOM.transactionModal)));
    DOM.transactionTypeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        document.querySelectorAll('.transaction-fields').forEach(fieldSet => fieldSet.classList.toggle('hidden', fieldSet.dataset.type !== selectedType));
    });

    // --- FORMULAIRE INTELLIGENT (Inchangé) ---
    const productSelect = DOM.transactionForm.elements['product_id'];
    const quantitySoldField = document.getElementById('field-quantity-sold');
    if (productSelect && quantitySoldField) {
        productSelect.addEventListener('change', () => {
            const productId = productSelect.value;
            quantitySoldField.classList.toggle('hidden', !productId);
        });
    }
    const statutVenteSelect = DOM.transactionForm.elements['statut_vente'];
    const portefeuilleVenteSelect = DOM.transactionForm.elements['portefeuille_vente'];
    const clientVenteField = document.getElementById('field-client-vente'); 
    const autrePortefeuilleVenteField = document.getElementById('field-autre-portefeuille-vente'); 
    statutVenteSelect.addEventListener('change', () => {
        const isImpaye = statutVenteSelect.value === 'Impayé (à crédit)';
        portefeuilleVenteSelect.parentElement.classList.toggle('hidden', isImpaye);
        portefeuilleVenteSelect.disabled = isImpaye;
        autrePortefeuilleVenteField.classList.toggle('hidden', isImpaye || portefeuilleVenteSelect.value !== 'Autre');
        clientVenteField.classList.toggle('hidden', !isImpaye);
    });
    portefeuilleVenteSelect.addEventListener('change', () => {
        autrePortefeuilleVenteField.classList.toggle('hidden', portefeuilleVenteSelect.value !== 'Autre' || statutVenteSelect.value === 'Impayé (à crédit)');
    });
    const statutDepenseSelect = DOM.transactionForm.elements['statut_depense'];
    const portefeuilleDepenseSelect = DOM.transactionForm.elements['portefeuille_depense'];
    const fournisseurDepenseField = document.getElementById('field-fournisseur-depense');
    const autrePortefeuilleDepenseField = document.getElementById('field-autre-portefeuille-depense');
    statutDepenseSelect.addEventListener('change', () => {
        const isImpaye = statutDepenseSelect.value === 'Impayé (à crédit)';
        portefeuilleDepenseSelect.parentElement.classList.toggle('hidden', isImpaye);
        portefeuilleDepenseSelect.disabled = isImpaye;
        autrePortefeuilleDepenseField.classList.toggle('hidden', isImpaye || portefeuilleDepenseSelect.value !== 'Autre');
        fournisseurDepenseField.classList.toggle('hidden', !isImpaye);
    });
    portefeuilleDepenseSelect.addEventListener('change', () => {
        autrePortefeuilleDepenseField.classList.toggle('hidden', portefeuilleDepenseSelect.value !== 'Autre' || statutDepenseSelect.value === 'Impayé (à crédit)');
    });
    const categorieDepenseSelect = DOM.transactionForm.elements['categorie_depense'];
    const stockPurchaseFields = document.getElementById('field-stock-purchase');
    const autreCategorieField = document.getElementById('field-autre-categorie');
    categorieDepenseSelect.addEventListener('change', () => {
        autreCategorieField.classList.toggle('hidden', categorieDepenseSelect.value !== 'Autre');
        stockPurchaseFields.classList.toggle('hidden', categorieDepenseSelect.value !== 'Achat de stock');
    });

    // =================== SOUMISSION FORMULAIRE TRANSACTION (Inchangé) ===================
    DOM.transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(DOM.transactionForm);
        const type = DOM.transactionTypeSelect.value;
        const editingId = formData.get('id');

        let oldTx = null;
        if (editingId) {
            const oldTxFound = db.transactions.find(t => t.id === editingId);
            if (oldTxFound) {
                oldTx = { ...oldTxFound };
            }
        }

        const txData = {
            id: editingId || crypto.randomUUID(), 
            date: new Date(formData.get('date')).toISOString(),
            type: type,
            montant: parseFloat(formData.get('montant')) || 0,
            description: formData.get('description'),
        };
        
        if (type === 'vente') {
            Object.assign(txData, {
                statut: formData.get('statut_vente'),
                portefeuille: formData.get('portefeuille_vente'),
                portefeuille_details: formData.get('portefeuille_vente') === 'Autre' ? formData.get('autre_portefeuille_vente') : '',
                client: formData.get('statut_vente') === 'Impayé (à crédit)' ? formData.get('client_vente') : '',
                client_tel: formData.get('statut_vente') === 'Impayé (à crédit)' ? formData.get('client_tel') : '',
                productId: formData.get('product_id') || null, 
            });
            const productId = txData.productId;
            if (productId) {
                const product = db.stock.find(p => p.id === productId);
                if (product) {
                    const quantitySold = parseInt(formData.get('quantity_sold')) || 1; 
                    txData.costOfGoodSold = product.cost * quantitySold; 
                    txData.quantitySold = quantitySold; 
                }
            }
        } else if (type === 'depense') {
            Object.assign(txData, {
                statut: formData.get('statut_depense'),
                portefeuille: formData.get('portefeuille_depense'),
                portefeuille_details: formData.get('portefeuille_depense') === 'Autre' ? formData.get('autre_portefeuille_depense') : '',
                fournisseur: formData.get('statut_depense') === 'Impayé (à crédit)' ? formData.get('fournisseur_depense') : '',
                categorie: formData.get('categorie_depense'),
                categorie_details: formData.get('categorie_depense') === 'Autre' ? formData.get('autre_categorie') : '',
                productId: formData.get('product_bought_id') || null, 
                quantityBought: parseInt(formData.get('quantity_bought')) || 0 
            });
        }
        
        const { error } = await supabaseClient.from('transactions').upsert(txData);
        
        if(error) {
            console.error("Erreur sauvegarde transaction:", error);
            alert("Erreur lors de la sauvegarde : " + error.message);
            return; 
        }

        if (editingId) {
            if (oldTx) {
                revertStockChange(oldTx);
            }
            applyStockChange(txData);
            const oldTxIndex = db.transactions.findIndex(t => t.id === editingId);
            if (oldTxIndex !== -1) {
                db.transactions[oldTxIndex] = txData; 
            }
        } else {
            applyStockChange(txData);
            db.transactions.push(txData); 
        }

        const stockToUpdate = db.stock.find(p => p.id === txData.productId);
        if (stockToUpdate) {
            await supabaseClient.from('stock').upsert(stockToUpdate);
        }
        
        renderAll(); 
        closeModal(DOM.transactionModal);
        showSyncIndicator();
    });

    // =================== SOUMISSION FORMULAIRE STOCK (Inchangé) ===================
    DOM.addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(DOM.addProductForm);
        const id = formData.get('product_id');
        
        const productData = {
            id: id || crypto.randomUUID(), 
            name: formData.get('product_name').trim(),
            quantity: parseInt(formData.get('product_quantity')),
            cost: parseFloat(formData.get('product_cost'))
        };

        if (!productData.name || isNaN(productData.quantity) || isNaN(productData.cost)) return;
        
        const { data, error } = await supabaseClient.from('stock').upsert(productData).select();
        
        if (error) {
            console.error("Erreur sauvegarde stock:", error);
            alert("Erreur lors de la sauvegarde : " + error.message);
            return;
        }

        if (id) { 
            const index = db.stock.findIndex(p => p.id === id);
            if (index !== -1) db.stock[index] = data[0];
        } else { 
            db.stock.push(data[0]);
        }
        
        renderAll(); 
        DOM.addProductForm.reset();
        showSyncIndicator();
    });

    // =================== GESTION CLICS JOURNAL (Inchangé) ===================
    DOM.journalList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-tx-btn');
        const deleteBtn = e.target.closest('.delete-tx-btn');

        if (editBtn) {
            const tx = db.transactions.find(t => t.id === editBtn.dataset.id);
            if (tx) {
                editingTxId = tx.id; 
                DOM.transactionModalTitle.textContent = "Modifier l'Opération";
                DOM.transactionForm.reset();
                DOM.transactionForm.elements['id'].value = tx.id;
                DOM.transactionForm.elements['transaction-type'].value = tx.type;
                DOM.transactionForm.elements['montant'].value = tx.montant;
                DOM.transactionForm.elements['description'].value = tx.description;
                DOM.transactionForm.elements['date'].value = tx.date.split('T')[0];
                if (tx.type === 'vente') {
                    DOM.transactionForm.elements['statut_vente'].value = tx.statut;
                    DOM.transactionForm.elements['portefeuille_vente'].value = tx.portefeuille;
                    if(tx.portefeuille === 'Autre') DOM.transactionForm.elements['autre_portefeuille_vente'].value = tx.portefeuille_details;
                    if(tx.statut === 'Impayé (à crédit)') {
                        DOM.transactionForm.elements['client_vente'].value = tx.client;
                        DOM.transactionForm.elements['client_tel'].value = tx.client_tel;
                    }
                    if(tx.productId) {
                        DOM.transactionForm.elements['product_id'].value = tx.productId;
                        DOM.transactionForm.elements['quantity_sold'].value = tx.quantitySold || 1;
                    }
                } else if (tx.type === 'depense') {
                    DOM.transactionForm.elements['statut_depense'].value = tx.statut;
                    DOM.transactionForm.elements['portefeuille_depense'].value = tx.portefeuille;
                    if(tx.portefeuille === 'Autre') DOM.transactionForm.elements['autre_portefeuille_depense'].value = tx.portefeuille_details;
                    if(tx.statut === 'Impayé (à crédit)') DOM.transactionForm.elements['fournisseur_depense'].value = tx.fournisseur;
                    DOM.transactionForm.elements['categorie_depense'].value = tx.categorie;
                    if(tx.categorie === 'Autre') DOM.transactionForm.elements['autre_categorie'].value = tx.categorie_details;
                    if(tx.categorie === 'Achat de stock') {
                        DOM.transactionForm.elements['product_bought_id'].value = tx.productId;
                        DOM.transactionForm.elements['quantity_bought'].value = tx.quantityBought;
                    }
                }
                DOM.transactionTypeSelect.dispatchEvent(new Event('change'));
                DOM.transactionForm.elements['statut_vente'].dispatchEvent(new Event('change'));
                DOM.transactionForm.elements['statut_depense'].dispatchEvent(new Event('change'));
                const productSelect = DOM.transactionForm.elements['product_id'];
                if (productSelect) {
                    productSelect.dispatchEvent(new Event('change'));
                }
                openModal(DOM.transactionModal);
            }
        }

        // --- GESTION SUPPRESSION TRANSACTION (Corrigé) ---
        if (deleteBtn) {
            const txId = deleteBtn.dataset.id;
            const txToDelete = db.transactions.find(t => t.id === txId);
            if (!txToDelete) return;

            showSettingsModal({
                title: "Confirmer la suppression",
                message: `Êtes-vous sûr de vouloir supprimer cette transaction ? (${txToDelete.description || txToDelete.type} - ${txToDelete.montant} F). Cette action est irréversible.`,
                buttons: [
                    { text: 'Annuler', classes: 'px-4 py-2 bg-gray-200 rounded-md', onClick: () => {} },
                    // *** ERREUR CORRIGÉE : 'async onClick: async ()' est devenu 'onClick: async ()' ***
                    { text: 'Supprimer', classes: 'px-4 py-2 bg-red-500 text-white rounded-md', onClick: async () => {
                        revertStockChange(txToDelete);
                        
                        if (txToDelete.productId) {
                            const stockToUpdate = db.stock.find(p => p.id === txToDelete.productId);
                            if(stockToUpdate) {
                                await supabaseClient.from('stock').upsert(stockToUpdate);
                            }
                        }

                        const { error } = await supabaseClient.from('transactions').delete().eq('id', txId);

                        if(error) {
                            console.error("Erreur suppression transaction:", error);
                            alert("Erreur lors de la suppression : " + error.message);
                            applyStockChange(txToDelete); 
                            return;
                        }

                        db.transactions = db.transactions.filter(t => t.id !== txId);
                        renderAll();
                        showSyncIndicator();
                    }}
                ]
            });
        }
    });
    
    // --- GESTION SUPPRESSION STOCK (Inchangé) ---
    DOM.stockList.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-product-btn');
        const deleteBtn = e.target.closest('.delete-product-btn');
        if (editBtn) {
            const product = db.stock.find(p => p.id === editBtn.dataset.id);
            if (product) {
                DOM.addProductForm.elements['product_id'].value = product.id;
                DOM.addProductForm.elements['product_name'].value = product.name;
                DOM.addProductForm.elements['product_quantity'].value = product.quantity;
                DOM.addProductForm.elements['product_cost'].value = product.cost;
            }
        }
        if (deleteBtn) {
            const productId = deleteBtn.dataset.id;
            const isUsed = db.transactions.some(tx => tx.productId === productId);
            if (isUsed) {
                alert("Impossible de supprimer ce produit car il est utilisé dans des transactions existantes.");
                return;
            }

            if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
                const { error } = await supabaseClient.from('stock').delete().eq('id', productId);
                if (error) {
                    alert("Erreur lors de la suppression : " + error.message);
                    return;
                }
                db.stock = db.stock.filter(p => p.id !== productId);
                renderAll();
                showSyncIndicator();
            }
        }
    });

    // =================== SOUMISSION REGLEMENT DETTE (Inchangé) ===================
    DOM.settleDebtForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const txId = DOM.settleDebtForm.dataset.txId;
        const transaction = db.transactions.find(t => t.id === txId);
        const formData = new FormData(DOM.settleDebtForm);
        let portefeuille = formData.get('settle_wallet');

        if (!portefeuille) return;
        if (!transaction) return;

        const updates = {
            statut: 'Payé',
            portefeuille: portefeuille,
            portefeuille_details: portefeuille === 'Autre' ? formData.get('settle_autre_portefeuille') : null
        };

        const { error } = await supabaseClient
            .from('transactions')
            .update(updates)
            .eq('id', txId);
        
        if (error) {
            alert("Erreur lors du règlement : " + error.message);
            return;
        }

        transaction.statut = updates.statut;
        transaction.portefeuille = updates.portefeuille;
        transaction.portefeuille_details = updates.portefeuille_details;
        
        renderAll(); 
        closeSettleModal(); 
        showSyncIndicator();
    });

    // --- GESTION DES PARAMETRES (Inchangé) ---
    const updateSettingsOnSupabase = async () => {
        const { error } = await supabaseClient
            .from('settings')
            .update({ 
                portefeuilles: db.settings.portefeuilles,
                categories: db.settings.categories
            })
            .eq('id', db.settings.id); 

        if (error) {
            alert("Erreur lors de la mise à jour des paramètres : " + error.message);
        } else {
            showSyncIndicator();
        }
    };

    DOM.addPortefeuilleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPortefeuille = e.target.elements.new_portefeuille.value.trim();
        if (newPortefeuille && !db.settings.portefeuilles.includes(newPortefeuille)) {
            db.settings.portefeuilles.splice(-1, 0, newPortefeuille); 
            renderAll(); 
            e.target.reset();
            updateSettingsOnSupabase(); 
        }
    });
    DOM.addCategorieForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newCategorie = e.target.elements.new_categorie.value.trim();
        if (newCategorie && !db.settings.categories.includes(newCategorie)) {
            db.settings.categories.splice(-1, 0, newCategorie); 
            renderAll(); 
            e.target.reset();
            updateSettingsOnSupabase(); 
        }
    });

    const handleSettingDelete = (type, name) => {
        showSettingsModal({
            title: "Confirmer la suppression",
            message: `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
            buttons: [
                { text: 'Annuler', classes: 'px-4 py-2 bg-gray-200 rounded-md', onClick: () => {} },
                { text: 'Supprimer', classes: 'px-4 py-2 bg-red-500 text-white rounded-md', onClick: () => {
                    if(type === 'portefeuille') {
                        db.settings.portefeuilles = db.settings.portefeuilles.filter(p => p !== name);
                    }
                    if(type === 'categorie') {
                        db.settings.categories = db.settings.categories.filter(c => c !== name);
                    }
                    renderAll(); 
                    updateSettingsOnSupabase(); 
                }}
            ]
        });
    };

    const handleSettingEdit = (type, oldName) => {
        const inputId = 'settings-modal-input-edit';
        showSettingsModal({
            title: `Renommer "${oldName}"`, message: 'Entrez le nouveau nom :',
            contentHtml: `<input type="text" id="${inputId}" class="w-full p-2 border rounded-md bg-gray-50" value="${oldName}">`,
            buttons: [
                { text: 'Annuler', classes: 'px-4 py-2 bg-gray-200 rounded-md', onClick: () => {} },
                // *** ERREUR CORRIGÉE : 'B =>' est supprimé ***
                { text: 'Enregistrer', classes: 'px-4 py-2 bg-indigo-600 text-white rounded-md', onClick: () => { 
                    const newName = document.getElementById(inputId).value.trim();
                    if (newName && newName !== oldName) {
                        const list = (type === 'portefeuille') ? db.settings.portefeuilles : db.settings.categories;
                        if (list.includes(newName)) return; 
                        const index = list.indexOf(oldName);
                        if(index !== -1) {
                            list[index] = newName;
                            renderAll(); 
                            updateSettingsOnSupabase(); 
                        }
                    }
                }}
            ]
        });
    };
        
    DOM.portefeuillesSettingsList.addEventListener('click', e => {
        const target = e.target.closest('button');
        if(!target) return;
        const name = target.dataset.name;
        if(target.classList.contains('delete-portefeuille-btn')) handleSettingDelete('portefeuille', name);
        if(target.classList.contains('edit-portefeuille-btn')) handleSettingEdit('portefeuille', name);
    });
    DOM.categoriesSettingsList.addEventListener('click', e => {
        const target = e.target.closest('button');
        if(!target) return;
        const name = target.dataset.name;
        if(target.classList.contains('delete-categorie-btn')) handleSettingDelete('categorie', name);
        if(target.classList.contains('edit-categorie-btn')) handleSettingEdit('categorie', name);
    });
        
    DOM.resetAppBtn.addEventListener('click', () => {
        alert("La réinitialisation est désactivée tant que l'application est connectée à une base de données.");
    });

    // Écouteur pour le bouton PDF (Inchangé)
    DOM.generatePdfBtn.addEventListener('click', () => {
        const availableMonths = [...new Set(db.transactions.map(tx => tx.date.substring(0, 7)))].sort().reverse();
        if (availableMonths.length === 0) { showSyncIndicator(); return; }
        const selectId = 'pdf-month-select';
        let optionsHtml = availableMonths.map(monthStr => {
            const formatted = new Date(monthStr + '-02').toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'});
            return `<option value="${monthStr}">${formatted}</option>`
        }).join('');
        showSettingsModal({
            title: "Générer un Bilan PDF",
            message: "Choisissez le mois pour votre rapport :",
            contentHtml: `<select id="${selectId}" class="w-full p-2 border rounded-md bg-gray-50">${optionsHtml}</select>`,
            buttons: [
                { text: 'Annuler', classes: 'px-4 py-2 bg-gray-200 rounded-md', onClick: () => {} },
                { text: 'Générer', classes: 'px-4 py-2 bg-blue-500 text-white rounded-md', onClick: () => {
                    const selectedMonth = document.getElementById(selectId).value;
                    const [year, month] = selectedMonth.split('-').map(Number);
                    generatePDF(year, month - 1);
                }}
            ]
        });
    });

    // Bouton EXPORT (Inchangé)
    DOM.exportBackupBtn.addEventListener('click', () => {
        try {
            const date = new Date().toISOString().split('T')[0];
            const filename = `ma_compta_sauvegarde_${date}.json`;
            const dataToSave = JSON.stringify(db, null, 2);
            const blob = new Blob([dataToSave], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showSyncIndicator();
        } catch (err) {
            console.error("Erreur lors de l'exportation : ", err);
            alert("Une erreur est survenue lors de l'exportation des données.");
        }
    });

    // Bouton IMPORT (Désactivé pour la BDD)
    DOM.importBackupBtn.addEventListener('click', () => {
        alert("L'importation est désactivée lorsque vous êtes connecté à la base de données.");
    });


    // Navigation Dashboard (Inchangé)
    DOM.prevMonthBtn.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        renderDashboard();
    });

    DOM.nextMonthBtn.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        renderDashboard();
    });
    
});