// js/game/player_logic.js
import { player, currentCombat } from './game_state.js';
import { baseItems } from '../data/items_db.js';
import { skillData, passiveSkillData } from '../data/skills_db.js';
import { floorData } from '../data/floor_data_db.js';
import { domElements } from '../dom.js';
import { updatePlayerHUD } from './hud_logic.js';
import { showNotification, calculateNeededExpForLevel } from '../utils.js';
import { saveGame } from './persistence_logic.js';
import { updateQuestProgress } from './quests_logic.js'; // Para actualizar misiones al subir de nivel o morir
import { endCombat } from './combat_logic.js'; // Para finalizar combate si el jugador muere
import { closeModal } from '../utils.js';


/**
 * Calcula las estadísticas efectivas del jugador (ataque, defensa, HP/MP máximo)
 * considerando el equipo y las habilidades pasivas.
 * Esta función debe llamarse cada vez que el equipo o las pasivas cambien, o al subir de nivel.
 */
export function calculateEffectiveStats() {
    let equippedAttack = 0, equippedDefense = 0, equippedMaxHp = 0, equippedMaxMp = 0;

    // Sumar stats del equipo
    Object.values(player.equipment).forEach(item => {
        if (item && item.stats) {
            equippedAttack += item.stats.attack || 0;
            equippedDefense += item.stats.defense || 0;
            equippedMaxHp += item.stats.hp || 0;
            equippedMaxMp += item.stats.mp || 0;
        }
    });

    player.effectiveAttack = player.baseAttack + equippedAttack;
    player.effectiveDefense = player.baseDefense + equippedDefense;

    const oldMaxHp = player.maxHp;
    player.maxHp = player.baseMaxHp + equippedMaxHp;

    // Ajustar HP actual si el HP máximo cambió
    if (player.hp > player.maxHp) {
        player.hp = player.maxHp;
    } else if (player.maxHp > oldMaxHp && player.hp > 0) { // Si el maxHp aumentó y el jugador no está muerto
        // Curar la diferencia o hasta el nuevo máximo, sin exceder el nuevo maxHp
        player.hp = Math.min(player.hp + (player.maxHp - oldMaxHp), player.maxHp);
    }
    if (player.hp <= 0 && oldMaxHp > 0 && player.maxHp > 0) { // Si estaba muerto y revive por stats (ej. admin)
         // No hacer nada aquí, la muerte se maneja en otro lado.
         // Solo asegurar que no se cure automáticamente si estaba en 0.
    } else if (player.hp <= 0 && player.maxHp <=0) { // Caso borde: si maxHp es 0 o negativo.
        player.hp = 0;
    }


    const oldMaxMp = player.maxMp;
    player.maxMp = player.baseMaxMp + equippedMaxMp;
    if (player.mp > player.maxMp) {
        player.mp = player.maxMp;
    } else if (player.maxMp > oldMaxMp) {
        player.mp = Math.min(player.mp + (player.maxMp - oldMaxMp), player.maxMp);
    }
    
    // Aplicar efectos de habilidades pasivas (esto podría modificar temporalmente los stats efectivos)
    calculatePassiveEffects();
}

/**
 * Calcula y aplica los efectos de las habilidades pasivas activas del jugador.
 * Estos efectos son temporales y se recalculan con calculateEffectiveStats.
 */
function calculatePassiveEffects() {
    // Reiniciar bonificaciones temporales de pasivas
    player.tempAttackBonus = 0; // Ejemplo si tuvieras pasivas de ataque
    player.tempDefenseBonus = 0; // Ejemplo si tuvieras pasivas de defensa
    player.tempCritChanceBonus = 0;
    player.tempMpCostReduction = 0;
    player.tempHpRegen = 0;

    if (player.passiveSkills && Array.isArray(player.passiveSkills)) {
        player.passiveSkills.forEach(pSkillRef => {
            // Asegurarse de que pSkillRef y pSkillRef.id existan
            if (!pSkillRef || !pSkillRef.id) {
                console.warn("Referencia de habilidad pasiva inválida:", pSkillRef);
                return;
            }
            const passive = passiveSkillData[pSkillRef.id];
            if (passive && passive.effect) {
                if (passive.effect.hpRegen) player.tempHpRegen += passive.effect.hpRegen;
                if (passive.effect.mpCostReduction) player.tempMpCostReduction += passive.effect.mpCostReduction;
                if (passive.effect.critChance) player.tempCritChanceBonus += passive.effect.critChance;
                // Añadir más efectos pasivos aquí si es necesario (ej. ATK+, DEF+)
            }
        });
    }
    // Nota: Las bonificaciones de ataque/defensa de pasivas deberían sumarse a player.effectiveAttack/Defense aquí si se implementan.
}


