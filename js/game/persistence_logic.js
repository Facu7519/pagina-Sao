// js/game/persistence_logic.js

import { player, initializeNewPlayerState } from './game_state.js'; // initializeNewPlayerState sí está en game_state.js
import { domElements, getEl } from '../dom.js'; // Para NameEntryModal principalmente
import { showNotification, calculateNeededExpForLevel, openModal, closeModal } from '../utils.js'; // calculateNeededExpForLevel se movió a utils
import { floorData } from '../data/floor_data_db.js';
import { skillData, passiveSkillData } from '../data/skills_db.js';
import { questDefinitions } from '../data/quests_db.js';
// inventory_logic para renderEquipment y equipar item inicial si es necesario.
import { renderEquipment, equipItem } from './inventory_logic.js';
import { calculateEffectiveStats as playerLogicCalculateEffectiveStats, gainExp } from './player_logic.js'; // Importar correctamente desde player_logic
import { updatePlayerHUD } from './hud_logic.js'; // Importar updatePlayerHUD correctamente desde hud_logic.js
import { baseItems } from '../data/items_db.js';


const SAVE_KEY = 'saoAincradChroniclesSave_v7'; // Incrementar versión si la estructura de guardado cambia significativamente

/**
 * Guarda el progreso actual del juego en localStorage.
 */
export function saveGame() {
    try {
        // Crear una copia del objeto player para guardar, seleccionando solo los datos necesarios
        const playerSaveData = {
            name: player.name,
            level: player.level,
            currentExp: player.currentExp,
            neededExp: player.neededExp, // Guardar neededExp calculado
            hp: player.hp,
            baseMaxHp: player.baseMaxHp,
            mp: player.mp,
            baseMaxMp: player.baseMaxMp,
            baseAttack: player.baseAttack,
            baseDefense: player.baseDefense,
            col: player.col,
            currentFloor: player.currentFloor,
            unlockedFloors: player.unlockedFloors,
            inventory: player.inventory.map(item => ({ id: item.id, count: item.count || 1 })), // Simplificar inventario
            equipment: { // Guardar solo IDs de items equipados
                weapon: player.equipment.weapon ? { id: player.equipment.weapon.id } : null,
                shield: player.equipment.shield ? { id: player.equipment.shield.id } : null,
                armor: player.equipment.armor ? { id: player.equipment.armor.id } : null,
                accessory: player.equipment.accessory ? { id: player.equipment.accessory.id } : null,
            },
            materials: player.materials,
            skills: player.skills.map(s => ({ id: s.id })), // Guardar solo IDs de habilidades
            passiveSkills: player.passiveSkills.map(s => ({ id: s.id })), // Guardar solo IDs de pasivas
            activeQuests: player.activeQuests, // Guardar el progreso de misiones
            completedQuests: player.completedQuests,
            isAdmin: player.isAdmin, // Guardar estado de admin
            uiStates: player.uiStates, // Guardar estados de UI para reabrir modales
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(playerSaveData));
        showNotification("¡Juego guardado!", "success");
    } catch (e) {
        console.error("Error al guardar el juego:", e);
        showNotification("Error al guardar el juego.", "error");
    }
}

/**
 * Carga el progreso del juego desde localStorage.
 */
