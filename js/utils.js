// js/utils.js

// On importe les éléments DOM dont ce fichier a besoin
import { syncIndicator, settingsModal } from './dom.js';

let syncTimer = null;

export const formatCurrency = (amount) => `${Math.round(amount).toLocaleString('fr-FR')} F`;

export const formatCurrencyPDF = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount).replace(/\s/g, ' ').replace('F\u202FCFA', 'F CFA');

export const showSyncIndicator = () => {
    if (syncTimer) clearTimeout(syncTimer);
    void syncIndicator.offsetWidth; // Reflow
    syncIndicator.classList.add('show');
    syncTimer = setTimeout(() => syncIndicator.classList.remove('show'), 2000);
};

export const openModal = (modal) => modal.classList.remove('hidden');
export const closeModal = (modal) => modal.classList.add('hidden');

export const showSettingsModal = (config) => {
    const { title, message, contentHtml, buttons } = config;
    document.getElementById('settings-modal-title').textContent = title;
    document.getElementById('settings-modal-message').textContent = message;
    const contentContainer = document.getElementById('settings-modal-content');
    contentContainer.innerHTML = contentHtml || '';
    const buttonsContainer = document.getElementById('settings-modal-buttons');
    buttonsContainer.innerHTML = '';
    buttons.forEach(btnConfig => {
        const button = document.createElement('button');
        button.textContent = btnConfig.text;
        button.className = btnConfig.classes;
        button.onclick = () => {
            btnConfig.onClick();
            closeModal(settingsModal); 
        };
        buttonsContainer.appendChild(button);
    });
    openModal(settingsModal);
};