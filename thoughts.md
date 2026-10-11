# Agent Thoughts Log

## Task: Rework Effects & Item Definitions to Leverage Tag System + Create Migrations for All Existing Items
**Date**: 2026-10-10

### User Request Analysis
The user requested:
1. Reworking effects (healing, damage types, mana potions refilling mana, item definitions granting spells, skills, and stats) to leverage the Unified Tag System rather than brittle name/regex parsing.
2. Creating migrations for all existing items.

### Intent & Architectural Decisions
1. **Rule 0 Compliance (No Regexp / Pattern Matching)**:
   - Previously, mana potions checked `itemName.includes('mana potion')` or `item.name.toLowerCase().includes('mana')`.
   - Damage reduction checked debuff descriptions using `desc.match(/(\d+)%/)`.
   - Items with spell or skill grants relied on loose fields or ad-hoc properties.
   - **Resolution**:
     - Introduced `resource.*` namespace (`resource.mana`, `resource.hp-bars`, `resource.temp-bars`) and `action.restore`.
     - In `item.mjs`, structured outcomes define `{ type: 'restore_resource', resource: 'mana', formula: '1d10 + 5' }` with tags `['action.restore', 'resource.mana']`.
     - In `actor.mjs`, `getDamageReduction(damageType)` maps damage type to element via `damageTypeToElement()` and checks debuff tags (`element.<type>`), comparing against structured `reductionPercent` / `reductionFlat` without any regex.
     - In `template.json`, added `grants: []` schema to `gear`, `loot`, `buff`, `debuff`.
     - Structured grant kinds: `stat`, `skill`, `spell`, `dr`, `evade`, `tag_bonus`.
     - `prepareDerivedData` evaluates equipped gear grants, active buff grants, and tag query bonuses (e.g. `+2 to all element.fire spells`).

2. **Migration Pipeline (`src/migrations/migration-3.2.0.mjs`)**:
   - Built `migrateItemData320(itemData)`:
     - Detects legacy mana items / potions and converts to structured `outcomes` (`type: 'restore_resource'`, `resource: 'mana'`) and adds canonical tags.
     - Converts legacy healing potions to structured `heal` outcomes with tags `['action.heal', 'resource.hp-bars']`.
     - Converts legacy gear stat bonuses (`system.statBonuses`, `system.grantedSkills`, `system.grantedSpells`) into structured `system.grants`.
     - Assigns canonical tags (`resource.mana`, `resource.hp-bars`, `action.restore`, `action.heal`) based on structured outcomes.
   - Built `migrateActorData320(actorData)`: migrates all embedded items on actors.
   - Built `migrateWorld320()` and integrated into `migrateWorld()` in `src/migration.mjs`.
   - Rebuilt all compendium packs using `scripts/build-packs.mjs`.

3. **Verification**:
   - Created `tests/tag-effects-grants.test.mjs` verifying all 8 scenarios (mana potions, healing potions, damage reduction without regex, gear stat grants, tag query bonuses, sheet display of granted spells, and migration of legacy items).
   - Ran `node --test tests/*.test.mjs`: all 1,142 tests passing across 201 suites with 0 failures.

4. **Documentation & Release Artifacts**:
   - Bumped system version to `3.2.0` in `system.json`.
   - Updated `CHANGELOG.md` with complete 3.2.0 section.
   - Updated `README.md` with 3.2.0 features.
   - Updated `next.md` marking task completed.
   - Rebuilt all compendium packs using `scripts/build-packs.mjs`.

## Task: Fix Hot Stuff Aura Burst Radius, Ally Application, Character Sheet & Combat Tracker Display
**Date**: 2026-10-10

### User Request Analysis
- When casting Hot Stuff Aura:
  1. The burst distance calculation was using 20ft instead of 5ft at Rank 1.
  2. Allies in the burst radius were not receiving the bonus health bars.
  3. Temporary health bars were not being used properly after an attack.
  4. Ensure bonus health bars / hitpoints are clearly displayed on the character sheet or combat tracker or both, and applied to all allies in the burst radius.

### Architectural Decisions & Root Cause Analysis
1. **Burst Radius Calculation**:
   - `Hot Stuff Aura` has base radius 5ft (`area.radius: 5`).
   - Rank 10 upgrade adds +5ft radius (`rankBreaks.rank10.area.radiusBonus: 5`).
   - Rank 15 upgrade adds +10ft radius (`rankBreaks.rank15.area.radiusBonus: 10`).
   - Cumulative upgrade at Rank 15 is 5 + 5 + 10 = 20ft.
   - At Rank 1, radius must strictly be 5ft.
   - In `src/documents/actor.mjs` line 6135 and `src/dcc.mjs` line 2030, fallback was hardcoded as `|| 20`. If `sys.area.radius` was 0 or unset on legacy items, it defaulted to 20ft!
   - In `activateAura()`, rank upgrade bonuses used `else if` instead of cumulative progression, and fallback wasn't referencing canonical spell data.
   - **Fix**: Calculate cumulative rank upgrades (5ft base at rank 1, 10ft at rank 10, 20ft at rank 15). Fallback to 5ft for auras and burst spells. Look up canonical `DCC_SPELLS` if item properties are incomplete.

