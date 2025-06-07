// js/main.js

// --- Configuración e Importaciones de Módulos ---
import { ADMIN_SECRET_KEY, NUM_BOSS_HP_BARS, SAVE_KEY } from './config.js';
import { domElements, getEl } from './dom.js';
import {
    showNotification,
    openModal,
    closeModal,
    renderGridItems,
    setActiveLink,
    calculateNeededExpForLevel, // Importado de utils.js
    initializeGlobalModalClosers
} from './utils.js';

// Importaciones del estado del juego y datos
import { player, currentCombat, initializeDefaultPlayerItemsAndSkills } from './game/game_state.js';
import { baseItems } from './data/items_db.js';
import { skillData, passiveSkillData } from './data/skills_db.js';
import { floorData } from './data/floor_data_db.js';
import { questDefinitions } from './data/quests_db.js'; // Solo importar las definiciones
import { blacksmithRecipes } from './data/recipes_db.js';
import { statusEffects } from './data/status_effects_db.js';
import {
    wikiCharacterData,
    wikiWeaponData,
    wikiFloorsData,
    wikiGuildsData
} from './data/wiki_data_db.js';

// Importaciones de lógica de juego
import { loadWikiContent, showWikiInfo } from './wiki/wiki_content.js';
import { initializeNewPlayer, saveGame, loadGame, confirmResetProgress } from './game/persistence_logic.js';
import { updatePlayerHUD } from './game/hud_logic.js';
import { openInventoryModal, renderInventory, renderEquipment } from './game/inventory_logic.js';
import { openShopModal, renderShop } from './game/shop_logic.js';
import { openBlacksmithModal, renderBlacksmithRecipes, renderPlayerMaterialsList } from './game/blacksmith_logic.js';
import { openPlayerStatsModal, renderPlayerStats } from './game/stats_modal_logic.js';
import { startCombat, startBossCombat, useCombatSkill, useCombatPotion, toggleCombatSkills, toggleCombatPotions, addCombatLog } from './game/combat_logic.js';
import { openFloorNavigationModal, renderFloorSelection } from './game/floor_nav_logic.js';
import { openTrainingModal, performTraining } from './game/training_logic.js';
// ¡Importante! initializeQuestDefinitions se importa desde quests_logic.js
import { openQuestsModal, renderAllQuestLists, showQuestDetails, claimQuestReward, updateQuestProgress, initializeQuestDefinitions } from './game/quests_logic.js';
import { adminActions, openAdminPanel, checkAdminKey, populateAdminPanel } from './game/admin_logic.js';
import { toggleMusic, createParticles } from './game/audiovisual_logic.js';


