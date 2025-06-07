// js/game/quests_logic.js

import { player } from './game_state.js';
import { domElements } from '../dom.js';
import { showNotification } from '../utils.js';
import { baseItems } from '../data/items_db.js';
import { questDefinitions } from '../data/quests_db.js'; // Importar solo las definiciones
import { addItemToInventory, addMaterial } from './inventory_logic.js';
import { saveGame } from './persistence_logic.js';
import { gainExp } from './player_logic.js';
import { updatePlayerHUD } from './hud_logic.js';

/**
 * Inicializa las definiciones de las misiones.
 * En este caso, simplemente asegura que el objeto questDefinitions esté cargado,
 * ya que se importa directamente desde quests_db.js.
 * Si se necesitara una lógica más compleja de inicialización (ej. cargar desde una API), iría aquí.
 */
export function initializeQuestDefinitions() {
    // console.log("Misiones inicializadas. Total de misiones definidas:", Object.keys(questDefinitions).length);
    // No hay una lógica de inicialización compleja aquí, ya que questDefinitions se importa directamente.
    // Esta función es principalmente para satisfacer la llamada en main.js y como un placeholder.
}

/**
 * Abre el modal de misiones y renderiza las listas de misiones.
 */
export function openQuestsModal() {
    if (!domElements.questsModal) {
        console.error("Modal de misiones no encontrado en el DOM.");
        return;
    }
    renderAllQuestLists();
    // Asegurarse de que el área de detalles de la misión exista antes de intentar manipularla
    if (domElements.questDetailsArea) {
        domElements.questDetailsArea.style.display = 'none'; // Ocultar detalles al abrir
    }
    player.uiStates.isQuestsModalOpen = true; // Acceso correcto a uiStates
    domElements.questsModal.style.display = 'block';
}

/**
 * Cierra el modal de misiones.
 */
export function closeQuestsModal() {
    if (!domElements.questsModal) return;
    player.uiStates.isQuestsModalOpen = false; // Acceso correcto
    domElements.questsModal.style.display = 'none';
}

/**
 * Renderiza todas las listas de misiones: disponibles, activas y completadas.
 */
export function renderAllQuestLists() {
    renderAvailableQuests();
    renderActiveQuests();
    renderCompletedQuests();
}

/**
 * Renderiza las misiones disponibles para el jugador.
 */
function renderAvailableQuests() {
    if (!domElements.availableQuestsList) return;
    domElements.availableQuestsList.innerHTML = '';
    
    // Filtra las misiones que el jugador no tiene activas ni completadas y cumple el nivel
    const questsToShow = Object.entries(questDefinitions).filter(([questId, questDef]) => {
        return !isQuestActive(questId) && !isQuestCompleted(questId) && player.level >= questDef.levelReq;
    });

    if (questsToShow.length === 0) {
        domElements.availableQuestsList.innerHTML = '<p class="empty-list-message">No hay misiones disponibles.</p>';
        return;
    }

    questsToShow.forEach(([questId, questDef]) => {
        const questItem = document.createElement('div');
        questItem.className = 'quest-item available';
        questItem.innerHTML = `
            <h4>${questDef.title}</h4>
            <p>${questDef.description}</p>
            <small>Req. LV: ${questDef.levelReq}</small>
        `;
        questItem.onclick = () => showQuestDetails(questId, 'available');
        domElements.availableQuestsList.appendChild(questItem);
    });
}

/**
 * Renderiza las misiones activas del jugador.
 */
function renderActiveQuests() {
    if (!domElements.activeQuestsList) return;
    domElements.activeQuestsList.innerHTML = '';

    if (player.activeQuests.length === 0) {
        domElements.activeQuestsList.innerHTML = '<p class="empty-list-message">No tienes misiones activas.</p>';
        return;
    }

    player.activeQuests.forEach(activeQuest => {
        const questDef = questDefinitions[activeQuest.questId];
        if (!questDef) return;

        const isObjectiveComplete = isQuestObjectiveCompleted(activeQuest.questId);
        const progressPercentage = (activeQuest.currentCount / questDef.targetCount) * 100;

        const questItem = document.createElement('div');
        questItem.className = `quest-item active ${isObjectiveComplete ? 'completed-objective' : ''}`;
        questItem.innerHTML = `
            <h4>${questDef.title}</h4>
            <p>Progreso: ${activeQuest.currentCount}/${questDef.targetCount}</p>
            <div class="quest-progress-bar-container">
                <div class="quest-progress-bar-fill" style="width: ${progressPercentage}%;"></div>
            </div>
        `;
        questItem.onclick = () => showQuestDetails(activeQuest.questId, 'active');
        domElements.activeQuestsList.appendChild(questItem);
    });
}

