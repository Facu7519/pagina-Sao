// js/game/game_state.js
import { baseItems } from '../data/items_db.js';
import { skillData }  from '../data/skills_db.js';

/**
 * Objeto principal que almacena el estado actual del jugador.
 * Incluye atributos, inventario, equipo, habilidades, progreso, etc.
 * Se exporta para que otros módulos puedan acceder y modificarlo (con precaución).
 */
export let player = {
    name: "",
    level: 1,
    currentExp: 0,
    neededExp: 100, // Se recalculará basado en el nivel
    hp: 100,
    baseMaxHp: 100, // HP máximo sin contar equipo
    mp: 50,
    baseMaxMp: 50,   // MP máximo sin contar equipo
    baseAttack: 5,
    baseDefense: 2,
    col: 1000,
    currentFloor: 1,
    unlockedFloors: [1], // Array de números de piso desbloqueados
    inventory: [ // Array de instancias de items { id: 'itemId', count: N, ...otras props específicas si las tuviera }
        // Se poblará al inicializar/cargar
    ],
    equipment: { // Slots de equipo, cada uno puede tener una instancia de item o null
        weapon: null, 
        shield: null, 
        armor: null, 
        accessory: null 
    },
    skills: [], // Habilidades activas aprendidas por el jugador
    passiveSkills: [], // Habilidades pasivas aprendidas por el jugador
    activeStatusEffects: [], // Efectos de estado activos en el jugador {type: 'poisoned', duration: 3}
    activeQuests: [], // Misiones que el jugador ha aceptado
    completedQuests: [], // IDs de misiones completadas (para no aceptarlas de nuevo)
    isAdmin: false, // Modo administrador
    
    // Estadísticas efectivas calculadas (se actualizarán en player_logic.js)
    effectiveAttack: 0,
    effectiveDefense: 0,
    maxHp: 0,
    maxMp: 0,

    // Variables temporales para efectos de pasivas o buffs
    tempHpRegen: 0,
    tempMpCostReduction: 0,
    tempCritChanceBonus: 0,

    // Estados de UI para persistencia de modales abiertos
    uiStates: {
        isInventoryModalOpen: false,
        isShopModalOpen: false,
        isBlacksmithModalOpen: false,
        isPlayerStatsModalOpen: false,
        isTrainingModalOpen: false,
        isQuestsModalOpen: false,
        isFloorNavigationModalOpen: false,
        isAdminKeyModalOpen: false,
        isAdminPanelModalOpen: false,
        isInfoModalOpen: false,
        // isCombatModalOpen se maneja por currentCombat.active
    }
};

/**
 * Objeto que almacena el estado del combate actual.
 * Se reinicia cada vez que comienza un nuevo combate.
 */
export let currentCombat = {
    active: false,      // Si hay un combate en curso
    enemy: null,        // Objeto del enemigo actual (copia profunda de la plantilla)
    isBoss: false,      // Si el enemigo actual es un jefe de piso
    playerTurn: true,   // Si es el turno del jugador
    turnCount: 0,       // Contador de turnos en el combate
};

/**
 * Función para inicializar el estado del jugador a sus valores por defecto.
 * Utilizado para iniciar una nueva partida.
 */
export function initializeNewPlayerState() {
    player.name = "";
    player.level = 1;
    player.currentExp = 0;
    player.neededExp = 100;
    player.hp = 100;
    player.baseMaxHp = 100;
    player.mp = 50;
    player.baseMaxMp = 50;
    player.baseAttack = 5;
    player.baseDefense = 2;
    player.col = 1000;
    player.currentFloor = 1;
    player.unlockedFloors = [1];
    player.materials = {};
    player.activeStatusEffects = [];
    player.activeQuests = [];
    player.completedQuests = [];
    player.isAdmin = false;
    player.uiStates = {
        isInventoryModalOpen: false,
        isShopModalOpen: false,
        isBlacksmithModalOpen: false,
        isPlayerStatsModalOpen: false,
        isTrainingModalOpen: false,
        isQuestsModalOpen: false,
        isFloorNavigationModalOpen: false,
        isAdminKeyModalOpen: false,
        isAdminPanelModalOpen: false,
        isInfoModalOpen: false,
    }; // Reiniciar estados de UI

    // Reinicializar inventario y habilidades por defecto
    initializeDefaultPlayerItemsAndSkills();
}

/**
 * Función para inicializar el inventario y habilidades del jugador por defecto.
 * Se llama cuando se crea un nuevo jugador.
 */
export function initializeDefaultPlayerItemsAndSkills() {
    player.inventory = [
        { id: 'healing_potion_s', count: 5 },
        { id: 'mana_potion_s', count: 3 },
        { id: 'basic_sword', count: 1 }
    ].map(itemRef => {
        const base = baseItems[itemRef.id];
        return base ? { ...base, ...itemRef, id: itemRef.id } : null;
    }).filter(item => item); // Filtra nulos si algún ID no existe

    player.equipment = { // Asegurar que el equipo también se reinicia
        weapon: null, 
        shield: null, 
        armor: null, 
        accessory: null 
    };

    player.skills = skillData['quick_slash'] ? [{ id: 'quick_slash' }] : [];
    player.passiveSkills = []; // Las pasivas se aprenden con LEVEL UP, no se dan por defecto
}