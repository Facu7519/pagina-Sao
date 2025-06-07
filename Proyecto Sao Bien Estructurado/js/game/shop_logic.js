// js/game/shop_logic.js

import { player } from './game_state.js'; // 'gameState' y 'uiStates' removidos de la importación
import { domElements } from '../dom.js';
import { showNotification, renderGridItems } from '../utils.js';
import { baseItems } from '../data/items_db.js';
import { floorData } from '../data/floor_data_db.js';
import { addItemToInventory, addMaterial } from './inventory_logic.js';
import { saveGame } from './persistence_logic.js';
import { updatePlayerHUD } from './hud_logic.js'; // Importar updatePlayerHUD desde hud_logic.js

/**
 * Renderiza los objetos de la tienda del piso actual en el modal de tienda.
 */
export function renderShop() {
    const currentFloorShopData = floorData[player.currentFloor]?.shopItems || [];
    if (!domElements.shopFloorNumberElement || !domElements.shopPlayerColElement || !domElements.shopGridDisplay) {
        console.error("Elementos del DOM para la tienda no encontrados.");
        return;
    }

    domElements.shopFloorNumberElement.textContent = player.currentFloor;
    domElements.shopPlayerColElement.textContent = player.col;

    renderGridItems(domElements.shopGridDisplay, currentFloorShopData, (shopEntry) => {
        const itemBase = baseItems[shopEntry.id];
        if (!itemBase) {
            console.warn("Item base no encontrado para la tienda:", shopEntry.id);
            return null; // No renderizar si el item base no existe
        }
        
        const itemToDisplay = { ...itemBase, ...shopEntry }; // Combina datos base con datos de tienda (precio)
        let detailsHtml = itemToDisplay.description ? `<span class="item-details">${itemToDisplay.description}</span>` : '';
        if (itemToDisplay.stats) {
            detailsHtml += `<span class="item-details">ATK:${itemToDisplay.stats.attack || 0} DEF:${itemToDisplay.stats.defense || 0} HP:${itemToDisplay.stats.hp || 0} MP:${itemToDisplay.stats.mp || 0}</span>`;
        }

        let disabledMessage = "";
        const levelReq = itemToDisplay.levelReq || 0;
        let isDisabled = false;

        if (player.col < itemToDisplay.price) {
            disabledMessage = "Col insuficiente.";
            isDisabled = true;
        } else if (player.level < levelReq) {
            disabledMessage = `Nivel ${levelReq} requerido.`;
            isDisabled = true;
        }

        return {
            icon: itemToDisplay.icon,
            name: itemToDisplay.name,
            details: detailsHtml,
            levelReq: levelReq > 0 ? `Req. LV: ${levelReq}` : '',
            price: `Precio: ${itemToDisplay.price} Col`,
            onClick: () => buyItem(itemToDisplay),
            disabled: isDisabled,
            disabledMessage: disabledMessage,
            itemClass: 'shop-item'
        };
    }, "No hay items disponibles en la tienda de este piso.");
}

/**
 * Compra un item de la tienda.
 * @param {object} itemDataFromShop - El objeto completo con datos base y precio de tienda.
 */
export function buyItem(itemDataFromShop) {
    if (player.col < itemDataFromShop.price) {
        showNotification("Col insuficiente.", "error");
        return;
    }
    if (itemDataFromShop.levelReq && player.level < itemDataFromShop.levelReq) {
        showNotification(`Nivel ${itemDataFromShop.levelReq} requerido para comprar ${itemDataFromShop.name}.`, "error");
        return;
    }

    player.col -= itemDataFromShop.price;

    if (baseItems[itemDataFromShop.id]?.type === 'material') {
        addMaterial(itemDataFromShop.id, 1); // Asumimos que se compra de a uno
    } else {
        addItemToInventory({ id: itemDataFromShop.id }, 1); // Añade al inventario general
    }

    showNotification(`Has comprado ${itemDataFromShop.name}.`, "success");
    updatePlayerHUD();
    
    // Acceder a uiStates a través del objeto player
    if (player.uiStates.isInventoryModalOpen) { // Si el inventario está abierto, re-renderizarlo
        // Asumiendo que renderInventory es exportado y se puede importar aquí
        // import { renderInventory } from './inventory_logic.js'; -> Cuidado con dependencias circulares
        // inventory_logic.renderInventory(); // O una función global si se decide así.
        console.log("Inventario abierto, se asume que renderInventory se llamará por el módulo.");
    }
    renderShop(); // Re-renderizar la tienda para actualizar el Col del jugador y estados de botones
    saveGame();
}


/**
 * Abre el modal de la tienda y renderiza su contenido.
 */
export function openShopModal() {
    if (!domElements.shopModal) {
        console.error("Modal de tienda no encontrado en el DOM.");
        return;
    }
    renderShop(); // Asegura que los items de la tienda estén actualizados
    player.uiStates.isShopModalOpen = true; // Acceder a uiStates a través del objeto player
    domElements.shopModal.style.display = 'block';
}

/**
 * Cierra el modal de la tienda.
 */
export function closeShopModal() {
    if (!domElements.shopModal) return;
    player.uiStates.isShopModalOpen = false; // Acceder a uiStates a través del objeto player
    domElements.shopModal.style.display = 'none';
}