/**
 * Renderiza las misiones completadas del jugador.
 */
function renderCompletedQuests() {
    if (!domElements.completedQuestsList) return;
    domElements.completedQuestsList.innerHTML = '';

    if (player.completedQuests.length === 0) {
        domElements.completedQuestsList.innerHTML = '<p class="empty-list-message">No has completado misiones.</p>';
        return;
    }

    player.completedQuests.forEach(questId => {
        const questDef = questDefinitions[questId];
        if (!questDef) return;

        const questItem = document.createElement('div');
        questItem.className = 'quest-item completed';
        questItem.innerHTML = `
            <h4>${questDef.title}</h4>
            <p>¡Completada!</p>
        `;
        questItem.onclick = () => showQuestDetails(questId, 'completed');
        domElements.completedQuestsList.appendChild(questItem);
    });
}


/**
 * Muestra los detalles de una misión seleccionada en el área de detalles.
 * @param {string} questId - El ID de la misión.
 * @param {string} listType - El tipo de lista de donde viene la misión ('available', 'active', 'completed', 'admin').
 */
export function showQuestDetails(questId, listType) {
    const questDef = questDefinitions[questId];
    if (!questDef) {
        console.error("Definición de misión no encontrada:", questId);
        // Ocultar el área de detalles si la misión no se encuentra
        if (domElements.questDetailsArea) domElements.questDetailsArea.style.display = 'none';
        return;
    }

    // Asegurarse de que los elementos existan antes de intentar setear su contenido
    if (domElements.questDetailTitle) domElements.questDetailTitle.textContent = questDef.title;
    if (domElements.questDetailDescription) domElements.questDetailDescription.textContent = questDef.description;
    
    // Objetivos
    if (domElements.questDetailObjectives) {
        domElements.questDetailObjectives.innerHTML = '';
        let objectiveText = '';
        const activeQuest = player.activeQuests.find(aq => aq.questId === questId);

        switch (questDef.type) {
            case 'kill':
                objectiveText = `Derrota ${questDef.targetCount}x ${questDef.targetId}.`;
                if (activeQuest) objectiveText += ` (${activeQuest.currentCount}/${questDef.targetCount})`;
                break;
            case 'collect':
                const materialName = baseItems[questDef.targetId]?.name || questDef.targetId;
                objectiveText = `Recolecta ${questDef.targetCount}x ${materialName}.`;
                if (activeQuest) objectiveText += ` (${activeQuest.currentCount}/${questDef.targetCount})`;
                break;
            case 'kill_boss':
                objectiveText = `Derrota a ${questDef.targetId}.`;
                if (activeQuest) objectiveText += ` (${activeQuest.currentCount}/${questDef.targetCount})`;
                break;
            case 'reach_floor':
                objectiveText = `Alcanza el Piso ${questDef.targetId}.`;
                if (activeQuest) objectiveText += ` (Piso Actual: ${player.currentFloor})`;
                break;
            default:
                objectiveText = "Objetivo desconocido.";
                break;
        }
        const liObj = document.createElement('li');
        liObj.textContent = objectiveText;
        domElements.questDetailObjectives.appendChild(liObj);
    }

    // Recompensas
    if (domElements.questDetailRewards) {
        domElements.questDetailRewards.innerHTML = '';
        const rewards = questDef.rewards;
        if (rewards.col) {
            const liCol = document.createElement('li');
            liCol.textContent = `Col: ${rewards.col} 💰`;
            domElements.questDetailRewards.appendChild(liCol);
        }
        if (rewards.exp) {
            const liExp = document.createElement('li');
            liExp.textContent = `EXP: ${rewards.exp} ✨`;
            domElements.questDetailRewards.appendChild(liExp);
        }
        if (rewards.itemId) {
            const itemBase = baseItems[rewards.itemId];
            if (itemBase) {
                const liItem = document.createElement('li');
                liItem.textContent = `${itemBase.icon || '❔'} ${itemBase.name} x${rewards.itemQty || 1}`;
                domElements.questDetailRewards.appendChild(liItem);
            }
        }
        if (!rewards.col && !rewards.exp && !rewards.itemId) {
            const liNoRewards = document.createElement('li');
            liNoRewards.textContent = "Sin recompensas adicionales.";
            domElements.questDetailRewards.appendChild(liNoRewards);
        }
    }

    const actionBtn = domElements.questActionBtn;
    if (actionBtn) {
        actionBtn.style.display = 'block'; // Mostrar el botón por defecto

        if (listType === 'available') {
            actionBtn.textContent = 'Aceptar Misión';
            actionBtn.onclick = () => acceptQuest(questId);
            actionBtn.disabled = player.level < questDef.levelReq;
            actionBtn.classList.remove('success-btn', 'default-btn');
            actionBtn.classList.add('default-btn'); // Color para aceptar
            if (actionBtn.disabled) {
                actionBtn.title = `Nivel ${questDef.levelReq} requerido para aceptar.`;
            } else {
                actionBtn.title = '';
            }
        } else if (listType === 'active') {
            const activeQuest = player.activeQuests.find(aq => aq.questId === questId);
            const isCompleted = isQuestObjectiveCompleted(questId);
            actionBtn.textContent = isCompleted ? 'Reclamar Recompensa' : 'Misión Activa';
            actionBtn.onclick = isCompleted ? () => claimQuestReward(questId) : null;
            actionBtn.disabled = !isCompleted;
            actionBtn.classList.remove('success-btn', 'default-btn');
            actionBtn.classList.add(isCompleted ? 'success-btn' : 'default-btn'); // Verde si completa, gris si activa pero no completa
            actionBtn.title = isCompleted ? 'Reclamar las recompensas de la misión.' : 'Objetivo no completado.';
        } else if (listType === 'completed') {
            actionBtn.textContent = 'Misión Completada';
            actionBtn.onclick = null;
            actionBtn.disabled = true;
            actionBtn.classList.remove('success-btn', 'default-btn');
            actionBtn.classList.add('default-btn'); // Gris para completadas
            actionBtn.title = 'Esta misión ya ha sido completada y reclamada.';
        } else if (listType === 'admin') {
            actionBtn.textContent = 'Editar Definición';
            actionBtn.onclick = null; // La edición se maneja con otros botones en el panel de admin
            actionBtn.disabled = true;
            actionBtn.style.display = 'none'; // Ocultar el botón si es solo para ver en admin
        }
    } else {
        console.warn("Botón de acción de misión (quest-action-btn) no encontrado.");
    }

    if (domElements.questDetailsArea) {
        domElements.questDetailsArea.style.display = 'block';
    }
}

