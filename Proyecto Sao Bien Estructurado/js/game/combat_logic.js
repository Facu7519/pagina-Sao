// js/game/combat_logic.js

import { player, currentCombat } from './game_state.js';
import { domElements, getEl } from '../dom.js'; // Añadir getEl si es necesario
import { showNotification, openModal, closeModal, updateResourceBar, renderGridItems } from '../utils.js';
import { floorData } from '../data/floor_data_db.js';
import { baseItems } from '../data/items_db.js';
import { skillData } from '../data/skills_db.js';
import { statusEffects } from '../data/status_effects_db.js';
import { saveGame } from './persistence_logic.js';
import { updateQuestProgress } from './quests_logic.js';
import { addMaterial, addItemToInventory } from './inventory_logic.js';
import { NUM_BOSS_HP_BARS } from '../config.js'; // Importar de config.js
import { 
    restoreResource, 
    applyStatusEffect, 
    removeStatusEffect, 
    gainExp, 
    calculateEffectiveStats, // Importar calculateEffectiveStats desde player_logic.js
    processPlayerStatusEffects // Asegurarse de importar si se usa aquí
} from './player_logic.js'; 
import { updatePlayerHUD } from './hud_logic.js'; // Importar updatePlayerHUD directamente

let combatInterval; // Para el loop de combate si fuera necesario (ej. ticks de veneno)

/**
 * Inicializa y comienza un nuevo combate.
 * @param {string} enemyType - 'monster' o 'boss'.
 * @param {number} [floorNumber] - El número de piso para obtener el enemigo (si no es el currentFloor del jugador).
 */
export function startCombat(enemyType = 'monster', floorNumber = player.currentFloor) {
    if (currentCombat.active) {
        showNotification("Ya estás en combate.", "default");
        return;
    }

    const floor = floorData[floorNumber];
    if (!floor) {
        showNotification("Datos del piso no encontrados para el combate.", "error");
        return;
    }

    let enemyTemplate;
    let isBoss = false;

    if (enemyType === 'boss') {
        enemyTemplate = floor.boss;
        isBoss = true;
        if (enemyTemplate.levelReq && player.level < enemyTemplate.levelReq) { // Asume que los jefes tienen levelReq
            showNotification(`Necesitas ser nivel ${enemyTemplate.levelReq} para desafiar a ${enemyTemplate.name}.`, "error");
            return;
        }
    } else {
        // Seleccionar un monstruo aleatorio del piso
        enemyTemplate = floor.monsters[Math.floor(Math.random() * floor.monsters.length)];
    }

    if (!enemyTemplate) {
        showNotification("No hay enemigos disponibles para combatir en este piso.", "error");
        return;
    }

    // Clonar el enemigo para que sus HP/stats sean específicos de este combate
    currentCombat.enemy = JSON.parse(JSON.stringify(enemyTemplate));
    currentCombat.enemy.hp = currentCombat.enemy.hp || 1; // Asegurar HP
    currentCombat.enemy.maxHp = currentCombat.enemy.hp; // Guardar max HP para la barra
    currentCombat.enemy.activeStatusEffects = []; // Inicializar efectos de estado para el enemigo

    currentCombat.active = true;
    currentCombat.isBoss = isBoss;
    currentCombat.playerTurn = true; // El jugador siempre empieza
    currentCombat.turnCount = 0;

    // Reiniciar HP/MP del jugador al máximo al inicio de un nuevo combate si no está ya full
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.activeStatusEffects = []; // Limpiar efectos de estado del jugador
    player.tempCritChanceBonus = 0; // Limpiar buffs/debuffs temporales

    openModal('combatModal');
    updateCombatUI();
    addCombatLog(`¡Un ${currentCombat.enemy.icon} ${currentCombat.enemy.name} aparece!`, 'system-message');
    addCombatLog(`¡Es tu turno!`, 'system-message');
    saveGame(); // Guardar estado al inicio del combate
}

/**
 * Inicia un combate contra el jefe del piso actual.
 */
export function startBossCombat() {
    startCombat('boss', player.currentFloor);
}

/**
 * Actualiza la interfaz de usuario del modal de combate.
 */