2. **Ally Application**:
   - `activateAura()` only granted temp bars to `this` (caster).
   - Hot Stuff Aura description states: "It also protects all allies within the radius."
   - **Fix**: In `activateAura()`, inspect canvas tokens (or `options.allies` / combatants), detect allies within `radius` ft, and call `grantTempBars()` on each ally. In `deactivateAura()`, clear temp bars with matching source on all allies within the scene/combat.

3. **Attack Damage Absorption Pipeline**:
   - `DCCCombatMetrics.applyDamageToTarget` absorbs from `tempBars` first.
   - However, if damage was applied via token HUD bar or direct actor update without `applyDamageToTarget`, `tempBars` were bypassed.
   - **Fix**: Override `modifyTokenAttribute` on `DCCActor` to route negative HP deltas through `applyDamage()`. Add `_preUpdate` absorption logic so any HP drop absorbs from active `tempBars` first slot-by-slot before reducing permanent HP bars.

4. **Character Sheet & Combat Tracker UI**:
   - Add shield badge indicator `[🛡️ +X Bars (Y Temp HP)]` in `DCCCombatTracker` combatant row (`templates/apps/combat-tracker.hbs`, `src/apps/combat-tracker.mjs`).
   - Add shield badge indicator on character sheet next to Temp HP numeric input (`templates/actors/parts/page1-core.hbs`).

5. **Verification & Tests**:
   - Updated `tests/setup.mjs` with MockActor cumulative radius calculation, ally detection, and `_absorbDamageIntoTempBars`.
   - Added 6 new test cases (10 through 15) in `tests/aura-workflow.test.mjs`.
   - Ran `node --test tests/*.test.mjs`: all 1,148 tests passing across 201 suites with 0 failures.
   - Bumped system version to `3.2.1` in `system.json`.
   - Updated `CHANGELOG.md` and `README.md`.

## Task: Brainstorm & Design UI/UX for Active Aura & Duration Tracking
**Date**: 2026-10-10

### User Request Analysis
- Provide ideas on how to show:
  1. If the user/crawler is currently affected by an aura.
  2. How much longer the aura effect will remain in place (rounds remaining / duration).
- Specific preference mentioned: Pathfinder 2e style effects panel docked to the left of the right sidebar channel (chat messages, etc.) showing clickable icon badges with remaining duration badges, expandable details, and dismiss actions.
- Open to other complementary ideas as well.

### Key Considerations
1. **Target Audience & Context**:
   - Both the caster (aura emitter) and allies (aura receivers within radius) need clear status indicators.
   - The indicator must update responsively as combat rounds progress (`DCCCombat.processRoundDurations`).
   - Clicking an effect should show rich information: name, rank, emitter token/actor, exact benefits granted (e.g., +4 Bonus Health Bars), remaining rounds/time, and dismiss controls (for the caster).
2. **Architecture in CarlRPG**:
   - CarlRPG already implements HUD overlays (`DCCFloorClockHUD`, `DCCCrawlerClockHUD`).
   - An effects panel positioned on the right screen edge (`#dcc-effects-panel`) can listen to token control change (`controlToken`), actor updates (`updateActor`), and combat round changes (`updateCombat`).
   - Character sheet (Page 1) already has active debuff and external buff strips—adding an active aura section keeps character sheet self-contained.
   - Token overlay / canvas templates give direct tactical visual feedback on the map.
3. **Duration Semantics**:
   - Combat Rounds: DCC rounds are 10s each. Hot Stuff Aura rank 1 duration is 3 rounds (30s) or sustained.
   - Emitter vs Receiver distinction: golden radiating aura icon for caster vs cyan shield aura icon for protected allies.
   - Remaining time display: round count badge overlay on icon (`3`, `2`, `1`), with flyout detail modal on click.

### Implementation Plan for PF2e-Style Effects Panel (`DCCEffectsPanel`):
1. **Model / Data Extraction**:
   - Given an active token or actor, extract:
     a) Active Auras (from `actor.system.activeAuras` or spell items with `system.isAura: true` and `system.auraActive: true`).
     b) In-range Aura Benefits (e.g. `system.tempBars` granted by an external aura caster).
     c) Active Buffs & Debuffs with durations.
   - For each effect, extract:
     - `id`, `name`, `icon` (fallback to system icons e.g. `icons/magic/fire/barrier-shield-fire.webp`), `type` (`aura-emitter`, `aura-receiver`, `buff`, `debuff`).
     - `source`: Caster actor/token name or "Self".
     - `roundsRemaining`: derived from `effect.duration.rounds` or combat tracking.
     - `durationLabel`: "2 rds", "10m", "∞".
     - `details`: mechanical summary (e.g. "+4 Temp Health Bars", "Absorbs Fire Damage").
     - `canDismiss`: boolean (true if user owns the caster actor or is GM).
