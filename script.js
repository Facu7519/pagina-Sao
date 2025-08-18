        // ===============================================
        //           CONFIGURACIÓN INICIAL Y DATOS
        // ===============================================
        // ADMIN AUTH (mejorado):
        // - Por seguridad, preferible mover la verificación al servidor.
        // - Aquí incluimos soporte para comparar SHA-256 del valor ingresado contra
        //   un hash precomputado (establecer ADMIN_SECRET_HASH a la cadena hex).
        // - Si ADMIN_SECRET_HASH === null, se usa un fallback temporal (clave en texto)
        //   para mantener compatibilidad; reemplázalo por el hash lo antes posible.
    const ADMIN_SECRET_HASH = '542238441123f9240bfe04c84f6cb8f521405d62ae85c5d4d43bb68c73298b6b'; // SHA-256 hex de la contraseña admin (reemplazable)

        // Lockout / logging (local) — mitigación temporal para proteger intentos bruteforce.
        const ADMIN_MAX_ATTEMPTS = 5; // Intentos fallidos antes de bloquear
        const ADMIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos de bloqueo por defecto
        const ADMIN_STORAGE_KEY = 'sao_admin_lockstate_v1';

        function readAdminLockState() {
            try {
                const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
                if (!raw) return { attempts: 0, lockedUntil: 0, logs: [] };
                return JSON.parse(raw);
            } catch (e) {
                console.error('Error leyendo lockstate admin:', e);
                return { attempts: 0, lockedUntil: 0, logs: [] };
            }
        }

        function writeAdminLockState(state) {
            try {
                localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.error('Error guardando lockstate admin:', e);
            }
        }

        function recordAdminAttempt(success) {
            const state = readAdminLockState();
            state.logs = state.logs || [];
            state.logs.push({ ts: Date.now(), success: !!success });
            if (success) {
                state.attempts = 0;
                state.lockedUntil = 0;
            } else {
                state.attempts = (state.attempts || 0) + 1;
                if (state.attempts >= ADMIN_MAX_ATTEMPTS) {
                    state.lockedUntil = Date.now() + ADMIN_LOCKOUT_MS;
                }
            }
            writeAdminLockState(state);
            return state;
        }

        // Helper: calcular SHA-256 y devolver hex string (browser SubtleCrypto)
        async function sha256Hex(message) {
            const enc = new TextEncoder();
            const data = enc.encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        const NUM_BOSS_HP_BARS = 4; // Número de barras de HP para jefes
        let player = {
            name: "", 
            level: 1,
            currentExp: 0,
            neededExp: 100,
            hp: 100,
            baseMaxHp: 100,
            mp: 50,
            baseMaxMp: 50,
            baseAttack: 5,
            baseDefense: 2,
            col: 1000,
            currentFloor: 1,
            unlockedFloors: [1], 
            inventory: [
                { id: 'healing_potion_s', name: 'Poción Vida (P)', icon: '🧪', type: 'consumable', effect: { hp: 50 }, count: 5, description: "Restaura 50 HP." },
                { id: 'mana_potion_s', name: 'Poción Maná (P)', icon: '💧', type: 'consumable', effect: { mp: 30 }, count: 3, description: "Restaura 30 MP." },
                { id: 'basic_sword', name: 'Espada Básica', icon: '🗡️', type: 'weapon', slot: 'weapon', stats: { attack: 5 }, levelReq: 1, description: "Una espada simple." },
                { id: 'raw_hide', name: 'Cuero Crudo', icon: '🟤', type: 'material', count: 10, description: "Material de forja básico."},
                { id: 'iron_ore', name: 'Mena de Hierro', icon: '🔩', type: 'material', count: 5, description: "Material de forja común."}
            ],
            equipment: {
                weapon: null,
                shield: null,
                armor: null,
                accessory: null
            },
            effectiveAttack: 0,
            effectiveDefense: 0,
            maxHp: 0,
            maxMp: 0,
            skills: [ 
                { id: 'quick_slash', name: 'Corte Rápido', mpCost: 5, damageMultiplier: 1.2, description: "Un ataque veloz. Coste: 5 MP." },
            ],
            passiveSkills: [], 
            materials: { 
                'raw_hide': 10, 'iron_ore': 5, 'kobold_fang': 0, 'silver_ingot': 0,
                'blue_crystal': 0, 'obsidian_shard': 0, 'dragon_scale': 0, 'divine_fragment': 0,
            },
            activeStatusEffects: [], 
            lastCombatAction: null, 
            attackComboCount: 0, 
            isAdmin: false, // Nueva propiedad para el acceso de admin
        };
        
        // Datos de Items Base (sin cambios)
    const baseItems = {
            'healing_potion_s': { name: 'Poción Vida (P)', icon: '🧪', type: 'consumable', effect: { hp: 50 }, description: "Restaura 50 HP."},
            'healing_potion_m': { name: 'Poción Vida (M)', icon: '🧪', type: 'consumable', effect: { hp: 120 }, description: "Restaura 120 HP." },
            'healing_potion_l': { name: 'Poción Vida (G)', icon: '🧪', type: 'consumable', effect: { hp: 300 }, description: "Restaura 300 HP." },
            'mana_potion_s': { name: 'Poción Maná (P)', icon: '💧', type: 'consumable', effect: { mp: 30 }, description: "Restaura 30 MP." },
            'mana_potion_m': { name: 'Poción Maná (M)', icon: '💧', type: 'consumable', effect: { mp: 75 }, description: "Restaura 75 MP." },
            
            'antidote_herb': { name: 'Hierba Antídoto', icon: '🌿', type: 'consumable', effect: { cure: 'poison' }, description: "Cura el veneno." },
            
            'basic_sword': { name: 'Espada Básica', icon: '🗡️', type: 'weapon', slot: 'weapon', stats: { attack: 5 }, levelReq: 1, description: "Una espada simple.", rarity: 'Common', sockets: 0 },
            'short_sword': { name: 'Espada Corta', icon: '🗡️', type: 'weapon', slot: 'weapon', stats: { attack: 8 }, levelReq: 2, description: "Un poco mejor que la básica." },
            'iron_sword': { name: 'Espada de Hierro', icon: '🗡️', type: 'weapon', slot: 'weapon', stats: { attack: 15 }, levelReq: 5, description: "Hoja de hierro confiable.", rarity: 'Common', sockets: 0 },
            'steel_longsword': { name: 'Mandoble de Acero', icon: '⚔️', type: 'weapon', slot: 'weapon', stats: { attack: 25, defense: 2 }, levelReq: 10, description: "Una espada larga y robusta.", rarity: 'Rare', sockets: 1 },
            'knight_sword': { name: 'Espada de Caballero', icon: '⚔️', type: 'weapon', slot: 'weapon', stats: { attack: 35, defense: 5 }, levelReq: 15, description: "Arma estándar de caballero." },
            
            'elucidator_prototype': { name: 'Prototipo Elucidator', icon: '⚫', type: 'weapon', slot: 'weapon', stats: { attack: 50, hp: 20 }, levelReq: 25, description: "Un intento de replicar una leyenda.", rarity: 'Rare', sockets: 1 },
            'lambent_light_replica': { name: 'Réplica Luz Lambent', icon: '✨', type: 'weapon', slot: 'weapon', stats: { attack: 45, mp: 15 }, levelReq: 25, description: "Imita la velocidad de la famosa estoque.", rarity: 'Rare', sockets: 1 },
            'wooden_buckler': { name: 'Broquel de Madera', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 3 }, levelReq: 1, description: "Un escudo pequeño y ligero." },
            'iron_kite_shield': { name: 'Escudo Cometa Hierro', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 8, hp: 15 }, levelReq: 6, description: "Defensa de hierro sólida." },
            'steel_tower_shield': { name: 'Escudo Torre Acero', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 15, hp: 30 }, levelReq: 12, description: "Gran protección, algo pesado." },
            'leather_jerkin': { name: 'Coraza de Cuero', icon: '👕', type: 'armor', slot: 'armor', stats: { defense: 3, hp: 10 }, levelReq: 1, description: "Protección básica." },
            'chainmail_vest': { name: 'Cota de Mallas', icon: '🧥', type: 'armor', slot: 'armor', stats: { defense: 8, hp: 25 }, levelReq: 4, description: "Buena defensa contra cortes." },
            'iron_plate_armor': { name: 'Armadura Placas Hierro', icon: '鎧', type: 'armor', slot: 'armor', stats: { defense: 18, hp: 50 }, levelReq: 9, description: "Pesada pero muy protectora." },
            'knight_armor': { name: 'Armadura de Caballero', icon: '鎧', type: 'armor', slot: 'armor', stats: { defense: 28, hp: 70 }, levelReq: 16, description: "Armadura completa de caballero." },
            'ring_of_strength': { name: 'Anillo de Fuerza', icon: '💍', type: 'accessory', slot: 'accessory', stats: { attack: 3 }, levelReq: 3, description: "Aumenta ligeramente el ataque." },
            'amulet_of_vitality': { name: 'Amuleto Vitalidad', icon: '💠', type: 'accessory', slot: 'accessory', stats: { hp: 25 }, levelReq: 5, description: "Incrementa los puntos de vida." },
            
            'mage_pendant': { name: 'Colgante de Mago', icon: '🔮', type: 'accessory', slot: 'accessory', stats: { mp: 20 }, levelReq: 8, description: "Aumenta la reserva de maná." },
            'raw_hide': { name: 'Cuero Crudo', icon: '🟤', type: 'material', description: "Material de forja básico."},
            'iron_ore': { name: 'Mena de Hierro', icon: '🔩', type: 'material', description: "Material de forja común."},
            
            'kobold_fang': { name: 'Colmillo de Kóbold', icon: '🦷', type: 'material', description: "Material de monstruo."},
            'silver_ingot': { name: 'Lingote de Plata', icon: '🥈', type: 'material', description: "Metal precioso para forja."},
            'blue_crystal': { name: 'Cristal Azul', icon: '💎', type: 'material', description: "Cristal imbuido de energía."},
            'obsidian_shard': { name: 'Esquirla de Obsidiana', icon: '🌑', type: 'material', description: "Fragmento de roca volcánica."},
            'dragon_scale': { name: 'Escama de Dragón', icon: '🐉', type: 'material', description: "Material raro y resistente."},
            'divine_fragment': { name: 'Fragmento Divino', icon: '🌟', type: 'material', description: "Material legendario, casi imposible de encontrar."},
            
            'elucidator': { name: 'Elucidator', icon: '⚫', type: 'weapon', slot: 'weapon', stats: { attack: 150, hp: 100 }, levelReq: 50, description: "Espada negra legendaria, forjada de un cristal de alta densidad.", rarity: 'Mythic', sockets: 2 },
            'dark_repulser': { name: 'Dark Repulser', icon: '🟢', type: 'weapon', slot: 'weapon', stats: { attack: 140, defense: 20 }, levelReq: 50, description: "Espada verde cristalina, forjada por Lisbeth con un lingote de Crystallite.", rarity: 'Mythic', sockets: 2 },
            'lambent_light': { name: 'Lambent Light', icon: '✨', type: 'weapon', slot: 'weapon', stats: { attack: 130, mp: 50 }, levelReq: 48, description: "Estoque de Asuna, increíblemente rápido y preciso.", rarity: 'Epic', sockets: 1 },
            'heathcliff_shield': { name: 'Escudo de Heathcliff', icon: '🛡️', type: 'shield', slot: 'shield', stats: { defense: 100, hp: 200 }, levelReq: 60, description: "El escudo inamovible del líder de los KoB.", rarity: 'Mythic', sockets: 2 }
        };

        // Recetas de Herrería (sin cambios)
        const blacksmithRecipes = {
            'elucidator_prototype': { itemId: 'elucidator_prototype', materials: { 'iron_ore': 20, 'obsidian_shard': 5, 'blue_crystal': 2 }, cost: 5000, levelReq: 20, chance: 0.60 },
            'lambent_light_replica': { itemId: 'lambent_light_replica', materials: { 'silver_ingot': 15, 'blue_crystal': 5 }, cost: 4500, levelReq: 20, chance: 0.65 },
            'elucidator': { itemId: 'elucidator', materials: { 'obsidian_shard': 25, 'dragon_scale': 3, 'divine_fragment': 1 }, cost: 50000, levelReq: 45, chance: 0.15 },
            'dark_repulser': { itemId: 'dark_repulser', materials: { 'blue_crystal': 30, 'dragon_scale': 2, 'divine_fragment': 1 }, cost: 48000, levelReq: 45, chance: 0.18 },
            'lambent_light': { itemId: 'lambent_light', materials: { 'silver_ingot': 50, 'blue_crystal': 15, 'divine_fragment': 1 }, cost: 45000, levelReq: 42, chance: 0.20 },
            'heathcliff_shield': { itemId: 'heathcliff_shield', materials: { 'iron_ore': 100, 'obsidian_shard': 20, 'dragon_scale': 5, 'divine_fragment': 2 }, cost: 75000, levelReq: 55, chance: 0.10 }
        };

    // Añadir recetas adicionales más accesibles para pisos bajos/medios
    blacksmithRecipes['wooden_buckler'] = { itemId: 'wooden_buckler', materials: { 'raw_hide': 4, 'iron_ore': 2 }, cost: 80, levelReq: 1, chance: 0.95 };
    blacksmithRecipes['iron_kite_shield'] = { itemId: 'iron_kite_shield', materials: { 'iron_ore': 12, 'raw_hide': 2 }, cost: 420, levelReq: 6, chance: 0.90 };
    blacksmithRecipes['leather_jerkin'] = { itemId: 'leather_jerkin', materials: { 'raw_hide': 8 }, cost: 60, levelReq: 1, chance: 0.97 };
    blacksmithRecipes['chainmail_vest'] = { itemId: 'chainmail_vest', materials: { 'iron_ore': 18, 'raw_hide': 4 }, cost: 300, levelReq: 4, chance: 0.85 };
    blacksmithRecipes['iron_plate_armor'] = { itemId: 'iron_plate_armor', materials: { 'iron_ore': 40, 'silver_ingot': 4 }, cost: 1200, levelReq: 9, chance: 0.6 };
    blacksmithRecipes['ring_of_strength'] = { itemId: 'ring_of_strength', materials: { 'silver_ingot': 2 }, cost: 150, levelReq: 3, chance: 0.92 };
    blacksmithRecipes['amulet_of_vitality'] = { itemId: 'amulet_of_vitality', materials: { 'blue_crystal': 1, 'silver_ingot': 3 }, cost: 300, levelReq: 5, chance: 0.7 };


        // Helper: generar UID único por instancia de item
        function genUid() {
            return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,9);
        }

        // Normalizar inventario y equipo tras load/initialize: asegurar instancias únicas con uid, stats y level
        function normalizePlayerItems() {
            // Normalize inventory
            const newInventory = [];
            for (const entry of player.inventory) {
                const base = baseItems[entry.id] || {};
                const type = base.type || entry.type;
                // Consumibles/materiales: keep as single stacked entry
                if (type === 'consumable' || type === 'material') {
                    const merged = Object.assign({}, base, entry);
                    merged.id = entry.id;
                    merged.count = entry.count || merged.count || 1;
                    newInventory.push(merged);
                } else {
                    // equipment-type: create one instance per count (or single)
                    const count = entry.count && entry.count > 1 ? entry.count : 1;
                    // if entry already seems like a full instance (has uid), keep as-is
                    if (entry.uid) {
                        // ensure stats/baseStats exist
                        entry.baseStats = entry.baseStats || (base.stats ? JSON.parse(JSON.stringify(base.stats)) : {});
                        entry.stats = entry.stats || JSON.parse(JSON.stringify(entry.baseStats));
                        entry.level = entry.level || 1;
                        newInventory.push(entry);
                    } else {
                        for (let i=0;i<count;i++) {
                            const inst = JSON.parse(JSON.stringify(base));
                            inst.id = entry.id;
                            inst.uid = genUid();
                            inst.count = 1;
                            inst.baseStats = inst.baseStats || (inst.stats ? JSON.parse(JSON.stringify(inst.stats)) : {});
                            inst.stats = inst.stats || JSON.parse(JSON.stringify(inst.baseStats));
                            inst.level = entry.level || 1;
                            newInventory.push(inst);
                        }
                    }
                }
            }
            player.inventory = newInventory;

            // Normalize equipment slots
            for (const slot in player.equipment) {
                const it = player.equipment[slot];
                if (it) {
                    const base = baseItems[it.id] || {};
                    // if it's a simple reference (no uid), ensure instance fields
                    if (!it.uid) {
                        const inst = Object.assign({}, base, it);
                        inst.id = it.id;
                        inst.uid = genUid();
                        inst.baseStats = inst.baseStats || (inst.stats ? JSON.parse(JSON.stringify(inst.stats)) : {});
                        inst.stats = inst.stats || JSON.parse(JSON.stringify(inst.baseStats));
                        inst.level = inst.level || 1;
                        player.equipment[slot] = inst;
                    } else {
                        it.baseStats = it.baseStats || (base.stats ? JSON.parse(JSON.stringify(base.stats)) : {});
                        it.stats = it.stats || JSON.parse(JSON.stringify(it.baseStats));
                        it.level = it.level || 1;
                    }
                }
            }
        }
        
        // Habilidades del Jugador (Actualizado con nuevas habilidades)
        const skillData = {
            'quick_slash': { name: 'Corte Rápido', icon: '⚡', mpCost: 5, damageMultiplier: 1.2, type: 'attack', description: "Un ataque veloz que consume 5 MP." },
            'special_strike': { name: 'Golpe Especial', icon: '🔥', mpCost: 12, damageMultiplier: 1.8, type: 'attack', levelReq: 1, description: "Un ataque más poderoso que consume MP. Buen trade-off daño/MP." },
            'basic_guard': { name: 'Guardia Básica', icon: '🛡️', mpCost: 8, type: 'defensive', statusEffect: { type: 'protected', duration: 1, value: 0.4 }, levelReq: 1, description: "Reduce el daño recibido el siguiente turno en 40%. Coste: 8 MP." },
            'power_strike': { name: 'Golpe Poderoso', icon: '💥', mpCost: 15, damageMultiplier: 2.0, type: 'attack', levelReq: 5, description: "Un golpe devastador. Coste: 15 MP. Req LV: 5." },
            'heal_light': { name: 'Curación Ligera', icon: '➕', mpCost: 20, healAmount: 50, type: 'heal', levelReq: 3, description: "Restaura 50 HP. Coste: 20 MP. Req LV: 3." },
            'shield_bash': { name: 'Golpe de Escudo', icon: '🛡️', mpCost: 10, damageMultiplier: 0.8, stunChance: 0.3, type: 'utility', levelReq: 8, description: "Aturde al enemigo con el escudo. Coste: 10 MP. Req LV: 8." },
            // New Sword Skills
            'cross_slash': { name: 'Corte Cruzado', icon: '✖️', mpCost: 10, damageMultiplier: 1.5, type: 'attack', statusEffect: { type: 'bleeding', duration: 3, value: 0.05 }, levelReq: 10, description: "Un ataque cruzado que causa sangrado (5% ATK por turno) durante 3 turnos. Coste: 10 MP. Req LV: 10." },
            'piercing_thrust': { name: 'Estocada Perforadora', icon: '➡️', mpCost: 12, damageMultiplier: 1.8, ignoreDefPercent: 0.3, type: 'attack', levelReq: 12, description: "Una estocada precisa que ignora el 30% de la defensa del enemigo. Coste: 12 MP. Req LV: 12." },
            'steel_whirlwind': { name: 'Torbellino de Acero', icon: '🌀', mpCost: 20, damageMultiplier: 1.0, type: 'attack', statusEffect: { type: 'weakened', duration: 2, value: 0.15 }, target: 'enemy', levelReq: 18, description: "Un ataque giratorio que golpea a todos los enemigos y los debilita (reduce ATK 15%) durante 2 turnos. Coste: 20 MP. Req LV: 18." },
            'graceful_strike': { name: 'Golpe de Gracia', icon: '🌟', mpCost: 8, damageMultiplier: 1.2, critChanceBonus: 0.2, type: 'attack', levelReq: 14, description: "Un ataque rápido con alta probabilidad de golpe crítico (+20%). Coste: 8 MP. Req LV: 14." },
            'thousand_blade_rush': { name: 'Ráfaga de Mil Cortes', icon: '⚔️', mpCost: 30, damageMultiplier: 2.5, type: 'attack', levelReq: 25, description: "Un aluvión de ataques de combo. Coste: 30 MP. Req LV: 25." },
            // New Defensive Skills
            'firm_defense': { name: 'Defensa Firme', icon: '🛡️', mpCost: 15, type: 'defensive', statusEffect: { type: 'protected', duration: 1, value: 0.5 }, target: 'player', levelReq: 7, description: "Reduce el daño recibido en un 50% durante el próximo turno. Coste: 15 MP. Req LV: 7." },
            'counterattack': { name: 'Contrataque', icon: '↩️', mpCost: 10, type: 'defensive', statusEffect: { type: 'counter', duration: 1, value: 0.5, damageReduction: 0.2 }, target: 'player', levelReq: 11, description: "El próximo ataque enemigo inflige 20% menos daño y refleja 50% del daño. Coste: 10 MP. Req LV: 11." },
            'mana_shield': { name: 'Escudo de Maná', icon: '🔮', mpCost: 25, type: 'defensive', statusEffect: { type: 'mana_shield', duration: 2, value: 0.5 }, target: 'player', levelReq: 20, description: "Convierte el 50% del daño recibido en costo de MP durante 2 turnos. Coste: 25 MP. Req LV: 20." },
        };

        // Passive Skills Data (New)
        const passiveSkillData = {
            'hp_regen_s': { name: 'Regeneración HP (P)', icon: '💚', effect: { hpRegen: 5 }, levelReq: 5, description: "Recupera 5 HP al final de cada turno de combate." },
            'mp_efficiency_s': { name: 'Eficiencia MP (P)', icon: '💙', effect: { mpCostReduction: 0.1 }, levelReq: 8, description: "Reduce el costo de MP de las habilidades en un 10%." },
            'crit_chance_s': { name: 'Golpe Crítico (P)', icon: '🎯', effect: { critChance: 0.2 }, levelReq: 15, description: "Aumenta la probabilidad de golpe crítico en un 20%." },
        };

        // Status Effects Data (New)
        const statusEffects = {
            'poisoned': { name: 'Envenenado', icon: '🤢', color: '#8cff8c', description: 'Pierde HP cada turno.' },
            'stunned': { name: 'Aturdido', icon: '💫', color: '#ffff00', description: 'No puede actuar el próximo turno.' },
            'bleeding': { name: 'Sangrando', icon: '🩸', color: '#ff6666', description: 'Pierde HP cada turno por heridas.' },
            'weakened': { name: 'Debilitado', icon: '📉', color: '#87ceeb', description: 'Reduce el ataque.' },
            'strengthened': { name: 'Fortalecido', icon: '💪', color: '#ffd700', description: 'Aumenta el ataque.' },
            'protected': { name: 'Protegido', icon: '🛡️', color: '#add8e6', description: 'Reduce el daño recibido.' },
            'counter': { name: 'Contrataque', icon: '↩️', color: '#ff9933', description: 'Refleja daño y reduce el daño recibido.' },
            'mana_shield': { name: 'Escudo de Maná', icon: '🔮', color: '#9370db', description: 'Convierte daño en costo de MP.' },
        };

        // Datos de Pisos, Monstruos y Jefes (Actualizado con IDs únicas)
        const floorData = {
            1: {
                name: "Bosque del Inicio",
                monsters: [
                    { id: 'jabal_agresivo_f1', name: "Jabalí Agresivo", hp: 40, attack: 7, defense: 0, exp: 12, col: 10, icon: '🐗', drops: { 'raw_hide': 0.5 } },
                    { id: 'lobo_frenetico_f1', name: "Lobo Frenético", hp: 60, attack: 10, defense: 2, exp: 18, col: 15, icon: '🐺', drops: { 'raw_hide': 0.7 } },
                ],
                boss: {
                    id: 'illfang_kobold_lord_f1', // ID para el jefe
                    name: "Illfang el Señor Kóbold",
                    hp: 250,
                    attack: 18,
                    defense: 6,
                    exp: 120,
                    col: 70,
                    icon: '👹',
                    drops: { 'kobold_fang': 1.0, 'iron_ore': 0.3 },
                    skills: [
                        { id: 'boss_slam', name: 'Golpe de Jefe', damageMultiplier: 1.5, statusEffect: { type: 'stunned', duration: 1, chance: 0.3 } }
                    ]
                },
                shopItems: [
                    { id: 'healing_potion_s', price: 20 },
                    { id: 'mana_potion_s', price: 25 },
                    { id: 'short_sword', price: 75 },
                    { id: 'leather_jerkin', price: 60 },
                    { id: 'wooden_buckler', price: 50 }
                ],
                blacksmithRecipes: ['leather_jerkin','wooden_buckler'],
                unlocked: true
            },
            2: {
                name: "Praderas de Urbus",
                monsters: [
                    { id: 'avispa_gigante_f2', name: "Avispa Gigante", hp: 70, attack: 15, defense: 4, exp: 28, col: 18, icon: '🐝', drops: { 'raw_hide': 0.2, 'iron_ore': 0.1 } },
                    { id: 'planta_carnivora_f2', name: "Planta Carnívora", hp: 90, attack: 12, defense: 6, exp: 35, col: 22, icon: '🌿', drops: { 'healing_potion_s': 0.1, 'iron_ore': 0.2 } }
                ],
                boss: {
                    id: 'asterios_tauro_plateado_f2', // ID para el jefe
                    name: "Asterios el Tauro Plateado",
                    hp: 550,
                    attack: 28,
                    defense: 10,
                    exp: 280,
                    col: 150,
                    icon: '🐂',
                    drops: { 'silver_ingot': 0.5, 'iron_sword': 0.1 },
                    skills: [
                        { id: 'boss_charge', name: 'Carga Bestial', damageMultiplier: 1.8, statusEffect: { type: 'bleeding', duration: 2, value: 0.1 } }
                    ]
                },
                shopItems: [
                    { id: 'healing_potion_s', price: 20 },
                    { id: 'healing_potion_m', price: 50 },
                    { id: 'mana_potion_s', price: 25 },
                    { id: 'iron_sword', price: 200 },
                    { id: 'chainmail_vest', price: 180 },
                    { id: 'iron_kite_shield', price: 150 },
                    { id: 'ring_of_strength', price: 120 }
                ],
                blacksmithRecipes: ['leather_jerkin','chainmail_vest','iron_kite_shield'],
                unlocked: false
            },
            3: {
                name: "Bosque Serpenteante",
                monsters: [
                    { id: 'serpiente_arborea_f3', name: "Serpiente Arbórea", hp: 120, attack: 20, defense: 7, exp: 50, col: 30, icon: '�', drops: { 'raw_hide': 0.4, 'antidote_herb': 0.3 } },
                    { id: 'arana_cueva_f3', name: "Araña de Cueva", hp: 100, attack: 25, defense: 5, exp: 60, col: 35, icon: '🕷️', drops: { 'iron_ore': 0.3, 'kobold_fang': 0.1 } }
                ],
                boss: {
                    id: 'nerius_reina_aracnida_f3', // ID para el jefe
                    name: "Nerius la Reina Arácnida",
                    hp: 900,
                    attack: 35,
                    defense: 12,
                    exp: 500,
                    col: 250,
                    icon: '👑🕷️',
                    drops: { 'blue_crystal': 0.2, 'steel_longsword': 0.05 },
                    skills: [
                        { id: 'poison_spit', name: 'Saliva Venenosa', damageMultiplier: 0.5, statusEffect: { type: 'poisoned', duration: 3, value: 0.08 } }
                    ]
                },
                shopItems: [
                    { id: 'healing_potion_m', price: 48 },
                    { id: 'mana_potion_m', price: 60 },
                    { id: 'antidote_herb', price: 30 },
                    { id: 'steel_longsword', price: 450 },
                    { id: 'iron_plate_armor', price: 400 },
                    { id: 'amulet_of_vitality', price: 250 }
                ],
                blacksmithRecipes: ['chainmail_vest','iron_plate_armor','ring_of_strength'],
                unlocked: false
            },
            4: {
                name: "Montañas Nevadas",
                monsters: [
                    { id: 'yeti_menor_f4', name: "Yeti Menor", hp: 180, attack: 30, defense: 10, exp: 90, col: 50, icon: '🦍', drops: { 'raw_hide': 0.6, 'silver_ingot': 0.15 } },
                    { id: 'lobo_hielo_f4', name: "Lobo de Hielo", hp: 150, attack: 35, defense: 8, exp: 100, col: 55, icon: '🐺❄️', drops: { 'kobold_fang': 0.2, 'blue_crystal': 0.05 } }
                ],
                boss: {
                    id: 'krampus_rey_helado_f4', // ID para el jefe
                    name: "Krampus el Rey Helado",
                    hp: 1500,
                    attack: 45,
                    defense: 18,
                    exp: 800,
                    col: 400,
                    icon: '👹❄️',
                    drops: { 'blue_crystal': 0.4, 'obsidian_shard': 0.1 },
                    skills: [
                        { id: 'boss_blizzard', name: 'Ventisca Congelante', damageMultiplier: 1.2, statusEffect: { type: 'weakened', duration: 3, value: 0.2 } }
                    ]
                },
                shopItems: [
                    { id: 'healing_potion_l', price: 100 },
                    { id: 'mana_potion_m', price: 55 },
                    { id: 'steel_tower_shield', price: 380 },
                    { id: 'mage_pendant', price: 300 }
                ],
                blacksmithRecipes: ['iron_plate_armor','amulet_of_vitality'],
                unlocked: false
            },
            5: {
                name: "Mazmorra Olvidada",
                monsters: [
                    { id: 'esqueleto_guerrero_f5', name: "Esqueleto Guerrero", hp: 220, attack: 40, defense: 15, exp: 150, col: 70, icon: '🦴', drops: { 'iron_ore': 0.5, 'obsidian_shard': 0.05 } },
                    { id: 'fantasma_lloron_f5', name: "Fantasma Llorón", hp: 180, attack: 38, defense: 12, exp: 140, col: 65, icon: '👻', drops: { 'blue_crystal': 0.1, 'mana_potion_s': 0.2 } }
                ],
                boss: {
                    id: 'lich_archimago_f5', // ID para el jefe
                    name: "Lich Archimago",
                    hp: 2200,
                    attack: 55,
                    defense: 22,
                    exp: 1200,
                    col: 600,
                    icon: '💀🧙',
                    drops: { 'obsidian_shard': 0.3, 'knight_armor': 0.03, 'divine_fragment': 0.01 },
                    skills: [
                        { id: 'boss_curse', name: 'Maldición Oscura', damageMultiplier: 0.8, statusEffect: { type: 'poisoned', duration: 5, value: 0.1 } }
                    ]
                },
                shopItems: [
                    { id: 'healing_potion_l', price: 95 },
                    { id: 'knight_sword', price: 800 },
                    { id: 'knight_armor', price: 750 }
                ],
                blacksmithRecipes: ['iron_plate_armor','knight_armor','ring_of_strength'],
                unlocked: false
            },
            6: {
                name: "Ciudad Flotante: Lyusula",
                monsters: [
                    { id: 'guardia_automata_f6', name: "Guardia Autómata Defectuoso", hp: 300, attack: 50, defense: 25, exp: 250, col: 100, icon: '🤖', drops: { 'silver_ingot': 0.3, 'blue_crystal': 0.15 } },
                    { id: 'quimera_escapada_f6', name: "Quimera Escapada", hp: 350, attack: 55, defense: 20, exp: 280, col: 120, icon: '🦁🦅🐍', drops: { 'raw_hide': 0.3, 'dragon_scale': 0.02 } }
                ],
                boss: {
                    id: 'general_geociclope_f6', // ID para el jefe
                    name: "General Geocíclope",
                    hp: 3500,
                    attack: 70,
                    defense: 30,
                    exp: 2000,
                    col: 1000,
                    icon: '👁️‍🗨️👁️', // Cambié el emoji por uno más genérico y compatible
                    drops: { 'dragon_scale': 0.12, 'divine_fragment': 0.025, 'elucidator_prototype': 0.02 },
                    skills: [
                        { id: 'boss_tremor', name: 'Temblor de Tierra', damageMultiplier: 1.6, statusEffect: { type: 'stunned', duration: 1, chance: 0.5 } }
                    ]
                },
                shopItems: [
                    { id: 'healing_potion_l', price: 90 },
                    { id: 'mana_potion_m', price: 50 },
                    { id: 'obsidian_shard', price: 1500, type: 'material' },
                    { id: 'blue_crystal', price: 2500, type: 'material' }
                ],
                blacksmithRecipes: ['elucidator_prototype','lambent_light_replica','iron_plate_armor'],
                unlocked: false
            },
            7: {
                name: "Corazón del Laberinto",
                monsters: [
                    { id: 'demonio_menor_f7', name: "Demonio Menor", hp: 400, attack: 60, defense: 28, exp: 350, col: 150, icon: '👿', drops: { 'obsidian_shard': 0.2, 'dragon_scale': 0.05 } },
                    { id: 'guardian_ebano_f7', name: "Guardián de Ébano", hp: 500, attack: 65, defense: 35, exp: 400, col: 180, icon: '💂⚫', drops: { 'divine_fragment': 0.01, 'silver_ingot': 0.4 } }
                ],
                boss: {
                    id: 'gleam_eyes_replica_f7', // ID para el jefe
                    name: "The Gleam Eyes (Réplica)",
                    hp: 5000,
                    attack: 85,
                    defense: 40,
                    exp: 3000,
                    col: 1500,
                    icon: '🐐👹',
                    drops: { 'divine_fragment': 0.06, 'dragon_scale': 0.22, 'elucidator': 0.008 },
                    skills: [
                        { id: 'boss_cleave', name: 'Tajo Brutal', damageMultiplier: 2.0, statusEffect: { type: 'bleeding', duration: 3, value: 0.12 } }
                    ]
                },
                shopItems: [],
                blacksmithRecipes: ['elucidator','dark_repulser','lambent_light','heathcliff_shield','elucidator_prototype'],
                unlocked: false
            }
            // ... hasta el piso 100 (seguir la misma estructura para añadir mas pisos)
        };

        
        // ===============================================
        //           SELECTORES DEL DOM (Actualizado)
        // ===============================================
        // HUD
        const saoPlayerNameDisplay = document.getElementById('sao-player-name-display');
        const saoHpBar = document.getElementById('sao-hp-bar');
        const playerHpCurrentText = document.getElementById('player-hp-current');
        const playerHpMaxText = document.getElementById('player-hp-max');
        const playerLevelText = document.getElementById('player-level');
        const playerStatusEffectsDisplay = document.getElementById('player-status-effects-display'); 
        const playerMpCurrentElement = document.getElementById('player-mp-current');
        const playerMpMaxElement = document.getElementById('player-mp-max');
        const mpBarFillElement = document.getElementById('mp-bar-fill');
        const currentExpElement = document.getElementById('current-exp');
        const neededExpElement = document.getElementById('needed-exp');
        const expBarFillElement = document.getElementById('exp-bar-fill');
        const playerColElement = document.getElementById('player-col');
        const currentFloorElement = document.getElementById('current-floor');

    // ...existing code...
        const floorNameElement = document.getElementById('floor-name');
        const trainCostDisplay = document.getElementById('train-cost-display'); 

        // Modales y Grids
        const infoModalElement = document.getElementById('infoModal');
        const modalBodyContentElement = document.getElementById('modal-body-content');
        const nameEntryModalElement = document.getElementById('nameEntryModal'); 
        const playerNameInputElement = document.getElementById('playerNameInput'); 
        const submitPlayerNameBtn = document.getElementById('submitPlayerNameBtn'); 
        
        const inventoryModalElement = document.getElementById('inventoryModal');
        const inventoryGridDisplay = document.getElementById('inventory-grid-display');
        const equipWeaponSlot = document.getElementById('equip-weapon');
        const equipShieldSlot = document.getElementById('equip-shield');
        const equipArmorSlot = document.getElementById('equip-armor');
        const equipAccessorySlot = document.getElementById('equip-accessory');
        
        const shopModalElement = document.getElementById('shopModal');
        const shopGridDisplay = document.getElementById('shop-grid-display');
        const shopFloorNumberElement = document.getElementById('shop-floor-number');
        const shopPlayerColElement = document.getElementById('shop-player-col');

        const blacksmithModalElement = document.getElementById('blacksmithModal');
        const blacksmithGridDisplay = document.getElementById('blacksmith-grid-display');
        const blacksmithFloorNumberElement = document.getElementById('blacksmith-floor-number');
        const blacksmithPlayerColElement = document.getElementById('blacksmith-player-col');
        const playerMaterialsListElement = document.getElementById('player-materials-list');

        const playerStatsModalElement = document.getElementById('playerStatsModal');
        const statsPlayerName = document.getElementById('stats-player-name');
        const statsLevel = document.getElementById('stats-level');
        const statsHp = document.getElementById('stats-hp');
        const statsMp = document.getElementById('stats-mp');
        const statsExp = document.getElementById('stats-exp');
        const statsCol = document.getElementById('stats-col');
        const statsBaseAtk = document.getElementById('stats-base-atk');
        const statsBaseDef = document.getElementById('stats-base-def');
        const statsEquipAtk = document.getElementById('stats-equip-atk');
        const statsEquipDef = document.getElementById('stats-equip-def');
        const statsEquipHp = document.getElementById('stats-equip-hp');
        const statsTotalAtk = document.getElementById('stats-total-atk');
        const statsTotalDef = document.getElementById('stats-total-def');
        const statsSkillsList = document.getElementById('stats-skills-list');
        const statsPassiveSkillsList = document.getElementById('stats-passive-skills-list'); 

        // Combat Modal Selectors
        const combatModalElement = document.getElementById('combatModal');
        const combatTitleElement = document.getElementById('combat-title');
        const combatPlayerDisplay = document.getElementById('combat-player-display'); 
        const combatPlayerNameElement = document.getElementById('combat-player-name');
        const combatPlayerAvatarImg = document.querySelector('#combat-player-display .combatant-icon img'); 
        const combatPlayerHpBarElement = document.getElementById('combat-player-hp-bar');
        const combatPlayerHpCurrentElement = document.getElementById('combat-player-hp-current');
        const combatPlayerHpMaxElement = document.getElementById('combat-player-hp-max');
        const combatPlayerMpCurrentElement = document.getElementById('combat-player-mp-current');
        const combatPlayerMpMaxElement = document.getElementById('combat-player-mp-max');
        const combatPlayerAtkElement = document.getElementById('combat-player-atk');
        const combatPlayerDefElement = document.getElementById('combat-player-def');
        const combatPlayerStatusEffectsDisplay = document.getElementById('combat-player-status-effects-display'); 

        const combatEnemyDisplay = document.getElementById('combat-enemy-display'); 
        const combatEnemyNameElement = document.getElementById('combat-enemy-name');
        const combatEnemyIconElement = document.getElementById('combat-enemy-icon');
        const combatEnemyHpBarFillElement = document.getElementById('combat-enemy-hp-bar-fill'); 
        const combatEnemyHpCurrentElement = document.getElementById('combat-enemy-hp-current');
        const combatEnemyHpMaxElement = document.getElementById('combat-enemy-hp-max');
        const combatEnemyAtkElement = document.getElementById('combat-enemy-atk');
        const combatEnemyDefElement = document.getElementById('combat-enemy-def');
        const combatEnemyStatusEffectsDisplay = document.getElementById('combat-enemy-status-effects-display'); 

        // ------------------ Nuevo: lógica Herrería Rework ------------------
        const blacksmithMainModal = document.getElementById('blacksmithMainModal');
        const blacksmithForgeModal = document.getElementById('blacksmithForgeModal');
        const blacksmithUpgradeModal = document.getElementById('blacksmithUpgradeModal');
        const blacksmithReforgeModal = document.getElementById('blacksmithReforgeModal');
        const blacksmithGemsModal = document.getElementById('blacksmithGemsModal');


        function openBlacksmithMain(){
            openModal('blacksmithMainModal');
        }

        // abrir ventana objetivo desde selector
        document.addEventListener('click', (e)=>{
            const el = e.target.closest && e.target.closest('.bs-option');
            if (!el) return;
            const target = el.dataset.target;
            if (!target) return;
            // cerrar selector y abrir modal objetivo
            closeModal('blacksmithMainModal');
            openModal(target);
        });

    // el listener se asigna en DOMContentLoaded para mantener la inicialización centralizada

        // Mejorar Equipamiento: sistema de niveles 1-10 con vista previa y coste
        const upgradeListDiv = document.getElementById('upgrade-equipment-list');
        const upgradePreviewDiv = document.getElementById('upgrade-preview');
        const confirmUpgradeBtn = document.getElementById('confirm-upgrade-btn');
        const upgradeCostSpan = document.getElementById('upgrade-cost');

        let selectedUpgradeItemId = null;

        // Por nivel -> porcentaje de incremento aplicado SOBRE el stat base al subir al siguiente nivel
        const UPGRADE_PERCENT_STEPS = [0, 10, 15, 18, 22, 26, 30, 35, 40, 50]; // índice 1 = 1->2
        const MAX_ITEM_LEVEL = 10;

        function getNextUpgradePercent(currentLevel){
            if (!currentLevel || currentLevel < 1) currentLevel = 1;
            if (currentLevel >= MAX_ITEM_LEVEL) return 0;
            return UPGRADE_PERCENT_STEPS[Math.min(currentLevel, UPGRADE_PERCENT_STEPS.length-1)];
        }

        function ensureItemHasBaseStats(item){
            if (!item) return {};
            if (!item.baseStats) {
                const base = baseItems[item.id] && baseItems[item.id].stats ? JSON.parse(JSON.stringify(baseItems[item.id].stats)) : (item.stats ? JSON.parse(JSON.stringify(item.stats)) : {});
                item.baseStats = base;
                // Ensure current stats exist
                item.stats = item.stats || JSON.parse(JSON.stringify(base));
                // default level
                if (!item.level) item.level = 1;
            }
            return item.baseStats;
        }

        function calcUpgradeCostForItem(item){
            // Coste escalado por nivel y rareza (si existe)
            const level = item.level || 1;
            const rarity = (baseItems[item.id] && baseItems[item.id].rarity) || (item.rarity || 'Common');
            const rarityMult = rarity === 'Rare' ? 1.1 : (rarity === 'Epic' ? 1.3 : (rarity === 'Mythic' ? 1.6 : 1));
            const baseValue = Math.max(1, (item.baseStats && ((item.baseStats.attack||0) + (item.baseStats.defense||0))) || 5);
            const cost = Math.round(150 * level * (1 + level*0.08) * rarityMult + baseValue * 10);
            return Math.max(50, cost);
        }

        function renderUpgradeEquipmentList(){
            if (!upgradeListDiv) return;
            upgradeListDiv.innerHTML = '';
            const addCardFor = (it, source) => {
                if (!it) return;
                ensureItemHasBaseStats(it);
                // ensure instance has uid
                if (!it.uid) {
                    it.uid = genUid();
                    // persist back to inventory/equipment depending on source
                    if (source === 'inv') {
                        const idx = player.inventory.findIndex(x => x === it || x.id === it.id && !x.uid);
                        if (idx !== -1) player.inventory[idx].uid = it.uid;
                    } else if (source === 'equip') {
                        for (const s in player.equipment) {
                            if (player.equipment[s] && player.equipment[s].id === it.id && !player.equipment[s].uid) player.equipment[s].uid = it.uid;
                        }
                    }
                }
                const card = document.createElement('div');
                card.className = 'item-card';
                card.dataset.uid = it.uid || '';
                card.dataset.itemId = it.id || '';
                card.innerHTML = `
                    <div class="item-card-top" style="display:flex;gap:8px;align-items:center;justify-content:center;flex-direction:column;">
                        <div class="item-icon">${(baseItems[it.id]||it).icon||''}</div>
                        <div style="font-size:0.95rem;font-weight:700;">${it.name||it.id||'Item'}</div>
                    </div>
                    <div style="font-size:0.8rem;color:#cfeeff;margin-top:6px;">LV ${it.level||1}</div>
                `;
                card.addEventListener('click', ()=> selectUpgradeItemByUid(it.uid));
                upgradeListDiv.appendChild(card);
            };

            // equipo equipado (mostrar primero)
            for (const slot of ['weapon','shield','armor','accessory']){
                const it = player.equipment[slot];
                if (it) addCardFor(it, 'equip');
            }
            // items en inventario: cada instancia
            for (const inv of player.inventory){
                const base = baseItems[inv.id] || inv;
                if (['weapon','armor','shield','accessory'].includes(base.type)){
                    addCardFor(inv, 'inv');
                }
            }
        }

        function selectUpgradeItemByUid(uid){
            if (!uid) return;
            selectedUpgradeItemId = uid; // ahora guarda uid
            const cards = upgradeListDiv.querySelectorAll('.item-card');
            cards.forEach(c=> c.classList.toggle('selected', c.dataset.uid === String(selectedUpgradeItemId)));
            let item = player.inventory.find(it => it.uid === uid) || Object.values(player.equipment).find(it => it && it.uid === uid);
            // fallback: si no encontró por uid, intentar buscar por itemId en la card seleccionada
            if (!item) {
                const selCard = upgradeListDiv.querySelector(`.item-card.selected`);
                if (selCard && selCard.dataset && selCard.dataset.itemId) {
                    const iid = selCard.dataset.itemId;
                    // buscar primer item en inventario con ese id
                    item = player.inventory.find(it => it.id === iid) || Object.values(player.equipment).find(it => it && it.id === iid);
                    // si encontramos y no tiene uid, asignar uid persistente
                    if (item && !item.uid) { item.uid = uid; }
                }
            }
            if (!item) return;
            ensureItemHasBaseStats(item);
            const level = item.level || 1;
            if (level >= MAX_ITEM_LEVEL){
                upgradePreviewDiv.innerHTML = `<strong>${item.name || item.id}</strong><p>Nivel máximo alcanzado (${level}).</p>`;
                upgradeCostSpan.textContent = '—';
                confirmUpgradeBtn.disabled = true;
                return;
            }
            const percent = getNextUpgradePercent(level);
            // mostrar preview por stat
            const base = item.baseStats || {};
            const curr = item.stats || {};
            let previewHtml = `<strong>${item.name || item.id}</strong><p style="margin-top:6px;">${level} → ${level+1}  (+${percent}%)</p><ul style="text-align:left;margin-top:8px;">`;
            ['attack','defense','hp','mp'].forEach(stat => {
                const b = base[stat] || 0;
                const c = curr[stat] || 0;
                const delta = Math.round(b * (percent/100));
                const projected = c + delta;
                if (b || c || delta) previewHtml += `<li>${stat.toUpperCase()}: ${c} → ${projected} <span style="color:#9fd8ff;">(+${delta})</span></li>`;
            });
            previewHtml += `</ul>`;
            const cost = calcUpgradeCostForItem(item);
            upgradeCostSpan.textContent = cost;
            confirmUpgradeBtn.disabled = player.col < cost;
            upgradePreviewDiv.innerHTML = previewHtml + `<p style="margin-top:8px;">Coste: ${cost} Col</p>`;
        }

        function confirmUpgrade(){
            if (!selectedUpgradeItemId) return;
            // localizar item por uid en equipo o inventario
            let item = player.inventory.find(it => it.uid === selectedUpgradeItemId) || Object.values(player.equipment).find(it => it && it.uid === selectedUpgradeItemId);
            if (!item) { showNotification('Item no encontrado.', 'error'); return; }
            ensureItemHasBaseStats(item);
            const level = item.level || 1;
            if (level >= MAX_ITEM_LEVEL){ showNotification('Item ya está en nivel máximo.', 'default'); return; }
            const cost = calcUpgradeCostForItem(item);
            if (player.col < cost){ showNotification('No tienes suficiente Col', 'error'); return; }
            const percent = getNextUpgradePercent(level);
            // aplicar incremento sobre baseStats
            ['attack','defense','hp','mp'].forEach(stat => {
                const b = item.baseStats[stat] || 0;
                const delta = Math.round(b * (percent/100));
                item.stats[stat] = (item.stats[stat] || 0) + delta;
            });
            item.level = (item.level || 1) + 1;
            player.col -= cost;
            updatePlayerHUD(); renderInventory(); renderEquipment(); renderUpgradeEquipmentList();
            confirmUpgradeBtn.disabled = true; selectedUpgradeItemId = null; upgradePreviewDiv.innerHTML = 'Selecciona un equipo para ver detalles y coste.';
            showNotification('Equipo mejorado al siguiente nivel.', 'success');
            saveGame();
        }

        if (confirmUpgradeBtn) confirmUpgradeBtn.addEventListener('click', confirmUpgrade);

        // Inicializar vista
        renderUpgradeEquipmentList();

        // Eliminar/ocultar funcionalidades de Reforjar y Reforzar Gemas (se piden borrar)
        (function disableReforgeAndGems(){
            const reforgeBtn = document.querySelector('.bs-option[data-target="blacksmithReforgeModal"]');
            const gemsBtn = document.querySelector('.bs-option[data-target="blacksmithGemsModal"]');
            if (reforgeBtn) reforgeBtn.remove();
            if (gemsBtn) gemsBtn.remove();
            const reforgeModal = document.getElementById('blacksmithReforgeModal'); if (reforgeModal) reforgeModal.remove();
            const gemsModal = document.getElementById('blacksmithGemsModal'); if (gemsModal) gemsModal.remove();
        })();

        // Añadir emojis y pequeño ajuste visual a botones del selector si faltan
        (function decorateBlacksmithSelectorButtons(){
            const map = { 'blacksmithForgeModal': '🔨', 'blacksmithUpgradeModal': '⬆️', 'blacksmithMainModal': '🛠️' };
            document.querySelectorAll('.bs-option').forEach(btn => {
                const target = btn.dataset.target;
                const emoji = map[target];
                if (emoji && !btn.textContent.trim().startsWith(emoji)) btn.textContent = `${emoji} ${btn.textContent.trim()}`;
            });
        })();

        // ------------------ FIN Herrería ------------------

        const combatLogDisplayElement = document.getElementById('combat-log-display');
        const combatActionAttackBtn = document.getElementById('combat-action-attack');
        const combatActionSkillsBtn = document.getElementById('combat-action-skills');
        const combatActionPotionsBtn = document.getElementById('combat-action-potions');
        const combatActionFleeBtn = document.getElementById('combat-action-flee');
        const combatSkillsListContainer = document.getElementById('combat-skills-list-container');
        const combatPotionsListContainer = document.getElementById('combat-potions-list-container');
        
        // Botones de acción principales
        const combatBtn = document.getElementById('combat-btn');
        const bossCombatBtn = document.getElementById('boss-combat-btn');
        const trainSkillBtn = document.getElementById('train-skill-btn');
        const inventoryBtn = document.getElementById('inventory-btn');
        const shopBtn = document.getElementById('shop-btn');
        const blacksmithBtn = document.getElementById('blacksmith-btn');
        const playerStatsBtn = document.getElementById('player-stats-btn');
        const floorNavigateBtn = document.getElementById('floor-navigate-btn'); 
        const adminAccessBtn = document.getElementById('admin-access-btn'); // Botón Admin

        // Floor Navigation Modal Selectors
        const floorNavigationModal = document.getElementById('floorNavigationModal');
        const floorSelectGrid = document.getElementById('floor-select-grid');

        // Training Modal Selectors
        const trainingModal = document.getElementById('trainingModal'); 
        const trainingGridDisplay = document.getElementById('training-grid-display'); 
        const trainingPlayerCol = document.getElementById('training-player-col'); 
        const trainingStatsPreview = document.getElementById('training-stats-preview'); 

        // Admin Panel Selectors
        const adminKeyModal = document.getElementById('adminKeyModal');
        const adminKeyValueInput = document.getElementById('adminKeyValue');
        const submitAdminKeyBtn = document.getElementById('submitAdminKeyBtn');
        const adminKeyErrorMsg = document.getElementById('adminKeyErrorMsg');
        const adminPanelModal = document.getElementById('adminPanelModal');
        const adminPanelMessage = document.getElementById('adminPanelMessage');
        // Inputs del panel de admin
        const adminSetLevelValueInput = document.getElementById('adminSetLevelValue');
        const adminGiveExpValueInput = document.getElementById('adminGiveExpValue');
        const adminGiveColValueInput = document.getElementById('adminGiveColValue');
        const adminSetBaseAtkValueInput = document.getElementById('adminSetBaseAtkValue');
        const adminSetBaseDefValueInput = document.getElementById('adminSetBaseDefValue');
        const adminSetBaseMaxHpValueInput = document.getElementById('adminSetBaseMaxHpValue');
        const adminSetBaseMaxMpValueInput = document.getElementById('adminSetBaseMaxMpValue');
        const adminItemIdValueInput = document.getElementById('adminItemIdValue');
        const adminItemDetailsPreviewDiv = document.getElementById('adminItemDetailsPreview');
        const adminItemQuantityValueInput = document.getElementById('adminItemQuantityValue');
        const adminItemQuickSelect = document.getElementById('adminItemQuickSelect');
        const adminFloorNumberValueInput = document.getElementById('adminFloorNumberValue');
        const adminUnlockedFloorsListDiv = document.getElementById('adminUnlockedFloorsList');

        // ==== NUEVOS SELECTORES PARA EL MODAL DE SELECCIÓN DE MOBS ====
        const mobSelectionModal = document.getElementById('mobSelectionModal');   // El modal principal de selección
        const mobListContainer = document.getElementById('mobListContainer');     // El div donde se cargarán las tarjetas de mobs
        const mobSelectionMessage = document.getElementById('mobSelectionMessage'); // Mensajes para el modal de selección
        // =============================================================

        // Para la Wiki (sin cambios)
        const charactersGridDisplay = document.getElementById('characters-grid-display');
        const weaponsGridDisplay = document.getElementById('weapons-grid-display');
        const floorsInfoContainer = document.getElementById('floors-info-container');
        const guildsInfoContainer = document.getElementById('guilds-info-container');

        // Estado del combate actual (Actualizado)
        let currentCombat = {
            active: false, enemy: null, isBoss: false, playerTurn: true,
            turnCount: 0, 
        };