/**
 * Acepta una misión para el jugador.
 * @param {string} questId - El ID de la misión a aceptar.
 */
function acceptQuest(questId) {
    const questDef = questDefinitions[questId];
    if (!questDef) {
        showNotification("Error: Misión no encontrada.", "error");
        return;
    }
    if (isQuestActive(questId)) {
        showNotification("Ya tienes esta misión activa.", "default");
        return;
    }
    if (isQuestCompleted(questId)) {
        showNotification("Ya completaste esta misión.", "default");
        return;
    }
    if (player.level < questDef.levelReq) {
        showNotification(`Necesitas ser Nivel ${questDef.levelReq} para aceptar esta misión.`, "error");
        return;
    }

    player.activeQuests.push({
        questId: questId,
        currentCount: 0,
        completed: false // 'completed' aquí significa que los objetivos se cumplieron, no que se reclamó
    });
    showNotification(`Misión \"${questDef.title}\" aceptada. ¡Buena suerte!`, "success");
    renderAllQuestLists();
    if (domElements.questDetailsArea) domElements.questDetailsArea.style.display = 'none';
    saveGame();
}

/**
 * Actualiza el progreso de una misión activa del jugador.
 * Esta función se llama desde otras lógicas del juego (combate, inventario, navegación).
 * @param {string} type - El tipo de evento que actualiza el progreso ('kill', 'collect', 'reach_floor').
 * @param {string} targetId - El ID del objetivo (nombre del monstruo, ID del item/material, número de piso).
 * @param {number} count - La cantidad a añadir al progreso (por defecto 1).
 */
