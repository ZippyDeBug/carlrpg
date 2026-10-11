# Agent Thoughts Log

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
1. **Summoning / Minion & Companion Spawner (Medium Priority)**:
   - Spells: `Rise, Dead Minion!` (summons Medium skeleton 1d8+Int), `Second Chance` (raises dead mob with 1/2 health bars), `Clockwork Triplicate`, `Minion Army`.
   - Currently: No interactive button to spawn a minion token linked to the caster.
   - A key game mechanic is the mob generator where mobs are generated every round up to a maximum or for each mob killed n new mobs are generated up to a maximum.  This could be more like a hazard or trap that is placed on the map and generates mobs every round.
2. **Terrain / Hazard / Barrier Placement (Medium Priority)**:
   - Spells: `Wall of Fire` (blocks line of sight, deals fire damage on pass), `Fireball` (ignites terrain), `Rise, Dead Minion!` (leaves difficult terrain on collapse).
3. **Crafting, Harvesting & Degraded Item Repair (Medium Priority)**:
   - Skills: `Alchemy`, `Cooking`, `Repair`, `Salvage`, `Dumpster Diving`, `Explosives Handling`, `Smithing`.
   - Currently: Rolled as simple d20 stat checks; no recipe or repair builder.
4. **Displacement / Knockback & Forced Movement (Medium Priority)**:
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

## Task: Audit Free-Form Text Inputs on Character, Spell, Item, and Skill Sheets
**Date**: 2026-10-11

### User Objective
- Inspect character (`crawler-sheet.hbs` & parts), spell (`spell.hbs`), item (`gear.hbs`, `attack.hbs`, `loot.hbs`, `buff.hbs`, `debuff.hbs`, etc.), and skill sheets (`skill.hbs`, `page3-skills.hbs`).
- Find any free-form text areas (text inputs, textareas, comma-separated strings, ad-hoc text fields) that are NOT descriptions, notes, or flavor text.
- Catalog each identified free-form field.
- Provide actionable suggestions for transforming them into:
  1. Controlled selectors / dropdowns / multi-select pills, OR

### Audit Findings & Catalog Overview
We conducted an exhaustive audit across the character sheet (`crawler-sheet.hbs`, `page1-core.hbs`, `page2-hotlist.hbs`, `page3-skills.hbs`, `page4-inventory.hbs`, `page5-extras.hbs`, `page6-abilities.hbs`, `spells.hbs`, `conditions.hbs`, `story-extras.hbs`, `achievements.hbs`) and all item sheets (`spell.hbs`, `skill.hbs`, `attack.hbs`, `gear.hbs`, `loot.hbs`, `buff.hbs`, `debuff.hbs`, `class.hbs`, `race.hbs`, `achievement.hbs`).

We isolated all non-description, non-lore, non-narrative free-form text inputs and textareas.

### Catalog Summary
1. **Spell Sheet (`spell.hbs`)**:
   - `system.spellType`: Free text input -> Should be `action.*` selector / tag picker (`action.attack`, `action.heal`, `action.passive`, `action.interrupt`, `action.reaction`, `action.free_interrupt`).
   - `system.damageType`: Free text input -> Should be `element.*` selector / tag picker (`element.fire`, `element.ice`, `element.electric`, etc.).
   - `system.favored`: Free text input -> Should be `favored.*` / `archetype.*` multi-select pills (`favored.mage`, `favored.bard`, etc.).
   - `system.duration`: Free text input -> Should be `duration.*` selector (`duration.instant`, `duration.rounds`, `duration.minutes`, `duration.hours`, `duration.combat`, `duration.permanent`).
   - `system.target`: Free text input -> Should be `delivery.*` / `target.*` selector (`target.allies`, `target.enemies`, `target.self`, `target.all`).
   - `system.range`: Free text input -> Range distance selector (Self, Touch, 15ft, 30ft, 60ft, 120ft, Sight) or formula.
   - `system.cooldown`: Free text input -> Cooldown selector (None, 1/Round, 1/Scene, 2h/Rank, 24h, Rest).
   - `system.limitations`: Free text input -> `rule.*` tags (`rule.requires-weapon`, `rule.depletes-on-empty`, etc.).
   - `system.healing.cleanseDebuffs` & `rankBreaks.*.cleanseDebuff`: Comma-separated text input -> Multi-select condition pills from `availableDebuffs` or `condition.*` tags.
   - `system.optionalEffects`: Comma-separated text input -> Metamagic / spell rider tag picker (`action.metamagic.*` or technique selector).
   - `system.rankBreaks.*.buffsResistances`: Free text input -> Structured resistance (`element.*`) + stat bonus (`stat.*`) builder.

