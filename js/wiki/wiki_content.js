// js/wiki/wiki_content.js
import { domElements } from '../dom.js';
import { openModal } from '../utils.js';
import { 
    wikiCharacterData, 
    wikiWeaponData, 
    wikiFloorsData, 
    wikiGuildsData 
} from '../data/wiki_data_db.js';

/**
 * Carga dinámicamente el contenido de las diferentes secciones de la wiki
 * en la página principal.
 */
export function loadWikiContent() {
    // Cargar Personajes
    if (domElements.charactersGridDisplay) {
        domElements.charactersGridDisplay.innerHTML = Object.entries(wikiCharacterData).map(([id, char]) => `
            <div class="card" data-wiki-type="character" data-wiki-id="${id}">
                <div class="card-avatar" style="font-size: ${char.icon.length > 2 ? '2.5rem' : '3.5rem'};">${char.icon}</div>
                <h3 class="card-name">${char.name}</h3>
                <p class="card-subtitle">${char.role}</p>
                <p class="card-description">${char.description}</p>
            </div>`).join('');
    }

    // Cargar Arsenal
    if (domElements.weaponsGridDisplay) {
        domElements.weaponsGridDisplay.innerHTML = Object.entries(wikiWeaponData).map(([id, wpn]) => `
            <div class="card" data-wiki-type="weapon" data-wiki-id="${id}">
                <div class="card-icon" style="font-size: ${wpn.icon.length > 2 ? '3rem' : '4.5rem'};">${wpn.icon}</div>
                <h3 class="card-name">${wpn.name}</h3>
                <p class="card-subtitle">${wpn.type}</p>
                <div class="weapon-stats"><span>${wpn.stats}</span></div>
                <p class="card-description" style="font-size:0.9em; margin-top:10px;">${wpn.description}</p>
            </div>`).join('');
    }

    // Cargar Información de Pisos
    if (domElements.floorsInfoContainer) {
        domElements.floorsInfoContainer.innerHTML = `
            <p style="text-align:center; margin-bottom:2rem;">Aincrad, el castillo flotante, es un mundo de cien pisos llenos de misterios, peligros y maravillas. Cada piso es un mundo en sí mismo, con sus propios paisajes, ciudades, monstruos y un temible jefe que guarda el camino al siguiente nivel.</p>
            <div class="card-grid">
                ${Object.entries(wikiFloorsData).map(([id, floor]) => `
                    <div class="card" style="cursor:default;">
                        <div class="card-icon" style="font-size: ${floor.icon.length > 2 ? '3rem' : '4.5rem'};">${floor.icon}</div>
                        <h3 class="card-name">${floor.name}</h3>
                        <p class="card-description"><strong>Descripción:</strong> ${floor.description}</p>
                        <p class="card-description" style="margin-top:0.5rem;"><strong>Detalles:</strong> ${floor.details}</p>
                    </div>`).join('')}
            </div>`;
    }

    // Cargar Información de Gremios
    if (domElements.guildsInfoContainer) {
        domElements.guildsInfoContainer.innerHTML = `
            <p style="text-align:center; margin-bottom:2rem;">En el vasto mundo de Aincrad, los gremios son faros de cooperación y poder. Unen a los jugadores bajo un mismo estandarte, ya sea para conquistar la línea del frente, proteger a los débiles o simplemente sobrevivir juntos. Cada gremio tiene su propia filosofía y metas.</p>
            <div class="card-grid">
                ${Object.entries(wikiGuildsData).map(([id, guild]) => `
                    <div class="card" style="cursor:default;">
                        <div class="card-icon" style="font-size: ${guild.icon.length > 2 ? '3rem' : '4.5rem'};">${guild.icon}</div>
                        <h3 class="card-name">${guild.name}</h3>
                        <p class="card-subtitle">${guild.description}</p>
                        <p class="card-description" style="margin-top:0.5rem;"><strong>Detalles:</strong> ${guild.details}</p>
                    </div>`).join('')}
            </div>`;
    }
    addWikiCardListeners(); // Añadir listeners después de crear las tarjetas
}

/**
 * Añade event listeners a las tarjetas de la wiki para mostrar información detallada.
 */
function addWikiCardListeners() {
    document.querySelectorAll('.card[data-wiki-type]').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.wikiType;
            const id = card.dataset.wikiId;
            showWikiInfo(type, id);
        });
    });
}


/**
 * Muestra información detallada de un elemento de la wiki (personaje o arma) en un modal.
 * @param {string} type - El tipo de dato a mostrar ('character' o 'weapon').
 * @param {string} id - El ID del personaje o arma.
 */
export function showWikiInfo(type, id) {
    const dataSet = type === 'character' ? wikiCharacterData : 
                    type === 'weapon' ? wikiWeaponData : null;
    
    if (!dataSet) {
        console.error("Tipo de datos de wiki desconocido:", type);
        return;
    }

    const data = dataSet[id];

    if (data && domElements.modalBodyContentElement) {
        let htmlContent = `
            <span class="modal-icon" style="font-size: ${data.icon.length > 2 ? '3.5rem' : '5rem'};">${data.icon}</span>
            <h2>${data.name}</h2>`;
        
        if (data.role) htmlContent += `<p><strong>Rol:</strong> ${data.role}</p>`;
        if (data.type && type === 'weapon') htmlContent += `<p><strong>Tipo:</strong> ${data.type}</p>`; // Asegurar que 'type' es para arma
        if (data.stats) htmlContent += `<p><strong>Características:</strong> ${data.stats}</p>`; // 'Stats' para armas, podría ser otra cosa para personajes
        
        htmlContent += `<p style="margin-top:1rem;">${data.description}</p>`;
        
        if (data.fullInfo) {
            htmlContent += `<p style="margin-top:0.5rem; font-style:italic; color:#b0c4de;">${data.fullInfo}</p>`;
        }
        
        domElements.modalBodyContentElement.innerHTML = htmlContent;
        openModal('infoModal');
    } else {
        console.error(`Datos no encontrados para wiki tipo "${type}" con ID "${id}".`);
    }
}