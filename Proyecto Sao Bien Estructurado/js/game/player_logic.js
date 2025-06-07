// js/game/player_logic.js
import { player, currentCombat, initializeDefaultPlayerItemsAndSkills, initializeNewPlayerState } from './game_state.js';
import { baseItems } from '../data/items_db.js';
import { skillData, passiveSkillData } from '../data/skills_db.js';
import { floorData } from '../data/floor_data_db.js';
import { domElements } from '../dom.js';
import { showNotification, calculateNeededExpForLevel } from '../utils.js';
import { saveGame } from './persistence_logic.js';
import { updateQuestProgress } from './quests_logic.js'; // Para actualizar misiones al subir de nivel o morir
import { endCombat, addCombatLog } from './combat_logic.js'; // Para finalizar combate si el jugador muere
import { closeModal } from '../utils.js';
import { updatePlayerHUD as updateHUD } from './hud_logic.js'; // Importar updatePlayerHUD desde hud_logic y renombrarla
import { statusEffects } from '../data/status_effects_db.js'; // Importar statusEffects
import { equipItem } from './inventory_logic.js'; // Necesario para equipar el item inicial

/**
 * Calcula las estadísticas efectivas del jugador (ataque, defensa, HP/MP máximo)
 * considerando el equipo y las habilidades pasivas.
 * Esta función debe llamarse cada vez que el equipo o las pasivas cambien, o al subir de nivel.
 */
export function calculateEffectiveStats() {
    let equippedAttack = 0, equippedDefense = 0, equippedMaxHp = 0, equippedMaxMp = 0;
    let tempHpRegen = 0;
    let tempMpCostReduction = 0;
    let tempCritChanceBonus = 0;

    // Sumar stats del equipo
    Object.values(player.equipment).forEach(item => {
        if (item && item.stats) {
            equippedAttack += item.stats.attack || 0;
            equippedDefense += item.stats.defense || 0;
            equippedMaxHp += item.stats.hp || 0;
            equippedMaxMp += item.stats.mp || 0;
        }
    });

    // Aplicar bonificaciones de habilidades pasivas
    player.passiveSkills.forEach(skillId => {
        const passive = passiveSkillData[skillId];
        if (passive && passive.effect) {
            if (passive.effect.hpRegen) tempHpRegen += passive.effect.hpRegen;
            if (passive.effect.mpCostReduction) tempMpCostReduction += passive.effect.mpCostReduction;
            if (passive.effect.critChance) tempCritChanceBonus += passive.effect.critChance;
            // Añadir más efectos pasivos según sea necesario
        }
    });

    player.effectiveAttack = player.baseAttack + equippedAttack;
    player.effectiveDefense = player.baseDefense + equippedDefense;
    player.maxHp = player.baseMaxHp + equippedMaxHp;
    player.maxMp = player.baseMaxMp + equippedMaxMp;
    player.tempHpRegen = tempHpRegen;
    player.tempMpCostReduction = tempMpCostReduction;
    player.tempCritChanceBonus = tempCritChanceBonus;

    // Asegurarse de que el HP/MP actual no supere el nuevo máximo
    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);
}

/**
 * El jugador gana experiencia.
 * @param {number} amount - Cantidad de experiencia a ganar.
 */
export function gainExp(amount) {
    player.currentExp += amount;
    showNotification(`Ganaste ${amount} EXP.`, "default");

    while (player.currentExp >= player.neededExp) {
        player.currentExp -= player.neededExp;
        player.level++;
        player.neededExp = calculateNeededExpForLevel(player.level); // Recalcular EXP para el siguiente nivel
        
        // Aumentar estadísticas base al subir de nivel (ejemplo)
        player.baseMaxHp += 10;
        player.baseMaxMp += 5;
        player.baseAttack += 2;
        player.baseDefense += 1;
        
        // Restaurar HP y MP al máximo al subir de nivel
        player.hp = player.maxHp; 
        player.mp = player.maxMp;

        showNotification(`¡Subiste a Nivel ${player.level}!`, "success", 5000);
        calculateEffectiveStats(); // Recalcular stats después de subir de nivel
        updateQuestProgress('reach_level', player.level.toString(), 1); // Notificar progreso de misiones de nivel
    }
    updateHUD(); // Actualizar HUD después de ganar EXP o subir de nivel
    saveGame();
}

