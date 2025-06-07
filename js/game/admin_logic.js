// js/game/admin_logic.js

// Estrictamente basado en las dependencias inferidas del script.js original y la estructura del proyecto.
import { player } from './game_state.js';
import { baseItems } from '../data/items_db.js';
import { floorData } from '../data/floor_data_db.js';
import { questDefinitions } from '../data/quests_db.js'; // Asumiendo que se puede modificar directamente
import { domElements, getEl } from '../dom.js';
import { showNotification, openModal, closeModal } from '../utils.js'; // Funciones de utils.js
import { ADMIN_SECRET_KEY } from '../config.js';
import { saveGame } from './persistence_logic.js';
import { updatePlayerHUD } from './hud_logic.js';
import { gainExp, calculateEffectiveStats } from './player_logic.js'; // addItemToInventory y addMaterial removidos
import { addItemToInventory, addMaterial, renderInventory } from './inventory_logic.js'; // Importar correctamente
import { claimQuestReward, renderAllQuestLists, showQuestDetails } from './quests_logic.js'; // showQuestDetails aquí es la de quests_logic


/**
 * Muestra un mensaje en el panel de administrador.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} [type="default"] - El tipo de mensaje (e.g., "success", "error").
 */
function showAdminPanelMessage(message, type = "default") {
    if (!domElements.adminPanelMessage) {
        console.error("Elemento adminPanelMessage no encontrado en domElements.");
        return;
    }
    domElements.adminPanelMessage.textContent = message;
    domElements.adminPanelMessage.className = `admin-feedback-message ${type}`;
    domElements.adminPanelMessage.style.display = 'block';
    setTimeout(() => {
        if (domElements.adminPanelMessage) { // Re-verificar por si acaso
            domElements.adminPanelMessage.style.display = 'none';
        }
    }, 5000);
}

/**
 * Objeto con las acciones de administrador. Será expuesto a window por main.js.
 */
