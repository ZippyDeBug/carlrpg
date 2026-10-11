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
   - A key game mechanic is the mob generator where mobs are generated every round up to a maximum or for each mob killed n new mobs are generated up to a maximum.  This could be more like a hazard or trap that is placed on the map and generates mobs every round.
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

## Task: Reaction and Interrupt Mechanics (#4) — In-Depth Analysis & Automation Options
**Date**: 2026-10-10

### User Request Analysis
- Dive into #4: **Reaction and Interrupt Mechanics**.
- Explore canon and emergent scenarios for interrupts in DCC RPG.
- Detail where interrupts can be tracked across the system (Combat Tracker, Character Sheets, Token HUD).
- Propose concrete automation and play mechanic options for handling interrupts in a Virtual Tabletop environment without bogging down turn flow.

### Key Scenarios in DCC RPG
1. **Defensive Reactions (Self Protection)**:
   - *Evade*: Declaring evasion out-of-turn to raise defense against all incoming attacks for the remainder of the round.
   - *Shield Block*: Intercepting an incoming strike with a shield to reduce incoming damage by Shield DR or Str Mod, with a critical riposte on Rank 10.
   - *Protective Shell / Shield*: Emergency Interrupt spell popping an impenetrable dome or magical barrier when attacked.
   - *Parkour (Rank 10)*: Free Interrupt to avoid involuntary movement or knockdown.
2. **Bodyguard / Interception (Protecting Allies)**:
   - *Catcher*: Stepping in front of a lethal blow meant for an ally, taking the hit and damage onto yourself.
   - *Taunt*: Barking an insult or threat to redirect a mob's declared attack mid-stride from an ally to yourself.
   - *Intervene*: Assisting an ally's check or save as an interrupt (+1d6 added directly to their roll).
3. **Reactive Opportunity Attacks (Zone of Control / Movement)**:
   - *Opportunity Attack*: When a foe moves out of an adjacent reach (without stepping), spend 1 Action as an Interrupt to strike.
   - *Zone of Control*: Reach weapon interrupt attack with Disadvantage when an enemy enters reach.
4. **Emergency Spellcasting & Disruption**:
   - *Hole*: Caster conjures an instant pit under a charging foe or incoming hazard. Rank 15 can collapse it with a thought as a free Interrupt.
   - *Emergency Healing*: In CarlRPG, fast healing spells can be cast as Interrupts to save an ally before permanent damage bars collapse.
   - *Got Your Tongue* (Mob Interrupt): Target grabs a mob's tongue attack via Wrasslin' as an Interrupt.