export function updateCombatUI() {
    if (!currentCombat.active) return;

    // Asegurarse de que las estadísticas del jugador estén actualizadas antes de mostrarlas
    calculateEffectiveStats(); 

    // Actualizar datos del jugador en combate
    domElements.combatPlayerName.textContent = player.name;
    updateResourceBar(domElements.combatPlayerHpBar, player.hp, player.maxHp, true);
    domElements.combatPlayerHpCurrent.textContent = player.hp;
    domElements.combatPlayerHpMax.textContent = player.maxHp;
    domElements.combatPlayerMpCurrent.textContent = player.mp;
    domElements.combatPlayerMpMax.textContent = player.maxMp;
    domElements.combatPlayerAtk.textContent = player.effectiveAttack;
    domElements.combatPlayerDef.textContent = player.effectiveDefense;
    displayStatusEffects(domElements.combatPlayerStatusEffectsDisplay, player.activeStatusEffects);

    // Actualizar datos del enemigo en combate
    domElements.combatEnemyName.textContent = currentCombat.enemy.name;
    domElements.combatEnemyIcon.textContent = currentCombat.enemy.icon || '❓';
    domElements.combatEnemyHpCurrent.textContent = currentCombat.enemy.hp;
    domElements.combatEnemyHpMax.textContent = currentCombat.enemy.maxHp;
    domElements.combatEnemyAtk.textContent = currentCombat.enemy.attack;
    domElements.combatEnemyDef.textContent = currentCombat.enemy.defense;
    displayStatusEffects(domElements.combatEnemyStatusEffectsDisplay, currentCombat.enemy.activeStatusEffects);

    // Manejo de barras de HP para jefe
    if (currentCombat.isBoss) {
        domElements.combatEnemyHpBarFill.style.display = 'none'; // Ocultar barra simple
        domElements.combatEnemyHpBarsContainer.classList.add('boss-hp-bars');
        domElements.combatEnemyHpBarsContainer.style.display = 'block';

        const segmentHp = currentCombat.enemy.maxHp / NUM_BOSS_HP_BARS;
        for (let i = 0; i < NUM_BOSS_HP_BARS; i++) {
            const segmentElement = getEl(`combat-enemy-hp-segment-${i + 1}`);
            if (segmentElement) {
                let currentSegmentHp = Math.max(0, currentCombat.enemy.hp - (segmentHp * i));
                const percentage = Math.min(100, (currentSegmentHp / segmentHp) * 100);
                segmentElement.style.width = `${percentage}%`;
                if (currentSegmentHp <= 0) {
                    segmentElement.classList.add('empty');
                } else {
                    segmentElement.classList.remove('empty');
                }
            }
        }
    } else {
        domElements.combatEnemyHpBarFill.style.display = 'block'; // Mostrar barra simple
        domElements.combatEnemyHpBarsContainer.classList.remove('boss-hp-bars');
        domElements.combatEnemyHpBarsContainer.style.display = 'none';
        updateResourceBar(domElements.combatEnemyHpBarFill, currentCombat.enemy.hp, currentCombat.enemy.maxHp, true);
    }

    // Resaltar turno activo
    if (currentCombat.playerTurn) {
        domElements.combatPlayerDisplay.classList.add('active-turn');
        domElements.combatEnemyDisplay.classList.remove('active-turn');
        domElements.combatActionAttackBtn.disabled = false;
        domElements.combatActionSkillsBtn.disabled = false;
        domElements.combatActionPotionsBtn.disabled = false;
    } else {
        domElements.combatPlayerDisplay.classList.remove('active-turn');
        domElements.combatEnemyDisplay.classList.add('active-turn');
        domElements.combatActionAttackBtn.disabled = true;
        domElements.combatActionSkillsBtn.disabled = true;
        domElements.combatActionPotionsBtn.disabled = true;
    }

    // Ocultar/mostrar listas de habilidades/pociones
    domElements.combatSkillsListContainer.style.display = 'none';
    domElements.combatPotionsListContainer.style.display = 'none';
}


/**
 * Muestra los iconos de los efectos de estado en el display.
 * @param {HTMLElement} displayElement - El elemento del DOM donde se mostrarán los iconos.
 * @param {Array<Object>} effectsArray - El array de efectos de estado activos.
 */