export const adminActions = {
    giveItem: () => {
        if (!domElements.adminItemIdValueInput || !domElements.adminItemQuantityValueInput) return;
        const itemId = domElements.adminItemIdValueInput.value.trim();
        const quantity = parseInt(domElements.adminItemQuantityValueInput.value) || 1;

        if (!baseItems[itemId]) return showAdminPanelMessage(`Error: Item ID '${itemId}' no encontrado.`, "error");
        if (quantity < 1) return showAdminPanelMessage(`Error: Cantidad debe ser >= 1.`, "error");

        const itemBase = baseItems[itemId];
        if (itemBase.type === 'material') {
            addMaterial(itemId, quantity); // De inventory_logic.js
        } else {
            addItemToInventory({ id: itemId }, quantity); // De inventory_logic.js
        }
        showAdminPanelMessage(`${quantity} x ${itemBase.name} añadido(s).`, "success");
        if (domElements.inventoryModalElement && domElements.inventoryModalElement.style.display === 'block') {
            renderInventory(); // De inventory_logic.js
        }
        saveGame(); // De persistence_logic.js
    },

    showItemDetails: () => {
        if (!domElements.adminItemIdValueInput || !domElements.adminItemDetailsPreviewDiv) return;
        const itemId = domElements.adminItemIdValueInput.value.trim();
        const itemBase = baseItems[itemId];
        if (itemBase) {
            let details = `Nombre: ${itemBase.name} ${itemBase.icon || ''}\nTipo: ${itemBase.type}\nDesc: ${itemBase.description || 'N/A'}`;
            if (itemBase.stats) details += `\nStats: ATK:${itemBase.stats.attack || 0}, DEF:${itemBase.stats.defense || 0}, HP:${itemBase.stats.hp || 0}, MP:${itemBase.stats.mp || 0}`;
            if (itemBase.effect) details += `\nEfecto: ${JSON.stringify(itemBase.effect)}`;
            if (itemBase.levelReq) details += `\nReq. LV: ${itemBase.levelReq}`;
            domElements.adminItemDetailsPreviewDiv.innerHTML = details.replace(/\n/g, '<br>');
        } else {
            domElements.adminItemDetailsPreviewDiv.textContent = `Item ID '${itemId}' no encontrado.`;
        }
    },

    selectItemFromList: () => {
        if (!domElements.adminItemQuickSelect || !domElements.adminItemIdValueInput) return;
        const selectedItemId = domElements.adminItemQuickSelect.value;
        if (selectedItemId) {
            domElements.adminItemIdValueInput.value = selectedItemId;
            adminActions.showItemDetails();
        }
    },

    giveCol: () => {
        if (!domElements.adminGiveColValueInput) return;
        const amount = parseInt(domElements.adminGiveColValueInput.value);
        if (isNaN(amount) || amount < 0) return showAdminPanelMessage("Col inválido.", "error");
        player.col += amount;
        updatePlayerHUD(); // De hud_logic.js
        saveGame();
        showAdminPanelMessage(`${amount} Col añadidos. Total: ${player.col}.`, "success");
    },

    giveExp: () => {
        if (!domElements.adminGiveExpValueInput) return;
        const amount = parseInt(domElements.adminGiveExpValueInput.value);
        if (isNaN(amount) || amount < 0) return showAdminPanelMessage("EXP inválida.", "error");
        gainExp(amount); // De player_logic.js
        // saveGame() es llamado por gainExp si hay level up, sino aquí.
        saveGame();
        showAdminPanelMessage(`${amount} EXP añadidos.`, "success");
    },

    setLevel: () => {
        if (!domElements.adminSetLevelValueInput) return;
        const newLevel = parseInt(domElements.adminSetLevelValueInput.value);
        if (isNaN(newLevel) || newLevel < 1) return showAdminPanelMessage("Nivel inválido.", "error");
        player.level = newLevel;
        player.currentExp = 0;
        // calculateNeededExpForLevel debe estar en player_logic o utils. Suponiendo que gainExp(0) lo maneja o player_logic.
        gainExp(0); // Para recalcular neededExp y actualizar UI
        updatePlayerHUD();
        saveGame();
        showAdminPanelMessage(`Nivel establecido a ${newLevel}.`, "success");
    },

    setStat: (statName, inputId) => {
        const inputElement = getEl(inputId); // de dom.js
        if (!inputElement) return showAdminPanelMessage(`Elemento input '${inputId}' no encontrado.`, "error");

        const value = parseInt(inputElement.value);
        const isMaxHpOrMpStat = statName.toLowerCase().includes('maxhp') || statName.toLowerCase().includes('maxmp');
        if (isNaN(value) || value < (isMaxHpOrMpStat ? 1 : 0)) {
            return showAdminPanelMessage(`Valor inválido para ${statName}.`, "error");
        }
        player[statName] = value;
        calculateEffectiveStats(); // De player_logic.js
        updatePlayerHUD();
        saveGame();
        showAdminPanelMessage(`${statName} establecido a ${value}.`, "success");
    },

    grantFloorAccess: () => {
        if (!domElements.adminFloorNumberValueInput) return;
        const floorNumber = parseInt(domElements.adminFloorNumberValueInput.value);
        if (isNaN(floorNumber) || floorNumber < 1 || !floorData[floorNumber]) return showAdminPanelMessage("Piso inválido.", "error");

        if (!player.unlockedFloors.includes(floorNumber)) {
            player.unlockedFloors.push(floorNumber);
            if (floorData[floorNumber]) floorData[floorNumber].unlocked = true;
            updateAdminUnlockedFloorsList();
            saveGame();
            showAdminPanelMessage(`Acceso concedido al Piso ${floorNumber}.`, "success");
        } else {
            showAdminPanelMessage(`Piso ${floorNumber} ya desbloqueado.`, "default");
        }
    },

    revokeFloorAccess: () => {
        if (!domElements.adminFloorNumberValueInput) return;
        const floorNumber = parseInt(domElements.adminFloorNumberValueInput.value);
        if (isNaN(floorNumber) || floorNumber < 1 || !floorData[floorNumber]) return showAdminPanelMessage("Piso inválido.", "error");
        if (floorNumber === 1) return showAdminPanelMessage("No se puede revocar Piso 1.", "error");

        const index = player.unlockedFloors.indexOf(floorNumber);
        if (index > -1) {
            player.unlockedFloors.splice(index, 1);
            if (floorData[floorNumber]) floorData[floorNumber].unlocked = false;
            updateAdminUnlockedFloorsList();
            if (player.currentFloor === floorNumber) {
                player.currentFloor = 1;
                updatePlayerHUD();
                showAdminPanelMessage(`Acceso revocado al Piso ${floorNumber}. Movido al Piso 1.`, "success");
            } else {
                showAdminPanelMessage(`Acceso revocado al Piso ${floorNumber}.`, "success");
            }
            saveGame();
        } else {
            showAdminPanelMessage(`Piso ${floorNumber} no estaba desbloqueado.`, "default");
        }
    },

    populateQuestAdminSection: () => {
        if (!domElements.adminQuestDefinitionSelect) return;
        domElements.adminQuestDefinitionSelect.innerHTML = Object.keys(questDefinitions)
            .map(id => `<option value="${id}">${questDefinitions[id].title} (${id})</option>`).join('');
        adminActions.populatePlayerQuestSelect();
    },

    populatePlayerQuestSelect: () => {
        if (!domElements.adminPlayerQuestSelect) return;
        domElements.adminPlayerQuestSelect.innerHTML = player.activeQuests
            .map(aq => `<option value="${aq.questId}">${questDefinitions[aq.questId]?.title || aq.questId}</option>`).join('');
    },

    loadQuestDefinitionForEditing: () => {
        if (!domElements.adminQuestDefinitionSelect) return;
        const questId = domElements.adminQuestDefinitionSelect.value;
        const def = questDefinitions[questId];
        if (def) {
            domElements.adminQuestIdInput.value = questId;
            domElements.adminQuestTitleInput.value = def.title;
            domElements.adminQuestDescriptionInput.value = def.description;
            domElements.adminQuestTypeSelect.value = def.type;
            domElements.adminQuestTargetIdInput.value = def.targetId;
            domElements.adminQuestTargetCountInput.value = def.targetCount;
            domElements.adminQuestLevelReqInput.value = def.levelReq || 0;
            domElements.adminQuestRewardColInput.value = def.rewards.col || 0;
            domElements.adminQuestRewardExpInput.value = def.rewards.exp || 0;
            domElements.adminQuestRewardItemIdInput.value = def.rewards.itemId || '';
            domElements.adminQuestRewardItemQtyInput.value = def.rewards.itemQty || 0;
            showAdminPanelMessage(`Definición de '${questId}' cargada para editar.`, "default");
        }
    },

    saveQuestDefinition: () => {
        const id = domElements.adminQuestIdInput.value.trim();
        if (!id) return showAdminPanelMessage("ID de misión es requerido.", "error");

        questDefinitions[id] = { // Modifica directamente el objeto importado
            title: domElements.adminQuestTitleInput.value.trim(),
            description: domElements.adminQuestDescriptionInput.value.trim(),
            type: domElements.adminQuestTypeSelect.value,
            targetId: domElements.adminQuestTargetIdInput.value.trim(),
            targetCount: parseInt(domElements.adminQuestTargetCountInput.value) || 1,
            levelReq: parseInt(domElements.adminQuestLevelReqInput.value) || 0,
            rewards: {
                col: parseInt(domElements.adminQuestRewardColInput.value) || 0,
                exp: parseInt(domElements.adminQuestRewardExpInput.value) || 0,
                itemId: domElements.adminQuestRewardItemIdInput.value.trim() || null,
                itemQty: parseInt(domElements.adminQuestRewardItemQtyInput.value) || 0,
            }
        };
        showAdminPanelMessage(`Definición de misión '${id}' guardada.`, "success");
        adminActions.populateQuestAdminSection();
        saveGame(); // persistence_logic se encarga de guardar el estado del jugador,
                    // que puede incluir questDefinitions si se gestiona así en persistence_logic.
    },

    deleteQuestDefinition: () => {
        if (!domElements.adminQuestDefinitionSelect) return;
        const questId = domElements.adminQuestDefinitionSelect.value;
        if (questDefinitions[questId]) {
            delete questDefinitions[questId]; // Modifica directamente

            player.activeQuests = player.activeQuests.filter(q => q.questId !== questId);
            player.completedQuests = player.completedQuests.filter(id => id !== questId);

            showAdminPanelMessage(`Definición de misión '${questId}' eliminada.`, "success");
            adminActions.clearQuestDefinitionForm();
            adminActions.populateQuestAdminSection();
            saveGame();
        } else {
            showAdminPanelMessage("Selecciona una misión para eliminar.", "error");
        }
    },

    clearQuestDefinitionForm: () => {
        // Usar los nombres exactos de las propiedades de domElements
        if(domElements.adminQuestIdInput) domElements.adminQuestIdInput.value = '';
        if(domElements.adminQuestTitleInput) domElements.adminQuestTitleInput.value = '';
        if(domElements.adminQuestDescriptionInput) domElements.adminQuestDescriptionInput.value = '';
        if(domElements.adminQuestTargetIdInput) domElements.adminQuestTargetIdInput.value = '';
        if(domElements.adminQuestTargetCountInput) domElements.adminQuestTargetCountInput.value = '';
        if(domElements.adminQuestLevelReqInput) domElements.adminQuestLevelReqInput.value = '';
        if(domElements.adminQuestRewardColInput) domElements.adminQuestRewardColInput.value = '';
        if(domElements.adminQuestRewardExpInput) domElements.adminQuestRewardExpInput.value = '';
        if(domElements.adminQuestRewardItemIdInput) domElements.adminQuestRewardItemIdInput.value = '';
        if(domElements.adminQuestRewardItemQtyInput) domElements.adminQuestRewardItemQtyInput.value = '';
        if (domElements.adminQuestTypeSelect) domElements.adminQuestTypeSelect.value = 'kill';
    },

    completePlayerQuest: () => {
        if (!domElements.adminPlayerQuestSelect) return;
        const questId = domElements.adminPlayerQuestSelect.value;
        const activeQuest = player.activeQuests.find(q => q.questId === questId);
        if (activeQuest) {
            activeQuest.progress.current = activeQuest.progress.target;
            showAdminPanelMessage(`Misión '${questId}' marcada como completable para el jugador.`, "success");
            claimQuestReward(questId); // De quests_logic.js
            adminActions.populatePlayerQuestSelect();
            if (domElements.questsModal && domElements.questsModal.style.display === 'block') {
               renderAllQuestLists(); // De quests_logic.js
               if (getEl('questDetailTitle') && getEl('questDetailTitle').textContent === questDefinitions[questId]?.title) {
                    showQuestDetails(questId, 'active'); // De quests_logic.js
               }
            }
            saveGame();
        } else {
            showAdminPanelMessage("Misión no activa para el jugador.", "error");
        }
    },

    resetPlayerQuest: () => {
        if (!domElements.adminPlayerQuestSelect) return;
        const questId = domElements.adminPlayerQuestSelect.value;
        const activeQuestIndex = player.activeQuests.findIndex(q => q.questId === questId);

        let message = "";
        if (activeQuestIndex > -1) {
            player.activeQuests.splice(activeQuestIndex, 1);
            message += `Misión activa '${questId}' reiniciada. `;
        }

        const completedIndex = player.completedQuests.indexOf(questId);
        if (completedIndex > -1) {
            player.completedQuests.splice(completedIndex, 1);
            message += `Misión completada '${questId}' eliminada del historial. `;
        }

        if (message) {
            showAdminPanelMessage(message.trim(), "success");
            adminActions.populatePlayerQuestSelect();
            if (domElements.questsModal && domElements.questsModal.style.display === 'block') {
                renderAllQuestLists();
                const questDetailsArea = getEl('questDetailsArea'); // Usar getEl por si acaso
                const questDetailTitle = getEl('questDetailTitle');
                if (questDetailsArea && questDetailsArea.style.display === 'block' && questDetailTitle && questDetailTitle.textContent.includes(questDefinitions[questId]?.title)) {
                    questDetailsArea.style.display = 'none';
                }
            }
            saveGame();
        } else {
            showAdminPanelMessage(`Misión '${questId}' no encontrada en activas o completadas.`, "default");
        }
    }
};

