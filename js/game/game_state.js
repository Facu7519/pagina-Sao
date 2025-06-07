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
    // Estadísticas efectivas calculadas (con equipo y pasivas)
    effectiveAttack: 0,
    effectiveDefense: 0,
    maxHp: 0, // HP máximo total (base + equipo)
    maxMp: 0, // MP máximo total (base + equipo)
    
    skills: [ // Habilidades activas aprendidas por el jugador
        // { id: 'quick_slash', ...skillData['quick_slash'] } // Ejemplo
    ],
    passiveSkills: [ // Habilidades pasivas aprendidas
        // { id: 'hp_regen_s', ...passiveSkillData['hp_regen_s'] } // Ejemplo
    ],
    materials: { // Cantidad de cada material de crafteo
        'raw_hide': 0, 
        'iron_ore': 0, 
        'kobold_fang': 0, 
        'silver_ingot': 0,
        'blue_crystal': 0, 
        'obsidian_shard': 0, 
        'dragon_scale': 0, 
        'divine_fragment': 0,
    },
    activeStatusEffects: [], // Efectos de estado activos en el jugador durante el combate
    lastCombatAction: null, // Para mecánicas de combo ('attack', 'skill', 'potion')
    attackComboCount: 0,   // Contador para combos de ataque
    isAdmin: false,        // Flag para acceso al panel de administrador
    
    activeQuests: [], // Array de objetos: { questId: 'id_mision', progress: { current: 0, target: N } }
    completedQuests: [], // Array de IDs de misiones completadas: ['id_mision1', 'id_mision2']

    // Bonificaciones temporales por pasivas (se recalculan)
    tempHpRegen: 0,
    tempMpCostReduction: 0,
    tempCritChanceBonus: 0,
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

    player.skills = skillData['quick_slash'] ? [{ id: 'quick_slash', ...skillData['quick_slash'] }] : [];
    
    // Reiniciar materiales
    Object.keys(player.materials).forEach(matId => player.materials[matId] = 0);
    player.materials['raw_hide'] = 10; // Ejemplo de materiales iniciales
    player.materials['iron_ore'] = 5;
}