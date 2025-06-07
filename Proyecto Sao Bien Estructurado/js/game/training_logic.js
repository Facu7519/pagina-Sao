// js/game/training_logic.js

import { player } from './game_state.js'; // 'uiStates' y 'updatePlayerHUD', 'calculateEffectiveStats' removidos de la importación
import { domElements } from '../dom.js';
import { showNotification, renderGridItems } from '../utils.js';
import { saveGame } from './persistence_logic.js';
import { calculateEffectiveStats } from './player_logic.js'; // Importar correctamente desde player_logic.js
import { updatePlayerHUD } from './hud_logic.js'; // Importar updatePlayerHUD desde hud_logic.js

const BASE_TRAINING_COST = 50; // Costo base del entrenamiento

/**
 * Calcula el costo actual del entrenamiento basado en el nivel del jugador.
 * @returns {number} El costo del entrenamiento.
 */
function getCurrentTrainingCost() {
    return BASE_TRAINING_COST * player.level;
}

/**
 * Abre el modal de entrenamiento y muestra las opciones.
 */
export function openTrainingModal() {
    if (!domElements.trainingModal || !domElements.trainingPlayerCol || !domElements.trainingStatsPreview || !domElements.trainingGridDisplay) {
        console.error("Elementos del DOM para el modal de entrenamiento no encontrados.");
        return;
    }

    const cost = getCurrentTrainingCost();
    domElements.trainingPlayerCol.textContent = player.col; // Mostrar Col del jugador
    
    // Mostrar ganancias estimadas
    domElements.trainingStatsPreview.innerHTML = `
        <li>Ataque Base: +1</li>
        <li>Defensa Base: +0-2 (aleatorio)</li>
        <li>HP Máx. Base: +5</li>
        <li>MP Máx. Base: +2</li>
        <li>Costo: ${cost} Col</li>
    `;

    // Renderizar la opción de entrenamiento
    // Usamos renderGridItems aunque solo sea una opción para mantener consistencia, o podríamos hacerlo directamente.
    const trainingOptions = [{
        id: 'physical_training',
        name: 'Entrenamiento Físico Intensivo',
        description: 'Mejora tus atributos de combate fundamentales.',
        cost: cost,
    }];

    renderGridItems(domElements.trainingGridDisplay, trainingOptions, (option) => {
        const canAfford = player.col >= option.cost;
        return {
            icon: '💪', // Icono para entrenamiento
            name: option.name,
            details: `<span class="item-details">${option.description}</span>`,
            price: `Costo: ${option.cost} Col`,
            onClick: () => performTraining(option.id),
            disabled: !canAfford,
            disabledMessage: !canAfford ? "Col insuficiente." : "",
            itemClass: 'training-option' // Clase CSS específica si es necesario
        };
    }, "No hay opciones de entrenamiento disponibles (esto no debería ocurrir).");
    
    player.uiStates.isTrainingModalOpen = true;
    domElements.trainingModal.style.display = 'block';
}

/**
 * Realiza la acción de entrenamiento.
 * @param {string} trainingId - El ID del tipo de entrenamiento (actualmente solo 'physical_training').
 */
export function performTraining(trainingId) {
    const cost = getCurrentTrainingCost();

    if (player.col >= cost) {
        player.col -= cost;

        // Aplicar mejoras de estadísticas
        player.baseAttack += 1;
        player.baseDefense += Math.floor(Math.random() * 3); // 0, 1, or 2
        player.baseMaxHp += 5;
        player.baseMaxMp += 2;

        // Es crucial recalcular estadísticas efectivas y actualizar HP/MP actuales
        calculateEffectiveStats(); 
        
        // Restaurar HP/MP por el aumento en MaxHP/MaxMP, sin sobrepasar el nuevo máximo
        player.hp = Math.min(player.hp + 5, player.maxHp); 
        player.mp = Math.min(player.mp + 2, player.maxMp);

        showNotification("¡Entrenamiento completado! Tus atributos base han mejorado.", "success");
        updatePlayerHUD(); // Actualizar el HUD principal
        
        // Re-renderizar el modal de entrenamiento para mostrar el nuevo costo y saldo de Col
        // (o simplemente actualizar los elementos necesarios directamente)
        openTrainingModal(); 
        
        saveGame();
    } else {
        showNotification(`Necesitas ${cost} Col para entrenar.`, "error");
    }
}

/**
 * Cierra el modal de entrenamiento.
 */
export function closeTrainingModal() {
    player.uiStates.isTrainingModalOpen = false;
    domElements.trainingModal.style.display = 'none';
}