/**
 * Abre el modal de login de admin o el panel si ya está logueado.
 */
export function openAdminLoginModal() {
    if (player.isAdmin) {
        openAdminPanel();
    } else {
        openModal('adminKeyModal'); // De utils.js
        if (domElements.adminKeyValueInput) {
            domElements.adminKeyValueInput.value = '';
            domElements.adminKeyValueInput.focus();
        }
        if (domElements.adminKeyErrorMsg) {
            domElements.adminKeyErrorMsg.style.display = 'none';
        }
    }
}

/**
 * Verifica la clave de administrador.
 */
export function checkAdminKey() {
    if (!domElements.adminKeyValueInput || !domElements.adminKeyErrorMsg) return;

    if (domElements.adminKeyValueInput.value === ADMIN_SECRET_KEY) { // ADMIN_SECRET_KEY de config.js
        player.isAdmin = true;
        saveGame();
        closeModal('adminKeyModal'); // De utils.js
        openAdminPanel();
        showAdminPanelMessage("Acceso de administrador concedido.", "success");
    } else {
        domElements.adminKeyErrorMsg.textContent = "Clave incorrecta.";
        domElements.adminKeyErrorMsg.style.display = 'block';
        domElements.adminKeyValueInput.value = '';
        domElements.adminKeyValueInput.focus();
    }
}