2. **App Class (`src/apps/effects-panel.mjs`)**:
   - Follow singleton pattern like `DCCCrawlerClockHUD`.
   - Renders template `templates/apps/effects-panel.hbs`.
   - Dynamic positioning: docked to the left of `#sidebar`, adjusting dynamically if `#sidebar` is collapsed (`#sidebar.collapsed`).
   - Event listeners:
     - Click badge: toggle flyout details popover.
     - Click dismiss button: calls actor's `deactivateAura(spellId)` or removes effect.
     - Hooks: `controlToken`, `updateCombat`, `updateActor`, `deleteCombat`, `canvasReady`.
3. **Template & Styling**:
   - `templates/apps/effects-panel.hbs`: vertical column of badge items with badge count overlay, and collapsible `.dcc-effect-flyout` card.
   - `styles/dcc.css`: LitRPG aesthetics, gold border for emitters, cyan for receivers, dark semi-transparent glass backdrop, Oswald typography.
4. **Testing (`tests/effects-panel.test.mjs`)**:
   - Tests extracting effects from controlled token/actor.
   - Tests emitter vs receiver classification.
   - Tests duration countdown calculation (combat rounds vs infinite).
   - Tests flyout details formatting and dismissal authorization.

## Task: User-Creatable Custom Auras, Rank Scaling, and Multi-Effect Mechanics
**Date**: 2026-10-10

### User Request Analysis
- The user observed that looking at the Hot Stuff Aura definition, a player/GM could NOT currently recreate it or create an analogous custom spell (e.g. "Cold Stuff Aura", which deals cold damage to enemies while granting cold protection/temp bars to allies).
- The user requests options for allowing users to create custom spells and items that emit auras like Hot Stuff, get larger at different ranks, and apply different modular effects (damage, protection, temp health, buffs, debuffs).

### Architectural Breakdown of What's Currently Missing
1. **Spell Sheet UI (`templates/items/parts/spell.hbs`)**:
   - Currently lacks form fields for configuring `system.area` (checkbox for Aura/AoE, base radius, shape, target filter).
   - Lacks form fields for `system.tempBars` (checkbox, slot formula / ability selection, HP per slot).
   - Lacks rank break bonus fields for `area.radiusBonus` and `tempBars.hpPerSlot` in Rank 5, 10, 15, 20 cards.
   - Lacks modular Aura Effect selector (Damage per round to enemies, elemental protection/absorption, debuff to enemies, buff to allies).
2. **Actor Logic (`activateAura`)**:
   - Currently checks `spellItem.name.toLowerCase().includes('hot stuff')` or canonical fallback to `DCC_SPELLS`.
   - Needs to be 100% data-driven based on `system.area`, `system.tempBars`, `system.auraEffects`, and tags (`spell.aura`, `element.<type>`).
3. **Item Types (Spells vs Gear vs Buffs)**:
   - Items (gear, weapons, accessories) should also be able to emit auras (e.g., an "Aegis of the Frostborn" shield emitting a Cold Aura when equipped or activated).

### Architectural Plan: Unifying Option 1 & Option 2 with Progressive Disclosure
1. **Single Engine & Tag System Foundation**:
   - Everything runs through the unified tag, outcome, and grant engine (`system.outcomes`, `system.grants`, `system.area`, `system.tempBars`, `system.tags`).
   - For an aura spell/item:
     - Geometry: `system.area` (`hasArea: true`, `shape: 'burst'`, `radius: 5`, `origin: 'caster'`, `targetFilter: 'both' | 'allies' | 'enemies'`).
     - Rank breaks: `system.rankBreaks[rank].area.radiusBonus`, `system.rankBreaks[rank].tempBars.hpPerSlot`, `system.rankBreaks[rank].damageDice`.
     - Tags: `spell.aura`, `element.<type>` (e.g. `element.cold` or `element.fire`), `action.protect`, `action.damage`.
     - Structured Outcomes:
       - Allied effect: `type: 'grant_temp_bars'`, `stat: 'cha'`, `hpPerSlot: 2`, `absorbElement: 'cold'`, `targetFilter: 'allies'`.
       - Enemy effect: `type: 'damage'`, `formula: '1d6'`, `damageType: 'Cold'`, `trigger: 'round_end'`, `targetFilter: 'enemies'`.
       - Debuff effect: `type: 'apply_debuff'`, `debuff: 'Chilled'`, `trigger: 'aura_enter'`, `targetFilter: 'enemies'`.