function displayStatusEffects(displayElement, effectsArray) {
    if (!displayElement) return;
    displayElement.innerHTML = ''; // Limpiar efectos anteriores

    if (!effectsArray || effectsArray.length === 0) return;

    effectsArray.forEach(effectInstance => {
        const effectDefinition = statusEffects[effectInstance.type];
        if (effectDefinition) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'status-effect-icon tooltip'; // Añadir clase tooltip
            iconSpan.textContent = effectDefinition.icon;
            iconSpan.style.color = effectDefinition.color || '#ffffff'; // Usar color definido o blanco por defecto

            // Crear el texto del tooltip
            const tooltipTextSpan = document.createElement('span');
            tooltipTextSpan.className = 'tooltiptext';
            tooltipTextSpan.textContent = `${effectDefinition.name}: ${effectDefinition.description} (Duración: ${effectInstance.duration} turnos)`;
            
            iconSpan.appendChild(tooltipTextSpan);
            displayElement.appendChild(iconSpan);
        }
    });
}


/**
 * Registra un mensaje en el log de combate.
 * @param {string} message - El mensaje a añadir.
 * @param {string} type - Clase CSS para el estilo del mensaje ('player-action', 'enemy-action', 'system-message', 'combo-message', 'status-message').
 */
export function addCombatLog(message, type = 'system-message') {
    const logEntry = document.createElement('p');
    logEntry.className = type;
    logEntry.textContent = message;
    domElements.combatLogDisplay.appendChild(logEntry);
    domElements.combatLogDisplay.scrollTop = domElements.combatLogDisplay.scrollHeight; // Scroll al final
}

/**
 * Maneja el turno del jugador (acciones: atacar, habilidad, poción, huir).
 */
async function playerTurn() {
    if (player.hp <= 0) {
        endCombat(false); // Player defeated
        return;
    }
    if (currentCombat.enemy.hp <= 0) {
        endCombat(true); // Enemy defeated
        return;
    }

    // Aplicar efectos de estado del jugador al inicio de su turno
    processPlayerStatusEffects(); // Esta función ahora procesa los efectos del jugador

    if (player.activeStatusEffects.some(eff => eff.type === 'stunned')) {
        addCombatLog(`${player.name} está aturdido y no puede actuar.`, 'status-message');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa
        currentCombat.playerTurn = false;
        enemyTurn();
        return;
    }

    // Habilitar botones de acción
    domElements.combatActionAttackBtn.disabled = false;
    domElements.combatActionSkillsBtn.disabled = false;
    domElements.combatActionPotionsBtn.disabled = false;
    domElements.combatActionFleeBtn.disabled = false;
    updateCombatUI(); // Asegurar que el turno esté resaltado y botones activos
}


/**
 * Procesa un ataque básico del jugador.
 */
export function playerAttack() {
    if (!currentCombat.active || !currentCombat.playerTurn) return;

    hideCombatActionPanels(); // Ocultar paneles de habilidades/pociones

    const baseDamage = player.effectiveAttack;
    let damageDealt = Math.max(1, baseDamage - currentCombat.enemy.defense);

    // Aplicar efecto 'protected' al enemigo si lo tiene
    const enemyProtectedEffect = currentCombat.enemy.activeStatusEffects.find(eff => eff.type === 'protected');
    if (enemyProtectedEffect) {
        damageDealt *= (1 - enemyProtectedEffect.value);
        damageDealt = Math.max(1, Math.floor(damageDealt)); // Reducir daño y asegurar que sea al menos 1
        addCombatLog(`${currentCombat.enemy.name} está ${statusEffects.protected.name} y el daño se redujo.`, 'status-message');
    }

    currentCombat.enemy.hp -= damageDealt;
    addCombatLog(`${player.name} ataca a ${currentCombat.enemy.name} por ${damageDealt} HP.`, 'player-action');
    flashDamage(domElements.combatEnemyDisplay); // Efecto visual de daño

    // Aplicar efecto 'counter' si el enemigo lo tiene
    const enemyCounterEffect = currentCombat.enemy.activeStatusEffects.find(eff => eff.type === 'counter');
    if (enemyCounterEffect && Math.random() < enemyCounterEffect.chance) {
        const counterDamage = Math.floor(player.maxHp * enemyCounterEffect.value); // Daño de contraataque % de HP máx del jugador
        player.hp -= counterDamage;
        addCombatLog(`${currentCombat.enemy.name} contraataca, ${player.name} recibe ${counterDamage} de daño.`, 'enemy-action');
        flashDamage(domElements.combatPlayerDisplay);
    }

    checkCombatEnd();
    if (currentCombat.active) {
        currentCombat.playerTurn = false;
        setTimeout(enemyTurn, 1500); // Pequeña pausa antes del turno del enemigo
    }
}