### Action Economy Integration in CarlRPG
- In CarlRPG, Crawlers and Mobs have a base of **2 Actions per round** (plus optional +1 Action via AI Favor for crawlers).
- In canon DCC rules, Interrupts generally **cost 1 Action from the combatant's action budget** ("spend Action to make Attack as Interrupt"), though high-rank perks grant "Free Interrupts" (costing 0 actions).
- If used out-of-turn (e.g. during a Mob's phase), an Interrupt pre-spends one of the crawler's action slots for the round. If the crawler has already spent all 2 actions, they cannot take regular interrupts unless they have a "Free Interrupt" perk or spend an AI Favor / Reaction budget.

### Tracking Locations
1. **Combat Tracker**:
   - Live action slot indicators: Mark a consumed slot with a lightning bolt badge `⚡ [INTERRUPT: Shield Block]` or `⚡ [EVADE]`.
   - Dedicated `[⚡ INTERRUPT]` button per combatant row, allowing GM/players to trigger an out-of-turn action popup with available reaction items/spells.
   - Dedicated Reaction indicator/pill (`⚡ REACTION READY` vs `⚡ REACTION USED`).
2. **Crawler & Mob Sheets**:
   - Combat tab shows active round action slots with interrupt flags.
   - Action / Hotlist tab highlights items/spells tagged with `action.interrupt` with a distinct blue/cyan `[INTERRUPT]` badge.
3. **Token HUD / Status Badges**:
   - Visual icon or badge showing when a combatant is in an active "Evading" or "Guarding" state.

### Automation & Play Mechanic Options
- **Option 1: Reactive Chat Prompts (Non-Blocking Prompt Cards)**:
  - When an attack or harmful effect targets an actor, the chat card evaluates nearby allies and the target for qualifying reaction spells/skills and presents 1-click reaction buttons (`[🛡️ Shield Block]`, `[📢 Taunt]`, `[🛡️ Catcher]`).
- **Option 2: Mid-Resolution Damage Interceptor Modal / Hook**:
  - In `DCCCombatMetrics`, before applying damage to a token, a quick confirmation hook checks if target or adjacent ally wants to spend an action to Intercept / Block.
- **Option 3: Stance / Ready Reaction (Pre-emptive Toggle)**:
  - Actor pre-toggles a stance (e.g. "Ready Shield Block" or "Active Evade"), which auto-applies on the next incoming trigger and consumes the action.
- **Option 4: Combat Tracker Quick-Trigger Drawer**:
  - Out-of-turn action drawer in the combat tracker allowing instant execution of any interrupt spell/skill on demand.

### Step 1 Implementation: Combat Tracker & Quick Interrupt Drawer
- **Unified Tag System (`src/data/tags.mjs`)**:
  - Added `action.reaction`, `action.free_interrupt`, and reactive triggers (`trigger.on_attack`, `trigger.on_damage`, `trigger.on_move`, `trigger.on_ally_hit`) to `DCC_TAGS`.
  - Added dynamic tag derivation in `computeDerivedTags()` for spells, skills, techniques, and milestone rank breaks.
- **Actor Discovery Engine (`src/documents/actor.mjs`)**:
  - Implemented `DCCActor.prototype.getAvailableInterrupts(options)`: discovers built-in DCC interrupts (Evade, Taunt, Catcher, Intervene), owned interrupt spells, owned interrupt skills, and milestone free interrupt perks. Evaluates live affordability against action budget and Mana Points.
- **Combat Execution Engine (`src/documents/combat.mjs`)**:
  - Implemented `DCCCombat.prototype.triggerInterrupt(combatantId, interruptId, options)`: executes reactions out-of-turn, deducts action slots for standard interrupts (marking slot `isInterrupt: true`), handles free interrupts (0 action cost), sets Evade stance, and generates authentic DCC chat cards.
- **Combat Tracker UI & Drawer (`src/apps/combat-tracker.mjs`, `templates/apps/combat-tracker.hbs`, `styles/dcc.css`)**:
  - Added live Reaction status indicator pill (`⚡ REACTION READY` / `⚡ REACTION SPENT`).
  - Added 1-click `⚡ INTERRUPT` toggle button in action rows.
  - Added slide-out Quick Interrupt Drawer (`.dcc-interrupt-drawer`) with trigger tags, cost pills, descriptions, and 1-click execution.
  - Styled interrupt action pips with `.pip-interrupt` (`fa-bolt`).
- **Verification**:
  - Automated test suite `tests/reaction-interrupt-mechanics.test.mjs` (17 tests) fully passing.
  - Entire suite verified: **1,244 tests passing across 226 suites with 0 failures**.
- **Version Bump**:
  - Bumped to `3.2.9` in `system.json`. Updated `CHANGELOG.md`, `README.md`, and `thoughts.md`.

### Step 2 Implementation: Interactive Chat Card Reaction Prompts
- **Contextual Reaction Discovery (`src/documents/actor.mjs`)**:
  - Implemented `DCCActor.prototype._getReactionPromptsHtml(targetResults, options)`:
    - Target Defender: Dynamically discovers defensive interrupts (`Evade`, `Shield Block`, `Protective Shell`, `Ice Barrier`, etc.) matching attack/damage triggers. Excludes ally-specific actions.
    - Allied Bodyguards & Tactical Support: Identifies active combat allies when a target is attacked or hit. Automatically presents `Catcher` (protecting an ally who took a hit) and `Taunt` (redirecting incoming strikes).
    - Renders clean, high-contrast 1-click button containers (`.dcc-interrupt-prompts-container` and `.dcc-trigger-interrupt-btn`) with cost tags (`[1 ACTION]` vs `[FREE INTERRUPT]`).
- **Direct Actor Execution (`src/documents/actor.mjs`)**:
  - Implemented `DCCActor.prototype.triggerInterrupt(interruptOrId, options)`: routes to `combat.triggerInterrupt` when in active combat, or executes standalone, setting stances (`isEvading`), deducting action budgets, and posting DCC Interrupt Chat Cards.
- **Attack & Spell Card Integration (`src/documents/actor.mjs`, `src/dcc.mjs`)**:
  - `_resolveAttackTargets()` outputs `reactionPromptsHtml`, automatically embedding the prompt block into `rollAttack()` and `rollSpellAttack()` output cards.
  - Added click listener in `src/dcc.mjs` for `.dcc-trigger-interrupt-btn`: extracts actor/combatant dataset attributes, triggers reaction execution, and gives instant button feedback.
- **Automated Verification (`tests/reaction-chat-prompts.test.mjs`)**:
  - 5 tests verifying prompt generation for defender, bodyguard discovery for allies, actor execution, and card embedding.
  - Full suite verified: **1,249 tests passing across 226 suites with 0 failures**.
- **Version Bump**:
  - Bumped to `3.2.10` in `system.json`. Updated `CHANGELOG.md`, `README.md`, and `thoughts.md`.