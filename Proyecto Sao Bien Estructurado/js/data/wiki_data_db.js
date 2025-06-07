// js/data/wiki_data_db.js

/**
 * Datos para la sección de la Wiki sobre personajes clave de SAO.
 * Cada personaje tiene un nombre, icono, rol, descripción breve y una información más completa.
 */
export const wikiCharacterData = {
    kirito: { 
        name: "Kirito (キリト)", 
        icon: "⚫", 
        role: "Beater, Espadachín Dual", 
        description: "El protagonista principal, conocido como el 'Espadachín Negro'. Es un jugador solitario que lucha por superar el juego y proteger a sus amigos.", 
        fullInfo: "Originalmente un beta tester, Kirito posee un conocimiento profundo del juego. Su habilidad única 'Doble Empuñadura' le permite blandir dos espadas, convirtiéndolo en uno de los jugadores más fuertes." 
    },
    asuna: { 
        name: "Asuna (アスナ)", 
        icon: "✨", 
        role: "Sublíder de los KoB, Espadachina", 
        description: "Una jugadora habilidosa y determinada, conocida como el 'Destello Veloz' por su increíble velocidad con la estoque.", 
        fullInfo: "Asuna es una de las pocas jugadoras que usa su nombre real. Se convierte en una figura central en la línea del frente y desarrolla una profunda relación con Kirito." 
    },
    klein: { 
        name: "Klein (クライン)", 
        icon: "🔥", 
        role: "Líder del Gremio Fuurinkazan", 
        description: "Uno de los primeros amigos de Kirito en SAO. Es un líder carismático y leal a sus compañeros de gremio.", 
        fullInfo: "Klein, cuyo nombre real es Ryoutarou Tsuboi, prioriza la seguridad y el bienestar de sus amigos por encima de todo. Es un hábil usuario de la katana." 
    },
    agil: { 
        name: "Agil (エギル)", 
        icon: "🔨", 
        role: "Mercader, Usuario de Hacha", 
        description: "Un jugador afroamericano robusto y dueño de una tienda en Algade. Es un aliado confiable y apoya a los jugadores de niveles inferiores.", 
        fullInfo: "Agil, o Andrew Gilbert Mills en la vida real, es conocido por su honestidad y su disposición a ayudar a otros, a menudo vendiendo objetos a precios justos o incluso donando equipamiento." 
    },
    silica: { 
        name: "Silica (シリカ)", 
        icon: "🐉", 
        role: "Domadora de Bestias", 
        description: "Una joven jugadora que se hizo famosa por domar a un Dragón Emplumado llamado Pina. Es una de las pocas 'Domadoras de Bestias' en SAO.", 
        fullInfo: "Silica, o Keiko Ayano, es una jugadora de nivel medio que experimenta la dureza de SAO de primera mano. Kirito la ayuda en un momento crítico, forjando una amistad." 
    },
    lisbeth: { 
        name: "Lisbeth (リズベット)", 
        icon: "🛠️", 
        role: "Herrera", 
        description: "Una talentosa herrera y amiga cercana de Asuna. Es conocida por su habilidad para forjar armas de alta calidad.", 
        fullInfo: "Lisbeth, o Rika Shinozaki, dirige una exitosa herrería. Acompaña a Kirito en una peligrosa misión para encontrar un metal raro, lo que fortalece su amistad y revela sus sentimientos." 
    },
    heathcliff: { 
        name: "Heathcliff (ヒースクリフ)", 
        icon: "🛡️✝️", 
        role: "Líder de los Caballeros de la Hermandad de Sangre", 
        description: "El carismático y poderoso líder del gremio más fuerte de Aincrad. Es considerado el jugador más fuerte, poseedor de la habilidad única 'Espada Sagrada'.", 
        fullInfo: "La verdadera identidad de Heathcliff es Akihiko Kayaba, el creador de Sword Art Online y el NerveGear. Se insertó en el juego como el jefe final del piso 100." 
    },
    yui: { 
        name: "Yui (ユイ)", 
        icon: "💖", 
        role: "Programa de Consejería de Salud Mental (MHCP001)", 
        description: "Una misteriosa niña encontrada por Kirito y Asuna en el Bosque Errante del Piso 22. Originalmente un programa de IA.", 
        fullInfo: "Yui fue diseñada para monitorear el estado mental de los jugadores. Al interactuar con Kirito y Asuna, desarrolla emociones y los considera sus padres. Es salvada por Kirito y se convierte en un PNJ de navegación." 
    }
};

/**
 * Datos para la sección de la Wiki sobre armas legendarias y notables de SAO.
 */