/**
 * Usa una habilidad de combate.
 * @param {string} skillId - El ID de la habilidad a usar.
 */
export function useCombatSkill(skillId) {
    if (!currentCombat.active || !currentCombat.playerTurn) return;

    const skill = skillData[skillId];
    if (!skill) {
        showNotification("Habilidad no encontrada.", "error");
        return;
    }
    if (player.mp < skill.mpCost) {
        showNotification("Maná insuficiente para usar esta habilidad.", "error");
        return;
    }
    if (skill.levelReq && player.level < skill.levelReq) {
        showNotification(`Nivel ${skill.levelReq} requerido para esta habilidad.`, "error");
        return;
    }

    // Consumir MP
    player.mp -= skill.mpCost;
    hideCombatActionPanels();

    let damageDealt = 0;
    if (skill.damageMultiplier) {
        damageDealt = Math.max(1, Math.floor(player.effectiveAttack * skill.damageMultiplier) - currentCombat.enemy.defense);
    }
    if (skill.healAmount) {
        restoreResource('hp', skill.healAmount);
        addCombatLog(`${player.name} usa ${skill.icon} ${skill.name} y restaura ${skill.healAmount} HP.`, 'player-action');
    }

    if (damageDealt > 0) {
        // Aplicar efecto 'protected' al enemigo si lo tiene
        const enemyProtectedEffect = currentCombat.enemy.activeStatusEffects.find(eff => eff.type === 'protected');
        if (enemyProtectedEffect) {
            damageDealt *= (1 - enemyProtectedEffect.value);
            damageDealt = Math.max(1, Math.floor(damageDealt));
            addCombatLog(`${currentCombat.enemy.name} está ${statusEffects.protected.name} y el daño se redujo.`, 'status-message');
        }

        currentCombat.enemy.hp -= damageDealt;
        addCombatLog(`${player.name} usa ${skill.icon} ${skill.name} e inflige ${damageDealt} HP a ${currentCombat.enemy.name}.`, 'player-action');
        flashDamage(domElements.combatEnemyDisplay);
    }

    // Aplicar efectos de estado de la habilidad al enemigo
    if (skill.statusEffect && Math.random() < skill.statusEffect.chance) {
        applyStatusEffect(currentCombat.enemy, skill.statusEffect.type, skill.statusEffect.duration);
        addCombatLog(`${currentCombat.enemy.name} ha sido ${statusEffects[skill.statusEffect.type].name.toLowerCase()}.`, 'status-message');
    }

    // Aplicar efecto 'counter' si el enemigo lo tiene
    const enemyCounterEffect = currentCombat.enemy.activeStatusEffects.find(eff => eff.type === 'counter');
    if (enemyCounterEffect && Math.random() < enemyCounterEffect.chance) {
        const counterDamage = Math.floor(player.maxHp * enemyCounterEffect.value);
        player.hp -= counterDamage;
        addCombatLog(`${currentCombat.enemy.name} contraataca, ${player.name} recibe ${counterDamage} de daño.`, 'enemy-action');
        flashDamage(domElements.combatPlayerDisplay);
    }

    checkCombatEnd();
    if (currentCombat.active) {
        currentCombat.playerTurn = false;
        setTimeout(enemyTurn, 1500);
    }
}


/**
 * Usa una poción de combate.
 * @param {number} inventoryIndex - El índice de la poción en el inventario del jugador.
 */
