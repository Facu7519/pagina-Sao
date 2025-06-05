// js/data/items_db.js

/**
 * Base de datos de todos los items disponibles en el juego.
 * Incluye consumibles, armas, armaduras, accesorios y materiales.
 * Cada item tiene propiedades como nombre, icono, tipo, efectos/stats, descripción, etc.
 */
export const baseItems = {
    // Consumibles
    'healing_potion_s': { name: 'Poción Vida (P)', icon: '🧪', type: 'consumable', effect: { hp: 50 }, description: "Restaura 50 HP." },
    'healing_potion_m': { name: 'Poción Vida (M)', icon: '🧪', type: 'consumable', effect: { hp: 120 }, description: "Restaura 120 HP." },
    'healing_potion_l': { name: 'Poción Vida (G)', icon: '🧪', type: 'consumable', effect: { hp: 300 }, description: "Restaura 300 HP." },
    'mana_potion_s': { name: 'Poción Maná (P)', icon: '💧', type: 'consumable', effect: { mp: 30 }, description: "Restaura 30 MP." },
    'mana_potion_m': { name: 'Poción Maná (M)', icon: '💧', type: 'consumable', effect: { mp: 75 }, description: "Restaura 75 MP." },
    'antidote_herb': { name: 'Hierba Antídoto', icon: '🌿', type: 'consumable', effect: { cure: 'poison' }, description: "Cura el veneno." },

    // Armas
    'basic_sword': { name: 'Espada Básica', icon: '🗡️', type: 'weapon', slot: 'weapon', stats: { attack: 5 }, levelReq: 1, description: "Una espada simple." },
    'short_sword': { name: 'Espada Corta', icon: '🗡️', type: 'weapon', slot: 'weapon', stats: { attack: 8 }, levelReq: 2, description: "Un poco mejor que la básica." },
    'iron_sword': { name: 'Espada de Hierro', icon: '🗡️', type: 'weapon', slot: 'weapon', stats: { attack: 15 }, levelReq: 5, description: "Hoja de hierro confiable." },
    'steel_longsword': { name: 'Mandoble de Acero', icon: '⚔️', type: 'weapon', slot: 'weapon', stats: { attack: 25, defense: 2 }, levelReq: 10, description: "Una espada larga y robusta." },
    'knight_sword': { name: 'Espada de Caballero', icon: '⚔️', type: 'weapon', slot: 'weapon', stats: { attack: 35, defense: 5 }, levelReq: 15, description: "Arma estándar de caballero." },
    'elucidator_prototype': { name: 'Prototipo Elucidator', icon: '⚫', type: 'weapon', slot: 'weapon', stats: { attack: 50, hp: 20 }, levelReq: 25, description: "Un intento de replicar una leyenda." },
    'lambent_light_replica': { name: 'Réplica Luz Lambent', icon: '✨', type: 'weapon', slot: 'weapon', stats: { attack: 45, mp: 15 }, levelReq: 25, description: "Imita la velocidad de la famosa estoque." },
    'elucidator': { name: 'Elucidator', icon: '⚫', type: 'weapon', slot: 'weapon', stats: { attack: 150, hp: 100 }, levelReq: 50, description: "Espada negra legendaria." },
    'dark_repulser': { name: 'Dark Repulser', icon: '🟢', type: 'weapon', slot: 'weapon', stats: { attack: 140, defense: 20 }, levelReq: 50, description: "Espada verde cristalina." },
    'lambent_light': { name: 'Lambent Light', icon: '✨', type: 'weapon', slot: 'weapon', stats: { attack: 130, mp: 50 }, levelReq: 48, description: "Estoque de Asuna." },

    // Escudos
    'wooden_buckler': { name: 'Broquel de Madera', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 3 }, levelReq: 1, description: "Un escudo pequeño y ligero." },
    'iron_kite_shield': { name: 'Escudo Cometa Hierro', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 8, hp: 15 }, levelReq: 6, description: "Defensa de hierro sólida." },
    'steel_tower_shield': { name: 'Escudo Torre Acero', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 15, hp: 30 }, levelReq: 12, description: "Gran protección, algo pesado." },
    'heathcliff_shield': { name: 'Escudo de Heathcliff', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 100, hp: 200 }, levelReq: 60, description: "El escudo del líder de los KoB." },

    // Armaduras
    'leather_jerkin': { name: 'Coraza de Cuero', icon: '👕', type: 'armor', slot: 'armor', stats: { defense: 3, hp: 10 }, levelReq: 1, description: "Protección básica." },
    'chainmail_vest': { name: 'Cota de Mallas', icon: '🧥', type: 'armor', slot: 'armor', stats: { defense: 8, hp: 25 }, levelReq: 4, description: "Buena defensa contra cortes." },
    'iron_plate_armor': { name: 'Armadura Placas Hierro', icon: '鎧', type: 'armor', slot: 'armor', stats: { defense: 18, hp: 50 }, levelReq: 9, description: "Pesada pero muy protectora." },
    'knight_armor': { name: 'Armadura de Caballero', icon: '鎧', type: 'armor', slot: 'armor', stats: { defense: 28, hp: 70 }, levelReq: 16, description: "Armadura completa de caballero." },

    // Accesorios
    'ring_of_strength': { name: 'Anillo de Fuerza', icon: '💍', type: 'accessory', slot: 'accessory', stats: { attack: 3 }, levelReq: 3, description: "Aumenta ligeramente el ataque." },
    'amulet_of_vitality': { name: 'Amuleto Vitalidad', icon: '💠', type: 'accessory', slot: 'accessory', stats: { hp: 25 }, levelReq: 5, description: "Incrementa los puntos de vida." },
    'mage_pendant': { name: 'Colgante de Mago', icon: '🔮', type: 'accessory', slot: 'accessory', stats: { mp: 20 }, levelReq: 8, description: "Aumenta la reserva de maná." },

    // Materiales
    'raw_hide': { name: 'Cuero Crudo', icon: '🟤', type: 'material', description: "Material de forja básico."},
    'iron_ore': { name: 'Mena de Hierro', icon: '🔩', type: 'material', description: "Material de forja común."},
    'kobold_fang': { name: 'Colmillo de Kóbold', icon: '🦷', type: 'material', description: "Material de monstruo."},
    'silver_ingot': { name: 'Lingote de Plata', icon: '🥈', type: 'material', description: "Metal precioso para forja."},
    'blue_crystal': { name: 'Cristal Azul', icon: '💎', type: 'material', description: "Cristal imbuido de energía."},
    'obsidian_shard': { name: 'Esquirla de Obsidiana', icon: '🌑', type: 'material', description: "Fragmento de roca volcánica."},
    'dragon_scale': { name: 'Escama de Dragón', icon: '🐉', type: 'material', description: "Material raro y resistente."},
    'divine_fragment': { name: 'Fragmento Divino', icon: '🌟', type: 'material', description: "Material legendario, casi imposible de encontrar."}
};