// --- Inicialización del Juego ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el jugador si es la primera vez o cargar el juego
    // La función initializeQuestDefinitions se encarga de que questDefinitions esté cargado
    initializeQuestDefinitions(); 
    initializeNewPlayer(); // Intenta cargar el juego o inicia uno nuevo

    // Inicializar los listeners para cerrar modales globalmente (Escape y clicks fuera)
    initializeGlobalModalClosers();

    // Cargar contenido de la Wiki
    loadWikiContent();

    // Crear partículas de fondo
    createParticles();

    // Actualizar HUD inicial
    updatePlayerHUD();

    // --- Configuración de Event Listeners ---

    // Navegación principal (enlaces)
    domElements.navPersonajesLink.addEventListener('click', function(event) {
        event.preventDefault();
        setActiveLink(this);
        window.location.hash = 'wiki-personajes';
    });
    domElements.navArsenalLink.addEventListener('click', function(event) {
        event.preventDefault();
        setActiveLink(this);
        window.location.hash = 'wiki-arsenal';
    });
    domElements.navPisosLink.addEventListener('click', function(event) {
        event.preventDefault();
        setActiveLink(this);
        window.location.hash = 'wiki-pisos';
    });
    domElements.navGremiosLink.addEventListener('click', function(event) {
        event.preventDefault();
        setActiveLink(this);
        window.location.hash = 'wiki-gremios';
    });
    domElements.navGameLink.addEventListener('click', function(event) {
        event.preventDefault();
        setActiveLink(this);
        window.location.hash = 'game-panel';
    });

    // Botón de música
    domElements.musicToggleBtn.addEventListener('click', toggleMusic);

    // Botones del panel de juego
    domElements.combatBtn.addEventListener('click', () => startCombat());
    domElements.bossCombatBtn.addEventListener('click', () => startBossCombat());
    domElements.questsBtn.addEventListener('click', openQuestsModal);
    domElements.trainSkillBtn.addEventListener('click', openTrainingModal);
    domElements.inventoryBtn.addEventListener('click', openInventoryModal);
    domElements.shopBtn.addEventListener('click', openShopModal);
    domElements.blacksmithBtn.addEventListener('click', openBlacksmithModal);
    domElements.playerStatsBtn.addEventListener('click', openPlayerStatsModal);
    domElements.floorNavigateBtn.addEventListener('click', openFloorNavigationModal);
    domElements.adminAccessBtn.addEventListener('click', openAdminPanel);
    domElements.saveGameBtn.addEventListener('click', saveGame);
    domElements.loadGameBtn.addEventListener('click', loadGame);
    domElements.newGameBtn.addEventListener('click', confirmResetProgress);

    // Botones de modales (cerrar)
    domElements.closeInfoModalBtn.addEventListener('click', () => closeModal('infoModal'));
    domElements.closeInventoryModalBtn.addEventListener('click', () => closeModal('inventoryModal'));
    domElements.closeShopModalBtn.addEventListener('click', () => closeModal('shopModal'));
    domElements.closeBlacksmithModalBtn.addEventListener('click', () => closeModal('blacksmithModal'));
    domElements.closePlayerStatsModalBtn.addEventListener('click', () => closeModal('playerStatsModal'));
    domElements.closeCombatModalBtn.addEventListener('click', () => closeModal('combatModal'));
    domElements.closeNameEntryModalBtn.addEventListener('click', () => closeModal('nameEntryModal'));
    domElements.closeFloorNavModalBtn.addEventListener('click', () => closeModal('floorNavigationModal'));
    domElements.closeTrainingModalBtn.addEventListener('click', () => closeModal('trainingModal'));
    domElements.closeQuestsModalBtn.addEventListener('click', () => closeModal('questsModal'));
    domElements.closeAdminKeyModalBtn.addEventListener('click', () => closeModal('adminKeyModal'));
    domElements.closeAdminPanelModalBtn.addEventListener('click', () => closeModal('adminPanelModal'));


    // Modal de entrada de nombre de jugador
    domElements.submitPlayerNameBtn.addEventListener('click', () => {
        const playerName = domElements.playerNameInput.value.trim();
        if (playerName) {
            player.name = playerName;
            updatePlayerHUD();
            saveGame();
            closeModal('nameEntryModal');
        } else {
            showNotification('Por favor, ingresa un nombre válido.', 'error');
        }
    });

    // Panel de administración - Event Listeners
    domElements.submitAdminKeyBtn.addEventListener('click', checkAdminKey);

    domElements.adminSetLevelBtn.addEventListener('click', adminActions.setLevel);
    domElements.adminGiveExpBtn.addEventListener('click', adminActions.giveExp);
    domElements.adminGiveColBtn.addEventListener('click', adminActions.giveCol);
    domElements.adminSetBaseAtkBtn.addEventListener('click', () => adminActions.setStat('baseAttack', 'adminSetBaseAtkValue'));
    domElements.adminSetBaseDefBtn.addEventListener('click', () => adminActions.setStat('baseDefense', 'adminSetBaseDefValue'));
    domElements.adminSetBaseMaxHpBtn.addEventListener('click', () => adminActions.setStat('baseMaxHp', 'adminSetBaseMaxHpValue'));
    domElements.adminSetBaseMaxMpBtn.addEventListener('click', () => adminActions.setStat('baseMaxMp', 'adminSetBaseMaxMpValue'));
    domElements.adminShowItemDetailsBtn.addEventListener('click', adminActions.showItemDetails);
    domElements.adminGiveItemBtn.addEventListener('click', adminActions.giveItem);
    domElements.adminItemQuickSelect.addEventListener('change', adminActions.selectItemFromList);
    domElements.adminGrantFloorAccessBtn.addEventListener('click', adminActions.grantFloorAccess);
    domElements.adminRevokeFloorAccessBtn.addEventListener('click', adminActions.revokeFloorAccess);
    domElements.adminLoadQuestForEditingBtn.addEventListener('click', adminActions.loadQuestDefinitionForEditing);
    domElements.adminDeleteQuestDefinitionBtn.addEventListener('click', adminActions.deleteQuestDefinition);
    domElements.adminSaveQuestDefinitionBtn.addEventListener('click', adminActions.saveQuestDefinition);
    domElements.adminClearQuestDefinitionFormBtn.addEventListener('click', adminActions.clearQuestDefinitionForm);
    domElements.adminPlayerQuestSelect.addEventListener('change', () => showQuestDetails(domElements.adminPlayerQuestSelect.value, 'admin'));
    domElements.adminCompletePlayerQuestBtn.addEventListener('click', adminActions.completePlayerQuest);
    domElements.adminResetPlayerQuestBtn.addEventListener('click', adminActions.resetPlayerQuest);


    // Wiki - Manejo de clicks en las tarjetas para mostrar info (delegación de eventos)
    document.querySelectorAll('.card-grid, #floors-info-container, #guilds-info-container').forEach(container => {
        container.addEventListener('click', (event) => {
            const card = event.target.closest('.card');
            if (card) {
                const type = card.dataset.wikiType;
                const id = card.dataset.wikiId;
                if (type && id) {
                    showWikiInfo(type, id);
                }
            }
        });
    });


    // Lógica específica para el botón de entrenamiento (ya que su texto depende del costo)
    domElements.trainSkillBtn.addEventListener('click', openTrainingModal);

    // Activar enlace "Juego" por defecto en la navegación
    setActiveLink(domElements.navGameLink);

    console.log("Game initialized and ready. If you see errors, ensure you are using a local web server.");
});