export function useCombatPotion(inventoryIndex) {
    if (!currentCombat.active || !currentCombat.playerTurn) return;

    const potionInstance = player.inventory[inventoryIndex];
    if (!potionInstance) {
        showNotification("Poción no encontrada en el inventario.", "error");
        return;
    }

    const itemBase = baseItems[potionInstance.id];
    if (!itemBase || itemBase.type !== 'consumable' || !itemBase.effect) {
        showNotification("No puedes usar este item como poción.", "error");
        return;
    }

    // Consumir poción
    if (potionInstance.count > 1) {
        potionInstance.count--;
    } else {
        player.inventory.splice(inventoryIndex, 1);
    }

    // Aplicar efecto de la poción
    if (itemBase.effect.hp) {
        restoreResource('hp', itemBase.effect.hp);
        addCombatLog(`${player.name} usa ${itemBase.icon} ${itemBase.name} y restaura ${itemBase.effect.hp} HP.`, 'player-action');
    }
    if (itemBase.effect.mp) {
        restoreResource('mp', itemBase.effect.mp);
        addCombatLog(`${player.name} usa ${itemBase.icon} ${itemBase.name} y restaura ${itemBase.effect.mp} MP.`, 'player-action');
    }
    if (itemBase.effect.statusEffect) {
        applyStatusEffect(player, itemBase.effect.statusEffect.type, itemBase.effect.statusEffect.duration);
        addCombatLog(`${player.name} ha ganado el efecto ${statusEffects[itemBase.effect.statusEffect.type].name}.`, 'player-action');
    }

    hideCombatActionPanels(); // Ocultar paneles de habilidades/pociones
    updatePlayerHUD(); // Actualizar el HUD principal por si cambió inventario o recursos

    checkCombatEnd();
    if (currentCombat.active) {
        currentCombat.playerTurn = false;
        setTimeout(enemyTurn, 1500);
    }
}


/**
 * Maneja el turno del enemigo.
 */
async function enemyTurn() {
    if (player.hp <= 0) {
        endCombat(false); // Player defeated
        return;
    }
    if (currentCombat.enemy.hp <= 0) {
        endCombat(true); // Enemy defeated
        return;
    }

    updateCombatUI(); // Asegurar que el turno esté resaltado en la UI
    currentCombat.turnCount++; // Incrementar contador de turnos

    // Aplicar efectos de estado del enemigo al inicio de su turno
    processStatusEffects(currentCombat.enemy, 'enemy');

    if (currentCombat.enemy.activeStatusEffects.some(eff => eff.type === 'stunned')) {
        addCombatLog(`${currentCombat.enemy.name} está aturdido y no puede actuar.`, 'status-message');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa
        currentCombat.playerTurn = true;
        playerTurn();
        return;
    }

    // Lógica de ataque del enemigo
    let enemyDamage = Math.max(1, currentCombat.enemy.attack - player.effectiveDefense);

    // Aplicar efecto 'protected' al jugador si lo tiene
    const playerProtectedEffect = player.activeStatusEffects.find(eff => eff.type === 'protected');
    if (playerProtectedEffect) {
        enemyDamage *= (1 - playerProtectedEffect.value);
        enemyDamage = Math.max(1, Math.floor(enemyDamage)); // Reducir daño y asegurar que sea al menos 1
        addCombatLog(`${player.name} está ${statusEffects.protected.name} y el daño se redujo.`, 'status-message');
    }

    // Lógica de habilidades del jefe
    if (currentCombat.isBoss && currentCombat.enemy.skills && currentCombat.enemy.skills.length > 0) {
        // Simple lógica: el jefe tiene una X% de probabilidad de usar una habilidad si tiene MP
        const skillToUse = currentCombat.enemy.skills[Math.floor(Math.random() * currentCombat.enemy.skills.length)];
        // Simplificación: asume que las habilidades del jefe no cuestan MP para este ejemplo, o que siempre tiene
        if (skillToUse) {
            let skillDamage = Math.floor(currentCombat.enemy.attack * (skillToUse.damageMultiplier || 1));
            // Aplicar 'protected' al jugador si lo tiene
            if (playerProtectedEffect) {
                skillDamage *= (1 - playerProtectedEffect.value);
                skillDamage = Math.max(1, Math.floor(skillDamage));
            }

            player.hp -= skillDamage;
            addCombatLog(`${currentCombat.enemy.icon} ${currentCombat.enemy.name} usa ${skillToUse.name} e inflige ${skillDamage} HP a ${player.name}.`, 'enemy-action');
            flashDamage(domElements.combatPlayerDisplay);

            if (skillToUse.statusEffect && Math.random() < skillToUse.statusEffect.chance) {
                applyStatusEffect(player, skillToUse.statusEffect.type, skillToUse.statusEffect.duration);
                addCombatLog(`${player.name} ha sido ${statusEffects[skillToUse.statusEffect.type].name.toLowerCase()}.`, 'status-message');
            }

            checkCombatEnd();
            if (!currentCombat.active) return; // Si el jugador muere por habilidad
        } else {
            // Si no usa habilidad, ataque básico
            player.hp -= enemyDamage;
            addCombatLog(`${currentCombat.enemy.icon} ${currentCombat.enemy.name} ataca a ${player.name} por ${enemyDamage} HP.`, 'enemy-action');
            flashDamage(domElements.combatPlayerDisplay);
        }
    } else {
        // Monstruo normal: ataque básico
        player.hp -= enemyDamage;
        addCombatLog(`${currentCombat.enemy.icon} ${currentCombat.enemy.name} ataca a ${player.name} por ${enemyDamage} HP.`, 'enemy-action');
        flashDamage(domElements.combatPlayerDisplay);
    }

    checkCombatEnd();
    if (currentCombat.active) {
        currentCombat.playerTurn = true;
        setTimeout(playerTurn, 1500);
    }
}

