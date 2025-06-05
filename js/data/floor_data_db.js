// js/data/floor_data_db.js
import { baseItems } from './items_db.js'; // Necesario para validar IDs de drops/shop

/**
 * Datos detallados para cada piso de Aincrad.
 * Incluye el nombre del piso, una lista de monstruos comunes con sus stats y drops,
 * el jefe del piso con sus stats, drops y habilidades especiales,
 * los items disponibles en la tienda del piso y las recetas de herrería desbloqueadas.
 * La propiedad 'unlocked' indica si el jugador tiene acceso a este piso.
 */
export const floorData = {
    1: { 
        name: "Bosque del Inicio", 
        monsters: [
            { name: "Lobo Frenético", hp: 40, attack: 7, defense: 2, exp: 12, col: 8, icon: '🐺', drops: {'raw_hide': 0.5, 'kobold_fang': 0.1} }, 
            { name: "Jabalí Agresivo", hp: 60, attack: 10, defense: 3, exp: 18, col: 12, icon: '🐗', drops: {'raw_hide': 0.7} }
        ], 
        boss: { 
            name: "Illfang el Señor Kóbold", hp: 250, attack: 18, defense: 6, exp: 120, col: 70, icon: '👹', 
            drops: {'kobold_fang': 1.0, 'iron_ore': 0.3, 'healing_potion_s': 0.5}, 
            skills: [ // Habilidades que el jefe puede usar
                { id: 'boss_slam', name: 'Golpe de Jefe', damageMultiplier: 1.5, statusEffect: { type: 'stunned', duration: 1, chance: 0.3 } },
                { id: 'kobold_cleave', name: 'Cuchillada Kóbold', damageMultiplier: 1.2, statusEffect: { type: 'bleeding', duration: 2, value: 0.05, chance: 0.4 } }
            ] 
        }, 
        shopItems: [ // Array de objetos { id: 'itemId', price: N }
            { id: 'healing_potion_s', price: 20 }, { id: 'mana_potion_s', price: 25 }, 
            { id: 'short_sword', price: 75 }, { id: 'wooden_buckler', price: 60}
        ], 
        blacksmithRecipes: ['elucidator_prototype'], // Array de IDs de recetas (de recipes_db.js)
        unlocked: true // El piso 1 siempre está desbloqueado al inicio
    },
    2: {
        name: "Praderas Ventosas",
        monsters: [
            { name: "Avispa Gigante", hp: 70, attack: 12, defense: 4, exp: 25, col: 15, icon: '🐝', drops: {'blue_crystal': 0.2, 'antidote_herb': 0.3} },
            { name: "Planta Carnívora", hp: 90, attack: 10, defense: 6, exp: 30, col: 20, icon: '🌿', drops: {'healing_potion_s': 0.4, 'obsidian_shard': 0.1} }
        ],
        boss: {
            name: "Baran, el General Toro Demonio", hp: 600, attack: 28, defense: 12, exp: 300, col: 250, icon: '🐃',
            drops: {'silver_ingot': 0.8, 'iron_kite_shield': 0.2, 'blue_crystal': 0.5},
            skills: [
                { id: 'bull_charge', name: 'Carga de Toro', damageMultiplier: 1.8, statusEffect: { type: 'stunned', duration: 1, chance: 0.25 } },
                { id: 'earth_stomp', name: 'Pisotón Terremoto', damageMultiplier: 1.3, areaEffect: true } // areaEffect es conceptual, la lógica de combate no lo usa aún
            ]
        },
        shopItems: [
            { id: 'healing_potion_m', price: 50 }, { id: 'mana_potion_m', price: 60 },
            { id: 'iron_sword', price: 200 }, { id: 'chainmail_vest', price: 180 }
        ],
        blacksmithRecipes: ['lambent_light_replica', 'knight_armor'],
        unlocked: false
    }
    // Puedes añadir más pisos aquí siguiendo la misma estructura.
    // Asegúrate que los IDs de items en 'drops' y 'shopItems' existan en 'baseItems'.
    // Asegúrate que los IDs de recetas en 'blacksmithRecipes' existan en 'blacksmithRecipes'.
};