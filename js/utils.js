// js/utils.js
import { domElements, getEl } from './dom.js';
import { player, currentCombat } from './game/game_state.js'; // Para closeModal y setActiveLink
import { renderInventory, renderEquipment } from './game/inventory_logic.js';
import { renderShop } from './game/shop_logic.js';
import { renderBlacksmithRecipes } from './game/blacksmith_logic.js';
import { renderPlayerStats } from './game/stats_modal_logic.js';
import { openQuestsModal } from './game/quests_logic.js';
import { populateAdminPanel } from './game/admin_logic.js';
// Importar otras funciones de renderizado de modales si es necesario para openModal

/**
 * Muestra una notificación en pantalla.
 * @param {string} message - El mensaje de la notificación.
 * @param {string} [type='default'] - Tipo de notificación ('default', 'success', 'error').
 * @param {number} [duration=5000] - Duración de la notificación en milisegundos.
 */
export function showNotification(message, type = 'default', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Forzar reflow para reiniciar la animación si es necesario
    notification.style.animation = 'none';
    // eslint-disable-next-line no-unused-expressions
    notification.offsetHeight; // Trigger reflow

    const fadeOutDelay = Math.max(0, duration / 1000 - 0.4); // Duración de fadeOut es 0.4s
    notification.style.animation = `slideInNotification 0.4s ease-out, fadeOutNotification 0.4s ease-in ${fadeOutDelay}s forwards`;
    
    domElements.notificationArea.appendChild(notification);

    setTimeout(() => {
        // Verificar si la notificación aún existe antes de intentar removerla
        if (notification.parentNode === domElements.notificationArea) {
            domElements.notificationArea.removeChild(notification);
        }
    }, duration);
}

/**
 * Abre un modal específico y cierra otros modales no persistentes.
 * @param {string} modalId - El ID del modal a abrir.
 */
export function openModal(modalId) {
    const modalToOpen = getEl(modalId);
    if (!modalToOpen) {
        console.error(`Modal con ID "${modalId}" no encontrado.`);
        return;
    }

    // Cierra otros modales que no deberían superponerse o persistir
    document.querySelectorAll('.modal').forEach(m => {
        if (m.id !== modalId && m.style.display === 'block') {
            // Define qué modales no deben cerrarse automáticamente aquí
            const nonClosableModals = ['nameEntryModal', 'adminKeyModal']; // Añade IDs si es necesario
            if (m.id === 'combatModal' && currentCombat.active) return; // No cerrar combate modal si está activo
            if (nonClosableModals.includes(m.id) && player.name === "") return; // No cerrar ciertos modales si el nombre no está puesto

            // No cerrar adminPanelModal si el adminKeyModal se está abriendo o viceversa
            if (!((modalId === 'adminPanelModal' && m.id === 'adminKeyModal') || (modalId === 'adminKeyModal' && m.id === 'adminPanelModal'))) {
                 if (m.id !== 'infoModal') { // infoModal puede ser genérico
                    m.style.display = 'none';
                 }
            }
        }
    });

    modalToOpen.style.display = 'block';

    // Lógica específica al abrir ciertos modales
    switch (modalId) {
        case 'inventoryModal':
            if (typeof renderInventory === 'function') renderInventory();
            if (typeof renderEquipment === 'function') renderEquipment();
            break;
        case 'shopModal':
            if (typeof renderShop === 'function') renderShop();
            break;
        case 'blacksmithModal':
            if (typeof renderBlacksmithRecipes === 'function') renderBlacksmithRecipes();
            break;
        case 'playerStatsModal':
            if (typeof renderPlayerStats === 'function') renderPlayerStats();
            break;
        case 'nameEntryModal':
            if (domElements.playerNameInputElement) domElements.playerNameInputElement.focus();
            break;
        case 'questsModal':
            if (typeof openQuestsModal === 'function') openQuestsModal(); // Esta función ya maneja su renderizado interno
            break;
        case 'adminKeyModal':
            if (domElements.adminKeyValueInput) domElements.adminKeyValueInput.value = '';
            if (domElements.adminKeyErrorMsg) domElements.adminKeyErrorMsg.style.display = 'none';
            if (domElements.adminKeyValueInput) domElements.adminKeyValueInput.focus();
            break;
        case 'adminPanelModal':
             if (typeof populateAdminPanel === 'function') populateAdminPanel();
            break;
        // Añadir más casos según sea necesario
    }
}