2. **Progressive Disclosure UI (Collapsible & Expandable Sections)**:
   - In `templates/items/parts/spell.hbs`:
     - Keep the primary spell sheet uncluttered (Mana, Range, Target, Duration).
     - Add collapsible card headers with `<details>` or toggle buttons and chevron icons:
       - `[✨ AURA & AREA OF EFFECT CONFIGURATION]` (collapsed by default unless `system.area.hasArea` is checked).
       - Inside this section:
         - Quick enable toggle: `[x] Emits Aura / Area Effect`.
         - Radius & shape fields.
         - Target filter: Allies, Enemies, Both.
         - Allied Effects toggle/group (Temp bars formula & HP/slot, Elemental damage absorption).
         - Enemy Effects toggle/group (Periodic damage formula & damage type, on-enter/tick debuff).
     - Inside Rank Break Milestone Cards (Ranks 5, 10, 15, 20):
       - If `hasArea` is enabled, show compact inputs for `+ Radius Bonus` and `Upgraded Temp HP/bar` and `Aura Damage Bonus`.
3. **Engine Decoupling (Zero Hardcoded Names)**:
   - In `src/documents/actor.mjs`:
     - Refactor `activateAura()` to read strictly from the item's own properties (`sys.area`, `sys.tempBars`, `sys.outcomes`, `sys.damageType`, `sys.rankBreaks`).
     - Remove `spellItem.name.toLowerCase().includes('hot stuff')` and remove `DCC_SPELLS.find(...)` fallback.
     - When activated:
       - Grants temp bars / allied outcomes to caster and allies in radius.
       - If spell has enemy outcomes (damage / debuff), marks aura as hostile to enemies.
   - In `src/documents/combat.mjs`:
     - In `processRoundDurations()` and `nextRound()`:
       - If an active aura has enemy periodic damage, automatically triggers damage for enemy tokens standing inside the aura's template and applies debuffs.
       - Decrements duration rounds; cleans up when expired.
4. **Verification**:
   - Write comprehensive tests in `tests/custom-aura-creation.test.mjs` verifying:
     - Creating "Cold Stuff Aura" with 5ft base radius, Rank 10 (+5ft) and Rank 15 (+10ft) radius scaling.
     - Allies receiving cold damage absorption and temp bars.
     - Enemies receiving cold damage and Chilled debuff.
     - Zero reliance on canonical spell name matching.

## Task: Progressive Disclosure & Single Engine Integration (Combining Option 1 & Option 2)
**Date**: 2026-10-10

### User Request Analysis
- **Objective**: Implement both Option 1 (Modular Sheet UI with Progressive Disclosure) and Option 2 (Single Engine & Unified Tag System).
- **Core Constraint**: Do not introduce extra complexity for the user. Code can be sophisticated under the hood, but UI forms are already very extensive.
- **Specific UX Mandate**: Allow users to hide/show configuration parts. If they don't need to add damage effects, rank milestones, extra damage parts, or an aura, they shouldn't have to see those long blocks on the sheet. But if they change their mind, they can simply expand the area with a single click.

### Architectural Implementation Plan
1. **Option 2 (Single Engine & Tag System)**:
   - Maintain and extend the unified data-driven pipeline:
     - Auras (geometry, targetFilter, tempBars/protection, periodicDamage, debuffs) use `system.area`, `system.tempBars`, and `system.tags`.
     - Outcomes (restore resources, heal, buffs, debuffs, spells, tables) use `system.outcomes`.
     - Grants (stats, skills, spells, DR, evade, tag bonuses) use `system.grants`.
     - Single execution engine in `actor.activateAura()`, `item.useLoot()`, `item.useGear()`, `actor.triggerAuraPeriodicEffects()`.
     - No regexp, no hardcoded canonical names.

