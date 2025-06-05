// js/game/inventory_logic.js

import { player, gameState, uiStates, updatePlayerHUD, calculateEffectiveStats } from './game_state.js';
import { domElements } from '../dom.js';
import { showNotification, renderGridItems } from '../utils.js';
import { baseItems } from '../data/items_db.js'; // Asumiendo que baseItems está en items_db.js
import { saveGame } from './persistence_logic.js';
import { updateQuestProgress } from './quests_logic.js'; // Para misiones de recolección de items/materiales

/**
 * Renderiza el inventario del jugador en el modal.
 */
export function renderInventory() {
    renderGridItems(domElements.inventoryGridDisplay, player.inventory, (item, index) => {
        const itemData = baseItems[item.id] || item; // Usa datos base si existen, sino los del item (por si no está en baseItems)
        let detailsHtml = itemData.description ? `<span class="item-details">${itemData.description}</span>` : '';
        if (itemData.stats) {
            detailsHtml += `<span class="item-details">ATK:${itemData.stats.attack || 0} DEF:${itemData.stats.defense || 0} HP:${itemData.stats.hp || 0} MP:${itemData.stats.mp || 0}</span>`;
        }
        if (itemData.effect) {
            detailsHtml += `<span class="item-details">Efecto: ${Object.entries(itemData.effect).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(', ')}</span>`;
        }
        return {
            icon: itemData.icon,
            name: itemData.name,
            details: detailsHtml,
            levelReq: itemData.levelReq ? `Req. LV: ${itemData.levelReq}` : '',
            count: item.count > 1 ? `x${item.count}` : '',
            onClick: () => handleItemClick(index),
            disabled: (itemData.levelReq && player.level < itemData.levelReq), // Deshabilitar si no cumple nivel para equipar
            disabledMessage: (itemData.levelReq && player.level < itemData.levelReq) ? `Nivel ${itemData.levelReq} requerido.` : ""
        };
    }, "Inventario vacío.");
}

/**
 * Renderiza el equipo actual del jugador en el modal de inventario.
 */
export function renderEquipment() {
    const slots = {
        weapon: domElements.equipWeaponSlot,
        shield: domElements.equipShieldSlot,
        armor: domElements.equipArmorSlot,
        accessory: domElements.equipAccessorySlot
    };
    for (const slotName in slots) {
        const slotElement = slots[slotName];
        const equippedItemInstance = player.equipment[slotName];
        const itemData = equippedItemInstance ? (baseItems[equippedItemInstance.id] || equippedItemInstance) : null;

        slotElement.innerHTML = `<span class="equipment-slot-label">${slotName.charAt(0).toUpperCase() + slotName.slice(1)}</span>`;
        if (itemData) {
            slotElement.innerHTML += `<span class="item-icon">${itemData.icon}</span><span class="item-name">${itemData.name}</span>`;
            slotElement.classList.add('has-item');
            slotElement.onclick = () => unequipItem(slotName);
            slotElement.title = `Desequipar: ${itemData.name}`;
        } else {
            slotElement.innerHTML += `<span>Vacío</span>`;
            slotElement.classList.remove('has-item');
            slotElement.onclick = null;
            slotElement.title = `Espacio para ${slotName}`;
        }
    }
    calculateEffectiveStats(); // Asegura que las stats se recalculen después de cambios en equipo
    updatePlayerHUD(); // Actualiza el HUD principal
}

/**
 * Maneja el clic en un objeto del inventario.
 * @param {number} itemIndexInInventory - El índice del objeto en el array player.inventory.
 */
function handleItemClick(itemIndexInInventory) {
    const itemInstance = player.inventory[itemIndexInInventory];
    if (!itemInstance) return;

    const itemBaseData = baseItems[itemInstance.id] || itemInstance;

    if (itemBaseData.type === 'consumable') {
        useConsumable(itemInstance, itemIndexInInventory);
    } else if (['weapon', 'shield', 'armor', 'accessory'].includes(itemBaseData.type)) {
        if (player.level >= (itemBaseData.levelReq || 0)) {
            equipItem(itemInstance, itemIndexInInventory);
        } else {
            showNotification(`Nivel ${itemBaseData.levelReq} requerido para ${itemBaseData.name}.`, "error");
        }
    } else if (itemBaseData.type === 'material') {
        showNotification(`${itemBaseData.name}: Material (Tienes ${player.materials[itemInstance.id] || itemInstance.count || 0}).`, "default");
    }
}

