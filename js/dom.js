// js/dom.js

// On exporte chaque élément pour que les autres fichiers puissent les utiliser
export const loadingOverlay = document.getElementById('loading-overlay');
export const syncIndicator = document.getElementById('sync-indicator');
export const navItems = document.querySelectorAll('.nav-item');
export const pages = document.querySelectorAll('.page');
export const addProductForm = document.getElementById('add-product-form');
export const stockList = document.getElementById('stock-list');
export const dashboardStockValue = document.getElementById('dashboard-stock-value');
export const transactionModal = document.getElementById('transaction-modal');
export const transactionModalTitle = document.getElementById('transaction-modal-title');
export const transactionForm = document.getElementById('transaction-form');
export const showTransactionModalBtn = document.getElementById('show-transaction-modal');
export const closeModalBtns = document.querySelectorAll('.close-modal');
export const transactionTypeSelect = document.getElementById('transaction-type');
export const journalList = document.getElementById('journal-list');
export const dashboardBenefice = document.getElementById('dashboard-benefice');
export const dashboardPortefeuilles = document.getElementById('dashboard-portefeuilles');
export const dashboardCreances = document.getElementById('dashboard-creances');
export const dashboardDettes = document.getElementById('dashboard-dettes');
export const dashboardPeriod = document.getElementById('dashboard-period');
export const creancesList = document.getElementById('creances-list');
export const dettesList = document.getElementById('dettes-list');
export const portefeuillesSettingsList = document.getElementById('portefeuilles-settings-list');
export const categoriesSettingsList = document.getElementById('categories-settings-list');
export const addPortefeuilleForm = document.getElementById('add-portefeuille-form');
export const addCategorieForm = document.getElementById('add-categorie-form');
export const generatePdfBtn = document.getElementById('generate-pdf-btn');

export const exportBackupBtn = document.getElementById('export-backup-btn');
export const importBackupBtn = document.getElementById('import-backup-btn');
export const importBackupInput = document.getElementById('import-backup-input');

export const resetAppBtn = document.getElementById('reset-app-btn');
export const settleDebtModal = document.getElementById('settle-debt-modal');
export const settleDebtForm = document.getElementById('settle-debt-form');
export const closeSettleModalBtn = document.querySelector('.close-settle-modal');
export const settleWalletList = document.getElementById('settle-wallet-list');
export const settingsModal = document.getElementById('settings-modal');
export const prevMonthBtn = document.getElementById('prev-month');
export const nextMonthBtn = document.getElementById('next-month');