// ===============================================
        //            MÚSICA DE FONDO (Archivo de Audio)
        // ===============================================
        const backgroundMusic = document.getElementById('background-music');
        const musicToggleBtn = document.getElementById('music-toggle-btn'); 

        // Solo procede si ambos elementos (audio y botón) existen en el DOM
        if (backgroundMusic && musicToggleBtn) {
            backgroundMusic.volume = 0.3; // Establece el volumen inicial

            // Función para actualizar el texto y la clase CSS del botón
            function updateMusicButtonUI() {
                if (!backgroundMusic.paused) {
                    musicToggleBtn.textContent = "🔇 Silenciar";
                    musicToggleBtn.classList.add('music-active'); // Añade la clase si la música está sonando
                } else {
                    musicToggleBtn.textContent = "🔊 Música";
                    musicToggleBtn.classList.remove('music-active'); // Quita la clase si la música está pausada
                }
            }

            // Función principal para alternar la música
            function toggleMusic() {
                if (backgroundMusic.paused) {
                    // Intenta reproducir la música. .play() devuelve una Promesa.
                    backgroundMusic.play()
                        .then(() => {
                            // La reproducción fue exitosa (o no fue bloqueada)
                            updateMusicButtonUI(); // Actualiza el UI del botón
                            showNotification("Música iniciada.", "default", 1500);
                        })
                        .catch(error => {
                            // La reproducción fue bloqueada por el navegador o falló por otra razón
                            console.warn("Error al intentar reproducir música:", error);
                            showNotification("Error: Click de nuevo para reproducir la música (requiere interacción).", "error", 3000);
                            // Asegúrate de que el botón refleje el estado pausado si la reproducción no pudo iniciarse
                            updateMusicButtonUI(); 
                        });
                } else {
                    // La música está sonando, la pausamos
                    backgroundMusic.pause();
                    backgroundMusic.currentTime = 0; // Opcional: Reinicia la música al principio
                    updateMusicButtonUI(); // Actualiza el UI del botón
                    showNotification("Música detenida.", "default", 1500);
                }
            }

            // Asocia la función toggleMusic al evento 'click' del botón de música
            // Este es el único event listener directo que necesitas para el click del usuario
            musicToggleBtn.addEventListener('click', toggleMusic);

            // Importante: Escucha los eventos 'play', 'pause' y 'ended' del propio elemento <audio>
            // Esto asegura que el botón se actualice SIEMPRE que el estado de la música cambie,
            // ya sea por un click del usuario, si termina la canción, o si el navegador la pausa/reproduce por su cuenta.
            backgroundMusic.addEventListener('play', updateMusicButtonUI);
            backgroundMusic.addEventListener('pause', updateMusicButtonUI);
            backgroundMusic.addEventListener('ended', updateMusicButtonUI); // Cuando la canción llega al final

            // Cuando el DOM está completamente cargado, inicializa el estado visual del botón.
            // Esto es crucial para que el botón muestre el texto y estilo correctos al cargar la página.
            // (La música siempre estará "pausada" al cargar la página sin interacción previa)
            document.addEventListener('DOMContentLoaded', updateMusicButtonUI);

        } else {
            // Si por alguna razón los IDs no existen, muestra un error en la consola para depuración
            console.error("Error: Elementos 'background-music' o 'music-toggle-btn' no encontrados en el DOM. Revisa tus IDs en HTML.");
        }

        // --- Sistema simple de SFX y texto flotante in-combat ---
        const audioContext = (typeof AudioContext !== 'undefined') ? new AudioContext() : null;
        const sfxBuffers = {};
        async function loadSfx(name, url) {
            if (!audioContext) return;
            try {
                const res = await fetch(url);
                const ab = await res.arrayBuffer();
                sfxBuffers[name] = await audioContext.decodeAudioData(ab);
            } catch (e) {
                console.warn('SFX load failed', name, e);
            }
        }
        function playSfx(name) {
            try {
                if (audioContext && sfxBuffers[name]) {
                    const src = audioContext.createBufferSource();
                    src.buffer = sfxBuffers[name];
                    const gain = audioContext.createGain();
                    gain.gain.value = 0.7;
                    src.connect(gain).connect(audioContext.destination);
                    src.start(0);
                } else {
                    // fallback: short silent/audio placeholder to avoid errors
                    const a = new Audio();
                    a.src = ''; // no-op placeholder
                    a.volume = 0.01; a.play().catch(()=>{});
                }
            } catch (e) { /* ignore */ }
        }

        function showFloatingText(text, anchorElement, opts = {}) {
                    try {
                        const span = document.createElement('div');
                        span.className = 'floating-text';
                        span.textContent = text;
                        const rect = anchorElement.getBoundingClientRect();
                        span.style.left = `${rect.left + rect.width/2}px`;
                        span.style.top = `${rect.top - 8}px`;
                        span.style.pointerEvents = 'none';
                        span.style.zIndex = 9999;
                        // Determine style by opts.type
                        const t = opts.type || (text.startsWith('-') ? 'damage' : (text.startsWith('+') ? 'heal' : 'status'));
                        span.classList.add(t);
                        // Optional color override
                        if (opts.color) span.style.color = opts.color;

                        // Larger for critical/important
                        if (opts.large) span.style.fontSize = '2.8rem';

                        document.body.appendChild(span);

                        // Choose animation: shaky for big hits/heal, animate for normal
                        if (opts.shaky) span.classList.add('shaky');
                        else span.classList.add('animate');

                        // Remove after animation ends
                        span.addEventListener('animationend', () => { if (span.parentNode) span.parentNode.removeChild(span); });
                        // Fallback removal
                        setTimeout(()=>{ if (span.parentNode) span.parentNode.removeChild(span); }, 1200);
                    } catch (e) { console.warn('floating text err', e); }
        }

        // ===============================================
        //           LÓGICA DEL JUEGO (Actualizada)
        // ===============================================

        function calculateEffectiveStats() {
            let equippedAttack = 0;
            let equippedDefense = 0;
            let equippedMaxHp = 0;
            let equippedMaxMp = 0;

            for (const slot in player.equipment) {
                const item = player.equipment[slot];
                if (item && item.stats) {
                    equippedAttack += item.stats.attack || 0;
                    equippedDefense += item.stats.defense || 0;
                    equippedMaxHp += item.stats.hp || 0;
                    equippedMaxMp += item.stats.mp || 0;
                }
            }
            player.effectiveAttack = player.baseAttack + equippedAttack;
            player.effectiveDefense = player.baseDefense + equippedDefense;
            
            const oldMaxHp = player.maxHp;
            player.maxHp = player.baseMaxHp + equippedMaxHp;
            if (player.hp > player.maxHp) player.hp = player.maxHp;
            else if (player.maxHp > oldMaxHp && player.hp > 0) { // Solo curar si no está muerto
                 player.hp = Math.min(player.hp + (player.maxHp - oldMaxHp), player.maxHp);
            }
            
            const oldMaxMp = player.maxMp;
            player.maxMp = player.baseMaxMp + equippedMaxMp;
            if (player.mp > player.maxMp) player.mp = player.maxMp;
             else if (player.maxMp > oldMaxMp) {
                 player.mp = Math.min(player.mp + (player.maxMp - oldMaxMp), player.maxMp);
            }

            calculatePassiveEffects();
        }

        function calculatePassiveEffects() {
            player.tempAttackBonus = 0;
            player.tempDefenseBonus = 0;
            player.tempCritChanceBonus = 0;
            player.tempMpCostReduction = 0;
            player.tempHpRegen = 0;

            player.passiveSkills.forEach(pSkill => {
                const passive = passiveSkillData[pSkill.id];
                if (passive) {
                    if (passive.effect.hpRegen) player.tempHpRegen += passive.effect.hpRegen;
                    if (passive.effect.mpCostReduction) player.tempMpCostReduction += passive.effect.mpCostReduction;
                    if (passive.effect.critChance) player.tempCritChanceBonus += passive.effect.critChance;
                }
            });
        }

        function updatePlayerHUD() {
            calculateEffectiveStats(); 

            saoPlayerNameDisplay.textContent = player.name || "Jugador"; 
            statsPlayerName.textContent = player.name || "Jugador"; 
            combatPlayerNameElement.textContent = player.name || "Jugador"; 

            const hpPercentage = (player.hp / player.maxHp) * 100;
            saoHpBar.style.width = `${hpPercentage}%`;
            saoHpBar.classList.remove('low', 'critical');
            if (hpPercentage < 50 && hpPercentage >= 25) saoHpBar.classList.add('low');
            else if (hpPercentage < 25) saoHpBar.classList.add('critical');
            
            playerHpCurrentText.textContent = player.hp;
            playerHpMaxText.textContent = player.maxHp;
            playerLevelText.textContent = player.level;

            playerMpCurrentElement.textContent = player.mp;
            playerMpMaxElement.textContent = player.maxMp;
            mpBarFillElement.style.width = `${(player.mp / player.maxMp) * 100}%`;

            currentExpElement.textContent = player.currentExp;
            neededExpElement.textContent = player.neededExp;
            expBarFillElement.style.width = `${(player.currentExp / player.neededExp) * 100}%`;
            
            playerColElement.textContent = player.col;
            currentFloorElement.textContent = player.currentFloor;
            floorNameElement.textContent = floorData[player.currentFloor]?.name || "Desconocido";

            trainCostDisplay.textContent = 50 * player.level; 

            displayStatusEffects(playerStatusEffectsDisplay, player.activeStatusEffects);
        }

        function calculateNeededExpForLevel(level) {
            let exp = 100;
            for (let i = 1; i < level; i++) {
                exp = Math.floor(exp * 1.35 + 80);
            }
            return exp;
        }

        function gainExp(amount) {
            if (player.hp <= 0) return; 
            player.currentExp += amount;
            showNotification(`¡Has ganado ${amount} EXP!`, "success");
            while (player.currentExp >= player.neededExp) { // Usar while para múltiples level ups
                levelUp();
            }
            updatePlayerHUD();
        }

        function levelUp() {
            player.level++;
            player.currentExp = Math.max(0, player.currentExp - player.neededExp); 
            player.neededExp = calculateNeededExpForLevel(player.level); 
            player.baseMaxHp += Math.floor(20 + player.level * 1.5);
            player.baseMaxMp += Math.floor(8 + player.level * 0.8);
            player.col += 100*player.level; // Gana 100 de Col al subir de nivel
            calculateEffectiveStats(); 
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.baseAttack += Math.floor(2 + player.level * 0.2);
            player.baseDefense += Math.floor(1 + player.level * 0.15);
            showNotification(`¡LEVEL UP! Has alcanzado el Nivel ${player.level}! Tus stats han mejorado.`, "success", 6000);
            
            Object.entries(skillData).forEach(([skillId, data]) => {
                if (data.levelReq === player.level && !player.skills.find(s => s.id === skillId)) {
                    player.skills.push({ id: skillId, ...data });
                    showNotification(`¡Nueva habilidad aprendida: ${data.name}!`, "success");
                }
            });
            Object.entries(passiveSkillData).forEach(([pSkillId, data]) => {
                if (data.levelReq === player.level && !player.passiveSkills.find(s => s.id === pSkillId)) {
                    player.passiveSkills.push({ id: pSkillId, ...data });
                    showNotification(`¡Nueva habilidad pasiva: ${data.name}!`, "success");
                }
            });
            updatePlayerHUD(); // Primero actualiza el HUD para que muestre los nuevos valores
            saveGame(); // ¡Aquí se guarda el progreso automáticamente!
        }
        
        function takeDamage(amount, target, sourceName = "Algo") {
            let damageTaken = Math.max(0, amount - (target.effectiveDefense || target.defense || 0));

            const protectedEffect = target.activeStatusEffects.find(eff => eff.type === 'protected');
            if (protectedEffect) {
                damageTaken *= (1 - protectedEffect.value);
                addCombatLog(`${target.name} está protegido, daño reducido.`, 'status-message');
            }

            const counterEffect = target.activeStatusEffects.find(eff => eff.type === 'counter');
            if (counterEffect && target === player && currentCombat.enemy) { // Solo el jugador puede contraatacar al enemigo
                const damageReductionFromCounter = damageTaken * (counterEffect.damageReduction || 0);
                damageTaken -= damageReductionFromCounter;
                const reflectedDamage = Math.floor(damageTaken * (counterEffect.value || 0)); // Refleja sobre el daño ya reducido

                currentCombat.enemy.currentHp -= reflectedDamage;
                addCombatLog(`${target.name} contraataca, ${currentCombat.enemy.name} recibe ${reflectedDamage} de daño reflejado.`, 'player-action');
                updateCombatEnemyDisplay();
                showFloatingText(`-${reflectedDamage}`, combatEnemyDisplay, { type: 'damage', color: '#ff9f9f', shaky: true });
                if (currentCombat.enemy.currentHp <= 0) {
                    endCombat(true); // El enemigo puede morir por el contraataque
                    return; // Termina la función si el enemigo muere
                }
            }

            damageTaken = Math.floor(damageTaken); // Redondear daño final

            if (target === player) {
                target.hp -= damageTaken;
                if (target.hp < 0) target.hp = 0;
            } else if (target === currentCombat.enemy) {
                target.currentHp -= damageTaken;
                if (target.currentHp < 0) target.currentHp = 0;
            }

            // Visual & audio feedback
            if (target === player) {
                combatPlayerDisplay.classList.add('damage-flash');
                setTimeout(() => combatPlayerDisplay.classList.remove('damage-flash'), 220);
                // Floating text + sfx for player hit
                showFloatingText(`-${damageTaken}`, combatPlayerDisplay, { type: 'damage', color:'#ff6b6b', shaky: damageTaken > Math.max(1, Math.floor(player.maxHp * 0.12)) });
                playSfx('hit');
                updatePlayerHUD();
                if (currentCombat.active) {
                    updateCombatPlayerDisplay();
                    addCombatLog(`${sourceName} te inflige ${damageTaken} de daño.`, 'enemy-action');
                } else {
                    showNotification(`${sourceName} te ha infligido ${damageTaken} de daño.`, "error");
                }
                if (player.hp === 0) {
                    if (currentCombat.active) endCombat(false);
                    else gameOver();
                }
            } else if (target === currentCombat.enemy) {
                combatEnemyDisplay.classList.add('damage-flash');
                setTimeout(() => combatEnemyDisplay.classList.remove('damage-flash'), 220);

                updateCombatEnemyDisplay();
                addCombatLog(`Infliges ${damageTaken} de daño a ${target.name}.`, 'player-action');
                // Floating text + sfx for enemy hit
                showFloatingText(`-${damageTaken}`, combatEnemyDisplay, { type: 'damage', color:'#ffd700', shaky: damageTaken > Math.max(1, Math.floor(currentCombat.enemy.hp * 0.12)) });
                playSfx('hit_enemy');
                // small screen shake on heavy hit
                if (damageTaken > Math.max(1, Math.floor((currentCombat.enemy.hp || 1) * 0.18))) {
                    const modalCont = document.querySelector('#combatModal .modal-content');
                    if (modalCont) {
                        modalCont.classList.add('screen-shake');
                        setTimeout(() => modalCont.classList.remove('screen-shake'), 450);
                    }
                }
                if (target.currentHp === 0) {
                    endCombat(true);
                }
            }
        }
        
        function gameOver() {
            showNotification("¡Has caído en Aincrad! Fin del juego...", "error", 10000);
            disableGameActions(true); 
        }

        function disableGameActions(disable) {
            combatBtn.disabled = disable;
            bossCombatBtn.disabled = disable;
            trainSkillBtn.disabled = disable;
            floorNavigateBtn.disabled = disable; 
        }

        function restoreResource(type, amount, target = player) {
            if (type === 'hp') {
                target.hp = Math.min(target.hp + amount, target.maxHp);
            } else if (type === 'mp') {
                target.mp = Math.min(target.mp + amount, target.maxMp);
            }
            updatePlayerHUD();
            if (currentCombat.active) updateCombatPlayerDisplay();
            // Floating text for restores (if in combat show above target)
            try {
                const anchor = (currentCombat.active && target === player) ? combatPlayerDisplay : (currentCombat.active && target === currentCombat.enemy ? combatEnemyDisplay : null);
                const text = `+${amount}`;
                if (anchor) showFloatingText(text, anchor, { type: 'heal', color: '#7CFC00', large: true, shaky: true });
            } catch (e) { /* silent */ }
        }
        
        function openTrainingModal() {
            const cost = 50 * player.level;
            trainingPlayerCol.textContent = player.col; 
            trainingStatsPreview.innerHTML = `
                <li>Ataque: +1</li>
                <li>Defensa: +0-2</li>
                <li>HP Máx: +5</li>
                <li>MP Máx: +2</li>
                <li>Costo: ${cost} Col</li>
            `;
            trainingGridDisplay.innerHTML = '';
            const trainingOptionDiv = document.createElement('div');
            trainingOptionDiv.className = 'training-option';
            trainingOptionDiv.tabIndex = 0;
            trainingOptionDiv.setAttribute('role', 'button');
            trainingOptionDiv.innerHTML = `
                <span class="item-icon">💪</span>
                <span class="item-name">Entrenamiento Físico</span>
                <span class="training-stats-gain">Mejora tus atributos base.</span>
                <span class="item-price">Costo: ${cost} Col</span>
            `;
            trainingOptionDiv.addEventListener('click', performTraining);
            trainingOptionDiv.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); performTraining(); } });
            trainingGridDisplay.appendChild(trainingOptionDiv);
            if (player.col < cost) {
                trainingOptionDiv.style.opacity = "0.6";
                trainingOptionDiv.style.pointerEvents = "none";
                trainingOptionDiv.title = "No tienes suficiente Col para entrenar.";
            } else {
                trainingOptionDiv.style.opacity = "1";
                trainingOptionDiv.style.pointerEvents = "auto";
                trainingOptionDiv.title = "";
            }

            trainingModal.style.display = 'block';

            const allModals = document.querySelectorAll('.modal');
            allModals.forEach(m => {
                if (m.id !== 'trainingModal' && m.id !== 'infoModal' && m.id !== 'nameEntryModal' && !(m.id === 'combatModal' && currentCombat.active)) {
                    m.style.display = 'none';
                }
            });
        }

        function performTraining() {
            const cost = 50 * player.level;
            if (player.col >= cost) {
                player.col -= cost;
                player.baseAttack += 1;
                player.baseDefense += Math.random() < 0.4 ? 2 : (Math.random() < 0.7 ? 1 : 0) ; // Ajustado para que 0-2 sea más probable
                player.baseMaxHp += 5;
                player.baseMaxMp += 2;
                calculateEffectiveStats();
                player.hp = Math.min(player.hp + 5, player.maxHp); // Curar un poco al entrenar
                player.mp = Math.min(player.mp + 2, player.maxMp);
                showNotification("¡Entrenamiento completado! Stats mejorados.", "success");
                updatePlayerHUD();
                openTrainingModal(); 
                saveGame();
            } else {
                showNotification(`Necesitas ${cost} Col para entrenar.`, "error");
            }
        }


        // ===============================================
        //           SISTEMA DE COMBATE (Modal) - Actualizado
        // ===============================================
        // Se encarga de INICIAR el combate REAL después de que elijas un enemigo.
        
        // ESTA ES LA NUEVA FUNCIÓN 'initCombat'.
        // Su ÚNICO trabajo es abrir el modal de selección de monstruos.
        function initCombat(isBossFight) {
            if (player.hp === 0) {
                showNotification("No puedes combatir, estás derrotado.", "error");
                return;
            }
            showMobSelectionModal(isBossFight); // Llamamos a la función que dibuja y muestra el modal de selección
        }
        
        function startSpecificCombat(mobId, isBossFight) {
            closeModal('mobSelectionModal'); // Cierra el modal de selección de monstruos

            if (player.hp === 0) {
                showNotification("No puedes combatir, estás derrotado.", "error");
                return;
            }
            const floor = floorData[player.currentFloor];
            if (!floor) {
                showNotification("Error: Datos del piso no encontrados.", "error");
                return;
            }

            let enemyTemplate;
            if (isBossFight) {
                enemyTemplate = floor.boss; // Para jefes, siempre es el mismo
            } else {
                // AQUÍ ES DONDE CAMBIA: Buscamos al monstruo por su ID
                enemyTemplate = floor.monsters.find(m => m.id === mobId);
            }

            if (!enemyTemplate) {
                showNotification("Error: Enemigo seleccionado no encontrado.", "error");
                return;
            }
            
            currentCombat.active = true;
            currentCombat.isBoss = isBossFight;
            currentCombat.enemy = JSON.parse(JSON.stringify(enemyTemplate)); 
            currentCombat.enemy.currentHp = currentCombat.enemy.hp; 
            currentCombat.enemy.activeStatusEffects = []; 
            currentCombat.playerTurn = true; 
            currentCombat.turnCount = 0; 
            player.activeStatusEffects = []; 
            player.attackComboCount = 0; 
            player.lastCombatAction = null; 

            combatTitleElement.textContent = `¡Combate contra ${currentCombat.enemy.name}!`;
            updateCombatPlayerDisplay();
            updateCombatEnemyDisplay();
            clearCombatLog();
            addCombatLog(`¡Te enfrentas a ${currentCombat.enemy.name} (${currentCombat.enemy.icon})!`, 'system-message');
            combatSkillsListContainer.style.display = 'none'; 
            combatPotionsListContainer.style.display = 'none';
            enableCombatActions(true);
            updateTurnIndicator(); 
            openModal('combatModal');
        }

        function updateCombatPlayerDisplay() {
            calculateEffectiveStats(); 
            combatPlayerNameElement.textContent = player.name || "Jugador"; 
            const playerHpPercent = (player.hp / player.maxHp) * 100;
            combatPlayerHpBarElement.style.width = `${playerHpPercent}%`;
            combatPlayerHpBarElement.textContent = `${player.hp}/${player.maxHp}`;
            combatPlayerHpBarElement.classList.remove('low', 'critical');
            if (playerHpPercent < 50 && playerHpPercent >= 25) combatPlayerHpBarElement.classList.add('low');
            else if (playerHpPercent < 25) combatPlayerHpBarElement.classList.add('critical');

            combatPlayerHpCurrentElement.textContent = player.hp;
            combatPlayerHpMaxElement.textContent = player.maxHp;
            combatPlayerMpCurrentElement.textContent = player.mp;
            combatPlayerMpMaxElement.textContent = player.maxMp;
            combatPlayerAtkElement.textContent = player.effectiveAttack;
            combatPlayerDefElement.textContent = player.effectiveDefense;
            displayStatusEffects(combatPlayerStatusEffectsDisplay, player.activeStatusEffects);
        }

        function updateCombatEnemyDisplay() {
            if (!currentCombat.enemy) return;
            combatEnemyNameElement.textContent = currentCombat.enemy.name;
            combatEnemyIconElement.textContent = currentCombat.enemy.icon;
            const enemyHpPercent = (currentCombat.enemy.currentHp / currentCombat.enemy.hp) * 100;
            combatEnemyHpBarFillElement.style.width = `${enemyHpPercent}%`; 
            combatEnemyHpBarFillElement.textContent = `${currentCombat.enemy.currentHp}/${currentCombat.enemy.hp}`; 
            
            combatEnemyHpBarFillElement.classList.remove('low', 'critical'); 
            if (enemyHpPercent < 50 && enemyHpPercent >= 25) {
                combatEnemyHpBarFillElement.classList.add('low');
            } else if (enemyHpPercent < 25) {
                combatEnemyHpBarFillElement.classList.add('critical');
            } 


            combatEnemyHpCurrentElement.textContent = currentCombat.enemy.currentHp;
            combatEnemyHpMaxElement.textContent = currentCombat.enemy.hp;
            combatEnemyAtkElement.textContent = currentCombat.enemy.attack;
            combatEnemyDefElement.textContent = currentCombat.enemy.defense;
            displayStatusEffects(combatEnemyStatusEffectsDisplay, currentCombat.enemy.activeStatusEffects);
        }
        
        function addCombatLog(message, type = 'default') {
            const logEntry = document.createElement('p');
            logEntry.className = type;
            logEntry.textContent = message;
            combatLogDisplayElement.appendChild(logEntry);
            combatLogDisplayElement.scrollTop = combatLogDisplayElement.scrollHeight; 
        }
        function clearCombatLog() {
            combatLogDisplayElement.innerHTML = '';
        }

        function applyStatusEffect(target, effectType, duration, value, chance = 1.0) {
            if (Math.random() > chance) return; 
            const existingEffectIndex = target.activeStatusEffects.findIndex(eff => eff.type === effectType);
            if (existingEffectIndex !== -1) {
                target.activeStatusEffects[existingEffectIndex].duration = duration;
                if (value !== undefined) target.activeStatusEffects[existingEffectIndex].value = value;
                addCombatLog(`${target.name || 'Objetivo'} ya está ${statusEffects[effectType].name.toLowerCase()}, se refresca la duración.`, 'status-message');
            } else {
                target.activeStatusEffects.push({ type: effectType, duration: duration, value: value });
                addCombatLog(`${target.name || 'Objetivo'} está ${statusEffects[effectType].name.toLowerCase()}!`, 'status-message');
            }
            if (target === player) updateCombatPlayerDisplay();
            else if (target === currentCombat.enemy) updateCombatEnemyDisplay();
        }

        function removeStatusEffect(target, effectType) {
            const initialLength = target.activeStatusEffects.length;
            target.activeStatusEffects = target.activeStatusEffects.filter(eff => eff.type !== effectType);
            if (target.activeStatusEffects.length < initialLength) {
                addCombatLog(`${target.name || 'Objetivo'} ya no está ${statusEffects[effectType].name.toLowerCase()}.`, 'status-message');
            }
            if (target === player) updateCombatPlayerDisplay();
            else if (target === currentCombat.enemy) updateCombatEnemyDisplay();
        }

        function processStatusEffects(target) {
            const effectsToRemove = [];
            target.activeStatusEffects.forEach(effect => {
                if (effect.duration > 0) {
                    effect.duration--;
                    switch (effect.type) {
                        case 'poisoned':
                        case 'bleeding':
                            const damage = Math.floor((target === player ? player.maxHp : currentCombat.enemy.hp) * effect.value);
                            if (target === player) {
                                target.hp -= damage;
                                if (target.hp < 0) target.hp = 0;
                            } else if (target === currentCombat.enemy) {
                                target.currentHp -= damage; 
                                if (target.currentHp < 0) target.currentHp = 0; 
                            }
                            addCombatLog(`${target.name || 'Objetivo'} pierde ${damage} HP por ${statusEffects[effect.type].name.toLowerCase()}.`, 'status-message');
                            break;
                        case 'hp_regen_s': 
                            if (target === player) {
                                restoreResource('hp', effect.value, player);
                                addCombatLog(`${target.name} recupera ${effect.value} HP por regeneración.`, 'status-message');
                            }
                            break;
                    }
                }
                if (effect.duration === 0) {
                    effectsToRemove.push(effect.type);
                }
            });

            effectsToRemove.forEach(type => removeStatusEffect(target, type));

            if (target === player) updateCombatPlayerDisplay();
            else if (target === currentCombat.enemy) updateCombatEnemyDisplay();
        }

        function displayStatusEffects(displayElement, effectsArray) {
            displayElement.innerHTML = '';
            effectsArray.forEach(effect => {
                const effectData = statusEffects[effect.type];
                if (effectData) {
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'status-effect-icon';
                    iconSpan.textContent = effectData.icon;
                    iconSpan.title = `${effectData.name} (${effectData.description}) - Duración: ${effect.duration} turno(s)`;
                    iconSpan.style.color = effectData.color;
                    displayElement.appendChild(iconSpan);
                }
            });
        }

        function updateTurnIndicator() {
            if (currentCombat.playerTurn) {
                combatPlayerDisplay.classList.add('active-turn');
                combatEnemyDisplay.classList.remove('active-turn');
            } else {
                combatPlayerDisplay.classList.remove('active-turn');
                combatEnemyDisplay.classList.add('active-turn');
            }
        }


        function playerAttack() {
            if (!currentCombat.active || !currentCombat.playerTurn) return;

            if (player.activeStatusEffects.some(eff => eff.type === 'stunned')) {
                addCombatLog("Estás aturdido y no puedes atacar.", 'system-message');
                removeStatusEffect(player, 'stunned'); 
                currentCombat.playerTurn = false;
                updateTurnIndicator();
                setTimeout(enemyTurn, 1000);
                return;
            }

            const enemy = currentCombat.enemy;
            let damageDealt = Math.max(1, player.effectiveAttack - (enemy.defense || 0) + Math.floor(Math.random() * (player.effectiveAttack * 0.2))); 
            
            if (player.lastCombatAction === 'attack') {
                player.attackComboCount++;
                if (player.attackComboCount >= 2) { 
                    damageDealt *= 1.5; 
                    addCombatLog(`¡COMBO! Tu ataque es más poderoso.`, 'combo-message');
                    player.attackComboCount = 0; 
                }
            } else {
                player.attackComboCount = 1; 
            }
            player.lastCombatAction = 'attack';

            takeDamage(damageDealt, enemy, player.name); 

            if (enemy.currentHp > 0) { // Solo ceder turno si el enemigo sigue vivo
                currentCombat.playerTurn = false;
                updateTurnIndicator();
                setTimeout(enemyTurn, 1000); 
            }
            // Si el enemigo muere, endCombat ya se encarga de todo.
        }


        
        function usePlayerSkill(skillId) {
            if (!currentCombat.active || !currentCombat.playerTurn) return;

            if (player.activeStatusEffects.some(eff => eff.type === 'stunned')) {
                addCombatLog("Estás aturdido y no puedes usar habilidades.", 'system-message');
                removeStatusEffect(player, 'stunned'); 
                currentCombat.playerTurn = false;
                updateTurnIndicator();
                setTimeout(enemyTurn, 1000);
                return;
            }

            const skill = player.skills.find(s => s.id === skillId);
            if (!skill) return addCombatLog("Habilidad desconocida.", "system-message");

            let mpCost = skill.mpCost;
            mpCost = Math.max(0, Math.floor(mpCost * (1 - player.tempMpCostReduction))); // Redondear hacia abajo

            if (player.mp < mpCost) return addCombatLog(`No tienes suficiente MP para ${skill.name}.`, "system-message");
            if (skill.requiresCombo && player.attackComboCount < 2) { 
                return addCombatLog(`Necesitas un combo activo para usar ${skill.name}.`, "system-message");
            }

            player.mp -= mpCost;
            addCombatLog(`Usas ${skill.name}.`, "player-action");
            player.lastCombatAction = 'skill'; 
            player.attackComboCount = 0;

            if (skill.type === 'attack') {
                const enemy = currentCombat.enemy;
                let damageDealt = Math.floor(player.effectiveAttack * skill.damageMultiplier);
                if (skill.ignoreDefPercent) {
                    damageDealt = Math.max(1, damageDealt - Math.floor(enemy.defense * (1 - skill.ignoreDefPercent) || 0));
                } else {
                    damageDealt = Math.max(1, damageDealt - (enemy.defense || 0));
                }

                let critChance = 0.1; 
                if (skill.critChanceBonus) critChance += skill.critChanceBonus;
                critChance += player.tempCritChanceBonus;

                if (Math.random() < critChance) {
                    damageDealt = Math.floor(damageDealt * 2); // Redondear daño crítico
                    addCombatLog(`¡Golpe Crítico!`, 'combo-message');
                }

                takeDamage(damageDealt, enemy, player.name); 

                if (skill.statusEffect) {
                    applyStatusEffect(enemy, skill.statusEffect.type, skill.statusEffect.duration, skill.statusEffect.value, skill.statusEffect.chance);
                }
            } else if (skill.type === 'heal') {
                restoreResource('hp', skill.healAmount);
                addCombatLog(`Te curas ${skill.healAmount} HP.`, 'player-action');
            } else if (skill.type === 'utility' && skill.id === 'shield_bash') {
                if (player.equipment.shield) {
                    const enemy = currentCombat.enemy;
                    const damageDealt = Math.max(1, Math.floor(player.effectiveAttack * skill.damageMultiplier) - (enemy.defense || 0));
                    takeDamage(damageDealt, enemy, player.name); 
                    if (Math.random() < (skill.stunChance || 0)) {
                        applyStatusEffect(enemy, 'stunned', 1); 
                    }
                } else {
                     addCombatLog(`Necesitas un escudo equipado para ${skill.name}.`, "system-message");
                     player.mp += mpCost; 
                }
            } else if (skill.type === 'defensive') {
                if (skill.statusEffect) {
                    applyStatusEffect(player, skill.statusEffect.type, skill.statusEffect.duration, skill.statusEffect.value);
                }
            }

            updateCombatPlayerDisplay(); 
            if (currentCombat.enemy.currentHp > 0) { // Solo ceder turno si el enemigo sigue vivo
                currentCombat.playerTurn = false;
                updateTurnIndicator();
                setTimeout(enemyTurn, 1000);
            }
            combatSkillsListContainer.style.display = 'none'; 
        }

        function useCombatPotion(itemIndexInInventory) {
            if (!currentCombat.active || !currentCombat.playerTurn) return;

            if (player.activeStatusEffects.some(eff => eff.type === 'stunned')) {
                addCombatLog("Estás aturdido y no puedes usar pociones.", 'system-message');
                removeStatusEffect(player, 'stunned'); 
                currentCombat.playerTurn = false;
                updateTurnIndicator();
                setTimeout(enemyTurn, 1000);
                return;
            }

            const item = player.inventory[itemIndexInInventory];
            if (!item || item.type !== 'consumable') return addCombatLog("No es una poción válida.", "system-message");

            player.lastCombatAction = 'potion'; 
            player.attackComboCount = 0;

            if (item.effect.hp) restoreResource('hp', item.effect.hp); 
            if (item.effect.mp) restoreResource('mp', item.effect.mp); 
            if (item.effect.cure) {
                removeStatusEffect(player, item.effect.cure);
            }
            addCombatLog(`Has usado ${item.name}.`, "player-action");
            item.count--;
            if (item.count <= 0) {
                player.inventory.splice(itemIndexInInventory, 1);
            }
            updateCombatPlayerDisplay(); 
            combatPotionsListContainer.style.display = 'none'; 

            currentCombat.playerTurn = false;
            updateTurnIndicator();
            setTimeout(enemyTurn, 1000);
        }


        function enemyTurn() {
            if (!currentCombat.active || currentCombat.playerTurn || player.hp === 0 || (currentCombat.enemy && currentCombat.enemy.currentHp === 0)) return; // Añadida verificación de HP enemigo

            currentCombat.turnCount++; 

            processStatusEffects(player);
             if (player.hp === 0) { // Verificar si el jugador murió por efectos de estado
                endCombat(false);
                return;
            }
            processStatusEffects(currentCombat.enemy);
            if (currentCombat.enemy.currentHp === 0) { // Verificar si el enemigo murió por efectos de estado
                endCombat(true);
                return;
            }


            const enemy = currentCombat.enemy;

            if (enemy.activeStatusEffects.some(eff => eff.type === 'stunned')) {
                addCombatLog(`${enemy.name} está aturdido y no puede actuar.`, 'enemy-action');
                removeStatusEffect(enemy, 'stunned'); 
                currentCombat.playerTurn = true;
                updateTurnIndicator();
                enableCombatActions(true);
                return;
            }

            let actionTaken = false;
            if (enemy.skills && enemy.skills.length > 0 && Math.random() < 0.3) { 
                const skillToUse = enemy.skills[Math.floor(Math.random() * enemy.skills.length)];
                if (skillToUse) {
                    addCombatLog(`${enemy.name} usa ${skillToUse.name}!`, 'enemy-action');
                    let damage = Math.max(1, Math.floor(enemy.attack * (skillToUse.damageMultiplier || 1)));
                    takeDamage(damage, player, enemy.name);

                    if (skillToUse.statusEffect) {
                        applyStatusEffect(player, skillToUse.statusEffect.type, skillToUse.statusEffect.duration, skillToUse.statusEffect.value, skillToUse.statusEffect.chance);
                    }
                    actionTaken = true;
                }
            }

            if (!actionTaken) { 
                const damageDealt = Math.max(1, enemy.attack - player.effectiveDefense + Math.floor(Math.random() * (enemy.attack * 0.15)));
                takeDamage(damageDealt, player, enemy.name); 
            }
            
            if (player.hp > 0) {
                currentCombat.playerTurn = true;
                updateTurnIndicator();
                enableCombatActions(true); 
            }
        }

        function fleeCombat() {
            if (!currentCombat.active) return;
            const fleeChance = currentCombat.isBoss ? 0.1 : 0.7; 
            if (Math.random() < fleeChance) {
                addCombatLog("¡Escapaste con éxito!", "system-message");
                showNotification("Lograste huir del combate.", "default");
                currentCombat.active = false;
                closeModal('combatModal');
                player.activeStatusEffects = []; 
                updatePlayerHUD();
            } else {
                addCombatLog("¡Fallaste al intentar huir!", "system-message");
                currentCombat.playerTurn = false;
                updateTurnIndicator();
                enableCombatActions(false);
                setTimeout(enemyTurn, 1000);
            }
        }
        
        function enableCombatActions(enable) {
            combatActionAttackBtn.disabled = !enable;
            combatActionSkillsBtn.disabled = !enable;
            combatActionPotionsBtn.disabled = !enable;
            combatActionFleeBtn.disabled = !enable;
        }

        function endCombat(playerWon) {
            // Visual cue: add victory/defeat class to modal content briefly
            const modalCont = document.querySelector('#combatModal .modal-content');
            if (modalCont) {
                if (playerWon) modalCont.classList.add('combat-victory');
                else modalCont.classList.add('combat-defeat');
            }

            currentCombat.active = false;
            enableCombatActions(false);
            player.activeStatusEffects = [];
            if (currentCombat.enemy) currentCombat.enemy.activeStatusEffects = [];
            updatePlayerHUD();
            if (currentCombat.enemy) updateCombatEnemyDisplay();
            combatPlayerDisplay.classList.remove('active-turn');
            combatEnemyDisplay.classList.remove('active-turn');

            if (playerWon) {
                const enemy = currentCombat.enemy;
                addCombatLog(`¡Has derrotado a ${enemy.name}!`, "system-message");
                showNotification(`¡Victoria! Has derrotado a ${enemy.name}.`, "success", 6000);
                gainExp(enemy.exp);
                player.col += enemy.col;
                showNotification(`Obtienes ${enemy.col} Col.`, "success");
                if (enemy.drops) {
                    for (const materialId in enemy.drops) {
                        if (Math.random() < enemy.drops[materialId]) {
                            addMaterial(materialId, 1);
                            const materialItem = baseItems[materialId];
                            showNotification(`Obtenido: ${materialItem.name} ${materialItem.icon}`, "success");
                            addCombatLog(`Obtenido: ${materialItem.name} ${materialItem.icon}`, "system-message");
                        }
                    }
                }
                // Screen shake + floating "Victory" text
                if (modalCont) {
                    setTimeout(() => modalCont.classList.remove('combat-victory'), 1600);
                }
                showFloatingText('¡Victoria!', combatPlayerDisplay, { type: 'status', color: '#7CFC00', large: true, shaky: true });

                if (currentCombat.isBoss) {
                    const nextFloor = player.currentFloor + 1;
                    if (floorData[nextFloor]) {
                        if (!player.unlockedFloors.includes(nextFloor)) {
                            player.unlockedFloors.push(nextFloor);
                            floorData[nextFloor].unlocked = true;
                            showNotification(`¡Has desbloqueado el Piso ${nextFloor}: ${floorData[nextFloor].name}!`, "success", 10000);
                            player.currentFloor = nextFloor;
                            updatePlayerHUD();
                        } else {
                            showNotification(`Ya habías desbloqueado el Piso ${nextFloor}.`, "default", 8000);
                        }
                    } else {
                        showNotification("¡FELICIDADES! ¡Has conquistado todos los pisos de Aincrad y completado el juego!", "success", 20000);
                        addCombatLog("¡Has completado Aincrad!", "system-message");
                        disableGameActions(true);
                    }
                    setTimeout(() => {
                        if (!currentCombat.active) closeModal('combatModal');
                    }, 3000);
                } else {
                    setTimeout(() => {
                        if (!currentCombat.active) closeModal('combatModal');
                    }, 4000);
                }
            } else {
                addCombatLog("Has sido derrotado...", "system-message");
                showNotification("Has caído en combate. Serás transportado al último punto seguro.", "error", 8000);
                player.hp = Math.floor(player.maxHp * 0.1);
                if (player.hp === 0 && player.maxHp > 0) player.hp = 1;
                player.col = Math.floor(player.col * 0.8);
                // Defeat text & visual
                showFloatingText('¡Derrota...', combatPlayerDisplay, { type: 'status', color: '#ff6b6b', large: true, shaky: true });
                if (modalCont) setTimeout(() => modalCont.classList.remove('combat-defeat'), 1600);

                setTimeout(() => {
                    if (!currentCombat.active) closeModal('combatModal');
                }, 4000);
            }
            updatePlayerHUD();
            saveGame(); // Guardar después de cada combate
        }

        combatActionAttackBtn.onclick = playerAttack;
        combatActionFleeBtn.onclick = fleeCombat;
        combatActionSkillsBtn.onclick = () => {
            combatSkillsListContainer.innerHTML = '';
            combatPotionsListContainer.style.display = 'none'; 
            const availableSkills = player.skills.filter(skill => player.level >= (skill.levelReq || 0));
            if (availableSkills.length === 0) {
                combatSkillsListContainer.innerHTML = '<p>No has aprendido ninguna habilidad activa.</p>';
            } else {
                availableSkills.forEach(skill => {
                    const skillBtn = document.createElement('button');
                    skillBtn.className = 'action-btn tooltip'; 
                    let mpCost = skill.mpCost;
                    mpCost = Math.max(0, Math.floor(mpCost * (1 - player.tempMpCostReduction))); 
                    skillBtn.innerHTML = `${skill.icon || '✨'} ${skill.name} (${mpCost} MP) <span class="tooltiptext">${skill.description}</span>`; 
                    skillBtn.onclick = () => usePlayerSkill(skill.id);
                    skillBtn.disabled = player.mp < mpCost || (skill.requiresCombo && player.attackComboCount < 2);
                    combatSkillsListContainer.appendChild(skillBtn);
                });
            }
            combatSkillsListContainer.style.display = combatSkillsListContainer.style.display === 'none' ? 'flex' : 'none';
        };
        combatActionPotionsBtn.onclick = () => {
            combatPotionsListContainer.innerHTML = '';
            combatSkillsListContainer.style.display = 'none'; 
            const potions = player.inventory.filter(item => item.type === 'consumable' && (item.effect.hp || item.effect.mp || item.effect.cure));
            if (potions.length === 0) {
                combatPotionsListContainer.innerHTML = '<p>No tienes pociones.</p>';
            } else {
                potions.forEach((potion) => { // No necesitamos el segundo argumento indexInFullInventory aquí
                    const originalIndex = player.inventory.findIndex(invItem => invItem.id === potion.id && invItem.count === potion.count); 
                    const potionBtn = document.createElement('button');
                    potionBtn.className = 'action-btn tooltip'; 
                    potionBtn.innerHTML = `${potion.icon || '🧪'} ${potion.name} (x${potion.count}) <span class="tooltiptext">${potion.description}</span>`; 
                    potionBtn.onclick = () => useCombatPotion(originalIndex);
                    combatPotionsListContainer.appendChild(potionBtn);
                });
            }
             combatPotionsListContainer.style.display = combatPotionsListContainer.style.display === 'none' ? 'flex' : 'none';
        };

        floorNavigateBtn.onclick = () => {
            renderFloorSelection();
            openModal('floorNavigationModal');
        };

        function renderFloorSelection() {
            floorSelectGrid.innerHTML = '';
            const totalFloors = Object.keys(floorData).length; // Asumiendo que floorData tiene entradas para todos los pisos hasta el máximo
            for (let i = 1; i <= totalFloors; i++) {
                const floor = floorData[i];
                if (!floor) continue; // Saltar si no hay datos para este piso
                const floorBtn = document.createElement('button');
                floorBtn.className = 'action-btn';
                floorBtn.textContent = `Piso ${i}: ${floor.name}`;
                floorBtn.disabled = !player.unlockedFloors.includes(i);
                floorBtn.onclick = () => {
                    if (player.currentFloor !== i) {
                        changeFloor(i);
                        closeModal('floorNavigationModal');
                    } else {
                        showNotification(`Ya estás en el Piso ${i}.`, 'default');
                    }
                };
                floorSelectGrid.appendChild(floorBtn);
            }
        }

        function changeFloor(newFloor) {
            if (player.unlockedFloors.includes(newFloor) && floorData[newFloor]) {
                player.currentFloor = newFloor;
                updatePlayerHUD();
                showNotification(`Has viajado al Piso ${newFloor}: ${floorData[newFloor].name}.`, 'default');
                saveGame();
            } else {
                showNotification(`El Piso ${newFloor} aún no está desbloqueado o no existe.`, 'error');
            }
        }


        // ===============================================
        //           INVENTARIO Y EQUIPO 
        // ===============================================
        function renderInventory() {
            inventoryGridDisplay.innerHTML = '';
            // Mostrar consumibles/materiales agrupados y cada instancia de equip por separado
            // Agrupar stackables
            const stackables = {};
            const nonStack = [];
            player.inventory.forEach((item, index) => {
                const base = baseItems[item.id] || item;
                if (base.type === 'consumable' || base.type === 'material') {
                    if (!stackables[item.id]) stackables[item.id] = { item: item, count: 0 };
                    stackables[item.id].count += item.count || 1;
                } else {
                    nonStack.push({ item, index });
                }
            });

            // Render stackables
            Object.values(stackables).forEach(s => {
                const item = s.item;
                const itemData = baseItems[item.id] || item;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'inventory-item';
                const rarityLabel = itemData.rarity || 'Common';
                itemDiv.classList.add(`rarity-${rarityLabel.toLowerCase()}`);
                itemDiv.classList.add(rarityLabel.toLowerCase()); // compat class (rare, epic, mythic)
                itemDiv.setAttribute('data-rarity', rarityLabel);
                const rarityColor = rarityLabel === 'Epic' ? '#b19cd9' : (rarityLabel === 'Rare' ? '#87ceeb' : (rarityLabel === 'Mythic' ? '#ff4d4d' : '#cccccc'));
                const detailsHtml = itemData.description ? `<span class="item-details">${itemData.description}</span>` : '';
                const socketHtml = itemData.sockets ? `<span class="item-sockets">🔵×${itemData.sockets}</span>` : '';
                itemDiv.innerHTML = `
                    <span class="item-icon">${itemData.icon}</span>
                    <span class="item-name ${(itemData.rarity||'Common').toLowerCase()}">${itemData.name}</span>
                    <span class="item-rarity" style="color:${rarityColor}; font-weight:700; margin-top:6px;">${rarityLabel}</span>
                    ${itemData.levelReq ? `<span class="item-level-req">Req. LV: ${itemData.levelReq}</span>` : ''}
                    <span class="item-count">x${s.count}</span>
                    ${detailsHtml}
                    ${socketHtml}
                `;
                itemDiv.onclick = () => handleItemClickById(item.id);
                inventoryGridDisplay.appendChild(itemDiv);
            });

            // Render non-stackables (each instance)
            nonStack.forEach(({ item, index }) => {
                const itemData = baseItems[item.id] || item;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'inventory-item';
                const rarityLabel = itemData.rarity || 'Common';
                itemDiv.classList.add(`rarity-${rarityLabel.toLowerCase()}`);
                itemDiv.classList.add(rarityLabel.toLowerCase());
                itemDiv.setAttribute('data-rarity', rarityLabel);
                const rarityColor = rarityLabel === 'Epic' ? '#b19cd9' : (rarityLabel === 'Rare' ? '#87ceeb' : (rarityLabel === 'Mythic' ? '#ff4d4d' : '#cccccc'));
                let detailsHtml = itemData.description ? `<span class="item-details">${itemData.description}</span>` : '';
                if (item.stats) detailsHtml += `<span class="item-details">ATK:${item.stats.attack||0} DEF:${item.stats.defense||0} HP:${item.stats.hp||0} MP:${item.stats.mp||0}</span>`;
                const socketHtml = item.sockets ? `<span class="item-sockets">🔵×${item.sockets}</span>` : '';
                itemDiv.innerHTML = `
                    <span class="item-icon">${itemData.icon}</span>
                    <span class="item-name ${(itemData.rarity||'Common').toLowerCase()}">${itemData.name}</span>
                    <span class="item-rarity" style="color:${rarityColor}; font-weight:700; margin-top:6px;">${rarityLabel}</span>
                    ${item.level ? `<div style="font-size:0.85rem;color:#cfeeff">LV ${item.level}</div>` : ''}
                    ${itemData.levelReq ? `<span class="item-level-req">Req. LV: ${itemData.levelReq}</span>` : ''}
                    ${detailsHtml}
                    ${socketHtml}
                `;
                // ensure item has a uid so clicks map to the correct instance
                if (!item.uid) {
                    const newUid = genUid();
                    item.uid = newUid;
                    // persist back to player inventory
                    player.inventory[index].uid = newUid;
                }
                itemDiv.onclick = () => handleItemClickByUid(item.uid);
                inventoryGridDisplay.appendChild(itemDiv);
            });
        }
        function renderEquipment() {
            const slots = { weapon: equipWeaponSlot, shield: equipShieldSlot, armor: equipArmorSlot, accessory: equipAccessorySlot };
            for (const slotName in slots) {
                const slotElement = slots[slotName];
                const equippedItem = player.equipment[slotName];
                const itemData = equippedItem ? (baseItems[equippedItem.id] || equippedItem) : null;
                slotElement.innerHTML = `<span class="equipment-slot-label">${slotName.charAt(0).toUpperCase() + slotName.slice(1)}</span>`;
                if (itemData) {
                    const rarity = itemData.rarity || 'Common';
                    const rarityColor = rarity === 'Epic' ? '#b19cd9' : (rarity === 'Rare' ? '#87ceeb' : (rarity === 'Mythic' ? '#ff4d4d' : '#cccccc'));
                    // clear previous rarity classes then add rarity class to slot for border/glow
                    slotElement.classList.remove('rarity-common','rarity-rare','rarity-epic','rarity-mythic','common','rare','epic','mythic');
                    slotElement.classList.add(`rarity-${(rarity||'Common').toLowerCase()}`);
                    slotElement.classList.add((rarity||'Common').toLowerCase());
                    slotElement.setAttribute('data-rarity', rarity || 'Common');
                    const socketHtml = itemData.sockets ? `<span class="item-sockets">🔵×${itemData.sockets}</span>` : '';
                    const rarityClass = (rarity||'Common').toLowerCase();
                    slotElement.innerHTML += `
                        <span class="item-icon">${itemData.icon}</span>
                        <span class="item-name ${rarityClass}">${itemData.name}</span>
                        <span class="item-level" style="font-size:0.85rem;color:#cfeeff;margin-left:0.4rem;">LV ${itemData.level || 1}</span>
                        ${itemData.levelReq ? `<span class="item-level-req">Req. LV: ${itemData.levelReq}</span>` : ''}
                        <span class="item-rarity" style="color:${rarityColor}; margin-left:0.4rem; font-weight:700;">${rarity}</span>
                        ${socketHtml}
                    `;
                    slotElement.classList.add('has-item');
                    slotElement.onclick = () => unequipItem(slotName);
                } else {
                    slotElement.innerHTML += `<span>Vacío</span>`;
                    slotElement.classList.remove('has-item');
                    slotElement.onclick = null;
                }
            }
            calculateEffectiveStats();
            updatePlayerHUD();
        }
        function handleItemClickById(itemId) {
            // usado para consumibles/materiales agrupados
            const itemBaseData = baseItems[itemId];
            if (!itemBaseData) return;
            if (itemBaseData.type === 'consumable') {
                const idx = player.inventory.findIndex(it => it.id === itemId && (baseItems[it.id] && baseItems[it.id].type === 'consumable'));
                if (idx !== -1) useConsumable(player.inventory[idx], idx);
            } else if (itemBaseData.type === 'material') {
                showNotification(`${itemBaseData.name}: Material de forja. Tienes ${player.materials[itemId] || 0}.`, "default");
            }
        }

        function handleItemClickByUid(uid) {
            const idx = player.inventory.findIndex(it => it.uid === uid);
            if (idx === -1) return;
            const item = player.inventory[idx];
            const itemBaseData = baseItems[item.id] || item;
            if (itemBaseData.type === 'consumable') return useConsumable(item, idx);
            if (['weapon','shield','armor','accessory'].includes(itemBaseData.type)) {
                if (player.level >= (itemBaseData.levelReq || 0)) {
                    equipItemByUid(item.uid);
                } else showNotification(`Necesitas ser Nivel ${itemBaseData.levelReq} para equipar ${itemBaseData.name}.`, 'error');
            }
        }
        function useConsumable(itemInstance, index) { 
            const itemBase = baseItems[itemInstance.id];
            if (!itemBase || itemBase.type !== 'consumable') return;
            if (itemBase.effect.hp) restoreResource('hp', itemBase.effect.hp);
            if (itemBase.effect.mp) restoreResource('mp', itemBase.effect.mp);
            if (itemBase.effect.cure) {
                removeStatusEffect(player, itemBase.effect.cure); 
            }
            showNotification(`Has usado ${itemBase.name}.`, "success");
            itemInstance.count = (itemInstance.count || 1) - 1;
            if (itemInstance.count <= 0) player.inventory.splice(index, 1);
            renderInventory();
            saveGame();
        }
        function equipItemByUid(uid) {
            const idx = player.inventory.findIndex(it => it.uid === uid);
            if (idx === -1) return;
            const itemToEquipInstance = player.inventory[idx];
            const itemBase = baseItems[itemToEquipInstance.id] || itemToEquipInstance;
            const slot = itemBase.slot;
            if (!slot) return;
            // move currently equipped back to inventory as an instance
            if (player.equipment[slot]) {
                const old = player.equipment[slot];
                addItemToInventory({ id: old.id, uid: old.uid, level: old.level, stats: old.stats }, 1);
            }
            // equip the instance (preserve uid/stats)
            player.equipment[slot] = player.inventory.splice(idx,1)[0];
            showNotification(`${itemBase.name} equipado.`, "success");
            renderInventory(); renderEquipment(); saveGame();
        }
        function equipItem(itemToEquipInstance, itemIndexInInventory) { // backward compatibility
            if (itemToEquipInstance.uid) return equipItemByUid(itemToEquipInstance.uid);
            return equipItemByUid(null);
        }
        function unequipItem(slotName) {
            const itemToUnequipInstance = player.equipment[slotName];
            if (!itemToUnequipInstance) return;
            const itemBase = baseItems[itemToUnequipInstance.id] || itemToUnequipInstance;
            addItemToInventory({ id: itemToUnequipInstance.id, uid: itemToUnequipInstance.uid, level: itemToUnequipInstance.level, stats: itemToUnequipInstance.stats }, 1);
            player.equipment[slotName] = null;
            showNotification(`${itemBase.name} desequipado.`, "default");
            renderInventory(); renderEquipment(); saveGame();
        }
        function addItemToInventory(itemData, quantity = 1) {
            const itemBase = baseItems[itemData.id] || itemData;
            const stackable = itemBase.type === 'consumable' || itemBase.type === 'material';
            if (stackable) {
                const existing = player.inventory.find(inv => inv.id === itemData.id && (baseItems[inv.id] && (baseItems[inv.id].type === 'consumable' || baseItems[inv.id].type === 'material')) );
                if (existing) { existing.count = (existing.count||0) + quantity; return; }
                const newItem = JSON.parse(JSON.stringify(itemBase)); newItem.id = itemData.id; newItem.count = quantity; delete newItem.price; delete newItem.stock; player.inventory.push(newItem); return;
            }
            // Non-stackable: create `quantity` instances each with uid
            for (let i=0;i<quantity;i++) {
                const inst = JSON.parse(JSON.stringify(itemBase));
                inst.id = itemData.id;
                inst.uid = itemData.uid || genUid();
                inst.count = 1;
                inst.baseStats = inst.baseStats || (inst.stats ? JSON.parse(JSON.stringify(inst.stats)) : {});
                inst.stats = inst.stats || JSON.parse(JSON.stringify(inst.baseStats));
                inst.level = itemData.level || inst.level || 1;
                delete inst.price; delete inst.stock;
                player.inventory.push(inst);
            }
        }

        // ===============================================
        //           TIENDA 
        // ===============================================
        function renderShop() { 
            const currentFloorShopData = floorData[player.currentFloor]?.shopItems;
            shopGridDisplay.innerHTML = '';
            shopFloorNumberElement.textContent = player.currentFloor;
            shopPlayerColElement.textContent = player.col;
            if (!currentFloorShopData || currentFloorShopData.length === 0) {
                shopGridDisplay.innerHTML = "<p>No hay artículos disponibles en la tienda de este piso.</p>";
                return;
            }
            currentFloorShopData.forEach(shopEntry => {
                const itemBase = baseItems[shopEntry.id];
                if (!itemBase) { console.warn("Item base no encontrado para la tienda:", shopEntry.id); return; }
                const itemToDisplay = { ...itemBase, ...shopEntry }; 
                const itemDiv = document.createElement('div');
                itemDiv.className = 'shop-item';
                // rarity class + mythic name color
                const shopRarity = (itemToDisplay.rarity || 'Common').toLowerCase();
                itemDiv.classList.add(`rarity-${shopRarity}`);
                itemDiv.classList.add(shopRarity);
                itemDiv.setAttribute('data-rarity', itemToDisplay.rarity || 'Common');
                let detailsHtml = itemToDisplay.description ? `<span class="item-details">${itemToDisplay.description}</span>` : '';
                 if (itemToDisplay.stats) {
                    detailsHtml += `<span class="item-details">ATK:${itemToDisplay.stats.attack || 0} DEF:${itemToDisplay.stats.defense || 0} HP:${itemToDisplay.stats.hp || 0} MP:${itemToDisplay.stats.mp || 0}</span>`;
                }
                const rarity = itemToDisplay.rarity || 'Common';
                const rarityColor = rarity === 'Epic' ? '#b19cd9' : (rarity === 'Rare' ? '#87ceeb' : (rarity === 'Mythic' ? '#ff4d4d' : '#cccccc'));
                const socketHtml = itemToDisplay.sockets ? `<span class="item-sockets">🔵×${itemToDisplay.sockets}</span>` : '';
                itemDiv.innerHTML = `
                    <span class="item-icon">${itemToDisplay.icon}</span>
                    <span class="item-name ${(itemToDisplay.rarity||'Common').toLowerCase()}">${itemToDisplay.name}</span>
                    <span class="item-rarity" style="color:${rarityColor}; font-weight:700; margin-left:0.4rem;">${rarity}</span>
                    ${detailsHtml}
                    ${socketHtml}
                    ${itemToDisplay.levelReq ? `<span class="item-level-req">Req. LV: ${itemToDisplay.levelReq}</span>` : ''}
                    <span class="item-price">${itemToDisplay.price} Col</span>
                `;
                itemDiv.onclick = () => buyItem(itemToDisplay); 
                shopGridDisplay.appendChild(itemDiv);
            });
        }
        function buyItem(itemDataFromShop) { 
            if (player.col >= itemDataFromShop.price) {
                if (itemDataFromShop.levelReq && player.level < itemDataFromShop.levelReq) {
                    showNotification(`Necesitas ser Nivel ${itemDataFromShop.levelReq} para comprar ${itemDataFromShop.name}.`, "error");
                    return;
                }
                player.col -= itemDataFromShop.price;
                const itemToAdd = { id: itemDataFromShop.id }; 
                if (baseItems[itemDataFromShop.id]?.type === 'material') { 
                    addMaterial(itemDataFromShop.id, 1);
                } else {
                    addItemToInventory(itemToAdd, 1); 
                }
                showNotification(`Has comprado ${itemDataFromShop.name} por ${itemDataFromShop.price} Col.`, "success");
                updatePlayerHUD();
                if(inventoryModalElement.style.display === 'block') renderInventory();
                renderShop(); 
                saveGame();
            } else {
                showNotification("No tienes suficiente Col para comprar este objeto.", "error");
            }
        }
        
        // ===============================================
        //           HERRERÍA (Blacksmith) 
        // ===============================================
        function addMaterial(materialId, quantity) { 
            if (!player.materials[materialId]) {
                player.materials[materialId] = 0;
            }
            player.materials[materialId] += quantity;
            if (blacksmithModalElement.style.display === 'block') {
                renderPlayerMaterials();
            }
        }
        function renderPlayerMaterials() { 
            playerMaterialsListElement.innerHTML = '';
            let hasMaterials = false;
            for (const materialId in player.materials) {
                if (player.materials[materialId] > 0) {
                    hasMaterials = true;
                    const materialBase = baseItems[materialId];
                    if (materialBase) {
                        const li = document.createElement('li');
                        li.innerHTML = `${materialBase.icon} ${materialBase.name}: <span style="color:#FFD700;">${player.materials[materialId]}</span>`;
                        playerMaterialsListElement.appendChild(li);
                    }
                }
            }
            if (!hasMaterials) {
                playerMaterialsListElement.innerHTML = '<li>No tienes materiales de forja.</li>';
            }
        }
        function renderBlacksmithRecipes() { 
            const currentFloorRecipes = floorData[player.currentFloor]?.blacksmithRecipes || [];
            blacksmithGridDisplay.innerHTML = '';
            // clear forge modal grid as well to avoid duplicates
            const forgeGridClear = document.getElementById('forge-recipes-grid');
            if (forgeGridClear) forgeGridClear.innerHTML = '';
            blacksmithFloorNumberElement.textContent = player.currentFloor;
            blacksmithPlayerColElement.textContent = player.col;
            renderPlayerMaterials();
            // Mostrar recetas listadas explícitamente en el piso (por clave de receta)
            // o recetas desbloqueadas por nivel del jugador.
            const availableRecipes = Object.entries(blacksmithRecipes).filter(([key, recipeDef]) => {
                if (currentFloorRecipes && currentFloorRecipes.includes(key)) return true;
                if (recipeDef.levelReq && player.level >= recipeDef.levelReq) return true;
                return false;
            }).map(([key, recipeDef]) => ({ key, ...recipeDef }));
            if (availableRecipes.length === 0) {
                blacksmithGridDisplay.innerHTML = "<p>No hay recetas de forja disponibles o que cumplas los requisitos en este piso.</p>";
                return;
            }
            availableRecipes.forEach(recipe => {
                const itemToCraftBase = baseItems[recipe.itemId];
                if (!itemToCraftBase) { console.warn("Item base no encontrado para receta:", recipe.itemId); return; }
                const itemDiv = document.createElement('div');
                itemDiv.className = 'blacksmith-item';
                const craftRarity = (itemToCraftBase.rarity || 'Common').toLowerCase();
                itemDiv.classList.add(`rarity-${craftRarity}`);
                itemDiv.classList.add(craftRarity);
                itemDiv.setAttribute('data-rarity', itemToCraftBase.rarity || 'Common');
                let materialsHtml = "Materiales: ";
                let canCraft = true;
                for (const matId in recipe.materials) {
                    const matBase = baseItems[matId];
                    const needed = recipe.materials[matId];
                    const owned = player.materials[matId] || 0;
                    materialsHtml += `${matBase.icon}${matBase.name} x${needed} (${owned}), `;
                    if (owned < needed) canCraft = false;
                }
                materialsHtml = materialsHtml.slice(0, -2); 
                if (player.col < recipe.cost) canCraft = false;
                if (player.level < (itemToCraftBase.levelReq || recipe.levelReq || 0) ) canCraft = false;
                let detailsHtml = itemToCraftBase.description ? `<span class="item-details">${itemToCraftBase.description}</span>` : '';
                 if (itemToCraftBase.stats) {
                    detailsHtml += `<span class="item-details">ATK:${itemToCraftBase.stats.attack || 0} DEF:${itemToCraftBase.stats.defense || 0} HP:${itemToCraftBase.stats.hp || 0}</span>`;
                }
                const rarityLabel = itemToCraftBase.rarity || 'Common';
                const rarityColor = rarityLabel === 'Epic' ? '#b19cd9' : (rarityLabel === 'Rare' ? '#87ceeb' : (rarityLabel === 'Mythic' ? '#ff4d4d' : '#cccccc'));
                itemDiv.innerHTML = `
                    <span class="item-icon">${itemToCraftBase.icon}</span>
                    <span class="item-name ${(itemToCraftBase.rarity||'Common').toLowerCase()}">${itemToCraftBase.name}</span>
                    <span class="item-rarity" style="color:${rarityColor}; font-weight:700; margin-top:6px;">${rarityLabel}</span>
                    ${detailsHtml}
                    ${itemToCraftBase.levelReq ? `<span class="item-level-req">Req. LV: ${itemToCraftBase.levelReq}</span>` : ''}
                    <span class="item-materials">${materialsHtml}</span>
                    <span class="item-price">Coste: ${recipe.cost} Col</span>
                    <span class="item-chance">Éxito: ${(recipe.chance * 100).toFixed(0)}%</span>
                `;
                if (!canCraft) {
                    itemDiv.style.opacity = "0.6";
                    itemDiv.style.pointerEvents = "none"; 
                    itemDiv.title = "No cumples los requisitos o no tienes suficientes materiales/Col.";
                } else {
                    // use recipe.key to identify which recipe to attempt (key = blacksmithRecipes key)
                    itemDiv.onclick = () => attemptForge(recipe.key);
                }
                // append to main blacksmith grid
                blacksmithGridDisplay.appendChild(itemDiv);
                // if the Forge modal grid exists, also append a clone so recipes show in the Forge modal
                const forgeGrid = document.getElementById('forge-recipes-grid');
                if (forgeGrid) {
                    const clone = itemDiv.cloneNode(true);
                    // ensure onclick uses recipe.key as well on the clone
                    clone.onclick = itemDiv.onclick;
                    forgeGrid.appendChild(clone);
                }
            });
        }
        function attemptForge(recipeIdToForge) { 
            const recipe = blacksmithRecipes[recipeIdToForge];
            const itemToCraftBase = baseItems[recipe.itemId];
            if (!recipe || !itemToCraftBase) return showNotification("Receta no válida.", "error");
            let canCraft = true;
            for (const matId in recipe.materials) {
                if ((player.materials[matId] || 0) < recipe.materials[matId]) canCraft = false;
            }
            if (player.col < recipe.cost) canCraft = false;
            if (player.level < (itemToCraftBase.levelReq || recipe.levelReq || 0) ) canCraft = false;
            if (!canCraft) return showNotification("No cumples los requisitos para forjar esto.", "error");
            for (const matId in recipe.materials) {
                player.materials[matId] -= recipe.materials[matId];
            }
            player.col -= recipe.cost;
            showNotification(`Materiales y ${recipe.cost} Col gastados intentando forjar ${itemToCraftBase.name}...`, "default");
            if (Math.random() < recipe.chance) {
                addItemToInventory({ id: recipe.itemId }, 1); // Usar cantidad 1
                showNotification(`¡FORJA EXITOSA! Has creado ${itemToCraftBase.name} ${itemToCraftBase.icon}!`, "success", 7000);
            } else {
                showNotification(`FORJA FALLIDA... ${itemToCraftBase.name} se ha roto en el proceso.`, "error", 7000);
            }
            updatePlayerHUD();
            renderBlacksmithRecipes(); 
            if(inventoryModalElement.style.display === 'block') renderInventory();
            saveGame();
        }


        // ===============================================
        //           PANTALLA DE ESTADÍSTICAS DEL JUGADOR 
        // ===============================================
        function renderPlayerStats() {
            calculateEffectiveStats(); 

            statsPlayerName.textContent = player.name || "Jugador"; 
            statsLevel.textContent = player.level;
            statsHp.textContent = `${player.hp} / ${player.maxHp}`;
            statsMp.textContent = `${player.mp} / ${player.maxMp}`;
            statsExp.textContent = `${player.currentExp} / ${player.neededExp}`;
            statsCol.textContent = player.col;
            statsBaseAtk.textContent = player.baseAttack;
            statsBaseDef.textContent = player.baseDefense;
            let equippedAttack = 0;
            let equippedDefense = 0;
            let equippedHp = 0;
            for (const slot in player.equipment) {
                const item = player.equipment[slot];
                if (item && item.stats) {
                    equippedAttack += item.stats.attack || 0;
                    equippedDefense += item.stats.defense || 0;
                    equippedHp += item.stats.hp || 0;
                }
            }
            statsEquipAtk.textContent = equippedAttack;
            statsEquipDef.textContent = equippedDefense;
            statsEquipHp.textContent = `+${equippedHp}`; 
            statsTotalAtk.textContent = player.effectiveAttack;
            statsTotalDef.textContent = player.effectiveDefense;
            statsSkillsList.innerHTML = '';
            if (player.skills.length > 0) {
                player.skills.forEach(skillRef => {
                    const skill = skillData[skillRef.id] || skillRef; 
                    const li = document.createElement('li');
                    li.textContent = `${skill.icon || '❖'} ${skill.name} - ${skill.description || `Coste MP: ${skill.mpCost}`}`; 
                    statsSkillsList.appendChild(li);
                });
            } else {
                statsSkillsList.innerHTML = '<li>No has aprendido ninguna habilidad activa.</li>';
            }

            statsPassiveSkillsList.innerHTML = '';
            if (player.passiveSkills.length > 0) {
                player.passiveSkills.forEach(pSkillRef => {
                    const pSkill = passiveSkillData[pSkillRef.id] || pSkillRef;
                    const li = document.createElement('li');
                    li.textContent = `${pSkill.icon || '🌟'} ${pSkill.name} - ${pSkill.description}`; 
                    statsPassiveSkillsList.appendChild(li);
                });
            } else {
                statsPassiveSkillsList.innerHTML = '<li>No has aprendido ninguna habilidad pasiva.</li>';
            }
        }


        // ===============================================
        //           MODALES Y NOTIFICACIONES 
        // ===============================================
        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                const allModals = document.querySelectorAll('.modal');
                allModals.forEach(m => { 
                    if (m.id !== modalId && m.id !== 'infoModal' && m.id !== 'nameEntryModal' && !(m.id === 'combatModal' && currentCombat.active) && m.id !== 'adminKeyModal' && m.id !== 'adminPanelModal') {
                        m.style.display = 'none'; 
                    }
                });
                modal.style.display = 'block';
            }
            if (modalId === 'inventoryModal') { renderInventory(); renderEquipment(); }
            if (modalId === 'shopModal') renderShop();
            if (modalId === 'blacksmithModal') renderBlacksmithRecipes();
            // Cuando abrimos el modal de Forjar en la interfaz rework, asegurarnos de renderizar recetas
            if (modalId === 'blacksmithForgeModal') renderBlacksmithRecipes();
            // Cuando abrimos el modal de Mejorar, normalizar instancias y renderizar la lista
            if (modalId === 'blacksmithUpgradeModal') { normalizePlayerItems(); renderUpgradeEquipmentList(); upgradePreviewDiv.innerHTML = 'Selecciona un equipo para ver detalles y coste.'; selectedUpgradeItemId = null; }
            if (modalId === 'playerStatsModal') renderPlayerStats();
            if (modalId === 'nameEntryModal') { 
                playerNameInputElement.focus();
            }
            if (modalId === 'adminKeyModal') {
                adminKeyValueInput.value = '';
                adminKeyErrorMsg.style.display = 'none';
                adminKeyValueInput.focus();
            }
            if (modalId === 'adminPanelModal') {
                populateAdminPanel(); // Llenar el panel de admin con datos actuales
            }
        }

        function closeModal(modalId) {
            if (modalId === 'nameEntryModal' && !player.name) {
                showNotification("Debes ingresar un nombre para tu personaje.", "error");
                playerNameInputElement.focus();
                return;
            }
            if (modalId === 'combatModal' && currentCombat.active) {
                showNotification("No puedes cerrar el combate mientras está activo. Usa el botón 'Huir'.", "error");
                return;
            }

            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
            if (modalId === 'infoModal') modalBodyContentElement.innerHTML = ''; 
            if (modalId === 'combatModal' && currentCombat.active) { 
                if (player.hp > 0) { 
                    addCombatLog("Combate interrumpido.", "system-message");
                }
                 currentCombat.active = false; 
                 player.activeStatusEffects = []; 
                 if(currentCombat.enemy) currentCombat.enemy.activeStatusEffects = []; 
                 updatePlayerHUD();
                 if(currentCombat.enemy) updateCombatEnemyDisplay();
            }
            if (modalId === 'adminPanelModal') { // Limpiar mensaje de feedback del panel admin al cerrar
                adminPanelMessage.style.display = 'none';
                adminPanelMessage.textContent = '';
            }
        }
        
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                if (event.target.id === 'combatModal' && currentCombat.active) return;
                if (event.target.id === 'nameEntryModal' && !player.name) return;
                if (event.target.id === 'adminKeyModal' && adminKeyModal.style.display === 'block') return; // No cerrar si se clickea fuera del contenido del modal de admin key
                if (event.target.id === 'adminPanelModal' && adminPanelModal.style.display === 'block') return; // Idem para el panel
                closeModal(event.target.id);
            }
        }
        document.addEventListener('keydown', function(event) {
            if (event.key === "Escape") {
                const openModals = document.querySelectorAll('.modal[style*="display: block"]');
                if (openModals.length > 0) {
                    const topModal = openModals[openModals.length - 1];
                    if (topModal.id === 'combatModal' && currentCombat.active) return;
                    if (topModal.id === 'nameEntryModal' && !player.name) return;
                    // No cerrar adminKeyModal o adminPanelModal con ESC si están abiertos y son el topModal
                    // para evitar cierres accidentales mientras se interactúa. El botón X sigue funcionando.
                    // if (topModal.id === 'adminKeyModal' || topModal.id === 'adminPanelModal') return; 
                    closeModal(topModal.id);
                }
            }
        });
        
        function showNotification(message, type = 'default', duration = 5000) {
            const notificationArea = document.getElementById('notification-area');
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            // Forzar reflow para reiniciar la animación si ya existe una con el mismo nombre
            notification.style.animation = 'none';
            notification.offsetHeight; // trigger reflow
            notification.style.animation = `slideInNotification 0.4s ease-out, fadeOutNotification 0.4s ease-in ${duration/1000 - 0.4}s forwards`;
            
            notificationArea.appendChild(notification);
            setTimeout(() => {
                if (notification.parentNode === notificationArea) { // Verificar si aún existe
                    notificationArea.removeChild(notification);
                }
            }, duration);
        }

        /**
         * Muestra el modal de selección de enemigos, cargando los mobs del piso actual.
         * @param {boolean} isBossFight Indica si la selección es para un jefe (true) o monstruos normales (false).
         */
        function showMobSelectionModal(isBossFight) {
            const floor = floorData[player.currentFloor];
            if (!floor) {
                mobSelectionMessage.textContent = "Error: Datos del piso no encontrados.";
                return;
            }

            mobListContainer.innerHTML = ''; // Limpiamos las tarjetas de mobs viejas del modal
            mobSelectionMessage.textContent = ""; // Limpiamos cualquier mensaje anterior

            let mobsToShow = [];
            if (isBossFight) {
                if (floor.boss) {
                    mobsToShow.push({ ...floor.boss, type: 'boss' }); // Añadimos el jefe si existe
                } else {
                    mobSelectionMessage.textContent = "No hay un jefe en este piso.";
                }
            } else {
                if (floor.monsters && floor.monsters.length > 0) {
                    mobsToShow = floor.monsters.map(m => ({ ...m, type: 'monster' })); // Añadimos los monstruos normales
                } else {
                    mobSelectionMessage.textContent = "No hay monstruos normales en este piso.";
                }
            }

            if (mobsToShow.length === 0 && mobSelectionMessage.textContent === "") {
                 mobSelectionMessage.textContent = "No hay enemigos disponibles en este piso.";
            }

            // Para cada monstruo/jefe que queremos mostrar, creamos una tarjeta
            mobsToShow.forEach(mob => {
                const mobCard = document.createElement('div');
                mobCard.className = 'mob-card';
                mobCard.dataset.mobId = mob.id;      // Guardamos el ID del mob en la tarjeta
                mobCard.dataset.mobType = mob.type;  // Guardamos el tipo (monstruo o jefe)

                const isBoss = mob.type === 'boss';
                const icon = mob.icon || (isBoss ? '👹' : '👻'); // Icono, si no tiene, uno por defecto
                const nameColor = isBoss ? 'var(--sao-red-alert)' : 'var(--sao-cyan-hud)'; // Color del nombre

                mobCard.innerHTML = `
                    <div class="mob-card-icon" style="font-size: 2.5em;">${icon}</div>
                    <div class="mob-card-name" style="color: ${nameColor};">${mob.name}</div>
                    <div class="mob-card-info"><i class="fas fa-heart mob-card-hp-icon"></i>HP: ${mob.hp}</div>
                    <div class="mob-card-info"><i class="fas fa-sword mob-card-attack-icon"></i>ATK: ${mob.attack}</div>
                    <div class="mob-card-info"><i class="fas fa-shield-alt"></i>DEF: ${mob.defense}</div>
                    <div class="mob-card-info">EXP: ${mob.exp} | Col: ${mob.col}</div>
                `;
                // Cuando se hace clic en la tarjeta, llamamos a startSpecificCombat para iniciar la pelea
                mobCard.onclick = () => startSpecificCombat(mob.id, isBoss);

                mobListContainer.appendChild(mobCard); // Agregamos la tarjeta al contenedor
            });

            openModal('mobSelectionModal'); // Abrimos el modal de selección
        }


        // ===============================================
        //           CONTENIDO DE LA WIKI (DINÁMICO) 
        // ===============================================
        const wikiCharacterData = { 
            kirito: { name: 'Kirito (黒の剣士)', role: 'Espadachín Solitario / Beater', icon: '⚫', description: 'Kazuto Kirigaya, conocido como Kirito, es el protagonista principal. Es un jugador solitario que prefiere luchar en la vanguardia. Posee la habilidad única de "Doble Empuñadura". Su determinación y habilidad lo convierten en una figura clave para completar Aincrad.', fullInfo: 'Más detalles sobre sus batallas, relaciones y crecimiento como personaje...'},
            asuna: { name: 'Asuna (閃光)', role: 'Destello Veloz / Subcomandante KoB', icon: '✨', description: 'Asuna Yuuki, conocida por su velocidad y habilidad con el estoque como "Destello Veloz". Es la subcomandante de los Caballeros de la Sangre (KoB). Inicialmente dedicada solo a escapar, su encuentro con Kirito cambia su perspectiva.', fullInfo: 'Su desarrollo desde una jugadora enfocada hasta una compañera leal y poderosa...'},
            klein: { name: 'Klein (クライン)', role: 'Líder de Fuurinkazan', icon: '🔥', description: 'Ryotaro Tsuboi, o Klein, es uno de los primeros amigos de Kirito en SAO. Es un líder carismático y leal de su gremio, Fuurinkazan. Siempre dispuesto a ayudar a sus amigos, valora la camaradería por encima de todo.', fullInfo: 'Sus aventuras junto a su gremio y su inquebrantable amistad con Kirito...'},
            agil: { name: 'Agil (エギル)', role: 'Mercader / Luchador con Hacha', icon: '💪', description: 'Andrew Gilbert Mills, conocido como Agil, es un mercader afroamericano y un hábil luchador con hacha. Es dueño de una tienda en Algade (Piso 50) y ayuda a los jugadores de niveles más bajos. Es una figura de apoyo importante.', fullInfo: 'Su papel como mercader justo y guerrero confiable en la comunidad de SAO...'},
            lisbeth: { name: 'Lisbeth (リズベット)', role: 'Herrera / Domadora de Mazas', icon: '🛠️', description: 'Rika Shinozaki, o Lisbeth, es una talentosa herrera y amiga cercana de Asuna. Es conocida por su habilidad para forjar armas de alta calidad, incluyendo la Dark Repulser de Kirito. Es alegre y decidida.', fullInfo: 'Sus desafíos como herrera, su aventura para encontrar un metal raro y su amistad...'},
            silica: { name: 'Silica (シリカ)', role: 'Domadora de Bestias', icon: '🐉', description: 'Keiko Ayano, o Silica, es una joven jugadora de nivel medio conocida como "Domadora de Bestias" por su compañero dragón de plumas, Pina. Es una de las pocas jugadoras que logró domesticar una bestia en SAO.', fullInfo: 'Su encuentro con Kirito, la pérdida y recuperación de Pina, y su crecimiento como jugadora...'},
            heathcliff: { name: 'Heathcliff (ヒースクリフ)', role: 'Líder de los KoB / ¿?', icon: '🛡️✝️', description: 'El comandante de los Caballeros de la Sangre, el gremio más fuerte de SAO. Conocido por su increíble defensa con su set de espada y escudo único, se dice que es el jugador más fuerte. Su verdadera identidad es uno de los mayores misterios de Aincrad.', fullInfo: 'Su liderazgo, sus habilidades legendarias y la impactante verdad detrás de su personaje...'}
        };
        const wikiWeaponData = { 
            elucidator: { name: 'Elucidator', type: 'Espada Recta (Una Mano)', icon: '⚫', stats: "ATK: 700-710, DUR: 1350", description: 'Una espada demoníaca obtenida como drop de un jefe de piso. Es el arma principal de Kirito, de color negro obsidiana. Es una de las pocas armas de "calidad divina" en SAO.', fullInfo: 'Forjada de un cristal de alta densidad, es increíblemente afilada y resistente...'},
            dark_repulser: { name: 'Dark Repulser', type: 'Espada Recta (Una Mano)', icon: '🟢', stats: "ATK: 680-700, DUR: 1200", description: 'Forjada por Lisbeth usando un lingote de Crystallite, obtenido de la fosa de un dragón. De color aguamarina, es la segunda espada de Kirito, usada en su habilidad de Doble Empuñadura.', fullInfo: 'Su creación fue una aventura peligrosa, y es un testimonio de la habilidad de Lisbeth...'},
            lambent_light: { name: 'Lambent Light', type: 'Estoque', icon: '✨', stats: "VEL: +50, ATK: 650-670", description: 'El estoque personal de Asuna, conocido por su increíble velocidad de ataque. Es un arma elegante y mortal, perfecta para su estilo de combate "Destello Veloz".', fullInfo: 'Un arma ligera pero poderosa, que permite a Asuna desatar una ráfaga de ataques precisos...'},
            anneal_blade: { name: 'Anneal Blade', type: 'Espada Recta (Una Mano)', icon: '🗡️', stats: "ATK: +8 (Mejorada +6)", description: 'La primera espada decente que Kirito obtiene y mejora. Aunque no es legendaria, representa sus primeros pasos y luchas en Aincrad.', fullInfo: 'Un ejemplo de cómo los jugadores mejoraban su equipo en los primeros pisos...'},
            liberator: { name: 'Liberator', type: 'Escudo y Espada', icon: '🛡️⚔️', description: 'El set de arma y escudo único de Heathcliff. El escudo presume de una defensa casi impenetrable, y la espada es igualmente formidable. Juntos, lo convierten en una fortaleza inexpugnable.', fullInfo: 'Este equipo es central para la identidad de Heathcliff como el jugador más fuerte...'}
        };
        const wikiFloorsData = { 
            f1: {name: "Piso 1: Ciudad del Inicio", icon: '🏙️', description: "El punto de partida para todos los jugadores, un vasto campo con bosques y la ciudad principal, Tolbana. Aquí Akihiko Kayaba anunció el inicio del juego mortal. El jefe es Illfang el Señor Kóbold.", details: "Contiene áreas de tutoriales, tiendas básicas y monstruos de bajo nivel como Lobos Frenéticos y Jabalíes Agresivos."},
            f22: {name: "Piso 22: Coral", icon: '🌲🏡', description: "Un piso tranquilo y boscoso con muchos lagos. Es conocido por ser el lugar donde Kirito y Asuna compraron una cabaña y vivieron juntos por un tiempo, disfrutando de una paz momentánea y pescando.", details: "El pueblo principal es Coral. Un piso relativamente seguro, popular para actividades recreativas."},
            f50: {name: "Piso 50: Algade", icon: '🛍️<0xF0><0x9F><0xAA><0x96>', description: "Una ciudad importante con un gran mercado y la tienda de Agil. Es un centro neurálgico para jugadores de nivel medio, donde se comercian bienes y se forma información.", details: "Algade es conocida por su arquitectura distintiva y su bulliciosa actividad comercial."},
            f74: {name: "Piso 74: Kamde", icon: '👹🐐', description: "Un piso laberíntico y peligroso. El jefe de este piso es The Gleam Eyes, un demonio azul con forma de cabra y una gran espada, uno de los jefes más temibles hasta ese momento.", details: "La batalla contra The Gleam Eyes fue un punto de inflexión, donde Kirito reveló por primera vez su habilidad de Doble Empuñadura a gran escala."},
            f75: {name: "Piso 75: Collinia", icon: '💀⚔️', description: "La sala del jefe de este piso, The Skull Reaper, es una de las más difíciles y mortales. Aquí tuvo lugar una batalla crucial donde se reveló la identidad de Heathcliff.", details: "The Skull Reaper es un jefe insectoide gigante con múltiples guadañas, capaz de aniquilar a grupos enteros. La batalla resultó en numerosas bajas."},
            f100: {name: "Piso 100: Palacio de Rubí", icon: '👑 Ruby Palace', description: "El piso final de Aincrad, donde reside el jefe final del juego. Conquistarlo significa la liberación de todos los jugadores atrapados.", details: "Pocos han llegado a vislumbrar este piso. Su diseño y el jefe final son el último gran desafío de SAO."}
        };
        const wikiGuildsData = { 
            kob: {name: "Caballeros de la Sangre (KoB)", icon: '🛡️✝️', description: "El gremio más poderoso y líder en la limpieza de pisos, comandado por Heathcliff. Asuna era su subcomandante. Su objetivo era completar el juego lo más rápido posible, imponiendo un orden estricto.", details: "Vestidos de blanco y rojo, eran la fuerza de vanguardia principal. Unirse requería habilidad excepcional."},
            lc: {name: "Ataúd Risueño (Laughing Coffin)", icon: '💀😈', description: "Un infame gremio de jugadores asesinos (PKers) que disfrutaban matando a otros jugadores. Eran temidos por su crueldad y tácticas sádicas. Liderados por PoH.", details: "Se especializaban en emboscadas y tortura, marcando a sus víctimas con el símbolo de un ataúd sonriente. Fueron el principal antagonista interno para muchos jugadores."},
            fuurinkazan: {name: "Fuurinkazan", icon: '🔥🌲⛰️', description: "Un gremio amigable y de tamaño mediano liderado por Klein. Se enfocaban en apoyarse mutuamente, sobrevivir y disfrutar del juego dentro de lo posible. Su nombre proviene del estandarte de Takeda Shingen.", details: "Conocidos por su camaradería y por ayudar a otros jugadores siempre que podían. Un ejemplo de gremio positivo."},
            als: {name: "Armada de Liberación de Aincrad (ALA)", icon: '🎖️', description: "Originalmente llamado Ejército de Aincrad. Un gran gremio que intentó imponer su propia ley y orden, pero a menudo eran vistos como ineficientes o corruptos. Liderados por Kibaou y luego por Thinker.", details: "Su objetivo era controlar los recursos y la información, pero sus métodos y liderazgo a menudo causaban conflictos con otros jugadores y gremios."}
        };

        function loadWikiContent() { 
            // Render characters as DOM nodes and wire listeners (no inline onclick)
            charactersGridDisplay.innerHTML = '';
            Object.entries(wikiCharacterData).forEach(([id, char]) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.innerHTML = `
                    <div class="card-avatar" style="font-size: ${char.icon.length > 2 ? '2.5rem' : '3.5rem'};">${char.icon}</div>
                    <h3 class="card-name">${char.name}</h3>
                    <p class="card-subtitle">${char.role}</p>
                    <p class="card-description">${char.description}</p>
                `;
                card.addEventListener('click', () => showWikiInfo('character', id));
                card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showWikiInfo('character', id); } });
                charactersGridDisplay.appendChild(card);
            });
            weaponsGridDisplay.innerHTML = '';
            Object.entries(wikiWeaponData).forEach(([id, wpn]) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.innerHTML = `
                    <div class="card-icon" style="font-size: ${wpn.icon.length > 2 ? '3rem' : '4.5rem'};">${wpn.icon}</div>
                    <h3 class="card-name">${wpn.name}</h3>
                    <p class="card-subtitle">${wpn.type}</p>
                    <div class="weapon-stats"><span>${wpn.stats}</span></div>
                    <p class="card-description" style="font-size:0.9em; margin-top:10px;">${wpn.description}</p>
                `;
                card.addEventListener('click', () => showWikiInfo('weapon', id));
                card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showWikiInfo('weapon', id); } });
                weaponsGridDisplay.appendChild(card);
            });
            floorsInfoContainer.innerHTML = `<p style="text-align:center; margin-bottom:2rem;">Aincrad, el castillo flotante, consta de 100 pisos, cada uno con sus propios paisajes, ciudades, monstruos y un temible jefe que guarda el acceso al siguiente nivel. Superar cada piso es un logro monumental para los jugadores atrapados.</p>` + 
            '<div class="card-grid">' + Object.entries(wikiFloorsData).map(([id, floor]) => `
                <div class="card" style="cursor:default;">
                    <div class="card-icon" style="font-size: ${floor.icon.length > 2 ? '3rem' : '4.5rem'};">${floor.icon}</div>
                    <h3 class="card-name">${floor.name}</h3>
                    <p class="card-description"><strong>Descripción:</strong> ${floor.description}</p>
                    <p class="card-description" style="margin-top:0.5rem;"><strong>Detalles:</strong> ${floor.details}</p>
                </div>
            `).join('') + '</div>';
            guildsInfoContainer.innerHTML = `<p style="text-align:center; margin-bottom:2rem;">Los gremios juegan un papel vital en SAO, desde grupos de limpieza de vanguardia hasta facciones con oscuros propósitos. La cooperación y la traición son comunes.</p>` +
            '<div class="card-grid">' + Object.entries(wikiGuildsData).map(([id, guild]) => `
                <div class="card" style="cursor:default;">
                    <div class="card-icon" style="font-size: ${guild.icon.length > 2 ? '3rem' : '4.5rem'};">${guild.icon}</div>
                    <h3 class="card-name">${guild.name}</h3>
                    <p class="card-subtitle">${guild.description}</p>
                    <p class="card-description" style="margin-top:0.5rem;"><strong>Detalles:</strong> ${guild.details}</p>
                </div>
            `).join('') + '</div>';
        }
        function showWikiInfo(type, id) { 
            let data;
            if (type === 'character') data = wikiCharacterData[id];
            else if (type === 'weapon') data = wikiWeaponData[id];
            if (data) {
                modalBodyContentElement.innerHTML = `
                    <span class="modal-icon" style="font-size: ${data.icon.length > 2 ? '3.5rem' : '5rem'};">${data.icon}</span>
                    <h2>${data.name}</h2>
                    ${data.role ? `<p><strong>Rol:</strong> ${data.role}</p>` : ''}
                    ${data.type ? `<p><strong>Tipo:</strong> ${data.type}</p>` : ''}
                    ${data.stats ? `<p><strong>Stats Clave:</strong> ${data.stats}</p>` : ''}
                    <p style="margin-top:1rem;">${data.description}</p>
                    ${data.fullInfo ? `<p style="margin-top:0.5rem; font-style:italic; color:#b0c4de;">${data.fullInfo}</p>` : ''}
                `;
                openModal('infoModal');
            }
        }


        // ===============================================
        //           GUARDAR/CARGAR/REINICIAR 
        // ===============================================
        function saveGame() {
            try {
                const playerSaveData = {
                    name: player.name, 
                    level: player.level, currentExp: player.currentExp, neededExp: player.neededExp,
                    hp: player.hp, baseMaxHp: player.baseMaxHp, mp: player.mp, baseMaxMp: player.baseMaxMp,
                    baseAttack: player.baseAttack, baseDefense: player.baseDefense,
                    col: player.col, currentFloor: player.currentFloor,
                    unlockedFloors: player.unlockedFloors, 
                    inventory: player.inventory, equipment: player.equipment,
                    skills: player.skills.map(s => ({id: s.id})),
                    passiveSkills: player.passiveSkills.map(s => ({id: s.id})), 
                    materials: player.materials,
                    isAdmin: player.isAdmin // Guardar estado de admin
                };
                localStorage.setItem('saoAincradChroniclesSave_v4', JSON.stringify(playerSaveData)); // v4 por el isAdmin
                showNotification('¡Progreso guardado!', 'success', 2000);
            } catch (e) {
                showNotification('Error al guardar: ' + e.message, 'error');
                console.error("Error al guardar:", e);
            }
        }

        function loadGame() {
            try {
                const savedState = localStorage.getItem('saoAincradChroniclesSave_v4'); 
                if (savedState) {
                    const loadedData = JSON.parse(savedState);
                    
                    player.name = loadedData.name || ""; 
                    player.level = loadedData.level || 1;
                    player.currentExp = loadedData.currentExp || 0;
                    player.neededExp = loadedData.neededExp || calculateNeededExpForLevel(player.level); // Recalcular si no está
                    player.baseMaxHp = loadedData.baseMaxHp || 100;
                    player.baseMaxMp = loadedData.baseMaxMp || 50;
                    player.hp = loadedData.hp !== undefined ? loadedData.hp : player.baseMaxHp;
                    player.mp = loadedData.mp !== undefined ? loadedData.mp : player.baseMaxMp;
                    player.baseAttack = loadedData.baseAttack || 5;
                    player.baseDefense = loadedData.baseDefense || 2;
                    player.col = loadedData.col || 100;
                    player.currentFloor = loadedData.currentFloor || 1;
                    player.unlockedFloors = loadedData.unlockedFloors || [1]; 
                    player.inventory = loadedData.inventory || [];
                    player.equipment = loadedData.equipment || { weapon: null, shield: null, armor: null, accessory: null };
                    player.materials = loadedData.materials || {};
                    player.isAdmin = loadedData.isAdmin || false; // Cargar estado de admin
                    // Normalizar instancias (uids, stats, niveles)
                    normalizePlayerItems();
                    
                    player.skills = []; 
                    if (loadedData.skills && Array.isArray(loadedData.skills)) {
                        loadedData.skills.forEach(skillRef => {
                            if (skillData[skillRef.id]) {
                                player.skills.push({ id: skillRef.id, ...skillData[skillRef.id] });
                            }
                        });
                    }
                    if (player.skills.length === 0 && skillData['quick_slash']) {
                         player.skills.push({ id: 'quick_slash', ...skillData['quick_slash'] });
                    }

                    player.passiveSkills = []; 
                    if (loadedData.passiveSkills && Array.isArray(loadedData.passiveSkills)) {
                        loadedData.passiveSkills.forEach(pSkillRef => {
                            if (passiveSkillData[pSkillRef.id]) {
                                player.passiveSkills.push({ id: pSkillRef.id, ...passiveSkillData[pSkillRef.id] });
                            }
                        });
                    }

                    Object.keys(floorData).forEach(floorNumStr => {
                        const floorNum = parseInt(floorNumStr);
                        if (floorData[floorNum]) { // Asegurarse que el piso existe en floorData
                           floorData[floorNum].unlocked = player.unlockedFloors.includes(floorNum);
                        }
                    });


                    if (!player.name) { 
                        promptForPlayerName();
                    } else {
                        calculateEffectiveStats(); 
                        updatePlayerHUD();
                        renderEquipment(); 
                        showNotification('¡Progreso cargado!', 'success');
                        disableGameActions(player.hp <= 0); 
                    }
                } else {
                    showNotification('No se encontró progreso guardado. Empezando nueva partida.', 'default');
                    initializeNewPlayer(true); 
                }
            } catch (e) {
                showNotification('Error al cargar el progreso: ' + e.message + '. Se iniciará una nueva partida.', 'error');
                console.error("Error al cargar:", e);
                localStorage.removeItem('saoAincradChroniclesSave_v4'); 
                initializeNewPlayer(true);
            }
        }
        
        function initializeNewPlayer(promptName = false) { 
            player = {
                name: "", level: 1, currentExp: 0, neededExp: 100,
                hp: 100, baseMaxHp: 100, mp: 50, baseMaxMp: 50,
                baseAttack: 5, baseDefense: 2,
                col: 1000, currentFloor: 1,
                unlockedFloors: [1], 
                inventory: [
                    { id: 'healing_potion_s', count: 5 }, { id: 'mana_potion_s', count: 3 },
                    { id: 'basic_sword', count: 1 }
                ].map(itemRef => ({ ...baseItems[itemRef.id], ...itemRef, id: itemRef.id })), 
                equipment: { weapon: null, shield: null, armor: null, accessory: null },
                skills: [
                    { id: 'quick_slash', ...skillData['quick_slash'] },
                    { id: 'special_strike', ...skillData['special_strike'] },
                    { id: 'basic_guard', ...skillData['basic_guard'] }
                ],
                passiveSkills: [], 
                materials: { 'raw_hide': 10, 'iron_ore': 5, 'kobold_fang': 0, 'silver_ingot': 0, 'blue_crystal': 0, 'obsidian_shard': 0, 'dragon_scale': 0, 'divine_fragment': 0 },
                activeStatusEffects: [],
                lastCombatAction: null,
                attackComboCount: 0,
                isAdmin: false // Reiniciar estado de admin
            };
            
            Object.keys(floorData).forEach(floorNumStr => {
                const floorNum = parseInt(floorNumStr);
                 if (floorData[floorNum]) {
                    floorData[floorNum].unlocked = (floorNum === 1);
                 }
            });

            if (promptName) {
                promptForPlayerName();
            } else {
                // Normalize created inventory instances
                normalizePlayerItems();
                calculateEffectiveStats();
                updatePlayerHUD();
                renderEquipment();
            }
        }

        function promptForPlayerName() {
            openModal('nameEntryModal');
            playerNameInputElement.value = player.name || ""; 
            playerNameInputElement.focus();
        }

        submitPlayerNameBtn.onclick = () => {
            const name = playerNameInputElement.value.trim();
            if (name && name.length > 0 && name.length <= 15 && /^[a-zA-Z0-9\s]+$/.test(name)) {
                player.name = name;
                closeModal('nameEntryModal');
                showNotification(`¡Nombre establecido como ${player.name}!`, "success");
                
                if (!player.equipment.weapon) {
                    const basicInstance = player.inventory.find(i => i.id === 'basic_sword');
                    if (basicInstance) {
                        equipItemByUid(basicInstance.uid);
                    }
                }
                
                calculateEffectiveStats();
                updatePlayerHUD();
                renderEquipment(); 
                saveGame(); 
            } else {
                showNotification("Nombre inválido. Usa 1-15 letras/números.", "error");
                playerNameInputElement.focus();
            }
        };


        function confirmResetProgress() {
            modalBodyContentElement.innerHTML = '';
            const h2 = document.createElement('h2'); h2.textContent = 'Confirmar Reinicio';
            const p = document.createElement('p'); p.textContent = '¿Estás seguro de que quieres iniciar un nuevo personaje? Todo tu progreso actual (incluyendo guardado local) se perderá.';
            const actionsDiv = document.createElement('div'); actionsDiv.className = 'action-buttons'; actionsDiv.style.marginTop = '1.5rem';
            const yesBtn = document.createElement('button'); yesBtn.className = 'action-btn'; yesBtn.textContent = 'Sí, Reiniciar';
            yesBtn.addEventListener('click', executeReset);
            const cancelBtn = document.createElement('button'); cancelBtn.className = 'action-btn'; cancelBtn.textContent = 'Cancelar';
            cancelBtn.addEventListener('click', () => closeModal('infoModal'));
            actionsDiv.appendChild(yesBtn); actionsDiv.appendChild(cancelBtn);
            modalBodyContentElement.appendChild(h2); modalBodyContentElement.appendChild(p); modalBodyContentElement.appendChild(actionsDiv);
            openModal('infoModal');
        }

        function executeReset() {
            localStorage.removeItem('saoAincradChroniclesSave_v4'); 
            initializeNewPlayer(true); 
            closeModal('infoModal');
            showNotification('¡Nuevo personaje creado! Tu aventura comienza.', 'success', 6000);
            disableGameActions(false); 
        }

        // ===============================================
        //           PANEL DE ADMINISTRADOR
        // ===============================================
        function openAdminLoginModal() {
            if (player.isAdmin) {
                openAdminPanel();
            } else {
                openModal('adminKeyModal');
            }
        }

        function checkAdminKey() {
            const enteredKey = adminKeyValueInput.value || '';
            // Requerimos que ADMIN_SECRET_HASH esté configurado para la verificación.
            if (!ADMIN_SECRET_HASH) {
                console.error('ADMIN_SECRET_HASH no configurado. No se permite verificación insegura en cliente.');
                showNotification('Administración desactivada (configuración insegura).', 'error');
                return;
            }

            const lockState = readAdminLockState();
            if (lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
                const remaining = Math.ceil((lockState.lockedUntil - Date.now()) / 1000);
                adminKeyErrorMsg.textContent = `Bloqueado por intentos fallidos. Intenta en ${remaining}s.`;
                adminKeyErrorMsg.style.display = 'block';
                showNotification('Acceso temporalmente bloqueado.', 'error');
                return;
            }

            sha256Hex(enteredKey).then(hex => {
                if (hex === ADMIN_SECRET_HASH) {
                    player.isAdmin = true;
                    saveGame();
                    closeModal('adminKeyModal');
                    openAdminPanel();
                    showNotification('Acceso Concedido ⚔️', 'success');
                    showAdminPanelMessage('Acceso de administrador concedido.', 'success');
                    recordAdminAttempt(true);
                } else {
                    const newState = recordAdminAttempt(false);
                    adminKeyErrorMsg.textContent = 'Clave incorrecta.';
                    adminKeyErrorMsg.style.display = 'block';
                    adminKeyValueInput.value = '';
                    if (newState.lockedUntil && Date.now() < newState.lockedUntil) {
                        showNotification('Demasiados intentos. Bloqueo temporal activado.', 'error');
                    } else {
                        showNotification('Acceso Denegado', 'error');
                    }
                }
            }).catch(err => {
                console.error('Error al calcular hash:', err);
                showNotification('Error interno. Intenta de nuevo.', 'error');
            });
        }

        function populateAdminPanel() {
            // Llenar campos con datos actuales del jugador
            adminSetLevelValueInput.value = player.level;
            adminGiveExpValueInput.value = 0;
            adminGiveColValueInput.value = 0;
            adminSetBaseAtkValueInput.value = player.baseAttack;
            adminSetBaseDefValueInput.value = player.baseDefense;
            adminSetBaseMaxHpValueInput.value = player.baseMaxHp;
            adminSetBaseMaxMpValueInput.value = player.baseMaxMp;
            adminItemIdValueInput.value = '';
            adminItemQuantityValueInput.value = 1;
            adminFloorNumberValueInput.value = player.currentFloor;
            adminItemDetailsPreviewDiv.textContent = 'Detalles del item aparecerán aquí...';

            // Llenar select de items
            adminItemQuickSelect.innerHTML = '';
            Object.keys(baseItems).sort().forEach(itemId => {
                const option = document.createElement('option');
                option.value = itemId;
                option.textContent = `${baseItems[itemId].name} (${itemId})`;
                adminItemQuickSelect.appendChild(option);
            });

            // Llenar lista de pisos desbloqueados
            updateAdminUnlockedFloorsList();
        }
        
        function updateAdminUnlockedFloorsList() {
            adminUnlockedFloorsListDiv.innerHTML = player.unlockedFloors.sort((a, b) => a - b).join(', ') || "Ninguno (excepto Piso 1)";
        }

        function openAdminPanel() {
            if (!player.isAdmin) {
                showNotification("No tienes acceso de administrador.", "error");
                return;
            }
            openModal('adminPanelModal'); // populateAdminPanel se llama desde openModal
        }

        function showAdminPanelMessage(message, type = "default") {
            adminPanelMessage.textContent = message;
            adminPanelMessage.style.color = type === "success" ? "#5cb85c" : (type === "error" ? "#d9534f" : "#87CEEB");
            adminPanelMessage.style.display = 'block';
            setTimeout(() => {
                adminPanelMessage.style.display = 'none';
            }, 5000);
        }

        const adminActions = {
            giveItem: () => {
                const itemId = adminItemIdValueInput.value.trim();
                const quantity = parseInt(adminItemQuantityValueInput.value) || 1;
                if (!baseItems[itemId]) {
                    showAdminPanelMessage(`Error: Item ID '${itemId}' no encontrado.`, "error");
                    return;
                }
                if (quantity < 1) {
                     showAdminPanelMessage(`Error: La cantidad debe ser al menos 1.`, "error");
                    return;
                }

                const itemBase = baseItems[itemId];
                if (itemBase.type === 'material') {
                    addMaterial(itemId, quantity);
                } else {
                    addItemToInventory({ id: itemId }, quantity); // addItemToInventory maneja la lógica de apilamiento
                }
                
                showAdminPanelMessage(`${quantity} x ${itemBase.name} (${itemId}) añadido(s) al inventario.`, "success");
                if (inventoryModalElement.style.display === 'block') renderInventory();
                saveGame();
            },
            showItemDetails: () => {
                const itemId = adminItemIdValueInput.value.trim();
                const itemBase = baseItems[itemId];
                if (itemBase) {
                    let details = `Nombre: ${itemBase.name} ${itemBase.icon}\nTipo: ${itemBase.type}\nDescripción: ${itemBase.description}`;
                    if(itemBase.stats) {
                        details += `\nStats: ATK:${itemBase.stats.attack || 0}, DEF:${itemBase.stats.defense || 0}, HP:${itemBase.stats.hp || 0}, MP:${itemBase.stats.mp || 0}`;
                    }
                    if(itemBase.effect) {
                        details += `\nEfecto: ${JSON.stringify(itemBase.effect)}`;
                    }
                     if(itemBase.levelReq) {
                        details += `\nReq. LV: ${itemBase.levelReq}`;
                    }
                    adminItemDetailsPreviewDiv.textContent = details.replace(/\n/g, '<br>'); // Usar <br> para saltos de línea en HTML
                } else {
                    adminItemDetailsPreviewDiv.textContent = `Item ID '${itemId}' no encontrado.`;
                }
            },
            selectItemFromList: () => {
                const selectedItemId = adminItemQuickSelect.value;
                if (selectedItemId) {
                    adminItemIdValueInput.value = selectedItemId;
                    adminActions.showItemDetails();
                }
            },
            giveCol: () => {
                const amount = parseInt(adminGiveColValueInput.value);
                if (isNaN(amount) || amount < 0) {
                    showAdminPanelMessage("Cantidad de Col inválida.", "error");
                    return;
                }
                player.col += amount;
                updatePlayerHUD();
                saveGame();
                showAdminPanelMessage(`${amount} Col añadidos. Total: ${player.col}.`, "success");
            },
            giveExp: () => {
                const amount = parseInt(adminGiveExpValueInput.value);
                 if (isNaN(amount) || amount < 0) {
                    showAdminPanelMessage("Cantidad de EXP inválida.", "error");
                    return;
                }
                gainExp(amount); // gainExp maneja level ups y HUD
                saveGame();
                showAdminPanelMessage(`${amount} EXP añadidos.`, "success");
            },
            setLevel: () => {
                const newLevel = parseInt(adminSetLevelValueInput.value);
                if (isNaN(newLevel) || newLevel < 1) {
                    showAdminPanelMessage("Nivel inválido.", "error");
                    return;
                }
                player.level = newLevel;
                player.currentExp = 0;
                player.neededExp = calculateNeededExpForLevel(newLevel);
                // Opcional: ajustar stats base aquí o dejar que el admin lo haga manualmente
                updatePlayerHUD();
                saveGame();
                showAdminPanelMessage(`Nivel establecido a ${newLevel}.`, "success");
            },
            setStat: (statName, inputId) => {
                const value = parseInt(document.getElementById(inputId).value);
                 if (isNaN(value) || value < (statName.includes('MaxHp') ? 1 : 0) ) { // HP Máx no puede ser 0
                    showAdminPanelMessage(`Valor inválido para ${statName}.`, "error");
                    return;
                }
                player[statName] = value;

                if (statName === 'baseMaxHp') {
                    const oldMaxHp = player.maxHp; // Guardar maxHp antes de recalcular
                    calculateEffectiveStats(); // Actualiza player.maxHp
                    if (player.hp > player.maxHp) player.hp = player.maxHp;
                    // Opcional: curar la diferencia si el nuevo maxHp es mayor
                    // else if (player.maxHp > oldMaxHp) player.hp = Math.min(player.hp + (player.maxHp - oldMaxHp), player.maxHp);
                } else if (statName === 'baseMaxMp') {
                    const oldMaxMp = player.maxMp;
                    calculateEffectiveStats(); // Actualiza player.maxMp
                    if (player.mp > player.maxMp) player.mp = player.maxMp;
                    // else if (player.maxMp > oldMaxMp) player.mp = Math.min(player.mp + (player.maxMp - oldMaxMp), player.maxMp);
                } else {
                    calculateEffectiveStats();
                }
                
                updatePlayerHUD();
                saveGame();
                showAdminPanelMessage(`${statName} establecido a ${value}.`, "success");
            },
            grantFloorAccess: () => {
                const floorNumber = parseInt(adminFloorNumberValueInput.value);
                if (isNaN(floorNumber) || floorNumber < 1 || !floorData[floorNumber]) {
                    showAdminPanelMessage("Número de piso inválido o no existente.", "error");
                    return;
                }
                if (!player.unlockedFloors.includes(floorNumber)) {
                    player.unlockedFloors.push(floorNumber);
                    floorData[floorNumber].unlocked = true;
                    updateAdminUnlockedFloorsList();
                    saveGame();
                    showAdminPanelMessage(`Acceso concedido al Piso ${floorNumber}.`, "success");
                } else {
                    showAdminPanelMessage(`El Piso ${floorNumber} ya estaba desbloqueado.`, "default");
                }
            },
            revokeFloorAccess: () => {
                const floorNumber = parseInt(adminFloorNumberValueInput.value);
                 if (isNaN(floorNumber) || floorNumber < 1 || !floorData[floorNumber]) {
                    showAdminPanelMessage("Número de piso inválido o no existente.", "error");
                    return;
                }
                if (floorNumber === 1) {
                    showAdminPanelMessage("No se puede revocar el acceso al Piso 1.", "error");
                    return;
                }
                const index = player.unlockedFloors.indexOf(floorNumber);
                if (index > -1) {
                    player.unlockedFloors.splice(index, 1);
                    if (floorData[floorNumber]) floorData[floorNumber].unlocked = false;
                    updateAdminUnlockedFloorsList();
                    if (player.currentFloor === floorNumber) { // Si el jugador estaba en ese piso, moverlo al piso 1
                        player.currentFloor = 1;
                        updatePlayerHUD();
                        showAdminPanelMessage(`Acceso revocado al Piso ${floorNumber}. Has sido movido al Piso 1.`, "success");
                    } else {
                        showAdminPanelMessage(`Acceso revocado al Piso ${floorNumber}.`, "success");
                    }
                    saveGame();
                } else {
                    showAdminPanelMessage(`El Piso ${floorNumber} no estaba desbloqueado.`, "default");
                }
            }
        };


        // ===============================================
        //           PARTÍCULAS FLOTANTES (Estético) 
        // ===============================================
        const particleStyle = document.createElement('style');
        particleStyle.textContent = `
            .floating-particles { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1; overflow: hidden; }
            .particle { position: absolute; opacity: 0; color: rgba(135, 206, 235, 0.5); user-select: none; }
            @keyframes float {
                0% { transform: translateY(105vh) rotate(0deg) scale(0.5); opacity: 0; }
                10%, 90% { opacity: 1; transform: scale(1); }
                100% { transform: translateY(-10vh) rotate(720deg) scale(0.5); opacity: 0; }
            }`;
        document.head.appendChild(particleStyle);
        function createParticles() { 
            const container = document.getElementById('particles');
            if (!container) return;
            container.innerHTML = ''; 
            const SAO_PARTICLES = ['⚔️', '🛡️', '💎', '🌐', '✨', '🌀', '🗝️', '💾', '🎮', '💠'];
            const numParticles = Math.min(30, Math.floor(window.innerWidth / 50)); 
            for (let i = 0; i < numParticles; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.innerHTML = SAO_PARTICLES[Math.floor(Math.random() * SAO_PARTICLES.length)];
                p.style.left = Math.random() * 100 + 'vw';
                p.style.fontSize = (Math.random() * 1.0 + 0.7) + 'rem'; 
                const duration = Math.random() * 25 + 20; 
                const delay = Math.random() * 30;
                p.style.animation = `float ${duration}s linear ${delay}s infinite`;
                container.appendChild(p);
            }
        }
        
        function setActiveLink(selectedLink) {
            document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
            selectedLink.classList.add('active');
        }


        // ===============================================
        //           INICIALIZACIÓN DEL JUEGO
        // ===============================================
        document.addEventListener('DOMContentLoaded', () => {
            combatBtn.onclick = () => initCombat(false); // Ahora llama a la nueva initCombat que abre el modal de selección
            bossCombatBtn.onclick = () => initCombat(true);   // Ahora llama a la nueva initCombat que abre el modal de selección
            trainSkillBtn.onclick = () => openTrainingModal(); 
            inventoryBtn.onclick = () => openModal('inventoryModal');
            shopBtn.onclick = () => openModal('shopModal');
            blacksmithBtn.onclick = () => openBlacksmithMain();
            playerStatsBtn.onclick = () => openModal('playerStatsModal');
            adminAccessBtn.onclick = openAdminLoginModal; // Listener para el botón de admin
            submitAdminKeyBtn.onclick = checkAdminKey; // Listener para el botón de enviar clave admin

            // Quick combat action buttons (if present)
            const quickSpecialBtn = document.getElementById('combat-action-skill-quick');
            const quickDefBtn = document.getElementById('combat-action-defensive-quick');
            if (quickSpecialBtn) quickSpecialBtn.addEventListener('click', () => {
                if (!currentCombat.active || !currentCombat.playerTurn) return;
                // choose highest damage attack skill affordable
                const availableAttacks = player.skills.filter(s => s.type === 'attack' && player.level >= (s.levelReq||0));
                availableAttacks.sort((a,b)=> (b.damageMultiplier||0)-(a.damageMultiplier||0));
                const choice = availableAttacks.find(s => Math.max(0, Math.floor(s.mpCost*(1-player.tempMpCostReduction))) <= player.mp);
                if (choice) usePlayerSkill(choice.id);
                else addCombatLog('No tienes MP para usar una habilidad especial.', 'system-message');
            });
            if (quickDefBtn) quickDefBtn.addEventListener('click', () => {
                if (!currentCombat.active || !currentCombat.playerTurn) return;
                const defs = player.skills.filter(s => s.type === 'defensive' && player.level >= (s.levelReq||0));
                if (defs.length>0) usePlayerSkill(defs[0].id);
                else addCombatLog('No tienes una habilidad defensiva equipada.', 'system-message');
            });

            loadGame(); 
            loadWikiContent();
            createParticles();
            
            document.querySelector('.nav-links a[href="#game-panel"]')?.classList.add('active');
        });