/**
 * Procesa los efectos de estado de una entidad (jugador o enemigo) al inicio de su turno.
 * @param {object} entity - El objeto de la entidad (player o currentCombat.enemy).
 * @param {string} entityType - 'player' o 'enemy'.
 */
function processStatusEffects(entity, entityType) {
    const effectsToRemove = [];
    entity.activeStatusEffects.forEach(effect => {
        effect.duration--; // Disminuir duración
        switch (effect.type) {
            case 'poisoned':
            case 'bleeding':
                const damage = Math.max(1, Math.floor(entity.maxHp * statusEffects[effect.type].value));
                entity.hp -= damage;
                addCombatLog(`${entity.name} sufre ${damage} de daño por ${statusEffects[effect.type].name.toLowerCase()}.`, 'status-message');
                flashDamage(entityType === 'player' ? domElements.combatPlayerDisplay : domElements.combatEnemyDisplay);
                break;
            case 'protected':
                // Se aplica al recibir daño, no aquí
                break;
            case 'stunned':
                // Se aplica al inicio del turno para saltar el turno
                break;
            case 'counter':
                // Se aplica al recibir daño, no aquí
                break;
            case 'hp_regen_s': // Habilidad pasiva del jugador
                if (entityType === 'player') {
                    // La regeneración de HP del jugador se calcula como stat temporal
                    // y se aplica en player_logic.js en calculateEffectiveStats() y handlePlayerTurnEndEffects()
                    // Para evitar doble regeneración, quitamos la lógica de aquí
                }
                break;
            // Otros efectos aquí
        }
        if (effect.duration <= 0) {
            effectsToRemove.push(effect.type);
        }
    });

    effectsToRemove.forEach(type => {
        removeStatusEffect(entity, type);
        addCombatLog(`${entity.name} ya no está ${statusEffects[type].name.toLowerCase()}.`, 'status-message');
    });

    updateCombatUI();
    if (player.hp <= 0) {
        endCombat(false); // Player defeated by status effect
    }
    if (currentCombat.enemy.hp <= 0) {
        endCombat(true); // Enemy defeated by status effect
    }
}

/**
 * Verifica si el combate ha terminado.
 */
function checkCombatEnd() {
    if (player.hp <= 0) {
        endCombat(false); // Derrota
    } else if (currentCombat.enemy.hp <= 0) {
        endCombat(true); // Victoria
    }
}

/**
 * Finaliza el combate y muestra el resultado.
 * @param {boolean} playerWon - True si el jugador ganó, false si perdió.
 */
