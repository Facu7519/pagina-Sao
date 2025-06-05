// js/game/blacksmith_logic.js

import { player, gameState, uiStates, updatePlayerHUD } from './game_state.js';
import { domElements } from '../dom.js';
import { showNotification, renderGridItems } from '../utils.js';
import { baseItems } from '../data/items_db.js';
import { blacksmithRecipes } from '../data/recipes_db.js'; // Asumiendo que blacksmithRecipes está aquí
import { floorData } from '../data/floor_data_db.js';
import { addItemToInventory, addMaterial, renderInventory as renderFullInventory } from './inventory_logic.js'; // addMaterial ya es de inventory_logic
import { saveGame } from './persistence_logic.js';

/**
 * Renderiza los materiales de forja que posee el jugador en el modal de herrería.
 */
export function renderPlayerMaterialsList() {
    if (!domElements.playerMaterialsListElement) {
        console.error("Elemento DOM para la lista de materiales del jugador no encontrado.");
        return;
    }
    domElements.playerMaterialsListElement.innerHTML = '';
    let hasMaterials = false;
    Object.entries(player.materials).forEach(([materialId, count]) => {
        if (count > 0) {
            hasMaterials = true;
            const materialBase = baseItems[materialId];
            if (materialBase) {
                const li = document.createElement('li');
                li.innerHTML = `${materialBase.icon || '❔'} ${materialBase.name}: <span style="color:#FFD700;">${count}</span>`;
                domElements.playerMaterialsListElement.appendChild(li);
            }
        }
    });
    if (!hasMaterials) {
        domElements.playerMaterialsListElement.innerHTML = '<li>No tienes materiales de forja.</li>';
    }
}

/**
 * Renderiza las recetas de herrería disponibles para el piso actual.
 */
export function renderBlacksmithRecipes() {
    const currentFloorRecipeIds = floorData[player.currentFloor]?.blacksmithRecipes || [];
     if (!domElements.blacksmithFloorNumberElement || !domElements.blacksmithPlayerColElement || !domElements.blacksmithGridDisplay) {
        console.error("Elementos del DOM para la herrería no encontrados.");
        return;
    }

    domElements.blacksmithFloorNumberElement.textContent = player.currentFloor;
    domElements.blacksmithPlayerColElement.textContent = player.col;
    renderPlayerMaterialsList(); // Actualizar lista de materiales del jugador

    const availableRecipesOnFloor = currentFloorRecipeIds
        .map(recipeId => blacksmithRecipes[recipeId])
        .filter(recipe => recipe); // Filtrar por si algún ID no existe en blacksmithRecipes

    renderGridItems(domElements.blacksmithGridDisplay, availableRecipesOnFloor, (recipe) => {
        const itemToCraftBase = baseItems[recipe.itemId];
        if (!itemToCraftBase) {
            console.warn("Item base no encontrado para la receta:", recipe.itemId);
            return null;
        }

        let materialsHtml = "Materiales: ";
        let canCraft = true;
        for (const matId in recipe.materials) {
            const matBase = baseItems[matId];
            const needed = recipe.materials[matId];
            const owned = player.materials[matId] || 0;
            materialsHtml += `${matBase ? matBase.icon || '' : ''}${matBase ? matBase.name : matId} x${needed} (${owned}), `;
            if (owned < needed) canCraft = false;
        }
        materialsHtml = materialsHtml.slice(0, -2); // Remover la última coma y espacio

        if (player.col < recipe.cost) canCraft = false;
        // Comprobar requisito de nivel para la receta o el item a crear
        const levelReq = recipe.levelReq || itemToCraftBase.levelReq || 0;
        if (player.level < levelReq) canCraft = false;
        
        let detailsHtml = itemToCraftBase.description ? `<span class="item-details">${itemToCraftBase.description}</span>` : '';
        if (itemToCraftBase.stats) {
            detailsHtml += `<span class="item-details">ATK:${itemToCraftBase.stats.attack || 0} DEF:${itemToCraftBase.stats.defense || 0} HP:${itemToCraftBase.stats.hp || 0} MP:${itemToCraftBase.stats.mp || 0}</span>`;
        }

        let disabledMessage = "";
        if (!canCraft) {
            if (player.level < levelReq) disabledMessage = `Nivel ${levelReq} requerido.`;
            else if (player.col < recipe.cost) disabledMessage = "Col insuficiente.";
            else disabledMessage = "Materiales insuficientes.";
        }
        
        return {
            icon: itemToCraftBase.icon,
            name: itemToCraftBase.name,
            details: detailsHtml,
            levelReq: levelReq > 0 ? `Req. LV: ${levelReq}` : '',
            materials: materialsHtml,
            price: `Coste: ${recipe.cost} Col`,
            chance: `Éxito: ${(recipe.chance * 100).toFixed(0)}%`,
            onClick: () => attemptForge(recipe.itemId), // Pasar el ID del item a forjar (que es la key de la receta)
            disabled: !canCraft,
            disabledMessage: disabledMessage,
            itemClass: 'blacksmith-item'
        };
    }, "No hay recetas de forja disponibles en este piso.");
}

/**
 * Intenta forjar un objeto basado en su ID de receta (que es el mismo que el itemID a crear).
 * @param {string} recipeKey - La clave de la receta en el objeto blacksmithRecipes (generalmente el ID del item a crear).
 */
export function attemptForge(recipeKey) {
    const recipe = blacksmithRecipes[recipeKey];
    if (!recipe) {
        showNotification("Receta no encontrada.", "error");
        return;
    }
    const itemToCraftBase = baseItems[recipe.itemId]; // recipe.itemId es el producto final
    if (!itemToCraftBase) {
        showNotification("Objeto a crear no encontrado en la base de datos.", "error");
        return;
    }

    // Doble chequeo de condiciones (aunque el botón debería estar deshabilitado)
    let canCraftCheck = true;
    for (const matId in recipe.materials) {
        if ((player.materials[matId] || 0) < recipe.materials[matId]) canCraftCheck = false;
    }
    if (player.col < recipe.cost) canCraftCheck = false;
    const levelReq = recipe.levelReq || itemToCraftBase.levelReq || 0;
    if (player.level < levelReq) canCraftCheck = false;

    if (!canCraftCheck) {
        showNotification("No cumples los requisitos para forjar este objeto.", "error");
        return;
    }

    // Consumir materiales y Col
    for (const matId in recipe.materials) {
        player.materials[matId] -= recipe.materials[matId];
    }
    player.col -= recipe.cost;

    showNotification(`Intentando forjar ${itemToCraftBase.name}...`, "default");

    // Simular intento de forja
    if (Math.random() < recipe.chance) {
        addItemToInventory({ id: recipe.itemId }, 1); // Añadir el objeto forjado
        showNotification(`¡FORJA EXITOSA! Creaste ${itemToCraftBase.name} ${itemToCraftBase.icon || ''}!`, "success", 7000);
    } else {
        showNotification(`FORJA FALLIDA... ${itemToCraftBase.name} se rompió en el proceso.`, "error", 7000);
        // Opcional: devolver una parte de los materiales o nada.
    }

    updatePlayerHUD();
    renderBlacksmithRecipes(); // Re-renderizar para actualizar UI de herrería
    if (uiStates.isInventoryModalOpen) { // Si el inventario está abierto, re-renderizarlo
         renderFullInventory();
    }
    saveGame();
}
