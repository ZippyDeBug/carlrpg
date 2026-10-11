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

### Implementation Summary & Verification (CarlRPG 3.2.6)
- **Data Models & Schema**:
  - `template.json`: Added `ignoreDR: false` on attack and gear; added `healing` object and `rankBreaks.*.isArmorPiercing`, `healing: { barsBonus, cleanseDebuff }` on spell and skill; added `techniqueConfig.isArmorPiercing: false` on skill.
  - `AttackDataModel`, `GearDataModel`, `SpellDataModel`, `SkillDataModel`: Added matching fields with zero schema divergence.
- **Tag Engine Integration**:
  - Added `action.hot`, `action.cleanse`, `action.armor_piercing`, and `action.ignore_dr` to `DCC_TAGS` and `computeDerivedTags()`.
- **Sheet Controllers & Templates**:
  - Added collapsible `<details class="dcc-collapsible-block">` modules for healing/regeneration/cleansing on `spell.hbs` and `skill.hbs`.
  - Added quick `Armor-Piercing (Ignores Target DR)` toggles across `spell.hbs`, `skill.hbs`, `attack.hbs`, and `gear.hbs`.
  - Added milestone rank break toggles for armor-piercing and healing bonuses across Ranks 5, 10, 15, and 20.
- **Actor Mechanics & Combat Routing**:
  - `actor.applyHealingBars(bars)`: Capped at max HP and sized by CON mod.
  - `actor.applyHoT({ name, healBars, rounds })`: Creates active HoT buff items.
  - `actor.cleanseDebuff(name)`: Removes specified debuff items or all debuffs.
  - `rollSpell()` & `rollSkill()`: Evaluates healing formulas, rank breaks, HoT, cleanses, and renders interactive buttons.
  - `rollAttack()` & `rollSpellDamage()`: Evaluates weapon gear, active techniques, rank break milestones, and tags to trigger `[ARMOR-PIERCING]` and route `data-ignore-dr="true"`.
  - `DCCCombatMetrics.applyDamageToTarget()`: Supports `ignoreDR: true` to bypass target DR while strictly observing DCC full damage bar absorption rules.
- **Migration & Verification**:
  - Ran `scripts/migrate-healing-and-armor-piercing.mjs` migrating 54 spells and 121 skills. Rebuilt all compendium packs.
  - Unit tests: 1,198 passing across 213 suites with 0 failures (`tests/healing-cleansing-mechanics.test.mjs` and `tests/armor-piercing-mechanics.test.mjs`).