/**
 * Restaura HP o MP al jugador.
 * @param {string} resourceType - 'hp' o 'mp'.
 * @param {number} amount - Cantidad a restaurar.
 */
export function restoreResource(resourceType, amount) {
    if (resourceType === 'hp') {
        player.hp = Math.min(player.hp + amount, player.maxHp);
    } else if (resourceType === 'mp') {
        player.mp = Math.min(player.mp + amount, player.maxMp);
    }
    updateHUD();
}

/**
 * Aplica un efecto de estado al jugador.
 * @param {string} effectType - El ID del efecto de estado.
 * @param {number} duration - La duración del efecto en turnos.
 * @param {object} [data={}] - Datos adicionales específicos del efecto.
 */
export function applyStatusEffect(effectType, duration, data = {}) {
    // Evitar duplicar efectos que no se apilan o refrescar duración
    let existingEffect = player.activeStatusEffects.find(eff => eff.type === effectType);
    if (existingEffect) {
        existingEffect.duration = duration; // Refrescar duración
        Object.assign(existingEffect, data); // Actualizar datos adicionales
    } else {
        player.activeStatusEffects.push({ type: effectType, duration: duration, ...data });
    }
    addCombatLog(`${player.name} ahora está ${statusEffects[effectType].name.toLowerCase()}.`, 'status-message');
    updateHUD(); // Actualizar HUD para mostrar el nuevo efecto
}

/**
 * Remueve un efecto de estado del jugador.
 * @param {object} target - El objeto del combatiente (player o enemy).
 * @param {string} effectType - El ID del efecto a remover.
 */
export function removeStatusEffect(target, effectType) {
    const initialLength = target.activeStatusEffects.length;
    target.activeStatusEffects = target.activeStatusEffects.filter(eff => eff.type !== effectType);
    if (target.activeStatusEffects.length < initialLength) {
        const effectDef = statusEffects[effectType];
        addCombatLog(`${target.name} ya no está ${effectDef.name.toLowerCase()}.`, 'status-message');
        if (target === player) {
            updateHUD(); // Actualizar HUD si es el jugador
        }
    }
}

/**
 * Procesa los efectos de estado que actúan al final del turno.
 * @param {object} target - El objeto del combatiente (player o enemy).
 */
export function processTurnEndStatusEffects(target) {
    const effectsToRemove = [];
    target.activeStatusEffects.forEach(effect => {
        effect.duration--; // Disminuir duración
        const effectDef = statusEffects[effect.type];

        if (effectDef) {
            switch (effect.type) {
                case 'poisoned':
                case 'bleeding':
                    const damage = Math.floor(target.maxHp * (effectDef.value || 0));
                    target.hp = Math.max(0, target.hp - damage);
                    addCombatLog(`${target.name} sufre ${damage} de daño por ${effectDef.name.toLowerCase()}.`, 'enemy-action'); // Usar 'enemy-action' para daño recibido, o 'system-message'
                    flashDamage(target === player ? domElements.combatPlayerDisplay : domElements.combatEnemyDisplay);
                    break;
                case 'hp_regen_s': // Ejemplo de efecto pasivo que puede estar en activeStatusEffects temporalmente
                                // Pero si fuera un buff temporal, aquí se manejaría.
                    if (player.tempHpRegen > 0) { // Usar valor calculado por pasivas
                         restoreResource('hp', player.tempHpRegen);
                         if (typeof addCombatLog === 'function') addCombatLog(`${player.name} recupera ${player.tempHpRegen} HP por regeneración.`, 'status-message');
                    }
                    break;
                // Otros efectos como 'protected' o 'counter' se aplican al recibir/hacer daño.
            }
        }
        if (effect.duration === 0) {
            effectsToRemove.push(effect.type);
        }
    });

    effectsToRemove.forEach(type => {
        removeStatusEffect(target, type); 
    });

    if (player.hp === 0) {
        endCombat(false); // El jugador fue derrotado por efectos de estado
    }
    // Actualizar UI de combate y HUD
    // Se asume que updateCombatPlayerDisplay y updateCombatEnemyDisplay están en combat_logic.js
    if (typeof updateCombatPlayerDisplay === 'function') updateCombatPlayerDisplay();
    if (typeof updateCombatEnemyDisplay === 'function') updateCombatEnemyDisplay();
}