2. **Skill Sheet (`skill.hbs`)**:
   - `system.checkType`: Free text input -> Selector (`Stat Check`, `Contested`, `Opposed`, `Attack Action`, `Passive`, `Saving / Reaction`, `None`) or `action.*`/`contest.*` tags.
   - `system.appliesTo`: Free text input -> Multi-select pills using `weapon.*`, `weaponClass.*`, `skillGroup.*`, or `technique.*` tags.
   - `system.techniqueConfig.cooldown`: Free text input -> Cooldown selector or `rule.cooldown-hours` tag.
   - `system.healing.cleanseDebuffs` & `rankBreaks.*.cleanseDebuff`: Comma-separated text -> Multi-select condition pills from `availableDebuffs`.
   - `system.rankBreaks.*.buffsResistances`: Free text input -> Structured resistance (`element.*`) + stat bonus (`stat.*`) builder.

3. **Attack Sheet (`attack.hbs`)**:
   - `system.weaponType`: Free text input -> `weapon.*` tag dropdown/builder.
   - `system.associatedSkills`: Comma-separated text input -> Upgrade to the same interactive pill/select widget already on `gear.hbs`.
   - `system.effects`: Free text input -> Multi-select condition/effect tags (`element.*`, `trigger.*`, `condition.*`).
   - `system.optionalEffects`: Comma-separated text input -> Interactive technique pills matching `gear.hbs`.

4. **Gear & Loot Sheets (`gear.hbs`, `loot.hbs`)**:
   - `system.weaponType` on gear -> `weapon.*` tag dropdown.
   - `system.cooldown` on gear & loot -> Standardized cooldown selector.
   - `system.outcomes.*.cureFilter` on gear & loot -> Condition multi-select picker (`condition.*`).
   - `system.outcomes.*.skillName` on gear & loot -> Skill datalist / compendium dropdown.
   - `system.outcomes.*.damageType` on gear & loot -> `element.*` dropdown.

5. **Buff & Debuff Sheets (`buff.hbs`, `debuff.hbs`)**:
   - `system.affects`: Comma-separated text input -> Checkbox pills for scopes (`all`, `attacks`, `spells`, `skills`, `str`, `dex`, `con`, `int`, `cha`).
   - `system.duration`: Free text input -> `duration.*` selector (`duration.rounds`, `duration.combat`, `duration.minutes`, `duration.permanent`).
   - `system.healingPerRound` / `system.damagePerRound`: Free text input -> Formula + periodic interval builder.

6. **Class & Race Sheets (`class.hbs`, `race.hbs`)**:
   - `system.classType`: Free text input -> `archetype.*` dropdown (`archetype.fighter`, `archetype.mage`, etc.).
   - `system.size`: Free text input -> Standard DCC size category selector (Tiny, Small, Medium, Large, Huge, Gargantuan).

7. **Character Sheet (`crawler-sheet.hbs` & parts)**:
   - `system.gearSlots.*` (page 2 & 4): Free text inputs for gear slot notes -> Either remove redundant text inputs or replace with quick equipment slot picker.
   - `system.details.classification` & `creatureType` (page 1 mob): Free text inputs -> Mob taxonomy dropdown / `kind.*` tags.
   - `system.details.floor` & `system.floor` (achievements): Free text inputs -> Floor selector (Floors 1–18, World, Celestial).
   - `system.details.popularity`: Free text input -> Numerical rating with tier badge.
   - `system.details.mountSize`: Free text input -> (DEFERRED: Mounts & pets out of scope for now per user instruction).
   - `system.details.deity`: Free text input -> Deity compendium selector / drop zone.
   - `system.attributes.debuffs` (page 1 core): Free text textarea -> Deprecate in favor of the active Conditions chips already rendered right above it.

### Execution Plan: 4-Phase Rollout

**Phase 1: Spells & Skills (`spell.hbs`, `skill.hbs`, `page3-skills.hbs`)**
- `spell.hbs`:
  - `system.spellType`: Convert to `<select>` populated from `spellTypes` (`action.attack`, `action.heal`, `action.passive`, `action.interrupt`, `action.reaction`, `action.free_interrupt`, `utility`).
  - `system.damageType`: Convert to `<select>` using `damageTypes` (elemental/physical).
  - `system.favored`: Convert to archetype `<select>` or tag pills (`archetypeOptions`).
  - `system.duration`: Convert to `<select>` using `durationOptions` (Instantaneous, Combat Rounds, Minutes, Hours, Until End of Combat, Permanent / Sustained) + custom support.
  - `system.cooldown`: Convert to `<select>` using `cooldownOptions` (None, 1/Round, Once per Scene / Combat, 2 Hours per Rank, 24 Hours, Until Rest) + custom support.
  - `system.target`: Convert to `<select>` (`targetFilterOptions`: allies, enemies, self, all).
  - `cleanseDebuffs`: Convert from raw text into multi-select condition chips from `availableDebuffs` across base healing config and rank breaks.