/**
 * Otorga EXP al jugador y maneja la subida de nivel.
 * @param {number} amount - La cantidad de EXP ganada.
 */
export function gainExp(amount) {
    if (player.hp <= 0) return; // No ganar EXP si está muerto

    player.currentExp += amount;
    showNotification(`¡Has ganado ${amount} EXP!`, "success");
    // Aquí se podría llamar a updateQuestProgress si tienes misiones de ganar EXP.
    // updateQuestProgress('gain_exp', null, amount); 

    while (player.currentExp >= player.neededExp) {
        levelUp();
    }
    updatePlayerHUD(); // Actualizar HUD para reflejar cambios de EXP
}

/**
 * Procesa la subida de nivel del jugador.
 * Aumenta stats base, HP/MP, y recalcula la EXP necesaria.
 * También verifica si se aprenden nuevas habilidades.
 */
function levelUp() {
    player.level++;
    player.currentExp = Math.max(0, player.currentExp - player.neededExp); // Restar EXP usada y evitar negativo
    player.neededExp = calculateNeededExpForLevel(player.level);

    // Aumento de stats base
    player.baseMaxHp += Math.floor(20 + player.level * 1.5);
    player.baseMaxMp += Math.floor(8 + player.level * 0.8);
    player.baseAttack += Math.floor(2 + player.level * 0.2);
    player.baseDefense += Math.floor(1 + player.level * 0.15);

    calculateEffectiveStats(); // Recalcular stats con nuevos base

    // Restaurar HP/MP al máximo al subir de nivel
    player.hp = player.maxHp;
    player.mp = player.maxMp;

    showNotification(`¡LEVEL UP! Has alcanzado el Nivel ${player.level}! Tus estadísticas han mejorado.`, "success", 6000);

    // Comprobar si se aprenden nuevas habilidades activas
    Object.entries(skillData).forEach(([skillId, data]) => {
        if (data.levelReq === player.level && !player.skills.find(s => s.id === skillId)) {
            player.skills.push({ id: skillId, ...data }); // Añadir la habilidad completa
            showNotification(`¡Habilidad aprendida: ${data.name}!`, "success");
        }
    });

    // Comprobar si se aprenden nuevas habilidades pasivas
    Object.entries(passiveSkillData).forEach(([pSkillId, data]) => {
        if (data.levelReq === player.level && !player.passiveSkills.find(s => s.id === pSkillId)) {
            player.passiveSkills.push({ id: pSkillId, ...data }); // Añadir la habilidad completa
            showNotification(`¡Habilidad pasiva aprendida: ${data.name}!`, "success");
        }
    });
    updateQuestProgress('reach_level', player.level.toString(), 1); // Para misiones de alcanzar nivel
}

/**
 * Aplica daño al jugador.
 * Considera la defensa y efectos como 'protected' o 'counter'.
 * @param {number} amount - La cantidad de daño base.
 * @param {string} [sourceName="Algo"] - El nombre de la fuente del daño.
 */
