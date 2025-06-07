// js/data/quests_db.js

/**
 * Definiciones iniciales de las misiones disponibles en el juego.
 * Esta estructura puede ser modificada por funciones de administrador si es necesario.
 * Cada misión tiene un título, descripción, tipo (matar, recolectar, etc.),
 * objetivo (ID y cantidad), nivel requerido y recompensas.
 */
export let questDefinitions = {
    'kill_wolves_1': { 
        title: "Cacería de Lobos (P1)", 
        description: "Los lobos frenéticos son una amenaza en las afueras de la Ciudad del Inicio. Reduce su número para asegurar el área.", 
        type: 'kill', 
        targetId: 'Lobo Frenético', // Coincide con el nombre del monstruo en floorData
        targetCount: 5, 
        levelReq: 1, 
        rewards: { col: 50, exp: 30, itemId: 'raw_hide', itemQty: 2 } 
    },
    'collect_hides_1': { 
        title: "Pieles para el Comerciante", 
        description: "Un comerciante local necesita pieles crudas para sus mercancías. Recolecta algunas de los monstruos cercanos.", 
        type: 'collect', 
        targetId: 'raw_hide', // Coincide con el ID del material en baseItems
        targetCount: 8, 
        levelReq: 2, 
        rewards: { col: 70, exp: 25 } 
    },
    'clear_floor_1_boss': { 
        title: "Conquistador del Piso 1", 
        description: "El camino al siguiente piso está bloqueado. Derrota al jefe del Piso 1, Illfang el Señor Kóbold, para avanzar.", 
        type: 'kill_boss', // Un tipo especial para jefes de piso
        targetId: 'Illfang el Señor Kóbold', // Coincide con el nombre del jefe en floorData
        targetCount: 1, 
        levelReq: 3, 
        rewards: { col: 200, exp: 150, itemId: 'iron_sword', itemQty: 1 } 
    }
    // Puedes añadir más definiciones de misiones aquí
};

/**
 * Función para actualizar las definiciones de misiones (usada por ejemplo, desde el panel de admin).
 * @param {object} newDefinitions - El nuevo objeto de definiciones de misiones.
 */
export function updateQuestDefinitions(newDefinitions) {
    questDefinitions = newDefinitions;
}