- `skill.hbs` & `page3-skills.hbs`:
  - `system.checkType`: Convert to `<select>` (`checkTypeOptions`: Stat Check, Opposed Contest, Attack vs Evade, Saving Throw / Reaction, Passive, Tool / Crafting Check, None).
  - `system.appliesTo`: Upgrade to tag pill widget with auto-suggest.
  - `system.techniqueConfig.cooldown`: Convert to `<select>` using `cooldownOptions`.
  - `cleanseDebuffs`: Convert to multi-select condition chips.

**Phase 2: Attacks, Gear & Loot (`attack.hbs`, `gear.hbs`, `loot.hbs`)**
- `attack.hbs`:
  - `system.weaponType`: Convert to `<select>` using weapon tag catalog / options.
  - `system.associatedSkills`: Upgrade from plain comma string to interactive tag pill widget with auto-suggest (parity with `gear.hbs`).
  - `system.optionalEffects`: Upgrade to interactive tag pill widget with auto-suggest (parity with `gear.hbs`).
- `gear.hbs`:
  - `system.weaponType`: Convert to `<select>` using weapon tag catalog.
  - `system.cooldown`: Convert to `<select>` using `cooldownOptions`.
  - `system.outcomes.*.damageType`: Ensure `<select>` using `damageTypes`.
- `loot.hbs`:
  - `system.cooldown`: Convert to `<select>` using `cooldownOptions`.
  - `system.outcomes.*.damageType`: Convert to `<select>` using `damageTypes`.

**Phase 3: Buffs, Debuffs, Classes & Races (`buff.hbs`, `debuff.hbs`, `class.hbs`, `race.hbs`)**
- `buff.hbs` & `debuff.hbs`:
  - `system.duration`: Convert to `<select>` using `durationOptions`.
  - `system.affects`: Convert comma-separated string to multi-select checkbox pills (`scopeOptions`: `all`, `attacks`, `spells`, `skills`, `str`, `dex`, `con`, `int`, `cha`).
- `class.hbs`:
  - `system.classType`: Convert to `<select>` using `archetypeOptions`.
- `race.hbs`:
  - `system.size`: Convert to `<select>` using `sizeOptions` (Tiny, Small, Medium, Large, Huge, Gargantuan).

**Phase 4: Character Sheet & Achievements (`page1-core.hbs`, `page2-hotlist.hbs`, `page4-inventory.hbs`, `achievement.hbs`)**
- *(Note: Mounts and Pets strictly excluded per user instructions).*
- `page1-core.hbs`:
  - `system.details.classification`: Convert to `<select>` (Normal, Minion, Elite, Boss, World Boss, Unique).
  - `system.details.creatureType`: Convert to `<select>` (Beast, Undead, Construct, Humanoid, Aberration, Elemental, Demon, Celestial, Plant, Dragon).
  - `system.details.floor`: Convert to `<select>` (Floors 1-18, Overworld, Celestial).
  - `system.attributes.debuffs`: Deprecate free textarea in favor of active condition badges already present.
- `achievement.hbs`:
  - `system.floor`: Convert to `<select>` (Floors 1-18, World, Celestial).
- `page2-hotlist.hbs` & `page4-inventory.hbs`:
  - Remove redundant dead free text inputs on gear slots in favor of clean equipped badges and item drop-links.

### Execution Results & Verification
- **Phase 1: Spells & Skills**: Complete.
  - `spell.hbs`: `spellType`, `duration`, `cooldown`, `target`, `damageType`, `favored` converted to `<select>`. `cleanseDebuffs` upgraded to interactive removable condition chips with dropdown picker and custom inputs. Rank break cleanse debuffs converted to `<select>` populated from `availableDebuffs`.
  - `skill.hbs` & `page3-skills.hbs`: `checkType` converted to `<select>` across item sheet and actor sheet skills table. `appliesTo` upgraded to interactive tag pills with auto-suggest. `techniqueConfig.cooldown` converted to `<select>`.
- **Phase 2: Attacks, Gear & Loot**: Complete.
  - `attack.hbs`: `weaponType` converted to `<select>` using `weaponTypeOptions`. `associatedSkills` and `optionalEffects` converted to interactive tag pill badges with dropdown pickers and auto-suggest buttons (parity with `gear.hbs`).
  - `gear.hbs`: `weaponType`, `cooldown`, and outcome `damageType` converted to `<select>`.
  - `loot.hbs`: `cooldown` and outcome `damageType` converted to `<select>`.
- **Phase 3: Buffs, Debuffs, Classes & Races**: Complete.
  - `buff.hbs` & `debuff.hbs`: `duration` converted to `<select>` using `durationOptions`. `affects` converted to interactive scope toggle chips (`scopeOptions`).
  - `class.hbs`: `classType` converted to `<select>` using `classTypeOptions`.
  - `race.hbs`: `size` converted to `<select>` using `sizeOptions`.