export function updateQuestProgress(type, targetId, count = 1) {
    player.activeQuests.forEach(activeQuest => {
        const questDef = questDefinitions[activeQuest.questId];
        if (!questDef) return;

        // Si el tipo de evento coincide y el objetivo es el correcto
        if (questDef.type === type && questDef.targetId === targetId) {
            // Solo actualiza si la misión no está ya completada
            if (activeQuest.currentCount < questDef.targetCount) {
                activeQuest.currentCount = Math.min(activeQuest.currentCount + count, questDef.targetCount);
                
                // Marcar como completada una vez que el objetivo se cumple
                if (activeQuest.currentCount >= questDef.targetCount) {
                    activeQuest.completed = true;
                    showNotification(`¡Objetivo de misión \"${questDef.title}\" completado! Reclama tu recompensa.`, "success", 6000);
                } else {
                    // Solo notificar si no es el último incremento y no se completó la misión
                    showNotification(`Progreso de \"${questDef.title}\": ${activeQuest.currentCount}/${questDef.targetCount}`, "default", 3000);
                }
                renderActiveQuests(); // Re-renderizar para mostrar el progreso
                showQuestDetails(activeQuest.questId, 'active'); // Actualizar detalles si están visibles
                saveGame();
            }
        }
    });
}


/**
 * Reclama las recompensas de una misión completada.
 * @param {string} questId - El ID de la misión a reclamar.
 */
export function claimQuestReward(questId) {
    const activeQuestIndex = player.activeQuests.findIndex(aq => aq.questId === questId);
    if (activeQuestIndex === -1) {
        showNotification("Error: Misión no activa o ya reclamada.", "error");
        return;
    }

    const activeQuest = player.activeQuests[activeQuestIndex];
    const questDef = questDefinitions[questId];

    if (!questDef || !activeQuest.completed) {
        showNotification("Esta misión aún no está completada o no existe su definición.", "error");
        return;
    }

    const rewards = questDef.rewards;
    const rewardMessages = [];

    if (rewards.exp) {
        gainExp(rewards.exp); // Asume que gainExp actualiza el HUD y guarda el juego
        rewardMessages.push(`${rewards.exp} EXP`);
    }
    if (rewards.col) {
        player.col += rewards.col;
        rewardMessages.push(`${rewards.col} Col`);
    }
    if (rewards.itemId && rewards.itemId in baseItems) {
        const itemBase = baseItems[questDef.rewards.itemId];
        const quantity = questDef.rewards.itemQty || 1;
        if (itemBase.type === 'material') {
            addMaterial(questDef.rewards.itemId, quantity);
        } else {
            addItemToInventory({ id: questDef.rewards.itemId }, quantity);
        }
        rewardMessages.push(`${itemBase.name} x${quantity}`);
    }

    showNotification(`¡Recompensa de \"${questDef.title}\" reclamada! (${rewardMessages.join(', ')})`, "success", 7000);

    // Mover misión de activa a completada
    player.activeQuests.splice(activeQuestIndex, 1);
    player.completedQuests.push(questId);

    renderAllQuestLists();
    if (domElements.questDetailsArea) domElements.questDetailsArea.style.display = 'none';
    updatePlayerHUD(); // Actualizar HUD por si cambió Col o Nivel/EXP
    saveGame();
}

/**
 * Comprueba si una misión está activa.
 * @param {string} questId - El ID de la misión.
 * @returns {boolean} - True si la misión está activa, false en caso contrario.
 */
export function isQuestActive(questId) {
    return player.activeQuests.some(aq => aq.questId === questId);
}

/**
 * Comprueba si una misión ha sido completada (y reclamada).
 * @param {string} questId - El ID de la misión.
 * @returns {boolean} - True si la misión está en la lista de completadas.
 */
export function isQuestCompleted(questId) {
    return player.completedQuests.includes(questId);
}

/**
 * Comprueba si el objetivo de una misión activa ha sido completado.
 * Esto no significa que la recompensa haya sido reclamada.
 * @param {string} questId - El ID de la misión.
 * @returns {boolean} - True si el objetivo está completado.
 */
export function isQuestObjectiveCompleted(questId) {
    const activeQuest = player.activeQuests.find(aq => aq.questId === questId);
    if (!activeQuest) return false;

    const questDef = questDefinitions[activeQuest.questId];
    if (!questDef) return false;

    if (questDef.type === 'reach_floor') {
        return player.currentFloor >= parseInt(questDef.targetId, 10);
    }
    return activeQuest.currentCount >= questDef.targetCount;
}