// js/utils.js
import { domElements, getEl } from './dom.js';
import { player, currentCombat } from './game/game_state.js';
import { renderInventory, renderEquipment } from './game/inventory_logic.js';
import { renderShop } from './game/shop_logic.js';
import { renderBlacksmithRecipes, renderPlayerMaterialsList } from './game/blacksmith_logic.js';
import { renderPlayerStats } from './game/stats_modal_logic.js';
import { openQuestsModal, renderAllQuestLists, showQuestDetails } from './game/quests_logic.js';
import { populateAdminPanel } from './game/admin_logic.js';
import { renderFloorSelection } from './game/floor_nav_logic.js';
import { openTrainingModal } from './game/training_logic.js';


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

    // Reiniciar animación con la duración correcta
    notification.style.animation = `slideInNotification 0.4s ease-out, fadeOutNotification 0.4s ease-in ${((duration / 1000) - 0.4)}s forwards`;


    domElements.notificationArea.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, duration);
}

/**
 * Abre un modal específico y renderiza su contenido si es necesario.
 * @param {string} modalId - El ID del modal a abrir.
 */
export function openModal(modalId) {
    const modalElement = domElements[modalId]; // Usar domElements para obtener la referencia
    if (!modalElement) {
        console.error(`Modal con ID '${modalId}' no encontrado.`);
        return;
    }

    // Ocultar todos los modales primero, excepto si estamos re-abriendo uno que ya está activo
    // para evitar que se superpongan si la lógica lo permite.
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id !== modalId) {
            modal.style.display = 'none';
        }
    });

    // Resetear scroll del modal al abrir
    modalElement.scrollTop = 0;

    // Renderizar contenido específico del modal si aplica
    switch (modalId) {
        case 'inventoryModal':
            renderInventory();
            renderEquipment();
            break;
        case 'shopModal':
            renderShop();
            break;
        case 'blacksmithModal':
            renderBlacksmithRecipes();
            renderPlayerMaterialsList(); // Asegurarse de que los materiales se muestren
            break;
        case 'playerStatsModal':
            renderPlayerStats();
            break;
        case 'questsModal':
            // openQuestsModal ya llama a renderAllQuestLists y setea el display de questDetailsArea
            // No es necesario llamar a renderAllQuestLists aquí también
            openQuestsModal(); 
            break;
        case 'floorNavigationModal':
            renderFloorSelection();
            break;
        case 'trainingModal':
            // openTrainingModal ya renderiza todo lo necesario y se llama a sí misma al final para actualizar el costo.
            openTrainingModal(); 
            break;
        case 'adminPanelModal':
            populateAdminPanel();
            break;
        case 'combatModal':
        case 'nameEntryModal':
        case 'adminKeyModal':
            // Estos modales tienen su propia lógica de apertura/inicialización
            // o su contenido se inyecta antes de llamar a openModal.
            break;
        case 'infoModal':
            // El contenido de infoModal ya se setea antes de llamar a openModal.
            // Asegurarse de que el botón de cerrar esté visible.
            const closeBtn = modalElement.querySelector('.close-button');
            if (closeBtn) closeBtn.style.display = 'block';
            break;
        default:
            console.log(`Abriendo modal: ${modalId}`);
            break;
    }

    // Actualizar el estado de UI si es un modal conocido
    if (player.uiStates && typeof player.uiStates === 'object') {
        switch (modalId) {
            case 'inventoryModal': player.uiStates.isInventoryModalOpen = true; break;
            case 'shopModal': player.uiStates.isShopModalOpen = true; break;
            case 'blacksmithModal': player.uiStates.isBlacksmithModalOpen = true; break;
            case 'playerStatsModal': player.uiStates.isPlayerStatsModalOpen = true; break;
            // questsModal maneja su propio isQuestsModalOpen internamente
            case 'floorNavigationModal': player.uiStates.isFloorNavigationModalOpen = true; break;
            case 'trainingModal': player.uiStates.isTrainingModalOpen = true; break;
            case 'adminPanelModal': player.uiStates.isAdminPanelOpen = true; break;
            case 'adminKeyModal': player.uiStates.isAdminKeyModalOpen = true; break;
            case 'combatModal': player.uiStates.isCombatModalOpen = true; break;
            case 'nameEntryModal': player.uiStates.isNameEntryModalOpen = true; break;
            case 'infoModal': player.uiStates.isInfoModalOpen = true; break;
            default: break;
        }
    }


    modalElement.style.display = 'block';
}