- **Phase 4: Character Sheet & Achievements**: Complete.
  - `page1-core.hbs`: Mob `classification`, mob `creatureType`, and crawler/mob `floor` converted to `<select>` using `mobClassifications`, `mobCreatureTypes`, and `floorOptions`.
  - `achievement.hbs`: `floor` converted to `<select>` using `floorOptions`.
  - `page2-hotlist.hbs`: Removed duplicate `name="system.gearSlots.*"` inputs to eliminate array serialization bugs (Rule 6); added `.actor-inline-edit` listener to allow hotlist editing without duplicate form harvest.
  - Mounts & Pets preserved as-is per user instruction.
- **Verification**:
  - `tests/sheet-selectors-and-tags.test.mjs` created and passing.
  - Full test suite: **1,255 tests passing across 226 suites with 0 failures**.
- **Release**:
  - Bumped version to `3.2.11` in `system.json`.
  - Updated `CHANGELOG.md`, `README.md`, and created `docs/sheet-selectors-and-tags.md`.



## Task: Fix Aura Expiration & Deactivation Not Removing Effects From All Affected Entities
**Date**: 2026-10-11

### Problem Analysis
- **User Issue**: "When Hot Stuff Aura expires, it correctly removes the aura affect from the caster, but did not remove the affect from other allies in the aura. When an aura expires it should remove its affect from all entities in the aura that are affected."
- **Root Cause 1 (`src/documents/combat.mjs` - `processRoundDurations`)**:
  - When a round-based spell/aura reaches round 0 in `combat.processRoundDurations`, it only clears `tempBars` on the caster `actor`.
  - It NEVER invoked `actor.deactivateAura(item)` or cleaned up allies or other entities affected by the aura.
- **Root Cause 2 (`src/documents/actor.mjs` - `deactivateAura`)**:
  - `deactivateAura(spellItem, options)` only searched `canvas.tokens.placeables` and `options.allies`.
  - When an aura was activated via `activateAura({ allies })`, the affected ally IDs were not stored on the item (`system.appliedAllies`).
  - When deactivated later (e.g. via round duration expiration, `rollSpell` toggle, or EffectsPanel button), `options.allies` is missing.
  - Furthermore, `deactivateAura` did not check `game.combat?.combatants` or `game.actors`, nor did it clean up any linked condition items (debuffs/buffs with duration `${auraName} Aura` or `auraItemId`).
- **Root Cause 3 (`src/models/items/spell-model.mjs` & `skill-model.mjs` & `template.json`)**:
  - `system.appliedAllies` was not part of the schema definitions, preventing persistent tracking of entities affected by the aura across rounds.

### Implementation Plan
1. **Schema Enhancements**:
   - Add `appliedAllies: new fields.ArrayField(new fields.StringField(), { initial: [] })` to `spell-model.mjs` and `skill-model.mjs`.
   - Update `template.json` to include `"appliedAllies": []` under `spell` and `skill`.
2. **Actor Document (`src/documents/actor.mjs`)**:
   - In `activateAura`: Record all affected ally IDs into `system.appliedAllies` when updating `spellItem`.
   - In `deactivateAura`:
     - Collect all candidate entities from:
       a) `options.allies`
       b) `sys.appliedAllies` (resolved via `game.actors`, `canvas.tokens`, or `game.combat`)
       c) `canvas.tokens.placeables` (all tokens with actors)
       d) Active combat combatants (`game.combat?.combatants` or `options.combatants`)
       e) World actors (`game.actors`)
     - For each entity:
       - Clear temporary health bars if `tempBars.source` matches `auraName` or if entity ID is in `appliedAllies`.
       - Clear any embedded debuff/buff items where `system.duration === `${auraName} Aura`` or `system.source === auraName` or flag `auraItemId === spellItem.id`.
     - Reset `system.appliedAllies: []` on the item.
3. **Combat Document (`src/documents/combat.mjs`)**:
   - In `processRoundDurations`: When an aura expires (detected via delivery/tags/method), call `await actor.deactivateAura(item, { combatants: this.combatants })` to ensure complete cleanup across all affected combatants and entities.
4. **Automated Tests**:
   - Add tests to `tests/aura-workflow.test.mjs` verifying:
     - Aura expiration via `combat.processRoundDurations()` removes temp bars and aura effects from caster AND all affected allies/entities.
     - Manual deactivation via `actor.deactivateAura()` cleans up allies across combatants and world actors even without `canvas.tokens.placeables`.
     - Persistent `appliedAllies` tracking works across rounds.
5. **Verification**:
   - Run full test suite (`node --test tests/*.test.mjs`) to ensure 0 failures.
