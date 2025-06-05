// js/game/quests_logic.js

import { player, uiStates, updatePlayerHUD, gainExp } from './game_state.js';
import { domElements } from '../dom.js';
import { showNotification } from '../utils.js';
import { baseItems } from '../data/items_db.js';
import { questDefinitions } from '../data/quests_db.js'; // Asumiendo que las definiciones de misiones están aquí
import { addItemToInventory, addMaterial } from './inventory_logic.js';
import { saveGame } from './persistence_logic.js'; // saveGame se llamará después de acciones de misión importantes

/**
 * Abre el modal de misiones y renderiza las listas de misiones.
 */
export function openQuestsModal() {
    if (!domElements.questsModal) {
        console.error("Modal de misiones no encontrado en el DOM.");
        return;
    }
    renderAllQuestLists();
    domElements.questDetailsArea.style.display = 'none'; // Ocultar detalles al abrir
    uiStates.isQuestsModalOpen = true;
    domElements.questsModal.style.display = 'block';
}

/**
 * Cierra el modal de misiones.
 */
export function closeQuestsModal() {
    if (!domElements.questsModal) return;
    uiStates.isQuestsModalOpen = false;
    domElements.questsModal.style.display = 'none';
}

/**
 * Renderiza todas las listas de misiones (disponibles, activas, completadas).
 */
export function renderAllQuestLists() {
    renderQuestList(domElements.availableQuestsList, 'available');
    renderQuestList(domElements.activeQuestsList, 'active');
    renderQuestList(domElements.completedQuestsList, 'completed');
}

/**
 * Renderiza una lista específica de misiones.
 * @param {HTMLElement} listElement - El elemento HTML (ul o div) donde se renderizará la lista.
 * @param {string} type - El tipo de lista ('available', 'active', 'completed').
 */
function renderQuestList(listElement, type) {
    if (!listElement) {
        console.error(`Elemento DOM para la lista de misiones tipo '${type}' no encontrado.`);
        return;
    }
    listElement.innerHTML = ''; // Limpiar lista anterior
    let questsToDisplay = [];

    if (type === 'available') {
        questsToDisplay = Object.entries(questDefinitions)
            .filter(([id, def]) =>
                !player.activeQuests.find(aq => aq.questId === id) &&
                !player.completedQuests.includes(id) &&
                player.level >= (def.levelReq || 0)
            )
            .map(([id, def]) => ({ ...def, id })); // Añadir el ID al objeto de la misión
    } else if (type === 'active') {
        questsToDisplay = player.activeQuests.map(aq => {
            const def = questDefinitions[aq.questId];
            return def ? { ...def, ...aq, id: aq.questId } : null; // Combinar definición con datos activos
        }).filter(q => q); // Filtrar nulos si alguna definición no se encontrara
    } else if (type === 'completed') {
        questsToDisplay = player.completedQuests.map(id => {
            const def = questDefinitions[id];
            return def ? { ...def, id, status: 'completed' } : null;
        }).filter(q => q);
    }

    if (questsToDisplay.length === 0) {
        listElement.innerHTML = `<p>No hay misiones ${type === 'available' ? 'disponibles actualmente' : (type === 'active' ? 'activas' : 'completadas')}.</p>`;
        return;
    }

    questsToDisplay.forEach(quest => {
        const questDiv = document.createElement('div');
        questDiv.className = 'quest-item';
        let titleHtml = `<h4>${quest.title} (LV ${quest.levelReq || 1})</h4>`;
        let statusTextHtml = '';

        if (type === 'active') {
            const progressPercent = quest.progress && quest.progress.target > 0 ? (quest.progress.current / quest.progress.target) * 100 : 0;
            titleHtml += `<div class="quest-progress-bar-container"><div class="quest-progress-bar-fill" style="width:${progressPercent}%"></div></div>`;
            if (quest.progress && quest.progress.current >= quest.progress.target) {
                statusTextHtml = `<p style="color:#FFD700;">¡Lista para reclamar!</p>`;
                questDiv.classList.add('claimable');
            } else if (quest.progress) {
                statusTextHtml = `<p>Progreso: ${quest.progress.current}/${quest.progress.target}</p>`;
            }
        } else if (type === 'completed') {
            questDiv.classList.add('completed');
            statusTextHtml = `<p style="color:#5cb85c;">Completada</p>`;
        }

        questDiv.innerHTML = titleHtml + statusTextHtml;
        questDiv.onclick = () => showQuestDetails(quest.id, type);
        listElement.appendChild(questDiv);
    });
}