2. **Option 1 (Progressive Disclosure Sheet UI)**:
   - Refactor configuration sections across sheet templates (`spell.hbs`, `attack.hbs`, `gear.hbs`, `skill.hbs`) using `<details class="dcc-collapsible-block">`:
     - **Spell Sheet**:
       - Core fields (Mana, Range, Target, Duration, Cooldown, Stat, Damage Type, Base Damage) remain cleanly visible at the top.
       - Collapsible `[✨ AURA & AREA OF EFFECT CONFIGURATION]`: default open if `system.area.hasArea` is true.
       - Collapsible `[⚡ SPELL DAMAGE MODIFIERS & SCALING]`: default open if `system.damageModifiers.length` > 0.
       - Collapsible `[🎯 CRITICAL MILESTONES & CONDITION TRIGGERS]`: default open if crit multipliers or on-hit/fumble debuffs are set.
       - Collapsible `[🎖️ RANK BREAK CONFIGURATIONS (RANKS 5, 10, 15, 20)]`: default open if any rank break milestone has data.
     - **Attack Sheet**:
       - Core attack fields (Equipped, To-Hit Rank/Stat, Primary Dice/Stat/Type) visible at top.
       - Collapsible `[⚔️ WEAPON PROFICIENCY & HANDLING]`: default open if weapon category/type/associated skills configured.
       - Collapsible `[💥 DAMAGE PARTS & COMPOSITE TYPED DAMAGE]`: default open if `system.damageParts.length` > 0.
       - Collapsible `[🥋 OPTIONAL DAMAGE EFFECTS & COMBAT TECHNIQUES]`: default open if `system.optionalEffects` configured.
     - **Gear Sheet**:
       - Core gear fields (Slot, Equipped, Is Weapon, DR, Evade, Quantity, Value) visible at top.
       - Collapsible `[⚔️ WEAPON PROFICIENCY & HANDLING]` (if isWeapon/hands).
       - Collapsible `[💪 ABILITY MODIFIERS (EQUIPPED ONLY)]`: default open if any ability modifier != 0.
       - Collapsible `[📖 SKILL & SPELL MODIFIERS / GRANTS]`: default open if `system.skillModifiers.length` > 0.
       - Collapsible `[💥 WEAPON DAMAGE PARTS]`: default open if `system.damageParts.length` > 0.
       - Collapsible `[✨ PASSIVE AURA EMISSION (GEAR AURA)]`: allows gear to emit an aura using the same single engine!
       - Collapsible `[⚡ ACTIVATED ABILITY & ON-USE OUTCOMES]`: default open if activated ability or outcomes exist.
     - **Skill Sheet**:
       - Core skill fields visible at top.
       - Collapsible `[🥋 TECHNIQUES, CONDITIONS & MANEUVERS]`: default open if `system.isTechnique`.
       - Collapsible `[⚡ RANK-SCALING DAMAGE MODIFIERS]`: default open if `system.damageModifiers.length` > 0.
       - Collapsible `[🎖️ RANK BREAK CONFIGURATIONS]`: default open if rank break data exists.

3. **Styling & Interaction (`styles/dcc.css`)**:
   - Add chevron rotation animation (`.dcc-collapsible-block[open] > .dcc-collapsible-summary .dcc-chevron`).
   - Status pills on headers: visually indicate whether the section is active/configured (e.g. `[AURA CONFIGURED]`, `[3 SCALING MODS]`, `[+2 STR]`) in gold vs `[CLICK TO CONFIGURE]` in muted gray.
   - Clean padding, dark header with high contrast, and smooth transitions.

### Implementation & Verification Status
- **Schema & Model**: Added `area` and `tempBars` schemas to `gear-model.mjs` and `template.json`. Both spells and gear now use the exact same single engine without code duplication.
- **Progressive Disclosure Flags**: Added `hasAuraConfigured`, `hasDamageModifiersConfigured`, `hasConditionTriggersConfigured`, `hasRankBreaksConfigured`, `hasProficiencyConfigured`, `hasDamagePartsConfigured`, `hasOptionalEffectsConfigured`, `hasAbilityModifiers`, `hasSkillModifiersConfigured`, `hasTechniqueConfigured` in `DCCItemSheet._prepareContext`.
- **Template Conversions**: Wrapped advanced sections in `spell.hbs`, `attack.hbs`, `gear.hbs`, and `skill.hbs` inside `<details class="dcc-collapsible-block">` with dynamic `open` attributes and status badges.
- **Hydration Fix**: Updated `hydrateRankBreaks` in `src/data/rank-dice.mjs` to preserve `existing.area` and `existing.tempBars`.
- **Aura Deactivation**: Updated `deactivateAura` in `src/documents/actor.mjs` to return `{ active: false, deactivated: true }`.
- **Testing**: Added `tests/progressive-disclosure-sheets.test.mjs` with 6 rigorous unit tests covering progressive disclosure calculations for all item types and single-engine gear aura activation.
- **Suite Results**: Full test suite passes: **1,164 tests passing across 201 suites with 0 failures**.


4. **Testing & Verification**:
   - Write unit tests in `tests/progressive-disclosure-sheets.test.mjs` verifying:
     - `_prepareContext` sets flags (`hasAbilityModifiers`, `hasRankBreaksConfigured`, `hasDamageModifiersConfigured`, etc.).
     - Gear with auras correctly integrates with the single aura engine.
     - Template renders smoothly with sections collapsed/expanded based on data.
   - Run full test suite with `node --test tests/*.test.mjs`.

---

## Task: Canon Spells & Skills Deep Analysis — Unaccounted Game Mechanics & Build Options
**Date**: 2026-10-10

### User Request Analysis
- **Goal**: Review all 54 Canon Spells (`src/data/spells.mjs`) and 121 Canon Skills (`src/data/skills.mjs`).
- **Objective**: Identify game mechanics and effects that appear to NOT be accounted for in our current build options.
- **Deliverable**: Provide a prioritized, well-structured list of candidates to start working on next.

