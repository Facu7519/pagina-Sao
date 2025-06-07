// js/main.js

// --- Configuración e Importaciones de Módulos ---
// Se importan las variables de config.js como están exportadas allí
import { VERSION, ADMIN_SECRET_KEY, NUM_BOSS_HP_BARS, SAVE_KEY } from '../config.js'; // Corregido a ../config.js
import { domElements, getEl } from '../dom.js'; // Corregido a ../dom.js
import {
    showNotification,
    openModal,
    closeModal,
    renderGridItems,
    setActiveLink,
    calculateNeededExpForLevel,
    initializeGlobalModalClosers // Corregido según tu utils.js
} from '../utils.js'; // Corregido a ../utils.js

// Importaciones del estado del juego y datos
import { player, currentCombat, initializeDefaultPlayerItemsAndSkills } from './game_state.js';
import { baseItems } from '../data/items_db.js';
import { skillData, passiveSkillData } from '../data/skills_db.js';
import { floorData } from '../data/floor_data_db.js';
import { questDefinitions, initializeQuestDefinitions } from '../data/quests_db.js';
import { blacksmithRecipes } from '../data/recipes_db.js';
import { statusEffects } from '../data/status_effects_db.js';
import {
    wikiCharacterData,
    wikiWeaponData,
    wikiFloorsData,
    wikiGuildsData,
    loadWikiContent,
    showWikiInfo
} from '../wiki/wiki_content.js'; // Corregido a ../wiki/wiki_content.js


// Importaciones de lógica de juego
import { calculateEffectiveStats, levelUp, gainExp, takeDamage, restoreResource } from './player_logic.js';
import { updatePlayerHUD } from './hud_logic.js';

import {
    loadGame,
    saveGame,
    initializeNewPlayer,
    promptForPlayerName,
    confirmAndSavePlayerName,
    confirmResetProgress,
    executeReset
} from './persistence_logic.js';

import {
    initCombat,
    playerAttack,
    usePlayerSkill,
    useCombatPotion,
    fleeCombat,
    // setupCombatActionListeners, // Se llama en DOMContentLoaded
    // showCombatSkills, // La lógica está en DOMContentLoaded
    // showCombatPotions // La lógica está en DOMContentLoaded
} from './combat_logic.js';

import {
    renderInventory,
    renderEquipment,
    handleItemClick,
    equipItem,
    unequipItem,
    addItemToInventory,
    useConsumable
} from './inventory_logic.js';

import { renderShop, buyItem } from './shop_logic.js';
import { renderBlacksmithRecipes, attemptForge, addMaterial, renderPlayerMaterials } from './blacksmith_logic.js';
import { renderPlayerStats, renderSkillListInStats } from './stats_modal_logic.js';
import { renderFloorSelection, changeFloor } from './floor_nav_logic.js';
import { openTrainingModal, performTraining } from './training_logic.js';

import {
    openQuestsModal,
    renderAllQuestLists,
    showQuestDetails,
    acceptQuest,
    updateQuestProgress,
    claimQuestReward
} from './quests_logic.js';

import {
    adminActions,
    openAdminLoginModal,
    checkAdminKey,
    openAdminPanel
} from './admin_logic.js';

import { toggleMusic, createParticles, SAO_PARTICLES } from './audiovisual_logic.js';


// --- Exposición de Funciones a `window` (para llamadas desde HTML onclick) ---
// Esto permite que los `onclick="nombreFuncion()"` en index1.html funcionen.
window.saveGame = saveGame;
window.loadGame = loadGame;
window.confirmResetProgress = confirmResetProgress;
window.executeReset = executeReset; // Usado en el modal de confirmación (infoModal)
window.setActiveLink = setActiveLink;
window.showWikiInfo = showWikiInfo;
window.closeModal = closeModal; // Para los botones de cierre en los modales
window.openModal = openModal;   // Por si algún HTML lo usa directamente
window.toggleMusic = toggleMusic; // Para el botón de música
window.openAdminLoginModal = openAdminLoginModal; // Para el botón de admin
window.checkAdminKey = checkAdminKey; // Para el modal de clave de admin
window.adminActions = adminActions; // Para los botones dentro del panel de admin
window.submitPlayerName = confirmAndSavePlayerName; // Para el modal de nombre de jugador

// Las funciones de combate como playerAttack, fleeCombat, etc., se asignan
// a los botones específicos en DOMContentLoaded más abajo.
// Si el HTML generara dinámicamente botones con onclick="playerAttack()",
// entonces también necesitaríamos window.playerAttack = playerAttack;