export function takePlayerDamage(amount, sourceName = "Algo") {
    if (player.hp <= 0) return; // No puede recibir más daño si ya está muerto

    let damageTaken = Math.max(0, amount - player.effectiveDefense); // Daño mínimo 0 después de defensa

    // Aplicar efecto 'protected' si está activo
    const protectedEffect = player.activeStatusEffects?.find(eff => eff.type === 'protected');
    if (protectedEffect && protectedEffect.value) {
        damageTaken = Math.floor(damageTaken * (1 - protectedEffect.value));
        if (currentCombat.active) showNotification(`${player.name} está protegido, daño reducido.`, 'status-message');
    }
    
    damageTaken = Math.floor(damageTaken);

    // Aplicar efecto 'counter' si está activo y estamos en combate
    const counterEffect = player.activeStatusEffects?.find(eff => eff.type === 'counter');
    if (counterEffect && currentCombat.active && currentCombat.enemy) {
        const damageReductionFromCounter = damageTaken * (counterEffect.damageReduction || 0);
        damageTaken = Math.max(0, damageTaken - Math.floor(damageReductionFromCounter)); // Reducir daño recibido
        
        const reflectedDamage = Math.floor(damageTaken * (counterEffect.value || 0)); // Reflejar parte del daño ya reducido
        if (reflectedDamage > 0) {
            currentCombat.enemy.currentHp = Math.max(0, currentCombat.enemy.currentHp - reflectedDamage);
             // Asumimos que combat_logic tiene una función para loguear y actualizar display enemigo
            if (typeof addCombatLog === 'function') addCombatLog(`${player.name} contraataca! ${currentCombat.enemy.name} recibe ${reflectedDamage} de daño.`, 'player-action');
            if (typeof updateCombatEnemyDisplay === 'function') updateCombatEnemyDisplay();
            if (currentCombat.enemy.currentHp <= 0) {
                endCombat(true); // Jugador gana
                return; // No procesar más daño al jugador si el enemigo murió por contraataque
            }
        }
    }


    player.hp = Math.max(0, player.hp - damageTaken);

    if (currentCombat.active && domElements.combatPlayerDisplay) {
        domElements.combatPlayerDisplay.classList.add('damage-flash');
        setTimeout(() => domElements.combatPlayerDisplay.classList.remove('damage-flash'), 200);
         // Asumimos que combat_logic tiene una función para loguear
        if (typeof addCombatLog === 'function') addCombatLog(`${sourceName} inflige ${damageTaken} de daño a ${player.name}.`, 'enemy-action');
    } else {
        showNotification(`${sourceName} te inflige ${damageTaken} de daño.`, 'error');
    }

    updatePlayerHUD(); // Actualizar HUD siempre
    if (currentCombat.active && typeof updateCombatPlayerDisplay === 'function') {
        updateCombatPlayerDisplay(); // Actualizar específicamente el display de combate del jugador
    }

    if (player.hp === 0) {
        if (currentCombat.active) {
            endCombat(false); // Jugador pierde el combate
        } else {
            gameOver();
        }
    }
}

/**
 * Maneja la condición de Game Over para el jugador.
 */
export function gameOver() {
    showNotification("¡Has caído en Aincrad! Fin del juego...", "error", 10000);
    // Aquí podrías añadir lógica para deshabilitar botones, mostrar pantalla de game over, etc.
    if (domElements.combatBtn) disableGameActions(true); // Asume que disableGameActions está en utils o main
    // No cerrar modales importantes, pero sí el de combate si estaba abierto por error.
    if (currentCombat.active) {
        currentCombat.active = false; // Forzar fin de combate
        closeModal('combatModal');
    }
}


/**
 * Habilita o deshabilita los botones de acción principales del juego.
 * @param {boolean} disable - True para deshabilitar, false para habilitar.
 */
export function disableGameActions(disable) {
    const buttonsToToggle = [
        domElements.combatBtn, domElements.bossCombatBtn, 
        domElements.trainSkillBtn, domElements.floorNavigateBtn, 
        domElements.questsBtn, domElements.inventoryBtn, 
        domElements.shopBtn, domElements.blacksmithBtn, 
        domElements.playerStatsBtn
        // No incluir admin, guardar, cargar, nuevo juego aquí, se manejan por separado.
    ];
    buttonsToToggle.forEach(btn => {
        if (btn) btn.disabled = disable;
    });
}


/**
 * Restaura HP o MP del jugador.
 * @param {('hp'|'mp')} type - El tipo de recurso a restaurar.
 * @param {number} amount - La cantidad a restaurar.
 */
export function restoreResource(type, amount) {
    if (player.hp <= 0 && type === 'hp' && amount > 0) { // No revivir con pociones normales
        // A menos que sea una mecánica específica de "revivir"
        // showNotification("No puedes curarte si estás incapacitado.", "error");
        // return;
    }

    if (type === 'hp') {
        player.hp = Math.min(player.hp + amount, player.maxHp);
    } else if (type === 'mp') {
        player.mp = Math.min(player.mp + amount, player.maxMp);
    }
    updatePlayerHUD();
    if (currentCombat.active && typeof updateCombatPlayerDisplay === 'function') {
        updateCombatPlayerDisplay();
    }
}

/**
 * Consume MP del jugador.
 * @param {number} amount - La cantidad de MP a consumir.
 * @returns {boolean} True si el MP fue consumido, false si no había suficiente MP.
 */