/**
 * Muestra los detalles de una misión seleccionada en el área de detalles del modal.
 * @param {string} questId - El ID de la misión.
 * @param {string} listType - El tipo de lista desde donde se seleccionó ('available', 'active', 'completed').
 */
export function showQuestDetails(questId, listType) {
    const questDef = questDefinitions[questId];
    if (!questDef || !domElements.questDetailsArea) return;

    let questInstance = { ...questDef, id: questId }; // Copia para no modificar original
    if (listType === 'active') {
        const activeQ = player.activeQuests.find(aq => aq.questId === questId);
        if (activeQ) questInstance = { ...questInstance, ...activeQ };
    }

    domElements.questDetailTitle.textContent = questDef.title;
    domElements.questDetailDescription.textContent = questDef.description;

    domElements.questDetailObjectives.innerHTML = '';
    const objectiveLi = document.createElement('li');
    let objectiveText = `${getQuestActionText(questDef.type)} ${questDef.targetCount} ${getTargetName(questDef.type, questDef.targetId)}`;
    if (questInstance.progress) {
        objectiveText += ` (${questInstance.progress.current}/${questInstance.progress.target})`;
    }
    objectiveLi.textContent = objectiveText;
    domElements.questDetailObjectives.appendChild(objectiveLi);

    domElements.questDetailRewards.innerHTML = '';
    if (questDef.rewards.col) domElements.questDetailRewards.innerHTML += `<li>${questDef.rewards.col} Col</li>`;
    if (questDef.rewards.exp) domElements.questDetailRewards.innerHTML += `<li>${questDef.rewards.exp} EXP</li>`;
    if (questDef.rewards.itemId && baseItems[questDef.rewards.itemId]) {
        domElements.questDetailRewards.innerHTML += `<li>${baseItems[questDef.rewards.itemId].name} x${questDef.rewards.itemQty || 1}</li>`;
    }

    const actionBtn = domElements.questActionBtn;
    if (listType === 'available') {
        actionBtn.textContent = 'Aceptar Misión';
        actionBtn.onclick = () => acceptQuest(questId);
        actionBtn.disabled = false;
    } else if (listType === 'active' && questInstance.progress && questInstance.progress.current >= questInstance.progress.target) {
        actionBtn.textContent = 'Reclamar Recompensa';
        actionBtn.onclick = () => claimQuestReward(questId);
        actionBtn.disabled = false;
    } else if (listType === 'active') {
        actionBtn.textContent = 'Misión en Progreso';
        actionBtn.onclick = null;
        actionBtn.disabled = true;
    } else { // Completed
        actionBtn.textContent = 'Misión Completada';
        actionBtn.onclick = null;
        actionBtn.disabled = true;
    }
    domElements.questDetailsArea.style.display = 'block';
}

function getQuestActionText(type) {
    switch (type) {
        case 'kill': return 'Matar';
        case 'kill_boss': return 'Derrotar al Jefe';
        case 'collect': return 'Recolectar';
        case 'reach_floor': return 'Alcanzar el';
        default: return 'Completar';
    }
}

function getTargetName(type, targetId) {
    if (type === 'collect' && baseItems[targetId]) {
        return baseItems[targetId].name;
    }
    if (type === 'reach_floor') {
        return `Piso ${targetId}`;
    }
    // Para 'kill' o 'kill_boss', targetId es el nombre del monstruo/jefe
    return targetId;
}


/**
 * Acepta una misión disponible.
 * @param {string} questId - El ID de la misión a aceptar.
 */
export function acceptQuest(questId) {
    if (player.activeQuests.find(q => q.questId === questId) || player.completedQuests.includes(questId)) {
        showNotification("Ya has interactuado con esta misión.", "error");
        return;
    }
    const questDef = questDefinitions[questId];
    if (!questDef) {
        showNotification("Misión no encontrada.", "error");
        return;
    }
    if (player.level < (questDef.levelReq || 0)) {
        showNotification(`Nivel ${questDef.levelReq} requerido para aceptar esta misión.`, "error");
        return;
    }

    player.activeQuests.push({
        questId: questId,
        progress: { current: 0, target: questDef.targetCount }
    });
    showNotification(`Misión "${questDef.title}" aceptada.`, "success");
    renderAllQuestLists();
    if (domElements.questDetailsArea) domElements.questDetailsArea.style.display = 'none';
    saveGame();
}