### Current Build System Capabilities (Baseline)
- **Spells**:
  - Base stats (Mana cost, Int/Cha stat, range, duration, cooldown, spellType, damageType, baseDamage).
  - Collapsible Aura & AoE Delivery (burst/cone/line, radius, caster/placed, allies/enemies filter, periodic damage, debuffs).
  - Collapsible Temp Bars (slotsFormula, hpPerSlot, first-absorption pipeline).
  - Collapsible Damage Modifiers (scaling/fixed bonuses).
  - Collapsible Condition Triggers (crit multipliers R5/R15, fumble debuff, on-hit debuff).
  - Collapsible Rank Breaks (R5, R10, R15, R20 milestone perks, radius bonuses, temp bar upgrades).
- **Skills**:
  - Rank, baseRank, boonBonus, itemBonus, stat, skillType, appliesTo.
  - Collapsible Techniques & Maneuvers (isTechnique, baseDiceCountMod, flatDamageMod, damageBonus, damageType, debuffName, cooldown).
  - Collapsible Condition Triggers (R5/R15 crit multipliers, fumble debuff, on-hit debuff).
  - Collapsible Attack Damage Modifiers (scaling/fixed bonuses).
  - Collapsible Rank Breaks (damageDice, rankDamageDice, buffsResistances, debuff, notes).
- **Attacks**:
  - To-hit rank/stat, primary formula, wieldMode, weaponCategory, weaponType, associatedSkills, composite damage parts, optional effects.
- **Gear**:
  - Equipped, slot, DR, Evade, weapon proficiency, ability modifiers, skill modifiers, damage parts, gear auras, activated ability outcomes.

### Unaccounted Canon Mechanics Identified
1. **Healing / Health Bar Restoration & Cleansing Mechanics (High Priority)**:
   - Spells: `Heal`, `Heal Self`, `Heal Others`, `Heal Critter`, `Intimate Touches`, `Nature's Breath`, `Solsplash`, `Drain Life`.
   - Skills: `First Aid`, `Regeneration`, `Cooking` (health recovery during rest).
   - Currently: Spells only have `baseDamage` and `applyDamage` chat card workflows. There is no structured `healingFormula` or `healHealthBars` action to restore permanent HP bars on targeted tokens, nor is there a structured debuff cleanse (e.g. `removeDebuff: 'Minor Injury'`).
2. **Armor-Piercing / Ignore Damage Resistance (DR) (High Priority)**:
   - Spells: `Icicles` (ignores DR), `Paladin's Smite` (Armor-Piercing at Rank 15), `Thunderlash`, `Vine Porn`.
   - Skills / Weapons: Attacks that ignore DR or treat target DR as 0.
   - Currently: `applyDamage` strictly subtracts target DR unless bypass is hardcoded. There is no user-facing checkbox/tag for `isArmorPiercing` / `ignoreDR` on spell or attack builders.
3. **Contested / Opposed Spell & Skill Checks (DC vs Stat/Skill) (High Priority)**:
   - Spells: `Rootfoot` (target Str vs Spell Rank/DC to break free), `Web`, `Panty Dropper` (Int-opposed check), `Grand Illusion`, `Turn Undead`.
   - Skills: `Stealth` vs `Perception`, `Ambush`, `Deception` vs `Detect Lies`, `Escape Artist` vs `Grapple`, `Taunt` vs `Insight`.
   - Currently: Attacks roll against static `10 + Foe Dex Mod + Floor`. There is no interactive "Roll Opposed Save / Escape Contest" card button for contested spell or skill effects.
4. **Reaction / Interrupt Mechanics & Action Economy Tracking (Medium-High Priority)**:
   - Spells: `Interrupt` spell type (`Hole`, `Protective Shell`, `Shield`).
   - Skills: `Attack of Opportunity`, `Shield Block`, `Intervene`, `Zone of Control`.
   - Currently: The character sheet tracks standard actions, but lacks explicit Reaction tracking (1 reaction per round) and reaction trigger prompts/cards.
5. **Summoning / Minion & Companion Spawner (Medium Priority)**:
   - Spells: `Rise, Dead Minion!` (summons Medium skeleton 1d8+Int), `Second Chance` (raises dead mob with 1/2 health bars), `Clockwork Triplicate`, `Minion Army`.
   - Currently: No interactive button to spawn a minion token linked to the caster.
6. **Terrain / Hazard / Barrier Placement (Medium Priority)**:
   - Spells: `Wall of Fire` (blocks line of sight, deals fire damage on pass), `Fireball` (ignites terrain), `Rise, Dead Minion!` (leaves difficult terrain on collapse).
7. **Crafting, Harvesting & Degraded Item Repair (Medium Priority)**:
   - Skills: `Alchemy`, `Cooking`, `Repair`, `Salvage`, `Dumpster Diving`, `Explosives Handling`, `Smithing`.
   - Currently: Rolled as simple d20 stat checks; no recipe or repair builder.
8. **Displacement / Knockback & Forced Movement (Medium Priority)**:
   - Spells: `Air Buddy` (fly 10 x Int mod), `Ice Blast` (push 10ft), `Protective Shell` (pushes mobs away radius+5ft).
   - Skills: `Toss` (throw enemy/object X feet based on Str).