/**
 * Cierra un modal específico.
 * @param {string} modalId - El ID del modal a cerrar.
 */
export function closeModal(modalId) {
    const modalElement = domElements[modalId]; // Usar domElements para obtener la referencia
    if (!modalElement) {
        console.error(`Modal con ID '${modalId}' no encontrado.`);
        return;
    }
    modalElement.style.display = 'none';

    // Restablecer los estados de UI en el objeto player
    if (player.uiStates && typeof player.uiStates === 'object') {
        switch (modalId) {
            case 'inventoryModal': player.uiStates.isInventoryModalOpen = false; break;
            case 'shopModal': player.uiStates.isShopModalOpen = false; break;
            case 'blacksmithModal': player.uiStates.isBlacksmithModalOpen = false; break;
            case 'playerStatsModal': player.uiStates.isPlayerStatsModalOpen = false; break;
            case 'questsModal': player.uiStates.isQuestsModalOpen = false; break;
            case 'floorNavigationModal': player.uiStates.isFloorNavigationModalOpen = false; break;
            case 'trainingModal': player.uiStates.isTrainingModalOpen = false; break;
            case 'adminPanelModal': player.uiStates.isAdminPanelOpen = false; break;
            case 'adminKeyModal': player.uiStates.isAdminKeyModalOpen = false; break;
            case 'combatModal': player.uiStates.isCombatModalOpen = false; break;
            case 'nameEntryModal': player.uiStates.isNameEntryModalOpen = false; break;
            case 'infoModal': 
                player.uiStates.isInfoModalOpen = false; 
                if (domElements.modalBodyContentElement) {
                    domElements.modalBodyContentElement.innerHTML = ''; // Limpiar contenido al cerrar
                }
                break;
            default: break;
        }
    }
}


/**
 * Renderiza una cuadrícula de elementos (usado para inventario, tienda, etc.).
 * @param {HTMLElement} containerElement - El elemento del DOM donde se renderizará la cuadrícula.
 * @param {Array<object>} itemsArray - El array de objetos a renderizar.
 * @param {function} getItemHtmlCallback - Función que devuelve el HTML para cada elemento.
 * @param {string} emptyMessage - Mensaje a mostrar si el array está vacío.
 */
export function renderGridItems(containerElement, itemsArray, getItemHtmlCallback, emptyMessage = "No hay elementos para mostrar.") {
    if (!containerElement) {
        console.error("Contenedor no encontrado para renderGridItems.");
        return;
    }
    containerElement.innerHTML = ''; // Limpiar contenido anterior

    if (!itemsArray || itemsArray.length === 0) {
        containerElement.innerHTML = `<p class="empty-grid-message">${emptyMessage}</p>`;
        return;
    }

    itemsArray.forEach((item, index) => {
        const itemHtmlData = getItemHtmlCallback(item, index);
        if (!itemHtmlData) return; // Si la callback devuelve null, no renderizar

        const itemDiv = document.createElement('div');
        itemDiv.className = `grid-item ${itemHtmlData.itemClass || ''} ${itemHtmlData.disabled ? 'disabled' : ''}`;
        
        let tooltipText = itemHtmlData.details || '';
        if (itemHtmlData.levelReq) tooltipText += `<br/>${itemHtmlData.levelReq}`;
        if (itemHtmlData.materials) tooltipText += `<br/>${itemHtmlData.materials}`;
        if (itemHtmlData.price) tooltipText += `<br/>${itemHtmlData.price}`;
        if (itemHtmlData.chance) tooltipText += `<br/>${itemHtmlData.chance}`;
        if (itemHtmlData.disabledMessage) tooltipText += `<br/><span class="tooltip-error">${itemHtmlData.disabledMessage}</span>`;

        // Asegurarse de que itemHtmlData.icon siempre sea una cadena válida
        const icon = itemHtmlData.icon || '❔'; // Usar '❔' como icono predeterminado si no se proporciona

        itemDiv.innerHTML = `
            <span class="item-icon">${icon}</span>
            <span class="item-name">${itemHtmlData.name || ''} ${itemHtmlData.count || ''}</span>
            <span class="tooltiptext">${tooltipText}</span>
        `;
        // Los tooltips son puramente CSS, pero la clase tooltip se añade aquí.
        itemDiv.classList.add('tooltip'); // Añadir clase tooltip para el CSS

        if (itemHtmlData.onClick && !itemHtmlData.disabled) {
            itemDiv.addEventListener('click', itemHtmlData.onClick);
        } else if (itemHtmlData.disabled) {
            itemDiv.style.cursor = 'not-allowed';
        }

        containerElement.appendChild(itemDiv);
    });
}

