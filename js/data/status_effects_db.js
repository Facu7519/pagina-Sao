// js/data/status_effects_db.js

/**
 * Base de datos de los efectos de estado que pueden afectar a los personajes.
 * Incluye nombre, icono, color para UI, descripción y valor (si aplica, como porcentaje de daño).
 */
export const statusEffects = {
    'poisoned': { 
        name: 'Envenenado', 
        icon: '🤢', 
        color: '#8cff8c', // Verde claro
        description: 'Pierde HP cada turno.', 
        value: 0.05 // Pierde 5% del HP máximo por turno
    },
    'stunned': { 
        name: 'Aturdido', 
        icon: '💫', 
        color: '#ffff00', // Amarillo
        description: 'No puede actuar.' 
    },
    'bleeding': { 
        name: 'Sangrando', 
        icon: '🩸', 
        color: '#ff4d4d', // Rojo claro
        description: 'Pierde HP cada turno.', 
        value: 0.08 // Pierde 8% del HP máximo por turno
    },
    'protected': {
        name: 'Protegido',
        icon: '🛡️✨',
        color: '#add8e6', // Azul claro
        description: 'Recibe daño reducido.',
        value: 0.3 // 30% de reducción de daño
    },
    'counter': {
        name: 'Contraataque',
        icon: '🔄💥',
        color: '#ffa500', // Naranja
        description: 'Devuelve parte del daño recibido y reduce ligeramente el daño propio.',
        value: 0.25, // Devuelve 25% del daño
        damageReduction: 0.1 // Reduce daño propio un 10%
    }
    // Puedes añadir más efectos de estado aquí
};