/**
 * Usa un objeto consumible del inventario.
 * @param {object} itemInstance - La instancia del objeto del inventario.
 * @param {number} index - El índice del objeto en player.inventory.
 */
function useConsumable(itemInstance, index) {
    const itemBase = baseItems[itemInstance.id];
    if (!itemBase || itemBase.type !== 'consumable') return;

    // Aplicar efectos (esto podría expandirse mucho)
    if (itemBase.effect) {
        if (itemBase.effect.hp) {
            player.hp = Math.min(player.hp + itemBase.effect.hp, player.maxHp);
        }
        if (itemBase.effect.mp) {
            player.mp = Math.min(player.mp + itemBase.effect.mp, player.maxMp);
        }
        if (itemBase.effect.cure) {
            // Importar y usar removeStatusEffect de combat_logic o player_logic si es necesario
            // Por ahora, simulamos que se cura un efecto genérico
            console.log(`Se intentó curar: ${itemBase.effect.cure}`);
            // removeStatusEffect(player, itemBase.effect.cure); // Necesitaría importación
        }
    }

    showNotification(`Has usado ${itemBase.name}.`, "success");
    itemInstance.count = (itemInstance.count || 1) - 1;
    if (itemInstance.count <= 0) {
        player.inventory.splice(index, 1);
    }

    updatePlayerHUD();
    renderInventory(); // Re-renderizar inventario para reflejar el cambio de cantidad o eliminación
    saveGame();
}

/**
 * Equipa un objeto del inventario.
 * @param {object} itemToEquipInstance - La instancia del objeto a equipar del inventario.
 * @param {number} itemIndexInInventory - El índice del objeto en player.inventory.
 */
export function equipItem(itemToEquipInstance, itemIndexInInventory) {
    const itemBase = baseItems[itemToEquipInstance.id] || itemToEquipInstance;
    const slot = itemBase.slot; // slot debe estar definido en baseItems para items equipables

    if (!slot) {
        showNotification("Este objeto no se puede equipar.", "error");
        return;
    }

    // Si ya hay algo equipado en ese slot, lo devolvemos al inventario
    if (player.equipment[slot]) {
        addItemToInventory(player.equipment[slot]); // No necesita cantidad, es una instancia única
    }

    // Equipar el nuevo objeto
    player.equipment[slot] = JSON.parse(JSON.stringify(itemToEquipInstance)); // Copia profunda para evitar referencias
    
    // Reducir la cantidad o eliminar del inventario
    itemToEquipInstance.count = (itemToEquipInstance.count || 1) - 1;
    if (itemToEquipInstance.count <= 0) {
        player.inventory.splice(itemIndexInInventory, 1);
    }

    showNotification(`${itemBase.name} equipado.`, "success");
    renderInventory();
    renderEquipment(); // Esto llamará a calculateEffectiveStats y updatePlayerHUD
    saveGame();
}

/**
 * Desequipa un objeto del slot especificado.
 * @param {string} slotName - El nombre del slot de equipamiento (e.g., 'weapon', 'armor').
 */
export function unequipItem(slotName) {
    const itemToUnequipInstance = player.equipment[slotName];
    if (!itemToUnequipInstance) return;

    const itemBase = baseItems[itemToUnequipInstance.id] || itemToUnequipInstance;

    addItemToInventory(itemToUnequipInstance); // Devuelve la instancia completa al inventario
    player.equipment[slotName] = null;

    showNotification(`${itemBase.name} desequipado.`, "default");
    renderInventory();
    renderEquipment(); // Esto llamará a calculateEffectiveStats y updatePlayerHUD
    saveGame();
}

/**
 * Añade un objeto (o material) al inventario del jugador, apilando si es posible.
 * @param {object} itemData - Un objeto que contiene al menos {id: 'string'}. Puede tener 'count'.
 * @param {number} quantity - La cantidad a añadir. Por defecto 1.
 */