/**
 * Deshabilita o habilita los botones principales de acción del juego.
 * Útil durante el combate o la entrada de nombre.
 * @param {boolean} disable - True para deshabilitar, false para habilitar.
 */
export function disableGameActions(disable) {
    const buttons = [
        domElements.combatBtn, domElements.bossCombatBtn, domElements.questsBtn,
        domElements.trainSkillBtn, domElements.inventoryBtn, domElements.shopBtn,
        domElements.blacksmithBtn, domElements.playerStatsBtn, domElements.floorNavigateBtn,
        domElements.adminAccessBtn, domElements.saveGameBtn, domElements.loadGameBtn,
        domElements.newGameBtn
    ];

    buttons.forEach(btn => {
        if (btn) btn.disabled = disable;
    });
}

/**
 * Pide al jugador que ingrese su nombre si no lo ha hecho.
 * Muestra el modal de entrada de nombre.
 */
export function promptPlayerName() {
    if (!player.name) {
        disableGameActions(true); // Deshabilitar acciones hasta que se ingrese el nombre
        openModal('nameEntryModal'); // Abre el modal de entrada de nombre
        if (domElements.playerNameInput) // Corregido: playerNameInput
        domElements.playerNameInput.value = player.name || "";
        domElements.playerNameInput.focus();
    }
}

/**
 * Confirma y guarda el nombre del jugador ingresado en el modal.
 * Si el nombre es válido, cierra el modal y actualiza la UI.
 */
export function confirmAndSavePlayerName() {
    if (!domElements.playerNameInput) return; // Corregido: playerNameInput
    const name = domElements.playerNameInput.value.trim();

    if (name && name.length > 0 && name.length <= 15 && /^[a-zA-Z0-9\s]+$/.test(name)) {
        player.name = name;
        closeModal('nameEntryModal');
        showNotification(`Nombre establecido: ${player.name}! Bienvenido a Aincrad.`, "success");

        // Equipar espada básica si no tiene arma y está en inventario
        // Esta lógica debe llamarse desde donde equipItem es importado, como inventory_logic.js o main.js
        // No se puede llamar directamente aquí sin una importación circular.
        // Se asume que en main.js se manejará la inicialización del equipo al cargar el juego.
        const basicSwordInInventory = player.inventory.find(item => item.id === 'basic_sword');
        if (basicSwordInInventory && !player.equipment.weapon) {
             // Encuentra el índice del item en el inventario
            const index = player.inventory.findIndex(item => item.id === 'basic_sword');
            if (index !== -1) {
                // equipItem requiere la instancia completa del item y su índice
                equipItem(player.inventory[index], index);
            }
        }
        
        calculateEffectiveStats();
        updateHUD(); // Usar la función renombrada
        saveGame();
        disableGameActions(false); // Habilitar acciones de juego
    } else {
        showNotification("Nombre inválido. Debe tener entre 1-15 caracteres alfanuméricos.", "error");
        if (domElements.nameEntryError) {
            domElements.nameEntryError.textContent = "Nombre inválido. Debe tener entre 1-15 caracteres alfanuméricos y no estar vacío.";
        }
    }
}