document.addEventListener('DOMContentLoaded', () => {

    // 1. Desplazamiento Suave General (incluyendo ahora el logo 'AINCRAD')
    // Este selector ahora incluye:
    // - 'a[href^="#"]': cualquier enlace que empiece con # (como #wiki-personajes, #top, etc.)
    // - '.logo-link': la clase específica que le dimos al enlace del logo.
    document.querySelectorAll('a[href^="#"], .logo-link').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Asegúrate de que el enlace es interno (empieza con '#')
            // y que no se trate de algún otro tipo de enlace que no queremos interceptar.
            const href = this.getAttribute('href');
            if (!href || !href.startsWith('#')) {
                return; // Si no es un hash o no tiene href, no hacemos nada
            }

            e.preventDefault(); // ¡Esto es clave! Previene el salto instantáneo por defecto del navegador.

            const targetId = href;
            // Si el href es solo '#', asumimos que es para ir al top del documento.
            // Si tu ID para el top es '#top', entonces targetId ya funcionará.
            // Si no tienes un ID específico para el top, puedes apuntar al body o html.
            const targetElement = (targetId === '#' || targetId === '#top') ? document.body : document.querySelector(targetId);

            if (targetElement) {
                const header = document.querySelector('header');
                const headerOffset = header ? header.offsetHeight : 0; // Obtiene la altura del header, o 0 si no lo encuentra

                // Calcula la posición del elemento al que queremos ir.
                // Si es el top, la posición es 0. Si no, la posición del elemento.
                const elementPosition = (targetId === '#' || targetId === '#top') ? 0 : targetElement.getBoundingClientRect().top + window.pageYOffset;

                // Ajusta la posición para que el header fijo no tape el contenido.
                // El '- 20' es un margen adicional para que no quede pegado.
                const offsetPosition = elementPosition - headerOffset - 20;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth' // ¡Aquí está la magia del scroll suave!
                });

                // Llama a setActiveLink solo si el enlace tiene la clase 'nav-link'
                // Esto es para que el logo no se marque como 'active'
                if (this.classList.contains('nav-link') && typeof setActiveLink === 'function') {
                    setActiveLink(this);
                } else if (this.classList.contains('logo-link')) {
                    // Si el logo-link es clicado, y tienes setActiveLink para limpiar otros,
                    // puedes llamarlo aquí para que desactive cualquier otro enlace 'active'.
                    if (typeof setActiveLink === 'function') {
                         document.querySelectorAll('.nav-links a').forEach(link => {
                            link.classList.remove('active');
                        });
                    }
                }
            }
        });
    });

    // 1. Declaración ÚNICA de headerElement y toggleHeaderBtn
    const headerElement = document.querySelector('header'); // Declara aquí UNA SOLA VEZ
    const toggleHeaderBtn = document.getElementById('toggle-header-btn');

    // 2. Funcionalidad de Ocultar/Mostrar Header
    // Ya no necesitas redeclarar headerElement aquí
    if (toggleHeaderBtn && headerElement) { // Asegúrate de que ambos elementos existan
        toggleHeaderBtn.addEventListener('click', () => {
            headerElement.classList.toggle('hidden'); // Agrega/quita la clase 'hidden' al header
            toggleHeaderBtn.classList.toggle('header-hidden'); // Agrega/quita la clase al botón para girar la flecha
        });
    }

    // 4. Función para las Partículas
    // NO redeclares headerElement aquí, ya lo declaraste arriba
     let particlesContainer;
    if (headerElement) { // Reutiliza la variable ya declarada
        particlesContainer = document.createElement('div');
        particlesContainer.classList.add('header-particles-container');
        // Usamos appendChild en lugar de prepend para que el z-index funcione mejor
        headerElement.appendChild(particlesContainer);
    }

        function createParticle() {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particlesContainer.appendChild(particle);

            // Posición aleatoria dentro del header
            const x = Math.random() * headerElement.offsetWidth;
            const y = Math.random() * headerElement.offsetHeight;
            const size = Math.random() * 3 + 1; // Tamaño de 1px a 4px

            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            particle.addEventListener('animationend', () => {
                particle.remove();
            });
        }

        setInterval(createParticle, 300); // Crea una partícula cada 300ms
    }

    // Asegúrate de que setActiveLink esté definida si la usas
    // (Si ya la tienes en otro lugar de tu JS, no la pegues de nuevo)
    /*
    function setActiveLink(clickedLink) {
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });
        clickedLink.classList.add('active');
    }
    */
);

    // Asegúrate de que setActiveLink esté definida si la usas
    // function setActiveLink(clickedLink) {
    //     document.querySelectorAll('.nav-links a').forEach(link => {
    //         link.classList.remove('active');
    //     });
    //     clickedLink.classList.add('active');
    // }