/**
 * Cierra un modal específico.
 * @param {string} modalId - El ID del modal a cerrar.
 */
export function closeModal(modalId) {
    if (modalId === 'nameEntryModal' && !player.name) {
        showNotification("Debes ingresar un nombre.", "error");
        if (domElements.playerNameInputElement) domElements.playerNameInputElement.focus();
        return;
    }
    // Prevenir cerrar el modal de combate si el combate está activo.
    if (modalId === 'combatModal' && currentCombat.active) {
        showNotification("No puedes cerrar el combate. Usa 'Huir'.", "error");
        return;
    }

    const modal = getEl(modalId);
    if (modal) {
        modal.style.display = 'none';
    }

    // Limpiar contenido específico si es necesario
    if (modalId === 'infoModal' && domElements.modalBodyContentElement) {
        domElements.modalBodyContentElement.innerHTML = '';
    }
    // Lógica adicional al cerrar adminPanelModal
    if (modalId === 'adminPanelModal' && domElements.adminPanelMessage) {
        domElements.adminPanelMessage.style.display = 'none';
        domElements.adminPanelMessage.textContent = '';
    }
}

/**
 * Obtiene el color para la barra de HP basado en el porcentaje de vida.
 * @param {number} current - HP actual.
 * @param {number} max - HP máximo.
 * @returns {string} Color HSL para la barra de HP.
 */
export function getHpColor(current, max) {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    if (percentage > 75) return 'hsl(120, 70%, 45%)'; // Verde
    if (percentage > 50) return 'hsl(90, 70%, 45%)';  // Verde-Amarillo
    if (percentage > 25) return 'hsl(60, 70%, 45%)';  // Amarillo
    if (percentage > 10) return 'hsl(30, 70%, 45%)';  // Naranja
    return 'hsl(0, 70%, 45%)'; // Rojo
}

/**
 * Actualiza una barra de recursos (HP, MP, EXP) en la UI.
 * @param {HTMLElement} barElement - El elemento de la barra a actualizar.
 * @param {number} current - Valor actual del recurso.
 * @param {number} max - Valor máximo del recurso.
 * @param {boolean} [isHpBar=false] - Indica si es una barra de HP para aplicar color dinámico.
 */
export function updateResourceBar(barElement, current, max, isHpBar = false) {
    if (!barElement) return;
    const percentage = max > 0 ? (Math.max(0, current) / max) * 100 : 0;
    barElement.style.width = `${Math.min(100, percentage)}%`; // Asegurar que no exceda 100%
    if (isHpBar) {
        barElement.style.backgroundColor = getHpColor(current, max);
    }
}

/**
 * Renderiza una colección de items en un elemento de cuadrícula del DOM.
 * @param {HTMLElement} gridElement - El elemento del DOM donde se renderizará la cuadrícula.
 * @param {Array<Object>} items - Array de objetos de datos para renderizar.
 * @param {Function} itemRendererFn - Función que toma un item y su índice, y devuelve un objeto con las propiedades para renderizar (icon, name, details, onClick, etc.).
 * @param {string} emptyMessage - Mensaje a mostrar si no hay items.
 */
