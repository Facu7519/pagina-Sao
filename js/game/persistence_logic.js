// js/game/persistence_logic.js

import { player, initializeNewPlayerState, calculateEffectiveStats, updatePlayerHUD, gainExp } from './game_state.js';
import { domElements } from '../dom.js'; // Para NameEntryModal principalmente
import { showNotification } from '../utils.js';
import { floorData } from '../data/floor_data_db.js';
import { skillData, passiveSkillData } from '../data/skills_db.js';
import { questDefinitions } from '../data/quests_db.js';
// inventory_logic para renderEquipment y equipar item inicial si es necesario.
import { renderEquipment, equipItem } from './inventory_logic.js';
// admin_logic para isAdmin (aunque isAdmin se guarda/carga directamente en el objeto player)

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
            inventory: player.inventory.map(item => ({ id: item.id, count: item.count })), // Guardar solo ID y cantidad
            equipment: {}, // Guardar solo IDs de items equipados
            skills: player.skills.map(s => s.id), // Guardar solo IDs de habilidades
            passiveSkills: player.passiveSkills.map(s => s.id), // Guardar solo IDs de habilidades pasivas
            materials: player.materials,
            isAdmin: player.isAdmin,
            activeQuests: player.activeQuests, // Guardar progreso completo de misiones activas
            completedQuests: player.completedQuests, // Guardar IDs de misiones completadas
            // Considerar si `questDefinitions` debe guardarse si es modificable por el admin
        };

        // Poblar equipment con IDs
        for (const slot in player.equipment) {
            if (player.equipment[slot]) {
                playerSaveData.equipment[slot] = player.equipment[slot].id;
            } else {
                playerSaveData.equipment[slot] = null;
            }
        }

        localStorage.setItem(SAVE_KEY, JSON.stringify(playerSaveData));
        // showNotification('¡Progreso guardado!', 'success', 2000); // Evitar spam de notificaciones si se guarda frecuentemente
        console.log("Game saved successfully.");
    } catch (e) {
        showNotification('Error al guardar el progreso: ' + e.message, 'error');
        console.error("Error saving game:", e);
    }
}

/**
 * Carga el progreso del juego desde localStorage.
 * Si no hay datos guardados o hay un error, inicializa un nuevo jugador.
 */
