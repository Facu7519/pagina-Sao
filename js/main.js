// js/main.js

// --- Configuración e Importaciones de Módulos ---
// Se importan las variables de config.js como están exportadas allí
import { VERSION, ADMIN_SECRET_KEY, NUM_BOSS_HP_BARS, SAVE_KEY } from './config.js';
import { domElements, getEl } from './dom.js';
import {
    showNotification,
    openModal,
    closeModal,
    renderGridItems,
    setActiveLink, // Asumiendo que esta es la correcta según tu utils.js
    calculateNeededExpForLevel,
    initializeGlobalModalClosers // Corregido según tu utils.js
} from './utils.js';

// Importaciones del estado del juego y datos
import { player, currentCombat, initializeDefaultPlayerItemsAndSkills } from './game/game_state.js';
import { baseItems } from './data/items_db.js';
import { skillData, passiveSkillData } from './data/skills_db.js';
import { floorData } from './data/floor_data_db.js';
import { questDefinitions, initializeQuestDefinitions } from './data/quests_db.js';
import { blacksmithRecipes } from './data/recipes_db.js'; // Asumiendo que lo tienes
import { statusEffects } from './data/status_effects_db.js'; // Asumiendo que lo tienes
import {
    wikiCharacterData,
    wikiWeaponData,
    wikiFloorsData,
    wikiGuildsData,
    loadWikiContent, // Esta es la función que tu script.js llama
    showWikiInfo // Esta es la función que tu script.js llama
} from './wiki/wiki_content.js';


// Importaciones de lógica de juego
import { calculateEffectiveStats, levelUp, gainExp, takeDamage, restoreResource } from './game/player_logic.js';
import { updatePlayerHUD } from './game/hud_logic.js'; // getHpColor y updateResourceBar son usados internamente o en utils.js

import {
    loadGame, // Renombrado para claridad, desde persistence_logic
    saveGame, // Renombrado para claridad, desde persistence_logic
    initializeNewPlayer, // Renombrado para claridad, desde persistence_logic
    promptForPlayerName, // Renombrado para claridad, desde persistence_logic
    confirmAndSavePlayerName, // Renombrado para claridad, desde persistence_logic
    confirmResetProgress, // Renombrado para claridad, desde persistence_logic
    executeReset // Renombrado para claridad, desde persistence_logic
} from './game/persistence_logic.js';

