# pagina-Sao

⚔️ Sword Art Online: Aincrad Chronicles
¡Link Start! Bienvenido a Aincrad Chronicles, un juego de rol (RPG) basado en navegador e inspirado en el icónico universo de Sword Art Online. Este proyecto te permite experimentar una versión simplificada de la lucha por la supervivencia dentro del castillo flotante de Aincrad. Crea tu personaje, combate contra monstruos, derrota a los jefes de piso y equípate con armas legendarias para avanzar a través de los 100 niveles.

![wp2458466-sword-art-online-hd-wallpapers](https://github.com/user-attachments/assets/8541780a-3c09-43ae-94f6-4d94b985c745)

Este proyecto web está construido enteramente con HTML, CSS y JavaScript vainilla, demostrando la capacidad de crear experiencias de juego "complejas" sin necesidad de frameworks pesados.

📜 Índice
Introducción al Juego

Características Principales

Cómo Jugar

La Wiki de Aincrad

Estructura y Documentación del Código

HTML (index.html)

CSS (style.css)

JavaScript (script.js)

Cómo Modificar y Expandir el Juego

Aviso Legal y Agradecimientos

🚀 Introducción al Juego
Aincrad Chronicles es una experiencia de RPG de un solo jugador donde asumes el rol de un jugador atrapado en Sword Art Online. Tu objetivo es simple pero desafiante: sobrevivir y conquistar los 100 pisos del castillo flotante de Aincrad.

Comenzarás como un aventurero novato en el "Piso 1: Ciudad del Inicio" y deberás abrirte paso a través de hordas de monstruos y jefes de piso cada vez más difíciles. A lo largo de tu viaje, ganarás experiencia, subirás de nivel, recolectarás Col (la moneda del juego), y obtendrás equipo para fortalecerte.

✨ Características Principales
Progresión de Personaje: Sistema de niveles, experiencia (EXP), puntos de salud (HP), puntos de maná (MP), ataque y defensa.

Combate por Turnos: Enfréntate a monstruos icónicos y jefes de piso en un sistema de combate estratégico.

Habilidades de Espada: Aprende y utiliza habilidades de espada que consumen MP para infligir daño masivo o aplicar efectos de estado.

Inventario y Equipo: Gestiona un inventario con consumibles (pociones), materiales y equipo. Equipa armas, escudos, armaduras y accesorios para mejorar tus estadísticas.

Economía y Tiendas: Cada piso tiene su propia tienda donde puedes comprar y vender objetos usando Col.

Herrería: ¡Forja tu propio equipo! Recolecta materiales de monstruos y úsalos en la herrería para crear armas y armaduras poderosas, incluyendo réplicas y versiones de equipos legendarios.

Navegación entre Pisos: Una vez que derrotes al jefe de un piso, desbloquearás el acceso al siguiente, pudiendo viajar entre los pisos ya conquistados.

Sistema de Guardado: Tu progreso se guarda localmente en tu navegador, permitiéndote continuar tu aventura en cualquier momento.

Panel de Administrador: Una herramienta de desarrollo oculta para modificar estadísticas, dar objetos y testear el juego fácilmente.

Wiki Integrada: Una completa sección de wiki con información sobre personajes, armas, pisos y gremios del universo de SAO.

🎮 Cómo Jugar
Inicio: Al cargar la página, se te pedirá que ingreses un nombre para tu personaje.

Panel de Juego: La sección principal del juego te muestra el HUD de tu personaje: Nivel, HP, MP, EXP y Col.

Acciones Principales:

Combatir: Lucha contra monstruos aleatorios del piso actual para ganar EXP, Col y materiales.

Jefe del Piso: Enfréntate al jefe del piso. ¡Prepárate bien! Derrotarlo es la única forma de avanzar.

Entrenar: Gasta Col para mejorar permanentemente tus estadísticas base.

Inventario: Abre tu inventario para ver tus objetos, equipar armas o usar pociones.

Tienda: Compra equipo y consumibles.

Herrería: Crea nuevo equipo si tienes los materiales y el Col necesarios.

Mis Stats: Revisa un desglose detallado de todas tus estadísticas y habilidades.

Guardado: Usa los botones de Guardar y Cargar para gestionar tu progreso. ¡No olvides guardar a menudo!

📖 La Wiki de Aincrad
Además del juego, el proyecto incluye una sección de Wiki interactiva para sumergirte en el lore de Sword Art Online. Puedes explorar:

Personajes Clave: Biografías de Kirito, Asuna, Heathcliff y más.

Arsenal Legendario: Detalles sobre armas icónicas como Elucidator y Dark Repulser.

Pisos de Aincrad: Descripciones de los pisos más importantes del castillo.

Gremios Notables: Información sobre los Caballeros de la Sangre, el Ataúd Risueño y otros gremios.

💻 Estructura y Documentación del Código
El proyecto está compuesto por tres archivos principales: index.html, style.css y script.js.

HTML (index.html)
El archivo HTML define la estructura de toda la página. Se divide en varias secciones lógicas:

<header>: Contiene la barra de navegación fija en la parte superior, con el logo y los enlaces a las diferentes secciones de la wiki y al panel de juego.

<section class="hero">: La sección de bienvenida visual con el título del juego y estadísticas del universo SAO.

<main>: El contenedor principal para el contenido interactivo.

#game-panel: El corazón del juego. Aquí se encuentra el HUD del jugador y todos los botones de acción principales (Combatir, Inventario, Tienda, etc.).

Secciones de la Wiki (#wiki-personajes, #wiki-arsenal, etc.): Contenedores vacíos que son llenados dinámicamente con información desde script.js.

Modales (<div class="modal">):

El HTML incluye las estructuras base para todas las ventanas emergentes (modales), como el inventario (#inventoryModal), la tienda (#shopModal), el combate (#combatModal), las estadísticas del jugador (#playerStatsModal), etc.

Estos modales están ocultos por defecto (display: none;) y se hacen visibles a través de JavaScript cuando el jugador interactúa con los botones correspondientes.

CSS (style.css)
Este archivo se encarga de todo el aspecto visual y la atmósfera del juego, inspirado en la interfaz de SAO.

Variables Globales (:root): Define la paleta de colores principal (tonos oscuros, azules, cian para el HUD) para mantener la consistencia.

Estilos Generales y Header: Establece el fondo, las fuentes y el estilo del encabezado y la navegación.

Paneles y Tarjetas (.section, .card): Estilos para los contenedores de la wiki, dándoles un aspecto de "panel de datos".

HUD del Jugador (.sao-player-hud): Estilos específicos para la barra de vida y la información del jugador, imitando el HUD del anime.

Botones de Acción (.action-btn): Da a los botones un aspecto 3D y reactivo, con efectos hover y active.

Modales (.modal, .modal-content): Centra los modales en la pantalla, les da un fondo semitransparente y define las animaciones de entrada y salida.

Estilos de Combate: Diseña la arena de combate, las barras de vida de los combatientes y los efectos visuales como el damage-flash.

Diseño Responsivo (@media): Incluye media queries para asegurar que el juego se vea y funcione bien en diferentes tamaños de pantalla, desde ordenadores de escritorio hasta dispositivos móviles.

JavaScript (script.js)
Este es el cerebro del proyecto. Gestiona todos los datos, la lógica del juego y la interactividad. Está estructurado en secciones claras:

Configuración Inicial y Datos:

player (Objeto): Este es el objeto más importante. Almacena todo el estado actual del jugador: nombre, nivel, EXP, HP, MP, Col, inventario, equipo, habilidades, materiales y pisos desbloqueados.

baseItems (Objeto): Una base de datos de todos los ítems posibles en el juego (armas, pociones, materiales). Cada ítem tiene un id único y propiedades como name, icon, type, stats, etc.

floorData (Objeto): Define los datos para cada piso: nombre, monstruos que aparecen, el jefe del piso (con sus estadísticas y drops), y los artículos disponibles en la tienda de ese piso.

skillData, blacksmithRecipes, etc.: Bases de datos similares para las habilidades, recetas de herrería y efectos de estado.

Selectores del DOM:

Una larga lista de constantes que vinculan las variables de JavaScript con los elementos del HTML usando document.getElementById(). Esto permite a JS manipular el contenido de la página (por ejemplo, actualizar la barra de vida o el contador de Col).

Lógica Principal del Juego:

calculateEffectiveStats(): Calcula las estadísticas totales del jugador sumando las estadísticas base y las del equipo. Se llama cada vez que el equipo cambia.

gainExp(), levelUp(): Gestionan la ganancia de experiencia y las subidas de nivel, mejorando las estadísticas del jugador y desbloqueando nuevas habilidades.

saveGame(), loadGame(): Usan localStorage del navegador para guardar el objeto player como una cadena de texto JSON y recuperarlo más tarde.

Sistema de Combate:

initCombat(isBossFight): Inicia una nueva batalla. Clona un monstruo o jefe de floorData, lo muestra en el modal de combate y prepara la arena.

playerAttack(), usePlayerSkill(): Gestionan las acciones del jugador durante su turno.

enemyTurn(): Controla la IA simple del enemigo, que decide si atacar o usar una habilidad.

endCombat(playerWon): Se ejecuta cuando el HP de un combatiente llega a cero. Distribuye las recompensas (EXP, Col, drops) si el jugador gana, o aplica penalizaciones si pierde.

Gestión de Modales y Renderizado:

openModal(), closeModal(): Funciones para mostrar y ocultar las ventanas emergentes.

renderInventory(), renderShop(), renderBlacksmithRecipes(): Funciones que leen los datos del jugador (inventario, piso actual) y generan dinámicamente el contenido HTML para los modales correspondientes, creando las listas de ítems, recetas, etc.

Contenido de la Wiki:

loadWikiContent(): Lee los objetos de datos de la wiki (wikiCharacterData, wikiWeaponData) y los usa para construir las "tarjetas" de información en las secciones correspondientes del HTML.

Inicialización:

El evento DOMContentLoaded se asegura de que todo el HTML esté cargado antes de ejecutar el código JS. Llama a loadGame() para cargar el progreso del jugador (o iniciar una nueva partida) y configura los onclick para todos los botones de acción principales.

🔧 Cómo Modificar y Expandir el Juego
Una de las grandes ventajas de este proyecto es lo fácil que es expandirlo. Casi todo el contenido del juego se define en los objetos de datos al principio de script.js.

Ejemplo 1: Añadir una Nueva Espada
Abre script.js y busca el objeto baseItems.

Añade una nueva entrada al objeto. El id debe ser único.

'flame_tongue': { 
    name: 'Lengua de Fuego', 
    icon: '🔥', 
    type: 'weapon', 
    slot: 'weapon', 
    stats: { attack: 40, hp: 15 }, 
    levelReq: 20, 
    description: "Una espada imbuida con el poder del fuego." 
},

¡Listo! Ahora puedes añadir esta espada al juego de varias maneras:

En una tienda: Añade { id: 'flame_tongue', price: 12000 } al array shopItems de cualquier piso en floorData.

Como drop de un monstruo: Añade 'flame_tongue': 0.05 (una probabilidad del 5%) al objeto drops de un monstruo o jefe.

Como receta de herrería: Añade una nueva entrada en blacksmithRecipes.

Ejemplo 2: Añadir un Nuevo Piso
En script.js, ve al objeto floorData.

Añade un nuevo objeto para el siguiente número de piso. Sigue la estructura existente.

8: {
    name: "Cañones de Arena",
    monsters: [
        { name: "Escorpión Gigante", hp: 450, attack: 65, defense: 30, exp: 300, col: 140, icon: '🦂', drops: { 'silver_ingot': 0.2, 'obsidian_shard': 0.05 } },
        { name: "Gusano de Arena", hp: 600, attack: 55, defense: 40, exp: 350, col: 160, icon: '🐛', drops: { 'raw_hide': 0.5 } }
    ],
    boss: {
        name: "Manticora del Desierto",
        hp: 6500,
        attack: 90,
        defense: 50,
        exp: 4000,
        col: 2000,
        icon: '🦁🦂',
        drops: { 'dragon_scale': 0.3, 'divine_fragment': 0.03 },
        skills: [
             { id: 'poison_sting', name: 'Aguijón Venenoso', damageMultiplier: 1.2, statusEffect: { type: 'poisoned', duration: 4, value: 0.1 } }
        ]
    },
    shopItems: [
        { id: 'healing_potion_l', price: 90 },
        // ...otros items
    ],
    blacksmithRecipes: [ /* Puedes añadir recetas únicas aquí */ ],
    unlocked: false // Siempre empieza como 'false'
},

El juego se encargará del resto. Una vez que el jugador derrote al jefe del piso 7, el piso 8 se desbloqueará automáticamente.

Ejemplo 3: Añadir una Nueva Habilidad
Ve al objeto skillData en script.js.

Añade una nueva habilidad con sus propiedades.

'double_slash': { 
    name: 'Corte Doble', 
    icon: '✌️', 
    mpCost: 18, 
    damageMultiplier: 2.2, 
    type: 'attack', 
    levelReq: 15, // Se aprenderá automáticamente al alcanzar este nivel
    description: "Un rápido ataque de dos golpes. Coste: 18 MP. Req LV: 15." 
},

El sistema de subida de nivel (levelUp()) comprobará automáticamente si el jugador ha alcanzado el levelReq y le otorgará la habilidad.

⚖️ Aviso Legal y Agradecimientos
Este proyecto es un humilde homenaje hecho por y para fans, celebrando el increíble mundo de Sword Art Online concebido por Reki Kawahara. Es una obra no oficial y sin fines de lucro.

Todos los personajes, la historia, los nombres y los derechos relacionados con el universo de Sword Art Online pertenecen a sus respectivos creadores, editoriales y propietarios. No se pretende infringir ningún derecho de autor.

¡Gracias por jugar y que disfrutes tu estancia en Aincrad!

https://facu7519.github.io/saoproject/