export function addItemToInventory(itemData, quantity = 1) {
    const itemBase = baseItems[itemData.id]; // Siempre buscar en baseItems para obtener datos completos
    if (!itemBase) {
        console.error(`Error: No se encontró baseItem para el ID: ${itemData.id}`);
        showNotification(`Error: Objeto desconocido ${itemData.id}.`, "error");
        return;
    }

    const stackable = itemBase.type === 'consumable' || itemBase.type === 'material';
    
    if (stackable) {
        const existingItem = player.inventory.find(invItem => invItem.id === itemData.id);
        if (existingItem) {
            existingItem.count = (existingItem.count || 0) + quantity;
        } else {
            // Crear nueva instancia basada en itemBase, pero solo con id y count para el inventario
            player.inventory.push({ id: itemData.id, count: quantity });
        }
    } else { // No apilable (ej. equipo)
        // Para items no apilables, se asume que itemData ya es una instancia completa si se devuelve de equipo.
        // Si se añade un nuevo item (ej. recompensa de misión), se crea una instancia simple con count 1.
        const newItemInstance = { id: itemData.id, count: 1 };
        // Si el itemData original tenía stats (como al desequipar), se mantienen.
        // Esto es un poco complejo porque 'itemData' puede ser una referencia a un objeto del equipo
        // o una simple referencia de ID de una recompensa.
        // La solución más simple es que addItemToInventory siempre añada basado en ID de baseItems,
        // y si un item tiene propiedades únicas (ej. encantamiento futuro), manejarlo con más cuidado.
        // Por ahora, para equipo, se asume que `unequipItem` pasa la instancia correcta.
        // Para recompensas, se crea una nueva instancia.
        if (itemData.stats) { // Si es una instancia de equipo que se está devolviendo
            Object.assign(newItemInstance, itemData); // Copia todas las propiedades de itemData (incluyendo stats si las tiene)
            newItemInstance.count = 1; // Asegura que solo se añade una instancia de equipo
        }
        player.inventory.push(newItemInstance);
    }
    
    // Actualizar misiones si el objeto es un material o un item coleccionable
    if (itemBase.type === 'material' || questTriggersItemCollection(itemBase.id)) {
        updateQuestProgress('collect', itemData.id, quantity);
    }

    if (uiStates.isInventoryModalOpen) { // Solo re-renderizar si el modal está abierto
        renderInventory();
    }
}


/**
 * Añade materiales al inventario específico de materiales del jugador y actualiza misiones.
 * @param {string} materialId - El ID del material a añadir.
 * @param {number} quantity - La cantidad a añadir.
 */
export function addMaterial(materialId, quantity) {
    const materialBase = baseItems[materialId];
    if (!materialBase || materialBase.type !== 'material') {
        showNotification(`Error: ${materialId} no es un material válido.`, "error");
        return;
    }

    player.materials[materialId] = (player.materials[materialId] || 0) + quantity;
    showNotification(`${materialBase.name} x${quantity} añadido(s) a materiales.`, "success");

    if (uiStates.isBlacksmithModalOpen) { // Actualizar UI de herrería si está abierta
        // Suponiendo que existe una función renderPlayerMaterials en blacksmith_logic.js
        // import { renderPlayerMaterials } from './blacksmith_logic.js'; -> Cuidado con dependencias circulares
        // Por ahora, asumimos que la actualización se maneja donde se llama addMaterial o que blacksmith_logic se re-renderiza.
        console.log("Actualizar UI de materiales en herrería si está abierta.");
    }
    
    updateQuestProgress('collect', materialId, quantity);
    saveGame();
}

/**
 * Verifica si un itemID debería activar una misión de recolección.
 * Esto es un placeholder, debería integrarse mejor con quests_logic.js o quests_db.js
 * @param {string} itemId 
 * @returns {boolean}
 */
function questTriggersItemCollection(itemId) {
    // Aquí se podría consultar una lista de items de misión no materiales
    // Por simplicidad, ahora solo los materiales lo hacen directamente desde addItemToInventory
    return false; 
}

// Inicializar equipo para que los slots se muestren correctamente al inicio si están vacíos.
// Esto se podría hacer en persistence_logic.js al cargar o inicializar jugador.
// if (domElements.equipWeaponSlot) { // Solo si el DOM está cargado
//     renderEquipment();
// }
