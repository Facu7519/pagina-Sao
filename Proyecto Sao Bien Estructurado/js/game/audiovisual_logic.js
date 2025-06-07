// js/game/audiovisual_logic.js
import { domElements } from '../dom.js';
import { showNotification } from '../utils.js'; // Usar la utilidad de notificación

/**
 * Maneja la reproducción y pausa de la música de fondo.
 */
export function toggleMusic() {
    if (!domElements.backgroundMusic || !domElements.musicToggleBtn) return;

    if (domElements.backgroundMusic.paused) {
        domElements.backgroundMusic.play().catch(e => {
            console.warn("Error al intentar reproducir música automáticamente:", e);
            showNotification("No se pudo iniciar la música. Intenta interactuar con la página primero.", "error");
        });
        domElements.musicToggleBtn.textContent = "🔇 Silenciar";
        // No mostrar notificación de "Música iniciada" aquí, es mejor si el usuario lo controla explícitamente
        // o si es la primera vez que se inicia.
    } else {
        domElements.backgroundMusic.pause();
        domElements.backgroundMusic.currentTime = 0; // Opcional: reiniciar la música al pausar
        domElements.musicToggleBtn.textContent = "🔊 Música";
    }
}

/**
 * Crea y anima partículas flotantes en el fondo para un efecto visual.
 * Las partículas son elementos del DOM con caracteres de SAO.
 */
export function createParticles() {
    const container = domElements.particlesContainer;
    if (!container) return;

    container.innerHTML = ''; // Limpiar partículas existentes si se llama múltiples veces

    const SAO_PARTICLES = ['⚔️', '🛡️', '💎', '🌐', '✨', '🌀', '🗝️', '💾', '🎮', '💠', '📜', '🌌'];
    const numParticles = Math.min(30, Math.floor(window.innerWidth / 60)); // Ajustar densidad de partículas

    for (let i = 0; i < numParticles; i++) {
        const particleElement = document.createElement('div');
        particleElement.className = 'particle';
        particleElement.innerHTML = SAO_PARTICLES[Math.floor(Math.random() * SAO_PARTICLES.length)];
        
        // Posición inicial aleatoria
        particleElement.style.left = Math.random() * 100 + 'vw';
        
        // Tamaño aleatorio
        particleElement.style.fontSize = (Math.random() * 1.0 + 0.6) + 'rem'; // Ligeramente más pequeñas en promedio
        
        // Duración y retraso de animación aleatorios para desincronizar
        const duration = Math.random() * 25 + 20; // Entre 20s y 45s
        const delay = Math.random() * -duration; // Retraso negativo para que algunas empiecen a mitad de animación
        
        particleElement.style.animationName = 'float'; // Asegurar que usa la animación definida en CSS
        particleElement.style.animationDuration = `${duration}s`;
        particleElement.style.animationTimingFunction = 'linear';
        particleElement.style.animationDelay = `${delay}s`;
        particleElement.style.animationIterationCount = 'infinite';
        
        container.appendChild(particleElement);
    }
}