;


// Dentro de tu script.js, preferiblemente dentro de un objeto `ui` si lo tienes.
// Si no, estas serán funciones globales. Para este ejemplo, las pondré como globales,
// asumiendo que tus `openModal`, `closeModal` ya lo son.

/**
 * Muestra el modal de selección de enemigos, cargando los mobs del piso actual.
 * @param {boolean} isBossFight Indica si la selección es para un jefe (true) o monstruos normales (false).
 */
function showMobSelectionModal(isBossFight) {
    const floor = floorData[player.currentFloor];
    if (!floor) {
        mobSelectionMessage.textContent = "Error: Datos del piso no encontrados.";
        return;
    }

    mobListContainer.innerHTML = ''; // Limpiar lista anterior
    mobSelectionMessage.textContent = ""; // Limpiar cualquier mensaje previo

    let mobsToShow = [];
    if (isBossFight) {
        if (floor.boss) {
            mobsToShow.push({ ...floor.boss, type: 'boss' }); // Añadir tipo para distinguir
        } else {
            mobSelectionMessage.textContent = "No hay un jefe en este piso.";
        }
    } else {
        if (floor.monsters && floor.monsters.length > 0) {
            mobsToShow = floor.monsters.map(m => ({ ...m, type: 'monster' })); // Añadir tipo
        } else {
            mobSelectionMessage.textContent = "No hay monstruos normales en este piso.";
        }
    }

    if (mobsToShow.length === 0 && mobSelectionMessage.textContent === "") {
         mobSelectionMessage.textContent = "No hay enemigos disponibles en este piso.";
    }

    mobsToShow.forEach(mob => {
        const mobCard = document.createElement('div');
        mobCard.className = 'mob-card';
        // Usa el ID del mob para la selección
        mobCard.dataset.mobId = mob.id;
        mobCard.dataset.mobType = mob.type; // Para saber si es un jefe o un monstruo normal

        // Determinar si es un jefe para aplicar estilos o lógica diferente
        const isBoss = mob.type === 'boss';
        // Asegúrate de que mob.icon exista, si no, usa un emoji por defecto
        const icon = mob.icon || (isBoss ? '👹' : '👻');
        const nameColor = isBoss ? 'var(--sao-red-alert)' : 'var(--sao-cyan-hud)';


        mobCard.innerHTML = `
            <div class="mob-card-icon" style="font-size: 2.5em;">${icon}</div>
            <div class="mob-card-name" style="color: ${nameColor};">${mob.name}</div>
            <div class="mob-card-info"><i class="fas fa-heart mob-card-hp-icon"></i>HP: ${mob.hp}</div>
            <div class="mob-card-info"><i class="fas fa-sword mob-card-attack-icon"></i>ATK: ${mob.attack}</div>
            <div class="mob-card-info"><i class="fas fa-shield-alt"></i>DEF: ${mob.defense}</div>
            <div class="mob-card-info">EXP: ${mob.exp} | Col: ${mob.col}</div>
        `;
    // Wiring por dataset: usa evento click y soporte keyboard (Enter/Space)
    mobCard.tabIndex = 0;
    mobCard.setAttribute('role', 'button');
    mobCard.addEventListener('click', () => startSpecificCombat(mob.id, isBoss));
    mobCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startSpecificCombat(mob.id, isBoss); } });

        mobListContainer.appendChild(mobCard);
    });

    openModal('mobSelectionModal'); // Abre el modal de selección de mobs
}