## Task: Architectural Suggestions for Healing & Armor-Piercing Mechanics
**Date**: 2026-10-10

### Analysis of Current Gaps & Directives
1. **Rule 0 & GEMINI.md Compliance**:
   - No hardcoded canonical names (e.g. eliminate `spellItem.name === 'Heal'` or hardcoded 2 bars).
   - No regular expressions for mechanic parsing (e.g. eliminate `/2\s*(?:health\s*bar)?\s*slots?/i.test(...)`).
   - Use the Unified Tag System (`action.heal`, `action.cleanse`, `action.hot`, `action.armor_piercing`, `resource.hp-bars`).
   - Progressive Disclosure UI: Clean, non-cluttered item sheets with collapsible `<details>` blocks so users can easily configure new items with these mechanics.

### Mechanic 1: Healing / Health Bar Restoration & Cleansing
- **Core Concept**: Enable data-driven healing, regeneration, and debuff cleansing for spells, skills, and consumables.
- **Tag Integration**:
  - Tags: `action.heal`, `action.hot`, `action.cleanse`, `resource.hp-bars`, `resource.mana`, `target.self`, `target.ally`.
- **Data Model**:
  - `system.healing`:
    - `hasHealing: Boolean`
    - `barsFormula: String` ('1', '2', 'int', 'cha', 'con', '1d4')
    - `targetType: String` ('self', 'ally', 'all_allies', 'area')
    - `isHoT: Boolean`
    - `hotRounds: Number`
    - `cleanseDebuffs: Array<String>`
- **UI Interface**:
  - Collapsible `<details class="dcc-collapsible-block">` on `spell.hbs`, `skill.hbs`:
    - `[💚 HEALING, REGENERATION & CLEANSING CONFIGURATION]`
    - Dynamic status badge `[HEALING CONFIGURED]` vs `[CLICK TO CONFIGURE HEALING]`.
- **Chat Card & Actions**:
  - Dedicated `.dcc-healing-card` chat card.
  - Interactive `.dcc-apply-healing-btn`, `.dcc-apply-hot-btn`, and `.dcc-cleanse-debuff-btn` buttons.

### Mechanic 2: Armor-Piercing / Ignore Damage Resistance (DR)
- **Core Concept**: Allow weapons, attacks, spells, skills/techniques, and rank break milestones to intrinsically bypass target DR.
- **Tag Integration**:
  - Tags: `action.armor_piercing`, `action.ignore_dr`.
