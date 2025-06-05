// js/data/skills_db.js

/**
 * Base de datos de habilidades activas que el jugador puede aprender y usar.
 * Incluye propiedades como costo de MP, multiplicador de daño, tipo,
 * descripción y nivel requerido.
 */
export const skillData = {
    'quick_slash': { 
        name: 'Corte Rápido', 
        icon: '⚡', 
        mpCost: 5, 
        damageMultiplier: 1.3, 
        type: 'attack', 
        description: "Un ataque veloz. Coste: 5 MP." 
    },
    'power_strike': { 
        name: 'Golpe Poderoso', 
        icon: '💥', 
        mpCost: 15, 
        damageMultiplier: 2.0, 
        type: 'attack', 
        levelReq: 5, 
        description: "Un golpe devastador. Coste: 15 MP. Req LV: 5." 
    },
    'heal_light': { 
        name: 'Curación Ligera', 
        icon: '➕', 
        mpCost: 20, 
        healAmount: 50, 
        type: 'heal', 
        levelReq: 3, 
        description: "Restaura 50 HP. Coste: 20 MP. Req LV: 3." 
    },
    'shield_bash': { 
        name: 'Golpe de Escudo', 
        icon: '🛡️💥', 
        mpCost: 10, 
        damageMultiplier: 0.8, 
        type: 'utility', 
        stunChance: 0.3, 
        levelReq: 8, 
        description: "Golpea con el escudo, puede aturdir. Req. Escudo. Coste: 10MP. Req LV: 8." 
    },
    'double_circular': { 
        name: 'Doble Circular', 
        icon: '🔄', 
        mpCost: 25, 
        damageMultiplier: 1.8, 
        type: 'attack', 
        hits: 2, 
        levelReq: 12, 
        description: "Un ataque giratorio que golpea dos veces. Coste: 25MP. Req LV: 12." 
    },
    // Puedes añadir más habilidades aquí
};

/**
 * Base de datos de habilidades pasivas que el jugador puede obtener.
 * Estas habilidades ofrecen bonificaciones o efectos automáticos.
 */
export const passiveSkillData = {
    'hp_regen_s': { 
        name: 'Regeneración HP (P)', 
        icon: '💚', 
        effect: { hpRegen: 5 }, 
        levelReq: 5, 
        description: "Recupera 5 HP al final de cada turno." 
    },
    'mp_efficiency_s': { 
        name: 'Eficiencia MP (P)', 
        icon: '💙', 
        effect: { mpCostReduction: 0.1 }, 
        levelReq: 8, 
        description: "Reduce costo de MP un 10%." 
    },
    'crit_chance_s': { 
        name: 'Golpe Crítico (P)', 
        icon: '🎯', 
        effect: { critChance: 0.05 }, 
        levelReq: 15, 
        description: "Aumenta probabilidad crítica 5%." 
    },
    // Puedes añadir más habilidades pasivas aquí
};