import {
    initCombat,
    playerAttack, // Esta es la que se usa en el script.js original
    usePlayerSkill, // Esta es la que se usa en el script.js original
    useCombatPotion, // Esta es la que se usa en el script.js original
    fleeCombat, // Esta es la que se usa en el script.js original
    // setupCombatActionListeners, // No se llama directamente en script.js, los listeners se asignan en DOMContentLoaded
    // showCombatSkills, // Lógica para mostrar skills se maneja en DOMContentLoaded
    // showCombatPotions // Lógica para mostrar pociones se maneja en DOMContentLoaded
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
import { openTrainingModal, performTraining } from './game/training_logic.js';

import {
    openQuestsModal, // Esta es la que se usa en el script.js original
    renderAllQuestLists,
    showQuestDetails, // Esta es la que se usa en el script.js original
    acceptQuest,
    updateQuestProgress,
    claimQuestReward
} from './game/quests_logic.js';

import {
    adminActions, // Objeto con todas las acciones de admin
    openAdminLoginModal, // Función para abrir el modal de login/panel
    checkAdminKey, // Función para verificar la clave
    // populateAdminPanel, // Llamada internamente por openAdminPanel
    openAdminPanel // Función para abrir el panel directamente si ya es admin
} from './game/admin_logic.js';

import { toggleMusic, createParticles, SAO_PARTICLES } from './audiovisual_logic.js';


// --- Exposición de Funciones a `window` (para llamadas desde HTML onclick) ---
// Basado en los onclicks directos en index1.html y script.js original

// Funciones de persistencia
window.saveGame = saveGame;
window.loadGame = loadGame;
window.confirmResetProgress = confirmResetProgress;
window.executeReset = executeReset; // Para el botón en el modal de confirmación

// Funciones de UI/Generales
window.toggleMusic = toggleMusic;
window.setActiveLink = setActiveLink; // De utils.js
window.showWikiInfo = showWikiInfo; // De wiki_content.js
window.closeModal = closeModal; // De utils.js, si algún HTML lo llama directamente
window.openModal = openModal;   // De utils.js, si algún HTML lo llama directamente

// Funciones de Admin
window.openAdminLoginModal = openAdminLoginModal;
window.checkAdminKey = checkAdminKey;
window.adminActions = adminActions; // Expone el objeto completo

// Funciones del Jugador
window.submitPlayerName = confirmAndSavePlayerName; // De persistence_logic.js


// Las funciones de combate como playerAttack, fleeCombat, etc.,
// son asignadas a los onclick de los botones en DOMContentLoaded más abajo.
// No es necesario exponerlas a window si los listeners se asignan en JS.
// Sin embargo, si alguna parte del HTML insertado dinámicamente las necesita,
// podrían tener que exponerse. Por ahora, se asume que los listeners de abajo son suficientes.


// --- Lógica Principal de Inicialización del Juego ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`Sword Art Online: Aincrad Chronicles - Initializing (Version ${VERSION || 'N/A'})`);
    console.log(`Save Key: ${SAVE_KEY}, Admin Key Hint: First 3 chars: ${ADMIN_SECRET_KEY.substring(0,3)}`);

    initializeQuestDefinitions(); // De data/quests_db.js
    initializeGlobalModalClosers(); // De utils.js

    loadGame(); // De persistence_logic.js. Esto también llama a updatePlayerHUD, etc.
    loadWikiContent(); // De wiki/wiki_content.js

    if (typeof createParticles === 'function' && SAO_PARTICLES && domElements.particlesContainer) {
        createParticles(SAO_PARTICLES, domElements.particlesContainer); // De audiovisual_logic.js
    } else {
        console.warn('createParticles o SAO_PARTICLES o domElements.particlesContainer no están disponibles.');
    }

    // --- Asignación de Event Listeners para Botones Principales del HUD ---
    // Basado en las asignaciones en el script.js original
    if (domElements.combatBtn) domElements.combatBtn.onclick = () => initCombat(false);
    if (domElements.bossCombatBtn) domElements.bossCombatBtn.onclick = () => initCombat(true);
    if (domElements.trainSkillBtn) domElements.trainSkillBtn.onclick = openTrainingModal;
    if (domElements.inventoryBtn) domElements.inventoryBtn.onclick = () => openModal('inventoryModal'); // openModal de utils.js se encarga de llamar a renderInventory, etc.
    if (domElements.shopBtn) domElements.shopBtn.onclick = () => openModal('shopModal');
    if (domElements.blacksmithBtn) domElements.blacksmithBtn.onclick = () => openModal('blacksmithModal');
    if (domElements.playerStatsBtn) domElements.playerStatsBtn.onclick = () => openModal('playerStatsModal');
    if (domElements.floorNavigateBtn) domElements.floorNavigateBtn.onclick = () => {
        renderFloorSelection(); // de floor_nav_logic.js
        openModal('floorNavigationModal');
    };
    if (domElements.questsBtn) domElements.questsBtn.onclick = () => openModal('questsModal'); // openModal de utils.js llama a openQuestsModal de quests_logic

    // Botones ya expuestos a window o que sus modales manejan sus propios botones internos
    if (domElements.musicToggleBtn) domElements.musicToggleBtn.onclick = window.toggleMusic;
    if (domElements.adminAccessBtn) domElements.adminAccessBtn.onclick = window.openAdminLoginModal;
    // submitAdminKeyBtn y submitPlayerNameBtn tienen onclicks en el HTML que llaman a funciones en window.

    // --- Asignación de Event Listeners para el Modal de Combate ---
    // Replicando la lógica del script.js original para los botones de acción de combate
    if (domElements.combatActionAttackBtn) domElements.combatActionAttackBtn.onclick = playerAttack; // de combat_logic.js
    if (domElements.combatActionFleeBtn) domElements.combatActionFleeBtn.onclick = fleeCombat; // de combat_logic.js

    if (domElements.combatActionSkillsBtn) {
        domElements.combatActionSkillsBtn.onclick = () => {
            if(domElements.combatPotionsListContainer) domElements.combatPotionsListContainer.style.display = 'none';
            const skillContainer = domElements.combatSkillsListContainer;
            if (!skillContainer) return;
            skillContainer.innerHTML = '';
            const availableSkills = player.skills.filter(skillDef => player.level >= (skillDef.levelReq || 0));

            if (availableSkills.length === 0) {
                skillContainer.innerHTML = '<p>No has aprendido habilidades.</p>';
            } else {
                availableSkills.forEach(skill => {
                    const skillFullData = skillData[skill.id] || skill; // Asegurar que tenemos todos los datos
                    const skillBtn = document.createElement('button');
                    skillBtn.className = 'action-btn tooltip';
                    let mpCost = Math.max(0, Math.floor(skillFullData.mpCost * (1 - (player.tempMpCostReduction || 0))));
                    skillBtn.innerHTML = `${skillFullData.icon || '✨'} ${skillFullData.name} (${mpCost} MP) <span class="tooltiptext">${skillFullData.description}</span>`;
                    skillBtn.onclick = () => usePlayerSkill(skillFullData.id); // usePlayerSkill de combat_logic.js
                    skillBtn.disabled = player.mp < mpCost || (skillFullData.requiresCombo && player.attackComboCount < 2);
                    skillContainer.appendChild(skillBtn);
                });
            }
            skillContainer.style.display = skillContainer.style.display === 'none' ? 'flex' : 'none';
        };
    }

    if (domElements.combatActionPotionsBtn) {
        domElements.combatActionPotionsBtn.onclick = () => {
            if(domElements.combatSkillsListContainer) domElements.combatSkillsListContainer.style.display = 'none';
            const potionContainer = domElements.combatPotionsListContainer;
            if (!potionContainer) return;
            potionContainer.innerHTML = '';
            const potions = player.inventory.filter(item => item.type === 'consumable' && (baseItems[item.id]?.effect?.hp || baseItems[item.id]?.effect?.mp || baseItems[item.id]?.effect?.cure));

            if (potions.length === 0) {
                potionContainer.innerHTML = '<p>No tienes pociones.</p>';
            } else {
                potions.forEach((potion) => {
                    // Encontrar el índice original del item en el inventario principal es crucial si se va a modificar/eliminar.
                    const originalIndex = player.inventory.findIndex(invItem => invItem.id === potion.id && invItem.count === potion.count); // Esto puede ser frágil si hay duplicados exactos.
                                                                                                                                        // Sería mejor si 'potion' fuera el objeto original del inventario.
                                                                                                                                        // O si useCombatPotion recibe el ID y busca.
                    const itemBase = baseItems[potion.id];
                    const potionBtn = document.createElement('button');
                    potionBtn.className = 'action-btn tooltip';
                    potionBtn.innerHTML = `${itemBase.icon || '🧪'} ${itemBase.name} (x${potion.count}) <span class="tooltiptext">${itemBase.description}</span>`;
                    potionBtn.onclick = () => useCombatPotion(originalIndex); // useCombatPotion de combat_logic.js
                    potionContainer.appendChild(potionBtn);
                });
            }
            potionContainer.style.display = potionContainer.style.display === 'none' ? 'flex' : 'none';
        };
    }

    // Activar enlace "Juego" por defecto en la navegación
    const gamePanelLink = document.querySelector('.nav-links a[href="#game-panel"]');
    if (gamePanelLink && typeof setActiveLink === 'function') { // setActiveLink de utils.js
        setActiveLink(gamePanelLink);
    }

    console.log("Game initialized and ready.");
});
