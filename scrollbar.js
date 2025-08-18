// Scrollbar palette mapper: asigna paletas por rango de piso y aplica transiciones suaves.
(function(){
	const root = document.documentElement;

	// Paletas por rango de pisos. Cada entrada: [min, max, {h,s,l}]
	const paletteRanges = [
		[1,2,  {h: 120, s: '70%', l: '46%'}],   // verdes
		[3,5,  {h: 200, s: '85%', l: '55%'}],   // azules
		[6,10, {h: 260, s: '72%', l: '58%'}],   // morados
		[11,20,{h: 30, s: '85%', l: '55%'}],    // dorados/ámbar
		[21,40,{h: 15, s: '80%', l: '48%'}],    // rojizos
		[41,100,{h: 197, s: '85%', l: '58%'}]   // default cian
	];

	function findPaletteForFloor(f){
		const floor = Number(f) || 1;
		for (let p of paletteRanges){
			if (floor >= p[0] && floor <= p[1]) return p[2];
		}
		return paletteRanges[paletteRanges.length-1][2];
	}

	function applyPalette(pal){
		// Aplicar con transición suave: usamos variables CSS y una transición en linea
		// (la propiedad CSS vars themselves no animan en todos los navegadores; hacemos una transición
		//  sobre una propiedad temporal para forzar interpolación visual)

		// Establecer una variable de estado para transición
		root.style.setProperty('--scroll-accent-h', String(pal.h));
		root.style.setProperty('--scroll-accent-s', pal.s);
		root.style.setProperty('--scroll-accent-l', pal.l);

		// Actualizar los colores compuestos también para compatibilidad inmediata
		root.style.setProperty('--scroll-accent', `hsl(${pal.h}, ${pal.s}, ${pal.l})`);
		root.style.setProperty('--scroll-accent-2', `hsl(${(pal.h + 18)}, 92%, 64%)`);

		// Añadir una clase que activa una transición suave en CSS (si está disponible)
		root.classList.add('scrollbar-color-transition');
		clearTimeout(applyPalette._t);
		applyPalette._t = setTimeout(()=> root.classList.remove('scrollbar-color-transition'), 520);
	}

	// Observa cambios en #current-floor
	const el = document.getElementById('current-floor');
	if (el){
		const applyFromEl = ()=>{
			const v = el.textContent.trim();
			const pal = findPaletteForFloor(v);
			applyPalette(pal);
		};
		applyFromEl();
		const mo = new MutationObserver(applyFromEl);
		mo.observe(el, { childList: true, characterData: true, subtree: true });
	}

	// Exponer helper para uso manual si se desea
	window.__sao_scrollbar = window.__sao_scrollbar || {};
	window.__sao_scrollbar.applyPaletteForFloor = function(floor){
		const pal = findPaletteForFloor(floor);
		applyPalette(pal);
	};

})();