// js/main.js

// --- Configuración e Importaciones de Módulos ---
import { VERSION, ADMIN_SECRET_KEY, NUM_BOSS_HP_BARS, SAVE_KEY } from './config.js';
import { domElements, getEl } from './dom.js';
import {
    showNotification,
    openModal,
    closeModal,
    renderGridItems,
    setActiveLink,
    calculateNeededExpForLevel,
    initializeGlobalModalClosers
} from './utils.js';

// Importaciones del estado del juego y datos
import { player, currentCombat, initializeDefaultPlayerItemsAndSkills } from './game/game_state.js';
import { baseItems } from './data/items_db.js';
import { skillData, passiveSkillData } from './data/skills_db.js';
import { floorData } from './data/floor_data_db.js';
import { questDefinitions, initializeQuestDefinitions } from './data/quests_db.js';
import { blacksmithRecipes } from './data/recipes_db.js';
import { statusEffects } from './data/status_effects_db.js';
import {
    wikiCharacterData,
    wikiWeaponData,
    wikiFloorsData,
    wikiGuildsData,
    loadWikiContent,
    showWikiInfo
} from './wiki/wiki_content.js';

// Importaciones de lógica de juego
import { calculateEffectiveStats, levelUp, gainExp, takeDamage, restoreResource } from './game/player_logic.js';
import { updatePlayerHUD } from './game/hud_logic.js';

import {
    loadGame,
    saveGame,
    initializeNewPlayer,
    promptForPlayerName,
    confirmAndSavePlayerName,
    confirmResetProgress,
    executeReset
} from './game/persistence_logic.js';

import {
    initCombat,
    playerAttack,
    usePlayerSkill,
    useCombatPotion,
    fleeCombat
} from './game/combat_logic.js';

import {
    renderInventory,
    renderEquipment,
    handleItemClick,
    equipItem,
    unequipItem,
    addItemToInventory,
    useConsumable
} from './game/inventory_logic.js';

import { renderShop, buyItem } from './game/shop_logic.js';
import { renderBlacksmithRecipes, attemptForge, addMaterial, renderPlayerMaterials } from './game/blacksmith_logic.js';
import { renderPlayerStats, renderSkillListInStats } from './game/stats_modal_logic.js';
import { renderFloorSelection, changeFloor } from './game/floor_nav_logic.js';
import { openTrainingModal, performTraining } from './game/training_logic.js;

import {
    openQuestsModal,
    renderAllQuestLists,
    showQuestDetails,
    acceptQuest,
    updateQuestProgress,
    claimQuestReward
} from './game/quests_logic.js';

import {
    adminActions,
    openAdminLoginModal,
    checkAdminKey,
    openAdminPanel
} from './game/admin_logic.js;

import { toggleMusic, createParticles, SAO_PARTICLES } from './game/audiovisual_logic.js;

// --- Exposición de Funciones a `window` ---
window.saveGame = saveGame;
window.loadGame = loadGame;
window.confirmResetProgress = confirmResetProgress;
window.executeReset = executeReset;
window.setActiveLink = setActiveLink;
window.showWikiInfo = showWikiInfo;
window.closeModal = closeModal;
window.openModal = openModal;
window.toggleMusic = toggleMusic;
window.openAdminLoginModal = openAdminLoginModal;
window.checkAdminKey = checkAdminKey;
window.adminActions = adminActions;
window.submitPlayerName = confirmAndSavePlayerName;

document.addEventListener('DOMContentLoaded', () => {
    console.log(`Sword Art Online: Aincrad Chronicles - Initializing (Version ${VERSION || 'N/A'})`);
    initializeQuestDefinitions();
    initializeGlobalModalClosers();
    loadGame();
    loadWikiContent();
});
