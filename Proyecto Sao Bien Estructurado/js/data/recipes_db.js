// js/data/recipes_db.js

/**
 * Base de datos de las recetas de herrería.
 * Cada receta especifica el item resultante, los materiales necesarios,
 * el costo en Col, el nivel requerido para intentarlo y la probabilidad de éxito.
 */
export const blacksmithRecipes = {
    'elucidator_prototype': { 
        itemId: 'elucidator_prototype', 
        materials: { 'iron_ore': 20, 'obsidian_shard': 5, 'blue_crystal': 2 }, 
        cost: 5000, 
        levelReq: 20, 
        chance: 0.60 
    },
    'lambent_light_replica': { 
        itemId: 'lambent_light_replica', 
        materials: { 'silver_ingot': 15, 'blue_crystal': 5 }, 
        cost: 4500, 
        levelReq: 20, 
        chance: 0.65 
    },
    'elucidator': { 
        itemId: 'elucidator', 
        materials: { 'obsidian_shard': 25, 'dragon_scale': 3, 'divine_fragment': 1 }, 
        cost: 50000, 
        levelReq: 45, 
        chance: 0.15 
    },
    'knight_armor': { 
        itemId: 'knight_armor', 
        materials: { 'iron_ore': 30, 'silver_ingot': 10, 'raw_hide': 15 }, 
        cost: 8000, 
        levelReq: 14, 
        chance: 0.70 
    },
    // Puedes añadir más recetas aquí
};