// Tu función updateEnemyHPBar ya está bien, solo asegúrate de que el ID del elemento
// para la barra de HP del enemigo sea 'combat-enemy-hp-bar-fill' como en el ejemplo HTML.
// Ya usa `classList.remove` y `classList.add` para los estados 'low' y 'critical'.
// No hay cambios aquí a menos que tu HTML use un ID diferente.

// --- Wiring genérico para data-action / data-close / data-admin-action ---
document.addEventListener('DOMContentLoaded', () => {
    // data-action handlers
    document.querySelectorAll('[data-action]').forEach(el => {
        const action = el.dataset.action;
        el.setAttribute('role', 'button');
        if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
        el.addEventListener('click', (e) => {
            if (action === 'save') return saveGame();
            if (action === 'load') return loadGame();
            if (action === 'reset') return confirmResetProgress();
            if (action === 'nav') {
                const target = el.dataset.target;
                if (target) {
                    const targetEl = document.querySelector(target);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                        // setActiveLink if exists
                        if (typeof setActiveLink === 'function') setActiveLink(el);
                    }
                }
            }
        });
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
    });

    // data-close handlers (modal close buttons)
    document.querySelectorAll('[data-close]').forEach(el => {
        const modalId = el.dataset.close;
        if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
        el.addEventListener('click', () => closeModal(modalId));
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeModal(modalId); } });
    });

    // data-admin-action handlers
    document.querySelectorAll('[data-admin-action]').forEach(el => {
        const act = el.dataset.adminAction;
        el.setAttribute('role', 'button');
        if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
        el.addEventListener('click', () => {
            if (typeof adminActions === 'object') {
                if (act === 'setStat') return adminActions.setStat(el.dataset.stat, el.dataset.inputid);
                if (typeof adminActions[act] === 'function') return adminActions[act]();
            }
        });
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
    });

    // Ensure modal content close by ESC still works (already present) and add ARIA roles to modals
    document.querySelectorAll('.modal').forEach(m => {
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-hidden', m.style.display === 'block' ? 'false' : 'true');
    });
});