// --- Lógica Principal de Inicialización del Juego ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`Sword Art Online: Aincrad Chronicles - Initializing (Version ${VERSION || 'N/A'})`);
    console.log(`Save Key: ${SAVE_KEY}, Admin Key Hint: First 3 chars: ${ADMIN_SECRET_KEY.substring(0,3)}`);

    initializeQuestDefinitions();
    initializeGlobalModalClosers(); // Configura listeners para cerrar modales (Esc, click fuera)

    loadGame(); // Carga el juego o inicializa uno nuevo. Actualiza HUD, etc.
    loadWikiContent(); // Carga el contenido de la wiki.

    if (typeof createParticles === 'function' && SAO_PARTICLES && domElements.particlesContainer) {
        createParticles(SAO_PARTICLES, domElements.particlesContainer);
    } else {
        console.warn('createParticles, SAO_PARTICLES o domElements.particlesContainer no están disponibles. Audiovisual_logic.js podría necesitar revisión.');
    }

    // --- Asignación de Event Listeners para Botones Principales del HUD ---
    // (Usando los IDs de los botones definidos en domElements)
    if (domElements.combatBtn) domElements.combatBtn.onclick = () => initCombat(false);
    if (domElements.bossCombatBtn) domElements.bossCombatBtn.onclick = () => initCombat(true);
    if (domElements.questsBtn) domElements.questsBtn.onclick = () => openModal('questsModal'); // openModal se encarga de llamar a openQuestsModal de quests_logic
    if (domElements.trainSkillBtn) domElements.trainSkillBtn.onclick = openTrainingModal;
    
    if (domElements.inventoryBtn) domElements.inventoryBtn.onclick = () => openModal('inventoryModal');
    if (domElements.shopBtn) domElements.shopBtn.onclick = () => openModal('shopModal');
    if (domElements.blacksmithBtn) domElements.blacksmithBtn.onclick = () => openModal('blacksmithModal');
    if (domElements.playerStatsBtn) domElements.playerStatsBtn.onclick = () => openModal('playerStatsModal');
    if (domElements.floorNavigateBtn) domElements.floorNavigateBtn.onclick = () => {
        renderFloorSelection(); 
        openModal('floorNavigationModal');
    };

    // Botones cuyos onclick ya llaman a funciones en window (definidas arriba)
    if (domElements.musicToggleBtn) domElements.musicToggleBtn.onclick = window.toggleMusic;
    if (domElements.adminAccessBtn) domElements.adminAccessBtn.onclick = window.openAdminLoginModal; // Llama a la función en window
    if (domElements.submitAdminKeyBtn) domElements.submitAdminKeyBtn.onclick = window.checkAdminKey; // Llama a la función en window
    if (domElements.submitPlayerNameBtn) domElements.submitPlayerNameBtn.onclick = window.submitPlayerName; // Llama a la función en window
    
    // --- Asignación de Event Listeners para el Modal de Combate ---
    if (domElements.combatActionAttackBtn) domElements.combatActionAttackBtn.onclick = playerAttack;
    if (domElements.combatActionFleeBtn) domElements.combatActionFleeBtn.onclick = fleeCombat;

    if (domElements.combatActionSkillsBtn) {
        domElements.combatActionSkillsBtn.onclick = () => {
            if(domElements.combatPotionsListContainer) domElements.combatPotionsListContainer.style.display = 'none';
            const skillContainer = domElements.combatSkillsListContainer;
            if (!skillContainer) return;
            skillContainer.innerHTML = '';
            // Asegúrate que player.skills y skillData estén disponibles y correctos.
            const availableSkills = player.skills.filter(skillRef => {
                const skillDef = skillData[skillRef.id] || skillRef; // Usar skillRef si ya tiene todos los datos
                return player.level >= (skillDef.levelReq || 0);
            });

            if (availableSkills.length === 0) {
                skillContainer.innerHTML = '<p>No has aprendido habilidades.</p>';
            } else {
                availableSkills.forEach(skillRef => {
                    const skillFullData = skillData[skillRef.id] || skillRef;
                    const skillBtn = document.createElement('button');
                    skillBtn.className = 'action-btn tooltip';
                    let mpCost = Math.max(0, Math.floor(skillFullData.mpCost * (1 - (player.tempMpCostReduction || 0))));
                    skillBtn.innerHTML = `${skillFullData.icon || '✨'} ${skillFullData.name} (${mpCost} MP) <span class="tooltiptext">${skillFullData.description || 'Sin descripción'}</span>`;
                    skillBtn.onclick = () => usePlayerSkill(skillFullData.id);
                    skillBtn.disabled = player.mp < mpCost || (skillFullData.requiresCombo && player.attackComboCount < 2);
                    skillContainer.appendChild(skillBtn);
                });
            }
            skillContainer.style.display = skillContainer.style.display === 'none' || !skillContainer.style.display ? 'flex' : 'none';
        };
    }

    if (domElements.combatActionPotionsBtn) {
        domElements.combatActionPotionsBtn.onclick = () => {
            if(domElements.combatSkillsListContainer) domElements.combatSkillsListContainer.style.display = 'none';
            const potionContainer = domElements.combatPotionsListContainer;
            if (!potionContainer) return;
            potionContainer.innerHTML = '';
            const potions = player.inventory.filter(item => {
                const itemBase = baseItems[item.id];
                return itemBase && itemBase.type === 'consumable' && (itemBase.effect?.hp || itemBase.effect?.mp || itemBase.effect?.cure);
            });

            if (potions.length === 0) {
                potionContainer.innerHTML = '<p>No tienes pociones.</p>';
            } else {
                potions.forEach((potionInstance) => { 
                    const itemBase = baseItems[potionInstance.id];
                    const originalIndex = player.inventory.findIndex(invItem => invItem.id === potionInstance.id); // Busca por ID, puede ser frágil si hay items idénticos no apilados. Idealmente el objeto potionInstance sería la referencia directa.
                    
                    const potionBtn = document.createElement('button');
                    potionBtn.className = 'action-btn tooltip';
                    potionBtn.innerHTML = `${itemBase.icon || '🧪'} ${itemBase.name} (x${potionInstance.count}) <span class="tooltiptext">${itemBase.description || 'Sin descripción'}</span>`;
                    potionBtn.onclick = () => useCombatPotion(originalIndex); // `useCombatPotion` debe estar preparado para manejar el índice o el ID.
                    potionContainer.appendChild(potionBtn);
                });
            }
            potionContainer.style.display = potionContainer.style.display === 'none' || !potionContainer.style.display ? 'flex' : 'none';
        };
    }

    // Activar enlace "Juego" por defecto en la navegación
    const gamePanelLink = document.querySelector('.nav-links a[href="#game-panel"]');
    if (gamePanelLink && typeof setActiveLink === 'function') {
        setActiveLink(gamePanelLink);
    }

    console.log("Game initialized and ready. If you see errors, ensure you are using a local web server.");
});