/**
 * Actualiza una barra de recursos (HP, EXP, MP) en el HUD.
 * @param {HTMLElement} barElement - El elemento de la barra (el contenedor).
 * @param {number} currentValue - El valor actual del recurso.
 * @param {number} maxValue - El valor máximo del recurso.
 * @param {boolean} [invertColors=false] - Si los colores deben invertirse (ej. rojo para HP si está bajo).
 */
export function updateResourceBar(barElement, currentValue, maxValue, invertColors = false) {
    if (!barElement) return;

    const fillElement = barElement.querySelector('.resource-bar-fill');
    if (!fillElement) return;

    const percentage = (currentValue / maxValue) * 100;
    fillElement.style.width = `${Math.max(0, Math.min(100, percentage))}%`; // Asegurar que esté entre 0 y 100

    // Opcional: Cambiar color de la barra según el porcentaje
    if (invertColors) {
        if (percentage < 20) {
            fillElement.style.backgroundColor = '#d9534f'; // Rojo
        } else if (percentage < 50) {
            fillElement.style.backgroundColor = '#f0ad4e'; // Naranja
        } else {
            fillElement.style.backgroundColor = ''; // Usar el color original (desde CSS)
        }
    }
}


/**
 * Calcula la EXP necesaria para el siguiente nivel.
 * Puede ser una función lineal o exponencial dependiendo del diseño del juego.
 * @param {number} level - El nivel para el que se calcula la EXP necesaria.
 * @returns {number} La cantidad de EXP necesaria para alcanzar el siguiente nivel.
 */
export function calculateNeededExpForLevel(level) {
    if (level <= 1) return 100;
    // Fórmula de ejemplo: EXP_n = EXP_n-1 * 1.35 + 80 (redondeado)
    let exp = 100;
    for (let i = 2; i <= level; i++) {
        exp = Math.floor(exp * 1.35 + 80);
    }
    return exp;
}


/**
 * Establece el enlace de navegación activo.
 * @param {HTMLElement} activeLinkElement - El elemento 'a' del enlace que debe estar activo.
 */
export function setActiveLink(activeLinkElement) {
    // Remover la clase 'active' de todos los enlaces de navegación
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });

    // Añadir la clase 'active' al enlace clickeado
    if (activeLinkElement) {
        activeLinkElement.classList.add('active');
    }
}

/**
 * Inicializa listeners globales para cerrar modales al hacer click fuera o presionar Escape.
 */
export function initializeGlobalModalClosers() {
    // Cerrar modal al hacer click fuera del contenido (pero dentro del overlay)
    document.addEventListener('click', (event) => {
        const openModals = document.querySelectorAll('.modal[style*="display: block"]');
        openModals.forEach(modal => {
            const modalContent = modal.querySelector('.modal-content');
            // Asegurarse de que el clic no fue dentro del contenido del modal
            if (modalContent && !modalContent.contains(event.target) && modal.contains(event.target)) {
                // Verificar si es un modal que no debe cerrarse con click fuera
                if (modal.id === 'nameEntryModal' && !player.name) return; // No cerrar si espera nombre
                if (modal.id === 'combatModal' && currentCombat.active) return; // No cerrar durante combate
                // No cerrar adminKeyModal o adminPanelModal si están activos
                if ((modal.id === 'adminKeyModal' && domElements.adminKeyModal.style.display === 'block') ||
                    (modal.id === 'adminPanelModal' && domElements.adminPanelModal.style.display === 'block')) {
                    return;
                }
                closeModal(modal.id);
            }
        });
    });

    // Cerrar modal con la tecla Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === "Escape") {
            const openModals = document.querySelectorAll('.modal[style*="display: block"]');
            if (openModals.length > 0) {
                const topModal = openModals[openModals.length - 1]; // Obtener el modal superior

                // No cerrar si es el modal de entrada de nombre y el nombre no está establecido
                if (topModal.id === 'nameEntryModal' && !player.name) return;
                // No cerrar el modal de combate si está activo
                if (topModal.id === 'combatModal' && currentCombat.active) return;
                 // No cerrar adminKeyModal o adminPanelModal con Escape si están activos y son el modal superior
                if ((topModal.id === 'adminKeyModal' || topModal.id === 'adminPanelModal') && topModal.style.display === 'block') return;

                closeModal(topModal.id);
            }
        }
    });
}