export function loadGame() {
    try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);

            // Cargar datos básicos del jugador
            player.name = data.name || "Jugador";
            player.level = data.level || 1;
            player.currentExp = data.currentExp || 0;
            player.neededExp = data.neededExp || calculateNeededExpForLevel(player.level); // Recalcular si no está

            player.hp = data.hp || player.baseMaxHp;
            player.baseMaxHp = data.baseMaxHp || 100;
            player.mp = data.mp || player.baseMaxMp;
            player.baseMaxMp = data.baseMaxMp || 50;
            player.baseAttack = data.baseAttack || 5;
            player.baseDefense = data.baseDefense || 2;
            player.col = data.col || 0;
            player.currentFloor = data.currentFloor || 1;
            player.unlockedFloors = data.unlockedFloors || [1];
            player.materials = data.materials || {};
            player.isAdmin = data.isAdmin || false;
            player.uiStates = data.uiStates || {}; // Cargar estados de UI

            // Cargar inventario, asegurando que los items tengan sus propiedades base
            player.inventory = (data.inventory || []).map(itemRef => {
                const base = baseItems[itemRef.id];
                return base ? { ...base, ...itemRef, id: itemRef.id } : null;
            }).filter(item => item);

            // Cargar equipo
            player.equipment = {
                weapon: null, shield: null, armor: null, accessory: null
            };
            if (data.equipment) {
                for (const slot in data.equipment) {
                    if (data.equipment[slot] && data.equipment[slot].id) {
                        const base = baseItems[data.equipment[slot].id];
                        if (base) {
                            player.equipment[slot] = { ...base, id: data.equipment[slot].id };
                        }
                    }
                }
            }

            // Cargar habilidades
            player.skills = (data.skills || []).map(skillRef => {
                const base = skillData[skillRef.id];
                return base ? { ...base, id: skillRef.id } : null;
            }).filter(skill => skill);

            // Cargar habilidades pasivas
            player.passiveSkills = (data.passiveSkills || []).map(passiveRef => {
                const base = passiveSkillData[passiveRef.id];
                return base ? { ...base, id: passiveRef.id } : null;
            }).filter(passive => passive);

            // Cargar misiones
            player.activeQuests = data.activeQuests || [];
            player.completedQuests = data.completedQuests || [];

            // Recalcular estadísticas efectivas después de cargar todo el equipo y pasivas
            playerLogicCalculateEffectiveStats(); // Usa la función importada de player_logic

            updatePlayerHUD();
            renderEquipment(); // Asegurar que el equipo se muestre
            showNotification("¡Juego cargado!", "success");

            // Reabrir modales si estaban abiertos al guardar
            Object.keys(player.uiStates).forEach(modalId => {
                if (player.uiStates[modalId]) {
                    // Cuidado: No reabrir el nameEntryModal si el nombre ya está puesto.
                    // No reabrir combatModal si no hay un enemigo activo.
                    if (modalId === 'nameEntryModal' && player.name) return;
                    if (modalId === 'combatModal') return; // Combat modal no se reabre en carga

                    // openModal maneja la lógica de renderizado interno para cada modal
                    openModal(modalId);
                }
            });

        } else {
            showNotification("No se encontró partida guardada. ¡Comienza una nueva aventura!", "default");
            initializeNewPlayer(true); // Inicia un nuevo juego y pide nombre
        }
    } catch (e) {
        console.error("Error al cargar el juego:", e);
        showNotification("Error al cargar el juego. Se iniciará un nuevo juego.", "error");
        executeReset(); // Forzar un reseteo si la carga falla gravemente
    }
}

/**
 * Inicializa un nuevo jugador, opcionalmente pidiendo el nombre.
 * @param {boolean} [askForName=false] - Si se debe mostrar el modal para pedir el nombre.
 */
export function initializeNewPlayer(askForName = false) {
    initializeNewPlayerState(); // Resetear el objeto player a su estado por defecto
    playerLogicCalculateEffectiveStats(); // Calcular stats iniciales
    player.neededExp = calculateNeededExpForLevel(player.level); // Asegurar neededExp correcto
    updatePlayerHUD();
    saveGame(); // Guardar el estado inicial del nuevo juego

    if (askForName) {
        openModal('nameEntryModal');
    }
    showNotification("¡Bienvenido a Aincrad! Comienza tu aventura.", "default", 5000);
}


/**
 * Muestra un modal de confirmación antes de reiniciar el progreso.
 */
export function confirmResetProgress() {
    // Usar el modal infoModal como modal de confirmación
    domElements.modalBodyContentElement.innerHTML = `
        <h3>¿Estás seguro?</h3>
        <p>Esto borrará todo tu progreso actual y comenzará un nuevo juego.</p>
        <button class="action-btn success-btn" id="confirmResetBtn" style="margin-right: 10px;">Sí, borrar todo</button>
        <button class="action-btn cancel-btn" id="cancelResetBtn">Cancelar</button>
    `;
    openModal('infoModal');

    // Añadir event listeners a los botones de confirmación
    getEl('confirmResetBtn').addEventListener('click', executeReset);
    getEl('cancelResetBtn').addEventListener('click', () => closeModal('infoModal'));
}

/**
 * Ejecuta el reinicio completo del juego.
 */
export function executeReset() {
    localStorage.removeItem(SAVE_KEY);
    initializeNewPlayer(true); // Inicia nuevo jugador y pide nombre
    if (domElements.infoModalElement) domElements.infoModalElement.style.display = 'none';
    showNotification('¡Nueva aventura iniciada! El progreso anterior ha sido borrado.', 'success', 6000);
    // Asegurar que los botones de acción se habiliten
    if (domElements.combatBtn) domElements.combatBtn.disabled = false;
    // ... otros botones
}