export function loadGame() {
    try {
        const savedState = localStorage.getItem(SAVE_KEY);
        if (savedState) {
            const loadedData = JSON.parse(savedState);

            // Restaurar datos directos del jugador
            player.name = loadedData.name || "";
            player.level = loadedData.level || 1;
            player.currentExp = loadedData.currentExp || 0;
            player.neededExp = loadedData.neededExp || calculateNeededExpForLevel(player.level); // Recalcular si no está
            player.baseMaxHp = loadedData.baseMaxHp || 100;
            player.mp = loadedData.mp || 50; // Se ajustará después de calcular maxMP
            player.baseMaxMp = loadedData.baseMaxMp || 50;
            player.baseAttack = loadedData.baseAttack || 5;
            player.baseDefense = loadedData.baseDefense || 2;
            player.col = loadedData.col || 1000;
            player.currentFloor = loadedData.currentFloor || 1;
            player.unlockedFloors = loadedData.unlockedFloors || [1];
            player.materials = loadedData.materials || { 'raw_hide': 0, 'iron_ore': 0 }; // Asegurar valores por defecto
            player.isAdmin = loadedData.isAdmin || false;
            player.activeQuests = loadedData.activeQuests || [];
            player.completedQuests = loadedData.completedQuests || [];
            
            // Restaurar inventario
            player.inventory = (loadedData.inventory || []).map(itemRef => {
                // La instancia en player.inventory solo necesita id y count.
                // Las propiedades completas se obtienen de baseItems al renderizar/usar.
                return { id: itemRef.id, count: itemRef.count };
            });

            // Restaurar equipo
            player.equipment = { weapon: null, shield: null, armor: null, accessory: null };
            if (loadedData.equipment) {
                for (const slot in loadedData.equipment) {
                    const itemId = loadedData.equipment[slot];
                    if (itemId) {
                        // Encontrar el item correspondiente en el inventario para equiparlo
                        // Esto es crucial: el objeto equipado debe ser una instancia del inventario.
                        // O, si el item equipado no está en el inventario (caso raro), crearlo.
                        // Por simplicidad, asumimos que si estaba equipado, "existe" y lo creamos como instancia para equipar.
                        // La lógica de equipItem se encarga de moverlo si está en el inventario.
                         const itemFromInventoryIndex = player.inventory.findIndex(invItem => invItem.id === itemId);
                         if (itemFromInventoryIndex !== -1) {
                            // Temporalmente, creamos una instancia para equipar. equipItem lo manejará.
                            // Esta parte es delicada. equipItem espera un item del inventario.
                            // Para evitar duplicados o problemas, es mejor limpiar el inventario
                            // de este item y luego equiparlo.
                            // O mejor: equipItem debe poder tomar un ID y buscarlo/crearlo.
                            // Por ahora, asumimos que equipItem puede manejar una instancia simple.
                            const itemToEquipInstance = JSON.parse(JSON.stringify(player.inventory[itemFromInventoryIndex]));
                            player.inventory.splice(itemFromInventoryIndex, 1); // Quitar del inventario para equipar
                            equipItem(itemToEquipInstance, -1); // -1 como índice para indicar que no viene de una posición de inventario visible
                         } else {
                             // Si el item equipado no está en el inventario cargado (ej. se borró el save corrupto),
                             // se podría intentar añadir una instancia base.
                             if(baseItems[itemId]){
                                 const baseEquipItem = { ...baseItems[itemId], id: itemId, count:1 }; // Crear instancia
                                 equipItem(baseEquipItem, -1); // Equiparlo
                             }
                         }
                    }
                }
            }
            
            // Restaurar HP después de que maxHP (base y equipo) se haya calculado
            calculateEffectiveStats(); // Esto calcula maxHp y maxMp con equipo
            player.hp = Math.min(loadedData.hp || player.maxHp, player.maxHp); // Restaurar HP sin exceder el nuevo máximo
            player.mp = Math.min(loadedData.mp || player.maxMp, player.maxMp); // Idem para MP

            // Restaurar habilidades
            player.skills = (loadedData.skills || []).map(skillId => {
                return skillData[skillId] ? { id: skillId, ...skillData[skillId] } : null;
            }).filter(s => s);
             if (player.skills.length === 0 && skillData['quick_slash']) { // Asegurar habilidad inicial
                player.skills.push({ id: 'quick_slash', ...skillData['quick_slash'] });
            }

            player.passiveSkills = (loadedData.passiveSkills || []).map(skillId => {
                return passiveSkillData[skillId] ? { id: skillId, ...passiveSkillData[skillId] } : null;
            }).filter(s => s);


            // Actualizar estado de desbloqueo de pisos según datos cargados
            Object.keys(floorData).forEach(floorNumStr => {
                const floorNum = parseInt(floorNumStr);
                if (floorData[floorNum]) {
                    floorData[floorNum].unlocked = player.unlockedFloors.includes(floorNum);
                }
            });

            showNotification('¡Progreso cargado exitosamente!', 'success');
            if (!player.name) {
                promptForPlayerName();
            } else {
                updatePlayerHUD();
                renderEquipment(); // Asegurar que el equipo se muestre
                // Habilitar/deshabilitar acciones según el estado del jugador (ej. si HP es 0)
                if (domElements.combatBtn) { // Ejemplo, los botones deben estar en domElements
                    domElements.combatBtn.disabled = player.hp <= 0;
                    // ...otros botones
                }
            }

        } else {
            showNotification('No hay datos guardados. Empezando una nueva aventura.', 'default');
            initializeNewPlayer(true); // true para solicitar nombre
        }
    } catch (e) {
        showNotification('Error al cargar datos: ' + e.message + '. Se iniciará una nueva partida.', 'error', 7000);
        console.error("Error loading game:", e);
        localStorage.removeItem(SAVE_KEY); // Limpiar datos corruptos
        initializeNewPlayer(true); // true para solicitar nombre
    }
}

/**
 * Inicializa un nuevo jugador.
 * @param {boolean} promptName - Si es true, solicitará el nombre del jugador.
 */
export function initializeNewPlayer(promptName = false) {
    initializeNewPlayerState(); // Llama a la función de game_state.js para resetear el objeto player
    
    // Configurar valores iniciales después del reseteo si es necesario
    player.neededExp = calculateNeededExpForLevel(player.level);
    player.inventory = [ // Inventario inicial básico
        { id: 'healing_potion_s', count: 5 },
        { id: 'mana_potion_s', count: 3 },
        { id: 'basic_sword', count: 1 }
    ];
    player.skills = [{ id: 'quick_slash', ...skillData['quick_slash'] }]; // Habilidad inicial

    Object.values(floorData).forEach(floor => floor.unlocked = (floor.id === 1 || floor.number === 1)); // Solo piso 1 desbloqueado

    if (promptName) {
        promptForPlayerName();
    } else {
        calculateEffectiveStats();
        updatePlayerHUD();
        renderEquipment();
    }
    // No se guarda automáticamente al inicializar; se guarda después de poner nombre o primera acción.
}

/**
 * Solicita el nombre del jugador mediante un modal.
 */
export function promptForPlayerName() {
    if (domElements.nameEntryModalElement && domElements.playerNameInputElement) {
        domElements.nameEntryModalElement.style.display = 'block';
        domElements.playerNameInputElement.value = player.name || "";
        domElements.playerNameInputElement.focus();
    } else {
        console.error("Elementos del modal de entrada de nombre no encontrados.");
        // Fallback si el modal no está, aunque no es ideal
        const name = window.prompt("Ingresa el nombre de tu personaje (máx. 15 caracteres):", "Kirito");
        if (name && name.trim().length > 0 && name.trim().length <= 15) {
            player.name = name.trim();
            confirmAndSavePlayerName(); // Simula la confirmación
        } else {
            player.name = "Aventurero"; // Nombre por defecto si falla el prompt
            confirmAndSavePlayerName();
        }
    }
}