export function consumeMp(amount) {
    let actualCost = Math.max(0, Math.floor(amount * (1 - (player.tempMpCostReduction || 0))));
    if (player.mp >= actualCost) {
        player.mp -= actualCost;
        updatePlayerHUD();
        if (currentCombat.active && typeof updateCombatPlayerDisplay === 'function') {
            updateCombatPlayerDisplay();
        }
        return true;
    }
    return false;
}


/**
 * Solicita el nombre del jugador a través de un modal.
 * Se llama al inicio de una nueva partida o si no hay nombre guardado.
 */
export function promptForPlayerName() {
    openModal('nameEntryModal');
    if (domElements.playerNameInputElement) {
        domElements.playerNameInputElement.value = player.name || "";
        domElements.playerNameInputElement.focus();
    }
}

/**
 * Confirma y guarda el nombre del jugador ingresado en el modal.
 * Si el nombre es válido, cierra el modal y actualiza la UI.
 */
export function confirmAndSavePlayerName() {
    if (!domElements.playerNameInputElement) return;
    const name = domElements.playerNameInputElement.value.trim();

    if (name && name.length > 0 && name.length <= 15 && /^[a-zA-Z0-9\s]+$/.test(name)) {
        player.name = name;
        closeModal('nameEntryModal');
        showNotification(`Nombre establecido: ${player.name}! Bienvenido a Aincrad.`, "success");

        // Equipar espada básica si no tiene arma y está en inventario
        if (!player.equipment.weapon) {
            const basicSwordIndex = player.inventory.findIndex(i => i.id === 'basic_sword');
            if (basicSwordIndex !== -1) {
                // Es importante importar equipItem de inventory_logic.js
                // Asumiendo que está disponible globalmente o se importará en main.js y se pasará
                if (typeof equipItem === "function") { // equipItem debe ser importado o definido
                     // equipItem(JSON.parse(JSON.stringify(player.inventory[basicSwordIndex])), basicSwordIndex);
                     // Necesita acceso a la función equipItem desde inventory_logic.js
                     console.warn("equipItem no está disponible en este contexto para equipar automáticamente la espada.")
                } else {
                    console.warn("La función equipItem no está definida globalmente para el auto-equipamiento.");
                }
            }
        }
        calculateEffectiveStats();
        updatePlayerHUD();
        // renderEquipment(); // Debería llamarse desde inventory_logic o hud_logic si es necesario
        saveGame();
        disableGameActions(false); // Habilitar acciones de juego
    } else {
        showNotification("Nombre inválido. Debe tener entre 1-15 caracteres alfanuméricos.", "error");
        domElements.playerNameInputElement.focus();
    }
}


/**
 * Verifica y aplica efectos de estado al inicio o final del turno del jugador en combate.
 * Por ejemplo, daño por veneno, regeneración de HP.
 */
export function processPlayerStatusEffects() {
    if (!currentCombat.active || !player.activeStatusEffects || player.activeStatusEffects.length === 0) return;
    
    const effectsToRemove = [];
    player.activeStatusEffects.forEach(effect => {
        const effectDef = statusEffects[effect.type]; // Necesita importar statusEffects de data
        if (!effectDef) return;

        if (effect.duration > 0) {
            effect.duration--;
            switch (effect.type) {
                case 'poisoned':
                case 'bleeding':
                    const damage = Math.floor(player.maxHp * (effect.value || effectDef.value || 0.05));
                    player.hp = Math.max(0, player.hp - damage);
                    if (typeof addCombatLog === 'function') addCombatLog(`${player.name} pierde ${damage} HP por ${effectDef.name.toLowerCase()}.`, 'status-message');
                    break;
                case 'hp_regen_s': // Este es un ejemplo de pasiva, su efecto directo en combate es vía tempHpRegen
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
        // removeStatusEffect(player, type); // Esta función debería estar en combat_logic o utils
        // Por ahora, solo lo logueamos y actualizamos el array
        const effectDef = statusEffects[type];
        player.activeStatusEffects = player.activeStatusEffects.filter(eff => eff.type !== type);
        if (effectDef && typeof addCombatLog === 'function') {
            addCombatLog(`${player.name} ya no está ${effectDef.name.toLowerCase()}.`, 'status-message');
        }
    });

    if (player.hp === 0) {
        endCombat(false); // El jugador fue derrotado por efectos de estado
    }
    // Actualizar UI de combate y HUD
    if (typeof updateCombatPlayerDisplay === 'function') updateCombatPlayerDisplay();
    updatePlayerHUD();
}