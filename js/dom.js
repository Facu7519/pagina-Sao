// js/dom.js

/**
 * Función auxiliar para obtener un elemento del DOM por su ID.
 * @param {string} id - El ID del elemento a obtener.
 * @returns {HTMLElement|null} El elemento del DOM o null si no se encuentra.
 */
export const getEl = (id) => document.getElementById(id);

/**
 * Objeto que almacena referencias a los elementos del DOM más utilizados en la aplicación.
 * Esto optimiza el acceso al DOM al evitar búsquedas repetidas.
 */
export const domElements = {
    // HUD Principal y elementos generales del juego
    saoPlayerNameDisplay: getEl('sao-player-name-display'),
    saoHpBar: getEl('sao-hp-bar'),
    playerHpCurrentText: getEl('player-hp-current'),
    playerHpMaxText: getEl('player-hp-max'),
    playerLevelText: getEl('player-level'),
    playerStatusEffectsDisplay: getEl('player-status-effects-display'), // HUD principal
    playerMpCurrentElement: getEl('player-mp-current'),
    playerMpMaxElement: getEl('player-mp-max'),
    mpBarFillElement: getEl('mp-bar-fill'),
    currentExpElement: getEl('current-exp'),
    neededExpElement: getEl('needed-exp'),
    expBarFillElement: getEl('exp-bar-fill'),
    playerColElement: getEl('player-col'),
    currentFloorElement: getEl('current-floor'),
    floorNameElement: getEl('floor-name'),
    trainCostDisplay: getEl('train-cost-display'),

    // Modales y sus contenidos principales
    infoModalElement: getEl('infoModal'),
    modalBodyContentElement: getEl('modal-body-content'), // Para wiki y confirmaciones
    nameEntryModalElement: getEl('nameEntryModal'),
    playerNameInputElement: getEl('playerNameInput'),
    submitPlayerNameBtn: getEl('submitPlayerNameBtn'),

    // Modal de Inventario
    inventoryModalElement: getEl('inventoryModal'),
    inventoryGridDisplay: getEl('inventory-grid-display'),
    equipWeaponSlot: getEl('equip-weapon'),
    equipShieldSlot: getEl('equip-shield'),
    equipArmorSlot: getEl('equip-armor'),
    equipAccessorySlot: getEl('equip-accessory'),

    // Modal de Tienda
    shopModalElement: getEl('shopModal'),
    shopGridDisplay: getEl('shop-grid-display'),
    shopFloorNumberElement: getEl('shop-floor-number'),
    shopPlayerColElement: getEl('shop-player-col'),

    // Modal de Herrería
    blacksmithModalElement: getEl('blacksmithModal'),
    blacksmithGridDisplay: getEl('blacksmith-grid-display'),
    blacksmithFloorNumberElement: getEl('blacksmith-floor-number'),
    blacksmithPlayerColElement: getEl('blacksmith-player-col'),
    playerMaterialsListElement: getEl('player-materials-list'),

    // Modal de Estadísticas del Jugador
    playerStatsModalElement: getEl('playerStatsModal'),
    statsPlayerName: getEl('stats-player-name'),
    statsLevel: getEl('stats-level'),
    statsHp: getEl('stats-hp'),
    statsMp: getEl('stats-mp'),
    statsExp: getEl('stats-exp'),
    statsCol: getEl('stats-col'),
    statsBaseAtk: getEl('stats-base-atk'),
    statsBaseDef: getEl('stats-base-def'),
    statsEquipAtk: getEl('stats-equip-atk'),
    statsEquipDef: getEl('stats-equip-def'),
    statsEquipHp: getEl('stats-equip-hp'),
    statsTotalAtk: getEl('stats-total-atk'),
    statsTotalDef: getEl('stats-total-def'),
    statsSkillsList: getEl('stats-skills-list'),
    statsPassiveSkillsList: getEl('stats-passive-skills-list'),

    // Modal de Combate
    combatModalElement: getEl('combatModal'),
    combatTitleElement: getEl('combat-title'),
    combatPlayerDisplay: getEl('combat-player-display'),
    combatPlayerNameElement: getEl('combat-player-name'),
    combatPlayerAvatarImg: document.querySelector('#combat-player-display .combatant-icon img'),
    combatPlayerHpBarElement: getEl('combat-player-hp-bar'),
    combatPlayerHpCurrentElement: getEl('combat-player-hp-current'),
    combatPlayerHpMaxElement: getEl('combat-player-hp-max'),
    combatPlayerMpCurrentElement: getEl('combat-player-mp-current'),
    combatPlayerMpMaxElement: getEl('combat-player-mp-max'),
    combatPlayerAtkElement: getEl('combat-player-atk'),
    combatPlayerDefElement: getEl('combat-player-def'),
    combatPlayerStatusEffectsDisplay: getEl('combat-player-status-effects-display'), // En combate
    combatEnemyDisplay: getEl('combat-enemy-display'),
    combatEnemyNameElement: getEl('combat-enemy-name'),
    combatEnemyIconElement: getEl('combat-enemy-icon'),
    combatEnemyHpBarsContainer: getEl('combat-enemy-hp-bars-container'),
    combatEnemySingleHpBarFill: getEl('combat-enemy-hp-bar-fill'), // Para barra única
    // Referencias a barras de HP de segmento de jefe se obtendrán dinámicamente si es necesario
    combatEnemyHpCurrentElement: getEl('combat-enemy-hp-current'),
    combatEnemyHpMaxElement: getEl('combat-enemy-hp-max'),
    combatEnemyAtkElement: getEl('combat-enemy-atk'),
    combatEnemyDefElement: getEl('combat-enemy-def'),
    combatEnemyStatusEffectsDisplay: getEl('combat-enemy-status-effects-display'), // En combate
    combatLogDisplayElement: getEl('combat-log-display'),
    combatActionAttackBtn: getEl('combat-action-attack'),
    combatActionSkillsBtn: getEl('combat-action-skills'),
    combatActionPotionsBtn: getEl('combat-action-potions'),
    combatActionFleeBtn: getEl('combat-action-flee'),
    combatSkillsListContainer: getEl('combat-skills-list-container'),
    combatPotionsListContainer: getEl('combat-potions-list-container'),

    // Botones de Acción Principales (fuera de modales específicos)
    combatBtn: getEl('combat-btn'),
    bossCombatBtn: getEl('boss-combat-btn'),
    trainSkillBtn: getEl('train-skill-btn'),
    inventoryBtn: getEl('inventory-btn'),
    shopBtn: getEl('shop-btn'),
    blacksmithBtn: getEl('blacksmith-btn'),
    playerStatsBtn: getEl('player-stats-btn'),
    floorNavigateBtn: getEl('floor-navigate-btn'),
    adminAccessBtn: getEl('admin-access-btn'), // Para abrir modal de clave de admin
    questsBtn: getEl('quests-btn'),

    // Modal de Navegación entre Pisos
    floorNavigationModal: getEl('floorNavigationModal'),
    floorSelectGrid: getEl('floor-select-grid'),

    // Modal de Entrenamiento
    trainingModal: getEl('trainingModal'),
    trainingGridDisplay: getEl('training-grid-display'),
    trainingPlayerCol: getEl('training-player-col'),
    trainingStatsPreview: getEl('training-stats-preview'),
    
    // Modal de Misiones
    questsModal: getEl('questsModal'),
    availableQuestsList: getEl('available-quests-list'),
    activeQuestsList: getEl('active-quests-list'),
    completedQuestsList: getEl('completed-quests-list'),
    questDetailsArea: getEl('quest-details-area'),
    questDetailTitle: getEl('quest-detail-title'),
    questDetailDescription: getEl('quest-detail-description'),
    questDetailObjectives: getEl('quest-detail-objectives'),
    questDetailRewards: getEl('quest-detail-rewards'),
    questActionBtn: getEl('quest-action-btn'),

    // Modal de Panel de Administrador y Clave
    adminKeyModal: getEl('adminKeyModal'),
    adminKeyValueInput: getEl('adminKeyValue'),
    submitAdminKeyBtn: getEl('submitAdminKeyBtn'),
    adminKeyErrorMsg: getEl('adminKeyErrorMsg'),
    adminPanelModal: getEl('adminPanelModal'),
    adminPanelMessage: getEl('adminPanelMessage'),
    adminSetLevelValueInput: getEl('adminSetLevelValue'),
    adminGiveExpValueInput: getEl('adminGiveExpValue'),
    adminGiveColValueInput: getEl('adminGiveColValue'),
    adminSetBaseAtkValueInput: getEl('adminSetBaseAtkValue'),
    adminSetBaseDefValueInput: getEl('adminSetBaseDefValue'),
    adminSetBaseMaxHpValueInput: getEl('adminSetBaseMaxHpValue'),
    adminSetBaseMaxMpValueInput: getEl('adminSetBaseMaxMpValue'),
    adminItemIdValueInput: getEl('adminItemIdValue'),
    adminItemDetailsPreviewDiv: getEl('adminItemDetailsPreview'),
    adminItemQuantityValueInput: getEl('adminItemQuantityValue'),
    adminItemQuickSelect: getEl('adminItemQuickSelect'),
    adminFloorNumberValueInput: getEl('adminFloorNumberValue'),
    adminUnlockedFloorsListDiv: getEl('adminUnlockedFloorsList'),
    adminQuestDefinitionSelect: getEl('adminQuestDefinitionSelect'),
    adminQuestIdInput: getEl('adminQuestId'),
    adminQuestTitleInput: getEl('adminQuestTitle'),
    adminQuestDescriptionInput: getEl('adminQuestDescription'),
    adminQuestTypeSelect: getEl('adminQuestType'),
    adminQuestTargetIdInput: getEl('adminQuestTargetId'),
    adminQuestTargetCountInput: getEl('adminQuestTargetCount'),
    adminQuestLevelReqInput: getEl('adminQuestLevelReq'),
    adminQuestRewardColInput: getEl('adminQuestRewardCol'),
    adminQuestRewardExpInput: getEl('adminQuestRewardExp'),
    adminQuestRewardItemIdInput: getEl('adminQuestRewardItemId'),
    adminQuestRewardItemQtyInput: getEl('adminQuestRewardItemQty'),
    adminPlayerQuestSelect: getEl('adminPlayerQuestSelect'),


    // Elementos de la Wiki
    charactersGridDisplay: getEl('characters-grid-display'),
    weaponsGridDisplay: getEl('weapons-grid-display'),
    floorsInfoContainer: getEl('floors-info-container'),
    guildsInfoContainer: getEl('guilds-info-container'),
    
    // Elementos Audiovisuales y de Notificación
    backgroundMusic: getEl('background-music'),
    musicToggleBtn: getEl('music-toggle-btn'),
    notificationArea: getEl('notification-area'),
    particlesContainer: getEl('particles'),

    // Nav Links (para active state)
    navLinks: document.querySelectorAll('.nav-links a'),
};