export function endCombat(playerWon) {
    if (!currentCombat.active) return; // Ya terminó el combate

    currentCombat.active = false;
    currentCombat.enemy = null; // Limpiar enemigo

    hideCombatActionPanels(); // Asegurar que los paneles de acción estén ocultos
    domElements.combatActionAttackBtn.disabled = false; // Re-habilitar botones para el próximo combate
    domElements.combatActionSkillsBtn.disabled = false;
    domElements.combatActionPotionsBtn.disabled = false;
    domElements.combatActionFleeBtn.disabled = false;

    if (playerWon) {
        addCombatLog(`¡VICTORIA! Has derrotado a ${currentCombat.enemy.name || 'tu oponente'}!`, 'system-message');
        const expGained = currentCombat.enemy.exp;
        const colGained = currentCombat.enemy.col;
        gainExp(expGained); // Ganar experiencia
        player.col += colGained; // Ganar Col
        addCombatLog(`Ganaste ${expGained} EXP y ${colGained} Col.`, 'success');

        // Manejar drops del enemigo
        if (currentCombat.enemy.drops) {
            for (const dropId in currentCombat.enemy.drops) {
                const dropChance = currentCombat.enemy.drops[dropId];
                if (Math.random() < dropChance) {
                    const itemBase = baseItems[dropId];
                    if (itemBase) {
                        if (itemBase.type === 'material') {
                            addMaterial(dropId, 1); // Asumimos que se dropea de a 1 material
                        } else {
                            addItemToInventory({ id: dropId }, 1); // Item completo
                        }
                        addCombatLog(`¡Obtuviste ${itemBase.icon || ''} ${itemBase.name}!`, 'success');
                    }
                }
            }
        }

        // Si es un jefe, desbloquear siguiente piso y/o misiones
        if (currentCombat.isBoss) {
            updateQuestProgress('kill_boss', currentCombat.enemy.name, 1); // Actualizar misión de jefe
            const nextFloor = player.currentFloor + 1;
            if (floorData[nextFloor] && !player.unlockedFloors.includes(nextFloor)) {
                player.unlockedFloors.push(nextFloor);
                player.unlockedFloors.sort((a,b) => a - b); // Mantener ordenado
                showNotification(`¡Has desbloqueado el Piso ${nextFloor}: ${floorData[nextFloor].name}!`, 'success', 7000);
                addCombatLog(`El camino al Piso ${nextFloor} ha sido abierto.`, 'system-message');
                updateQuestProgress('reach_floor', nextFloor.toString(), 1); // Posible misión de alcanzar piso
            }
        } else {
            updateQuestProgress('kill', currentCombat.enemy.name, 1); // Actualizar misión de matar monstruo
        }

    } else {
        addCombatLog(`¡DERROTA! Has sido derrotado por ${currentCombat.enemy.name || 'tu oponente'}.`, 'error');
        showNotification("¡Has sido derrotado! Serás transportado de vuelta al inicio.", "error", 8000);
        player.hp = Math.floor(player.maxHp / 2); // Respawn con la mitad de HP
        player.mp = player.maxMp;
        player.currentFloor = 1; // Volver al piso 1
        player.activeStatusEffects = []; // Limpiar efectos de estado
        addCombatLog(`Fuiste enviado de regreso al Piso 1.`, 'system-message');
    }

    saveGame();
    updatePlayerHUD();
    // Cerrar modal de combate después de un breve retraso para que el usuario lea el log final
    setTimeout(() => {
        closeModal('combatModal');
    }, 3000); // Pequeña pausa
}

/**
 * Reinicia el estado de combate (usado al huir o al finalizar).
 */
export function resetCombat() {
    currentCombat.active = false;
    currentCombat.enemy = null;
    currentCombat.isBoss = false;
    currentCombat.playerTurn = true;
    currentCombat.turnCount = 0;
    // Detener cualquier animación o intervalo si lo hubiera
}

/**
 * Maneja la acción de huir del combate.
 */
export function fleeCombat() {
    if (!currentCombat.active) return;
    addCombatLog(`${player.name} intenta huir...`, 'system-message');
    // Lógica de huida: simple éxito por ahora, pero podría tener % de fallo.
    const fleeChance = 0.6; // 60% de probabilidad de huir
    if (Math.random() < fleeChance) {
        addCombatLog(`¡Has huido exitosamente del combate!`, 'system-message');
        endCombat(false); // Considerar como "derrota" en términos de no ganar nada, pero no morir
        showNotification("Has huido del combate.", "default");
    } else {
        addCombatLog(`¡Fallaste al huir! ${currentCombat.enemy.name} ataca de nuevo.`, 'error');
        showNotification("No pudiste huir.", "error");
        // Turno del enemigo inmediatamente
        currentCombat.playerTurn = false;
        setTimeout(enemyTurn, 1000);
    }
}


/**
 * Alterna la visibilidad de la lista de habilidades en el modal de combate.
 */
export function toggleCombatSkills() {
    domElements.combatPotionsListContainer.style.display = 'none'; // Ocultar pociones
    domElements.combatSkillsListContainer.style.display = domElements.combatSkillsListContainer.style.display === 'flex' ? 'none' : 'flex';

    if (domElements.combatSkillsListContainer.style.display === 'flex') {
        renderCombatSkills();
    }
}