/**
 * Llena el panel de admin con los datos actuales del jugador.
 * Esta función se llama desde openAdminPanel o cuando se abre el modal.
 */
export function populateAdminPanel() {
    if (!player.isAdmin) return;

    if (domElements.adminSetLevelValueInput) domElements.adminSetLevelValueInput.value = player.level;
    if (domElements.adminGiveExpValueInput) domElements.adminGiveExpValueInput.value = 0; // Default to 0
    if (domElements.adminGiveColValueInput) domElements.adminColValueInput.value = 0; // Default to 0
    if (domElements.adminSetBaseAtkValueInput) domElements.adminSetBaseAtkValueInput.value = player.baseAttack;
    if (domElements.adminSetBaseDefValueInput) domElements.adminSetBaseDefValueInput.value = player.baseDefense;
    if (domElements.adminSetBaseMaxHpValueInput) domElements.adminSetBaseMaxHpValueInput.value = player.baseMaxHp;
    if (domElements.adminSetBaseMaxMpValueInput) domElements.adminSetBaseMaxMpValueInput.value = player.baseMaxMp;

    if (domElements.adminItemIdValueInput) domElements.adminItemIdValueInput.value = '';
    if (domElements.adminItemQuantityValueInput) domElements.adminItemQuantityValueInput.value = 1; // Default to 1
    if (domElements.adminItemDetailsPreviewDiv) domElements.adminItemDetailsPreviewDiv.textContent = 'Detalles del item aparecerán aquí...';

    if (domElements.adminItemQuickSelect) {
        domElements.adminItemQuickSelect.innerHTML = Object.keys(baseItems).sort().map(itemId =>
            `<option value="${itemId}">${baseItems[itemId].name} (${itemId})</option>`
        ).join('');
    }

    if (domElements.adminFloorNumberValueInput) domElements.adminFloorNumberValueInput.value = player.currentFloor;
    updateAdminUnlockedFloorsList();

    adminActions.populateQuestAdminSection(); // Llenar sección de misiones
}

/**
 * Actualiza la lista de pisos desbloqueados en el panel de admin.
 */
function updateAdminUnlockedFloorsList() {
    if (domElements.adminUnlockedFloorsListDiv) {
        domElements.adminUnlockedFloorsListDiv.innerHTML = player.unlockedFloors.sort((a, b) => a - b).join(', ') || "Ninguno (excepto Piso 1)";
    }
}

/**
 * Abre el panel de administrador.
 */
export function openAdminPanel() {
    if (!player.isAdmin) {
        showNotification("No tienes acceso de administrador.", "error"); // De utils.js
        return;
    }
    populateAdminPanel(); // Asegurarse de que el panel esté actualizado antes de mostrarlo
    openModal('adminPanelModal'); // De utils.js
}