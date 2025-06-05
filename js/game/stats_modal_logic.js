// js/game/stats_modal_logic.js

import { player, calculateEffectiveStats, uiStates } from './game_state.js'; // Assuming calculateEffectiveStats is also in game_state or player_logic
import { domElements } from '../dom.js';
import { skillData, passiveSkillData } from '../data/skills_db.js'; // Assuming skill data is here

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
    let equippedHp = 0;
    // Calculate bonuses from equipment
    Object.values(player.equipment).forEach(item => {
        if (item && item.stats) {
            equippedAttack += item.stats.attack || 0;
            equippedDefense += item.stats.defense || 0;
            equippedHp += item.stats.hp || 0;
            // Add other stat bonuses from equipment if they exist (e.g., mp)
        }
    });

    domElements.statsEquipAtk.textContent = equippedAttack;
    domElements.statsEquipDef.textContent = equippedDefense;
    domElements.statsEquipHp.textContent = `+${equippedHp}`; // Show as bonus

    domElements.statsTotalAtk.textContent = effectiveAttack;
    domElements.statsTotalDef.textContent = effectiveDefense;

    // Render Skills
    renderSkillList(domElements.statsSkillsList, player.skills, skillData, '❖', 'No has aprendido habilidades activas.');
    renderSkillList(domElements.statsPassiveSkillsList, player.passiveSkills, passiveSkillData, '🌟', 'No has aprendido habilidades pasivas.');
}

/**
 * Helper para renderizar listas de habilidades (activas o pasivas) en el modal de stats.
 * @param {HTMLElement} ulElement - El elemento UL donde se renderizará la lista.
 * @param {Array<Object>} playerSkillRefs - Array de referencias de habilidades del jugador (ej: [{id: 'skill_id'}, ...]).
 * @param {Object} allSkillData - Objeto que contiene todas las definiciones de habilidades (ej: skillData o passiveSkillData).
 * @param {string} iconPrefix - Prefijo de icono para cada habilidad en la lista.
 * @param {string} emptyMessage - Mensaje a mostrar si no hay habilidades.
 */
function renderSkillList(ulElement, playerSkillRefs, allSkillData, iconPrefix, emptyMessage) {
    if (!ulElement) {
        console.error("Elemento UL para lista de skills no encontrado en DOM.");
        return;
    }
    ulElement.innerHTML = ''; // Clear previous list
    if (playerSkillRefs && playerSkillRefs.length > 0) {
        playerSkillRefs.forEach(skillRef => {
            // skillRef podría ser solo {id: 'xxx'} o el objeto completo si se guardó así.
            // Es más robusto buscar siempre en allSkillData usando el id.
            const skillId = skillRef.id;
            const skill = allSkillData[skillId]; 
            
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
    uiStates.isPlayerStatsModalOpen = true; // Actualizar el estado global
    domElements.playerStatsModalElement.style.display = 'block';
}

/**
 * Cierra el modal de estadísticas del jugador.
 */
export function closePlayerStatsModal() {
    uiStates.isPlayerStatsModalOpen = false; // Actualizar el estado global
    domElements.playerStatsModalElement.style.display = 'none';
}