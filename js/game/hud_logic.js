// js/game/hud_logic.js
import { player } from './game_state.js';
import { domElements } from '../dom.js';
import { updateResourceBar, showNotification as utilShowNotification } from '../utils.js'; // Renombrar para evitar conflicto si se define showNotification localmente
import { floorData } from '../data/floor_data_db.js';
import { statusEffects } from '../data/status_effects_db.js'; // Para mostrar iconos y tooltips
import { calculateEffectiveStats } from './player_logic.js';


/**
 * Actualiza toda la Interfaz de Usuario (HUD) principal con los datos actuales del jugador.
 * Llama a calculateEffectiveStats antes de actualizar para asegurar que los datos son correctos.
 */
export function updatePlayerHUD() {
    calculateEffectiveStats(); // Asegurar que maxHp, maxMp, etc., estén actualizados

    if (domElements.saoPlayerNameDisplay) domElements.saoPlayerNameDisplay.textContent = player.name || "Jugador";
    
    // Actualizar barra de HP y texto en el HUD principal
    if (domElements.saoHpBar) updateResourceBar(domElements.saoHpBar, player.hp, player.maxHp, true);
    if (domElements.playerHpCurrentText) domElements.playerHpCurrentText.textContent = player.hp;
    if (domElements.playerHpMaxText) domElements.playerHpMaxText.textContent = player.maxHp;
    
    if (domElements.playerLevelText) domElements.playerLevelText.textContent = player.level;

    // Actualizar barra de MP y texto
    if (domElements.mpBarFillElement) updateResourceBar(domElements.mpBarFillElement, player.mp, player.maxMp);
    if (domElements.playerMpCurrentElement) domElements.playerMpCurrentElement.textContent = player.mp;
    if (domElements.playerMpMaxElement) domElements.playerMpMaxElement.textContent = player.maxMp;
    
    // Actualizar barra de EXP y texto
    if (domElements.expBarFillElement) updateResourceBar(domElements.expBarFillElement, player.currentExp, player.neededExp);
    if (domElements.currentExpElement) domElements.currentExpElement.textContent = player.currentExp;
    if (domElements.neededExpElement) domElements.neededExpElement.textContent = player.neededExp;

    if (domElements.playerColElement) domElements.playerColElement.textContent = player.col;
    if (domElements.currentFloorElement) domElements.currentFloorElement.textContent = player.currentFloor;
    if (domElements.floorNameElement) domElements.floorNameElement.textContent = floorData[player.currentFloor]?.name || "Desconocido";
    
    // Actualizar costo de entrenamiento visible
    if (domElements.trainCostDisplay) domElements.trainCostDisplay.textContent = 50 * player.level;

    // Mostrar efectos de estado en el HUD principal
    if (domElements.playerStatusEffectsDisplay) {
        displayStatusEffectsOnHUD(domElements.playerStatusEffectsDisplay, player.activeStatusEffects);
    }
}

/**
 * Muestra los iconos de los efectos de estado activos del jugador en el HUD.
 * @param {HTMLElement} displayElement - El elemento del DOM donde se mostrarán los iconos.
 * @param {Array<Object>} effectsArray - El array de efectos de estado activos del jugador.
 */
function displayStatusEffectsOnHUD(displayElement, effectsArray) {
    if (!displayElement) return;
    displayElement.innerHTML = ''; // Limpiar efectos anteriores
    
    if (!effectsArray || effectsArray.length === 0) return;

    effectsArray.forEach(effectInstance => {
        const effectDefinition = statusEffects[effectInstance.type];
        if (effectDefinition) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'status-effect-icon tooltip'; // Añadir clase tooltip
            iconSpan.textContent = effectDefinition.icon;
            iconSpan.style.color = effectDefinition.color || '#ffffff'; // Usar color definido o blanco por defecto

            // Crear el texto del tooltip
            const tooltipTextSpan = document.createElement('span');
            tooltipTextSpan.className = 'tooltiptext';
            tooltipTextSpan.textContent = `${effectDefinition.name}: ${effectDefinition.description} (Duración: ${effectInstance.duration} turnos)`;
            
            iconSpan.appendChild(tooltipTextSpan);
            displayElement.appendChild(iconSpan);
        }
    });
}