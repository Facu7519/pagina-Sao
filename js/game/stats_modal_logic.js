// js/game/stats_modal_logic.js

import { player } from './game_state.js'; // 'calculateEffectiveStats' y 'uiStates' removidos de la importación
import { domElements } from '../dom.js';
import { skillData, passiveSkillData } from '../data/skills_db.js';
import { calculateEffectiveStats } from './player_logic.js'; // Importar correctamente desde player_logic
import { openModal } from '../utils.js'; // Necesario para openPlayerStatsModal

/**
 * Renderiza las estadísticas del jugador en el modal correspondiente.
 * Asegura que las estadísticas efectivas se calculen antes de mostrar.
 */
export function renderPlayerStats() {
    calculateEffectiveStats(); // Ensure stats are up-to-date

    const {
        name, level, hp, maxHp, mp, maxMp, currentExp, neededExp, col,
        baseAttack, baseDefense, effectiveAttack, effectiveDefense
    } = player;

    // Basic Info
    domElements.statsPlayerName.textContent = name || "Jugador";
    domElements.statsLevel.textContent = level;
    domElements.statsHp.textContent = `${hp} / ${maxHp}`;
    domElements.statsMp.textContent = `${mp} / ${maxMp}`;
    domElements.statsExp.textContent = `${currentExp} / ${neededExp}`;
    domElements.statsCol.textContent = col;

    // Combat Stats
    domElements.statsBaseAtk.textContent = baseAttack;
    domElements.statsBaseDef.textContent = baseDefense;

    let equippedAttack = 0;
    let equippedDefense = 0;
    let equippedMaxHp = 0;
    let equippedMaxMp = 0;

    Object.values(player.equipment).forEach(item => {
        if (item && item.stats) {
            equippedAttack += item.stats.attack || 0;
            equippedDefense += item.stats.defense || 0;
            equippedMaxHp += item.stats.hp || 0;
            equippedMaxMp += item.stats.mp || 0;
        }
    });

    domElements.statsEquippedAtk.textContent = equippedAttack;
    domElements.statsEquippedDef.textContent = equippedDefense;
    domElements.statsEquippedHp.textContent = equippedMaxHp;
    domElements.statsEquippedMp.textContent = equippedMaxMp;

    domElements.statsEffectiveAtk.textContent = effectiveAttack;
    domElements.statsEffectiveDef.textContent = effectiveDefense;

    // Skills
    renderSkillList(domElements.playerActiveSkillsList, player.skills, skillData, '⚡', "No tienes habilidades activas.");
    renderSkillList(domElements.playerPassiveSkillsList, player.passiveSkills, passiveSkillData, '🌟', "No tienes habilidades pasivas.");
}

/**
 * Función auxiliar para renderizar listas de habilidades (activas o pasivas).
 * @param {HTMLElement} ulElement - El elemento <ul> donde se renderizarán las habilidades.
 * @param {Array<Object>} playerSkillsArray - El array de habilidades del jugador (player.skills o player.passiveSkills).
 * @param {Object} skillDefinitionData - El objeto de definiciones de habilidades (skillData o passiveSkillData).
 * @param {string} iconPrefix - Un icono predeterminado si la habilidad no tiene uno.
 * @param {string} emptyMessage - Mensaje a mostrar si no hay habilidades.
 */
function renderSkillList(ulElement, playerSkillsArray, skillDefinitionData, iconPrefix, emptyMessage) {
    ulElement.innerHTML = '';
    if (playerSkillsArray && playerSkillsArray.length > 0) {
        playerSkillsArray.forEach(playerSkill => {
            const skillId = playerSkill.id;
            const skill = skillDefinitionData[skillId]; 
            
            if (skill) {
                const li = document.createElement('li');
                let descriptionText = skill.description || '';
                if (skill.mpCost !== undefined) {
                    descriptionText = `Coste MP: ${skill.mpCost}. ${descriptionText}`;
                }
                if (skill.levelReq !== undefined) {
                    descriptionText += ` (Req. LV: ${skill.levelReq})`;
                }
                li.textContent = `${skill.icon || iconPrefix} ${skill.name} - ${descriptionText.trim()}`;
                ulElement.appendChild(li);
            } else {
                console.warn(`Definición no encontrada para la habilidad ID: ${skillId}`);
            }
        });
    } else {
        const li = document.createElement('li');
        li.textContent = emptyMessage;
        ulElement.appendChild(li);
    }
}

/**
 * Abre el modal de estadísticas del jugador.
 */
export function openPlayerStatsModal() {
    renderPlayerStats(); // Asegura que los datos estén actualizados al abrir
    player.uiStates.isPlayerStatsModalOpen = true; // Actualizar el estado global
    domElements.playerStatsModalElement.style.display = 'block';
}

/**
 * Cierra el modal de estadísticas del jugador.
 */
export function closePlayerStatsModal() {
    player.uiStates.isPlayerStatsModalOpen = false; // Actualizar el estado global
    domElements.playerStatsModalElement.style.display = 'none';
}