export function renderGridItems(gridElement, items, itemRendererFn, emptyMessage) {
    if (!gridElement) return;
    gridElement.innerHTML = '';
    if (!items || items.length === 0) {
        gridElement.innerHTML = `<p style="text-align:center; opacity:0.7;">${emptyMessage}</p>`;
        return;
    }

    items.forEach((itemData, index) => {
        const renderedItem = itemRendererFn(itemData, index); // La función renderer debe manejar la lógica de qué mostrar
        if (renderedItem) { 
            const itemDiv = document.createElement('div');
            // Clase base, más específica si se provee
            itemDiv.className = renderedItem.itemClass || (gridElement.id.includes('inventory') ? 'inventory-item' : 
                                (gridElement.id.includes('shop') ? 'shop-item' : 
                                (gridElement.id.includes('blacksmith') ? 'blacksmith-item' : 
                                (gridElement.id.includes('training') ? 'training-option' : 'grid-item'))));


            let content = `<span class="item-icon">${renderedItem.icon || '❓'}</span>
                           <span class="item-name">${renderedItem.name || 'Desconocido'}</span>`;
            
            if (renderedItem.details) content += renderedItem.details; // details puede ser HTML preformateado
            if (renderedItem.levelReq) content += `<span class="item-level-req">${renderedItem.levelReq}</span>`;
            if (renderedItem.materials) content += `<span class="item-materials">${renderedItem.materials}</span>`;
            if (renderedItem.price) content += `<span class="item-price">${renderedItem.price}</span>`;
            if (renderedItem.chance) content += `<span class="item-chance">${renderedItem.chance}</span>`;
            if (renderedItem.count) content += `<span class="item-count">${renderedItem.count}</span>`;
            
            itemDiv.innerHTML = content;

            if (renderedItem.onClick) {
                itemDiv.onclick = renderedItem.onClick;
                itemDiv.style.cursor = "pointer";
            }
            if (renderedItem.disabled) {
                itemDiv.style.opacity = "0.6";
                itemDiv.style.cursor = "not-allowed";
                itemDiv.title = renderedItem.disabledMessage || "No cumples los requisitos";
                if (renderedItem.onClick) itemDiv.onclick = null; // Deshabilitar click si está deshabilitado
            }
            gridElement.appendChild(itemDiv);
        }
    });
}

/**
 * Establece el enlace activo en la navegación principal.
 * @param {HTMLElement} selectedLink - El elemento <a> del enlace seleccionado.
 */
export function setActiveLink(selectedLink) {
    if (domElements.navLinks) {
        domElements.navLinks.forEach(link => link.classList.remove('active'));
    }
    if (selectedLink) {
        selectedLink.classList.add('active');
    }
}

/**
 * Calcula la EXP necesaria para alcanzar un nivel dado.
 * @param {number} level - El nivel para el cual calcular la EXP necesaria.
 * @returns {number} La cantidad de EXP necesaria.
 */
export function calculateNeededExpForLevel(level) {
    if (level <= 1) return 100; // EXP base para el nivel 1
    let exp = 100;
    for (let i = 1; i < level; i++) {
        exp = Math.floor(exp * 1.35 + (80 * (i * 0.5 + 1))); // Curva de EXP ajustada
    }
    return Math.max(100, exp); // Asegurar un mínimo
}

/**
 * Inicializa los listeners de eventos globales para cerrar modales.
 * Esto debe llamarse una vez, por ejemplo en main.js.
 */
export function initializeGlobalModalClosers() {
    // Cerrar modal al hacer clic fuera de él
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            // Condiciones especiales para no cerrar ciertos modales
            if (modalId === 'nameEntryModal' && !player.name) return;
            if (modalId === 'combatModal' && currentCombat.active) return;
            // Permitir cerrar infoModal, pero otros podrían tener reglas
            if (modalId === 'adminKeyModal' && getEl('adminKeyModal').style.display === 'block') return;
            if (modalId === 'adminPanelModal' && getEl('adminPanelModal').style.display === 'block') return;

            closeModal(modalId);
        }
    });

    // Cerrar modal con la tecla Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape") {
            const openModals = document.querySelectorAll('.modal[style*="display: block"]');
            if (openModals.length > 0) {
                // Intenta cerrar el modal "superior" (el último en la lista de nodos, o el que tenga mayor z-index si se gestionara así)
                // Por simplicidad, tomamos el último que encuentre abierto.
                const topModal = openModals[openModals.length - 1];
                
                if (topModal.id === 'nameEntryModal' && !player.name) return;
                if (topModal.id === 'combatModal' && currentCombat.active) return;
                 // No cerrar adminKeyModal o adminPanelModal con Escape si están activos y son el modal superior
                if ((topModal.id === 'adminKeyModal' || topModal.id === 'adminPanelModal') && topModal.style.display === 'block') return;

                closeModal(topModal.id);
            }
        }
    });
}