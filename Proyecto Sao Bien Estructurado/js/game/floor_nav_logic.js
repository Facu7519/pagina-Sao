// js/game/floor_nav_logic.js

import { player } from './game_state.js'; // 'uiStates' removido de la importación
import { domElements } from '../dom.js';
import { showNotification } from '../utils.js';
import { floorData } from '../data/floor_data_db.js';
import { saveGame } from './persistence_logic.js';
import { updateQuestProgress } from './quests_logic.js';
import { updatePlayerHUD } from './hud_logic.js'; // Importar updatePlayerHUD directamente

/**
 * Renderiza la selección de pisos disponibles para viajar en el modal de navegación.
 */
export function renderFloorSelection() {
    if (!domElements.floorSelectGrid) {
        console.error("Elemento DOM para la cuadrícula de selección de pisos no encontrado.");
        return;
    }
    domElements.floorSelectGrid.innerHTML = ''; // Limpiar opciones anteriores

    const totalFloorsInGameData = Object.keys(floorData).length;

    for (let i = 1; i <= totalFloorsInGameData; i++) {
        const floor = floorData[i];
        if (!floor) continue; // Saltar si no hay datos para este número de piso

        const floorBtn = document.createElement('button');
        floorBtn.className = 'action-btn'; // Reutilizar clase de botón de acción o crear una específica
        floorBtn.textContent = `Piso ${i}: ${floor.name}`;
        
        const isUnlocked = player.unlockedFloors.includes(i);
        floorBtn.disabled = !isUnlocked;
        if (!isUnlocked) {
            floorBtn.title = "Piso bloqueado";
        }

        floorBtn.onclick = () => {
            if (player.currentFloor !== i) {
                changeFloor(i);
                closeFloorNavigationModal(); // Cierra el modal después de la selección
            } else {
                showNotification(`Ya estás en el Piso ${i}.`, 'default');
            }
        };
        domElements.floorSelectGrid.appendChild(floorBtn);
    }
}

/**
 * Cambia el piso actual del jugador.
 * @param {number} newFloorNumber - El número del piso al que viajar.
 */
export function changeFloor(newFloorNumber) {
    if (player.unlockedFloors.includes(newFloorNumber) && floorData[newFloorNumber]) {
        player.currentFloor = newFloorNumber;
        updatePlayerHUD(); // Actualiza el HUD para mostrar el nuevo piso y nombre
        showNotification(`Viajaste al Piso ${newFloorNumber}: ${floorData[newFloorNumber].name}.`, 'default');
        
        // Actualizar progreso de misiones si la misión es alcanzar este piso
        updateQuestProgress('reach_floor', newFloorNumber.toString(), 1);
        
        saveGame();
    } else {
        showNotification(`El Piso ${newFloorNumber} no está desbloqueado o no existe.`, 'error');
    }
}

/**
 * Abre el modal de navegación entre pisos.
 */
export function openFloorNavigationModal() {
    renderFloorSelection(); // Asegura que las opciones estén actualizadas
    player.uiStates.isFloorNavigationModalOpen = true;
    domElements.floorNavigationModal.style.display = 'block';
}

/**
 * Cierra el modal de navegación entre pisos.
 */
export function closeFloorNavigationModal() {
    player.uiStates.isFloorNavigationModalOpen = false;
    domElements.floorNavigationModal.style.display = 'none';
}