/**
 * Actualiza el progreso de las misiones activas del jugador.
 * @param {string} actionType - Tipo de acción que podría progresar una misión (e.g., 'kill', 'collect', 'reach_floor').
 * @param {string} targetId - El ID del objetivo (nombre del monstruo, ID del item, número de piso).
 * @param {number} amount - La cantidad de progreso (por defecto 1).
 */
export function updateQuestProgress(actionType, targetId, amount = 1) {
    let questProgressMade = false;
    player.activeQuests.forEach(activeQuest => {
        const questDef = questDefinitions[activeQuest.questId];
        // Si la misión ya está lista para reclamar o no existe definición, no hacer nada.
        if (!questDef || (activeQuest.progress && activeQuest.progress.current >= activeQuest.progress.target)) {
            return;
        }

        let match = false;
        // Comprobar si el tipo de acción y el objetivo coinciden con los de la misión
        if (questDef.type === actionType && questDef.targetId === targetId) {
            match = true;
        }
        // Caso especial para 'kill_boss' que puede ser un tipo específico en questDef
        // o simplemente un 'kill' con un targetId de jefe.
        // Asumimos que 'kill_boss' es un tipo de misión distinto si se usa así.
        // Si una misión 'kill' tiene como targetId el nombre de un jefe, también debería funcionar.

        if (match) {
            activeQuest.progress.current = Math.min(activeQuest.progress.current + amount, activeQuest.progress.target);
            questProgressMade = true;
            showNotification(`Progreso en "${questDef.title}": ${activeQuest.progress.current}/${activeQuest.progress.target}`, "default", 2500);
            if (activeQuest.progress.current >= activeQuest.progress.target) {
                showNotification(`¡Objetivo de "${questDef.title}" completado! Reclama tu recompensa.`, "success", 4000);
            }
        }
    });

    if (questProgressMade) {
        if (uiStates.isQuestsModalOpen && domElements.questsModal.style.display === 'block') {
            renderAllQuestLists();
            // Si el detalle de alguna misión estaba abierto, refrescarlo también
            // Esto es más complejo, por ahora solo refresca las listas.
            const displayedQuestId = domElements.questDetailTitle?.textContent; // Podríamos guardar el ID de la misión mostrada
            // y llamar a showQuestDetails si coincide.
        }
        saveGame();
    }
}


/**
 * Reclama la recompensa de una misión completada.
 * @param {string} questId - El ID de la misión a reclamar.
 */
export function claimQuestReward(questId) {
    const activeQuestIndex = player.activeQuests.findIndex(q => q.questId === questId);
    if (activeQuestIndex === -1) {
        showNotification("Esta misión no está activa o ya fue reclamada.", "error");
        return;
    }

    const activeQuest = player.activeQuests[activeQuestIndex];
    const questDef = questDefinitions[questId];

    if (!questDef || !activeQuest.progress || activeQuest.progress.current < activeQuest.progress.target) {
        showNotification("Aún no has completado todos los objetivos de la misión.", "error");
        return;
    }

    // Otorgar recompensas
    let rewardMessages = [];
    if (questDef.rewards.col) {
        player.col += questDef.rewards.col;
        rewardMessages.push(`${questDef.rewards.col} Col`);
    }
    if (questDef.rewards.exp) {
        gainExp(questDef.rewards.exp); // gainExp maneja su propia notificación y actualización de HUD
        rewardMessages.push(`${questDef.rewards.exp} EXP`);
    }
    if (questDef.rewards.itemId && baseItems[questDef.rewards.itemId]) {
        const itemBase = baseItems[questDef.rewards.itemId];
        const quantity = questDef.rewards.itemQty || 1;
        if (itemBase.type === 'material') {
            addMaterial(questDef.rewards.itemId, quantity);
        } else {
            addItemToInventory({ id: questDef.rewards.itemId }, quantity);
        }
        rewardMessages.push(`${itemBase.name} x${quantity}`);
    }

    showNotification(`¡Recompensa de "${questDef.title}" reclamada! (${rewardMessages.join(', ')})`, "success", 7000);

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
 * @returns {boolean} - True si la misión está completada, false en caso contrario.
 */
export function isQuestCompleted(questId) {
    return player.completedQuests.includes(questId);
}