export const wikiWeaponData = {
    elucidator: { 
        name: "Elucidator", 
        icon: "⚫", 
        type: "Espada Recta (Una Mano)", 
        stats: "Ataque Alto, Durabilidad Alta", 
        description: "Una poderosa espada negra obtenida por Kirito como drop de un jefe. Es una de sus armas principales.", 
        fullInfo: "Forjada con un metal de alta calidad, la Elucidator es un arma demoníaca que destaca por su filo y resistencia. Es una de las pocas armas de su calibre que no fue creada por un jugador." 
    },
    dark_repulser: { 
        name: "Dark Repulser", 
        icon: "🟢", 
        type: "Espada Recta (Una Mano)", 
        stats: "Ataque Muy Alto, Durabilidad Media", 
        description: "Una espada de color aguamarina forjada por Lisbeth para Kirito utilizando un lingote de Cristalito.", 
        fullInfo: "La Dark Repulser es el resultado de una ardua búsqueda de materiales. Aunque increíblemente poderosa, su durabilidad es menor en comparación con la Elucidator, lo que requiere un uso más estratégico." 
    },
    lambent_light: { 
        name: "Lambent Light", 
        icon: "✨", 
        type: "Estoque", 
        stats: "Velocidad de Ataque Extrema, Precisión Alta", 
        description: "El estoque personal de Asuna, conocido por su velocidad y precisión mortales.", 
        fullInfo: "Esta arma, en manos de Asuna, es capaz de desatar una ráfaga de ataques casi imparables. Su diseño elegante contrasta con su letalidad en combate." 
    },
    anneal_blade: { 
        name: "Anneal Blade", 
        icon: "🗡️", 
        type: "Espada Recta (Una Mano)", 
        stats: "Ataque Moderado, Común", 
        description: "Una espada común, a menudo mejorada por jugadores en los primeros pisos. Kirito usó una versión mejorada al inicio.", 
        fullInfo: "Representa el esfuerzo de los jugadores por sobrevivir y mejorar su equipo con recursos limitados en las primeras etapas del juego." 
    },
    tyrant_dragon: { 
        name: "Tyrant Dragon", 
        icon: "🐉⚔️", 
        type: "Espadón (Dos Manos)", 
        stats: "Ataque Masivo, Peso Elevado", 
        description: "Un espadón legendario que requiere una gran fuerza para ser blandido, pero que ofrece un poder destructivo inmenso.", 
        fullInfo: "Pocos jugadores son capaces de manejar eficazmente esta arma debido a sus requisitos de fuerza. Se dice que sus golpes pueden atravesar las defensas más robustas." 
    }
};

/**
 * Datos para la sección de la Wiki sobre los pisos de Aincrad.
 */
export const wikiFloorsData = {
    floor1: { 
        name: "Piso 1: Ciudad del Inicio", 
        icon: "🏁", 
        description: "El punto de partida para todos los jugadores. Contiene vastas llanuras, bosques y la primera mazmorra.", 
        details: "Aquí Akihiko Kayaba reveló la naturaleza mortal de SAO. El jefe es Illfang el Señor Kóbold." 
    },
    floor22: { 
        name: "Piso 22: Coral", 
        icon: "🌳🏠", 
        description: "Un piso tranquilo y pintoresco, conocido por sus bosques y lagos. Kirito y Asuna compraron una cabaña aquí.", 
        details: "Es un respiro de los pisos más peligrosos, ideal para actividades como la pesca. Aquí encontraron a Yui." 
    },
    floor50: { 
        name: "Piso 50: Algade", 
        icon: "🏙️", 
        description: "Una de las ciudades principales más grandes de Aincrad, un importante centro de comercio y actividad de gremios.", 
        details: "La tienda de Agil se encuentra aquí. El área circundante es conocida por sus monstruos de tipo insecto." 
    },
    floor74: { 
        name: "Piso 74: Kamdeet", 
        icon: "👹🏞️", 
        description: "Un piso con un terreno montañoso y peligroso. La mazmorra del jefe es particularmente desafiante.", 
        details: "El jefe es The Gleam Eyes, un demonio azul con gran poder. Kirito lo enfrentó usando su habilidad de Doble Empuñadura por primera vez públicamente." 
    },
    floor75: { 
        name: "Piso 75: Collinia", 
        icon: "💀🚪", 
        description: "La antesala de la habitación del jefe de este piso fue el escenario de una batalla masiva y trágica contra The Skull Reaper.", 
        details: "Esta batalla resultó en numerosas bajas y fue un punto de inflexión para muchos jugadores, incluyendo el enfrentamiento entre Kirito y Heathcliff." 
    },
    floor100: { 
        name: "Piso 100: Palacio de Rubí", 
        icon: "👑🏰", 
        description: "El piso final de Aincrad, donde reside el jefe final del juego.", 
        details: "Se rumorea que es la residencia de Akihiko Kayaba en el juego. Conquistarlo significa la liberación de todos los jugadores atrapados." 
    }
};

/**
 * Datos para la sección de la Wiki sobre gremios notables en SAO.
 */
export const wikiGuildsData = {
    knights_of_blood: { 
        name: "Caballeros de la Hermandad de Sangre (KoB)", 
        icon: "🛡️✝️", 
        description: "El gremio más fuerte y prominente, enfocado en limpiar los pisos. Liderado por Heathcliff.", 
        details: "Conocidos por sus uniformes rojo y blanco, y su estricta disciplina. Asuna fue su sublíder." 
    },
    fuurinkazan: { 
        name: "Fuurinkazan (風林火山)", 
        icon: "🔥🌲", 
        description: "Un gremio de tamaño mediano liderado por Klein. Valoran la camaradería y la diversión.", 
        details: "Su nombre proviene del estandarte de guerra de Takeda Shingen, que significa 'Viento, Bosque, Fuego, Montaña'. Son amigos leales de Kirito." 
    },
    aincrad_liberation_force: { 
        name: "Fuerza de Liberación de Aincrad (ALF)", 
        icon: "✊🚩", 
        description: "También conocido como 'El Ejército'. El gremio más grande, but a menudo criticado por su liderazgo y tácticas ineficaces.", 
        details: "Su objetivo principal es limpiar el juego, pero su tamaño masivo a veces conduce a desorganización y pérdidas innecesarias." 
    },
    divine_dragon_alliance: { 
        name: "Alianza de Dragones Divinos (DDA)", 
        icon: "🐉🤝", 
        description: "Un gremio de tamaño considerable que a menudo compite con otros gremios por recursos y áreas de caza.", 
        details: "Son conocidos por su agresividad y su enfoque en el poder militar. A veces entran en conflicto con otros gremios." 
    }
};