- **Data Model**:
  - `system.ignoreDR: Boolean` / `isArmorPiercing: Boolean` in `spell`, `attack`, `gear` (weapons), and `techniqueConfig`.
  - `rankBreaks[rank].isArmorPiercing: Boolean` for rank milestones (e.g. Paladin's Smite R15).
- **UI Interface**:
  - Quick toggle checkbox `[ ] Armor-Piercing (Ignores Target DR)` in `attack.hbs`, `spell.hbs`, `gear.hbs`, and `skill.hbs`.
  - Rank break milestone toggle in R5, R10, R15, R20 cards.
- **Chat Card & Actions**:
  - Prominent badge `[🛡️⚡ ARMOR-PIERCING]` on damage card.
  - Primary button automatically sets `data-ignore-dr="true"`.
  - Full integration with `DCCCombatMetrics.applyDamageToTarget({ ignoreDR: true })`.

---

## Task: Fix Tag Manager Checkbox Visibility & Eliminate Row Background Inversion
**Date**: 2026-10-10

### User Request Analysis
- In Tag Manager:
  1. The checkbox for adding/assigning a tag to an item is hard or impossible to see.
  2. When the checkbox is checked, the row background turns white while the text remains white, causing an illegible white-on-white state.
  3. Desired behavior: Keep the normal background without inversion when checked; ensure the checkbox is easily visible, high contrast, and clearly indicates checked state.

### Root Cause Analysis
1. **Row Background Inversion**:
   - In `templates/apps/tag-manager.hbs` line 74: `<tr style="border-bottom: 1px solid #eee; {{#if tag.isAssigned}}background: #f4fbf7;{{/if}}">`
   - In dark mode, `dcc.css` specifies `.dcc-tag-manager-container .dcc-tm-list table tbody td { color: #e5e7eb !important; }`.
   - When `tag.isAssigned` is true, the inline style sets `background: #f4fbf7` (off-white). The text is `#e5e7eb` (white), resulting in invisible white-on-white text.
   - **Fix**: Remove `{{#if tag.isAssigned}}background: #f4fbf7;{{/if}}` so table rows retain their consistent background in both light and dark themes.

2. **Checkbox Visibility**:
   - The checkbox had inline style `width: 14px; height: 14px;` with no explicit high-contrast borders or accent colors.
   - In dark mode, the browser/Foundry defaults to dark gray checkboxes against the dark `#141414` background, making them invisible.
   - **Fix**:
     - Upgrade sizing to `18px x 18px` with clear cursor and styling.
     - Add explicit high-contrast outline (`2px solid #555` in light mode, `2px solid #ffffff !important` in dark mode) so unchecked checkboxes pop out against any background.
     - Add `accent-color: #c0392b` (`#e74c3c` in dark mode) for crisp checkmarks on vivid red.
     - Style the custom tag create checkbox label (`.dcc-custom-tag-apply-label`) with high-contrast text in dark mode.

---

## Task: Unifying Skills with Aura Mechanics & Calling Out Spell vs. Skill Differences
**Date**: 2026-10-10

### 1. Differences Between Spells and Skills in DCC RPG
- **Resource Cost (Mana vs. At-Will / Cooldowns)**:
  - Spells require Mana Points (MP) to cast (unless cast from a scroll or consumable item).
  - Skills do not consume Mana. High-tier combat techniques or special maneuvers may have cooldowns (e.g. 1/round, 30 hours) or action restrictions, but no MP cost.
- **Favored Archetypes & Mana Surcharges**:
  - Spells have `favored` class archetypes (e.g. `Mage`, `Priest`). Non-favored casters incur a +1 MP penalty per spell cast (classless crawlers and pets are exempt).
  - Skills do not have a favored MP surcharge. Instead, classes and races apply flat skill rank bonuses or penalties (e.g. Boring Ol' Mage -3 to Str/Dex skills, floored at 1).
- **Stat Association & Check Types**:
  - Spells typically rely on `Int` (Arcane) or `Cha` (Divine). Rolls are either Spell Attacks vs Evade, Opposed Checks, or automatic effect applications (Auras/Heals/Utility).
  - Skills span all 5 attributes (`Str`, `Dex`, `Con`, `Int`, `Cha`).
- **Weapon Attacks & Synthesis**:
  - Combat skills (`Strike`, `Edge`, `Bashing`, `Reach`, `Ranged`, `Hand to Hand`) govern weapon proficiencies, wielding modes, and synthesize attacks on crawler sheets using the Rank Damage Die table (`+1d2` up to `+2d10`).
  - Spells have their own explicit base damage formulas and scaling modifiers.
- **Advancement & Training**:
  - Skills advance through invested hours, usage checks, and grinding advancement.
  - Spells are learned from spell books, class grants, or sponsors, advancing by rank.

### 2. Implementation Plan: Further Unifying the Engine with Skill Auras
- **Schema & Data Models (`template.json`, `src/models/items/skill-model.mjs`)**:
  - Add `area`, `delivery`, `tempBars`, `durationConfig`, and `active` schemas to `skill` matching `spell` and `gear`.
  - Add `area.radiusBonus` and `tempBars.hpPerSlot` to each Rank Break milestone card (`rank5`, `rank10`, `rank15`, `rank20`) on skills.
- **Progressive Disclosure UI (`templates/items/parts/skill.hbs`, `src/sheets/item-sheet.mjs`)**:
  - Add `hasAuraConfigured` calculation to `DCCItemSheet._prepareContext` for skills.
  - Add collapsible `<details class="dcc-collapsible-block" {{#if hasAuraConfigured}}open{{/if}}>` for Aura & AoE Configuration in `skill.hbs`.
  - Add `+ Radius Bonus (ft)` and `Upgraded Temp HP/Bar` inputs inside each Rank Break milestone card on `skill.hbs`.
- **Actor & Combat Execution (`src/documents/actor.mjs`, `src/apps/effects-panel.mjs`)**:
  - Update `activateAura(item)` to resolve effective rank via `getSkillRank(item.name)` when `item.type === 'skill'`.
  - Update `rollSkill(skillItem)` to detect when a skill emits an aura (`sys.area?.hasArea`). Toggling it activates the aura or dismisses it with clean chat cards.
  - Update `DCCEffectsPanel.collectEffects()` to include active auras emitted by skills (`['spell', 'skill', 'gear', 'buff'].includes(item.type)`).
- **Automated Tests**:
  - Create `tests/skill-aura-mechanics.test.mjs` verifying skill aura activation, radius scaling, temp bars, and effects panel presence.

### 3. Verification & Results
- **Test Suite Execution**: `node --test tests/skill-aura-mechanics.test.mjs` ran with 8 tests passing with 0 failures.
- **Full Regression Suite**: `node --test tests/*.test.mjs` ran across all 201 test suites with **1,173 tests passing and 0 failures**.
- **Engine Unification Completed**:
  - `template.json` and `skill-model.mjs` share identical area, temporary health bars, duration config, and rank break milestone upgrade fields with spells and gear.
  - `item-sheet.mjs` and `skill.hbs` feature progressive disclosure for skill auras.
  - `actor.activateAura`, `actor.deactivateAura`, and `actor.rollSkill` handle skill auras identically with spells.
  - `effects-panel.mjs` seamlessly renders active skill auras and receiver badges.