/**
 * Alterna la visibilidad de la lista de pociones en el modal de combate.
 */
export function toggleCombatPotions() {
    domElements.combatSkillsListContainer.style.display = 'none'; // Ocultar habilidades
    domElements.combatPotionsListContainer.style.display = domElements.combatPotionsListContainer.style.display === 'flex' ? 'none' : 'flex';

    if (domElements.combatPotionsListContainer.style.display === 'flex') {
        renderCombatPotions();
    }
}

/**
 * Renderiza las habilidades disponibles en el modal de combate.
 */
function renderCombatSkills() {
    const skillsContainer = domElements.combatSkillsListContainer;
    skillsContainer.innerHTML = ''; // Limpiar anteriores

    player.skills.forEach(skillInstance => {
        const skillBase = skillData[skillInstance.id];
        if (skillBase && player.level >= (skillBase.levelReq || 0)) {
            const skillBtn = document.createElement('button');
            skillBtn.className = 'action-btn tooltip';
            skillBtn.innerHTML = `${skillBase.icon || '✨'} ${skillBase.name} (${skillBase.mpCost} MP) <span class="tooltiptext">${skillBase.description || 'Sin descripción'}</span>`;
            skillBtn.disabled = player.mp < skillBase.mpCost;
            skillBtn.addEventListener('click', () => useCombatSkill(skillInstance.id));
            skillsContainer.appendChild(skillBtn);
        }
    });

    if (skillsContainer.innerHTML === '') {
        skillsContainer.innerHTML = '<p class="empty-list-message">No tienes habilidades activas o tu nivel es bajo.</p>';
    }
}

/**
 * Renderiza las pociones disponibles en el modal de combate.
 */
function renderCombatPotions() {
    const potionsContainer = domElements.combatPotionsListContainer;
    potionsContainer.innerHTML = ''; // Limpiar anteriores

    const usablePotions = player.inventory.filter(item => {
        const itemBase = baseItems[item.id];
        return itemBase && itemBase.type === 'consumable' && itemBase.effect && (itemBase.effect.hp || itemBase.effect.mp);
    });

    if (usablePotions.length === 0) {
        potionsContainer.innerHTML = '<p class="empty-list-message">No tienes pociones utilizables.</p>';
        return;
    }

    usablePotions.forEach((potionInstance, index) => {
        const itemBase = baseItems[potionInstance.id];
        if (itemBase) {
            const potionBtn = document.createElement('button');
            potionBtn.className = 'action-btn tooltip';
            potionBtn.innerHTML = `${itemBase.icon || '🧪'} ${itemBase.name} (x${potionInstance.count}) <span class="tooltiptext">${itemBase.description || 'Sin descripción'}</span>`;
            potionBtn.addEventListener('click', () => useCombatPotion(player.inventory.indexOf(potionInstance))); // Pasa el índice del item original
            potionsContainer.appendChild(potionBtn);
        }
    });
}

/**
 * Oculta los paneles de habilidades y pociones en combate.
 */
function hideCombatActionPanels() {
    domElements.combatSkillsListContainer.style.display = 'none';
    domElements.combatPotionsListContainer.style.display = 'none';
}


/**
 * Aplica un efecto visual de "daño" al elemento del combatiente.
 * @param {HTMLElement} element - El elemento del combatiente a aplicar el flash.
 */
function flashDamage(element) {
    element.classList.add('damage-flash');
    setTimeout(() => {
        element.classList.remove('damage-flash');
    }, 200); // Duración de la animación en CSS
}

// Asignar listeners a los botones de acción del combate
document.addEventListener('DOMContentLoaded', () => {
    if (domElements.combatActionAttackBtn) {
        domElements.combatActionAttackBtn.addEventListener('click', playerAttack);
    }
    if (domElements.combatActionSkillsBtn) {
        domElements.combatActionSkillsBtn.addEventListener('click', toggleCombatSkills);
    }
    if (domElements.combatActionPotionsBtn) {
        domElements.combatActionPotionsBtn.addEventListener('click', toggleCombatPotions);
    }
    if (domElements.combatActionFleeBtn) {
        domElements.combatActionFleeBtn.addEventListener('click', fleeCombat);
    }
});