/**
 * Confirma y guarda el nombre del jugador ingresado en el modal.
 * Esta función ahora es parte de persistence_logic ya que se relaciona con el inicio del juego/carga.
 */
export function confirmAndSavePlayerName() {
    const nameInput = domElements.playerNameInputElement;
    const name = nameInput ? nameInput.value.trim() : player.name; // Usa player.name si el input no existe (fallback)

    if (name && name.length > 0 && name.length <= 15 && /^[a-zA-Z0-9\s]+$/.test(name)) {
        player.name = name;
        if (domElements.nameEntryModalElement) domElements.nameEntryModalElement.style.display = 'none';
        showNotification(`Nombre establecido: ${player.name}! Bienvenido a Aincrad.`, "success");

        // Equipar espada básica si no tiene arma y está en el inventario
        if (!player.equipment.weapon) {
            const basicSwordIndex = player.inventory.findIndex(i => i.id === 'basic_sword');
            if (basicSwordIndex !== -1) {
                // Necesitamos una instancia completa para equipar si la lógica de equipItem la espera así.
                const swordInstance = { ...baseItems['basic_sword'], id: 'basic_sword', count: player.inventory[basicSwordIndex].count };
                equipItem(swordInstance, basicSwordIndex); // equipItem debe manejar la reducción de count y remoción del inventario
            }
        }
        
        calculateEffectiveStats(); // Asegurarse de que las stats se calculan con el equipo inicial
        updatePlayerHUD();
        renderEquipment(); // Renderizar equipo después de posible auto-equipamiento
        saveGame(); // Guardar el juego por primera vez con el nombre
    } else {
        showNotification("Nombre inválido. Usa 1-15 letras/números. Intenta de nuevo.", "error");
        if (nameInput) nameInput.focus();
    }
}


/**
 * Muestra una confirmación para reiniciar el progreso del juego.
 */
export function confirmResetProgress() {
    if (domElements.infoModalElement && domElements.modalBodyContentElement) {
        domElements.modalBodyContentElement.innerHTML = `
            <h2>Confirmar Reinicio Total</h2>
            <p>¿Estás absolutamente seguro de que quieres borrar todo tu progreso y empezar una nueva partida? Esta acción no se puede deshacer.</p>
            <div class="action-buttons" style="margin-top:1.5rem; justify-content:center;">
                <button class="action-btn" onclick="gamePersistence.executeReset()">Sí, Reiniciar Aventura</button>
                <button class="action-btn" onclick="closeModal('infoModal')" style="background:grey;">No, Cancelar</button>
            </div>`;
        // Hacer que gamePersistence.executeReset esté disponible globalmente o pasar closeModal como callback
        // Por simplicidad, se asume que main.js expondrá gamePersistence.
        // Si no, se necesitaría un event listener o una forma de llamar a executeReset desde aquí.
        // window.executeResetGame = executeReset; // Temporalmente global
        uiStates.isInfoModalOpen = true; // Asumiendo que tienes control sobre el estado del infoModal
        domElements.infoModalElement.style.display = 'block';
    } else {
        // Fallback si el modal no está disponible (poco probable si el juego funciona)
        if (window.confirm("¿Seguro que quieres reiniciar? Todo progreso se perderá.")) {
            executeReset();
        }
    }
}
/**
 * Ejecuta el reinicio del progreso del juego.
 */
export function executeReset() {
    localStorage.removeItem(SAVE_KEY);
    initializeNewPlayer(true); // Inicia nuevo jugador y pide nombre
    if (domElements.infoModalElement) domElements.infoModalElement.style.display = 'none';
    uiStates.isInfoModalOpen = false;
    showNotification('¡Nueva aventura iniciada! El progreso anterior ha sido borrado.', 'success', 6000);
    // Asegurar que los botones de acción se habiliten
    if (domElements.combatBtn) domElements.combatBtn.disabled = false;
    // ... otros botones
}


// Helper para calcular neededExp, podría estar en game_state o utils también.
function calculateNeededExpForLevel(level) {
    if (level <= 1) return 100;
    // Fórmula de ejemplo: EXP_n = EXP_n-1 * 1.35 + 80 (redondeado)
    let exp = 100;
    for (let i = 2; i <= level; i++) {
        exp = Math.floor(exp * 1.35 + 80);
    }
    return exp;
}

// Para que executeReset sea accesible desde el HTML del modal de confirmación
// Esto es una forma. Otra sería añadir event listeners directamente en este módulo
// a botones que SÓLO existen cuando este modal está activo.
// O mejor, que el onclick en el HTML llame a una función que esté en el scope global
// y que esa función global llame a la función exportada de este módulo.
// Ejemplo: en main.js: window.gamePersistence = { executeReset, ... };
// y el HTML: onclick="window.gamePersistence.executeReset()"
// Por ahora, lo dejamos así esperando que main.js lo maneje.