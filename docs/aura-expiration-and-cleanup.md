# Dungeon Crawler Carl RPG — Aura Engine: Expiration, Deactivation & Multi-Entity Effect Cleanup

## Overview

In the Dungeon Crawler Carl Roleplaying Game (CarlRPG), Auras are sustained magical or technique-based emanations centered on an entity (such as *Hot Stuff Aura*, *Holy Aura*, or *Blazing Corona Aura*). Auras can provide defensive shielding (e.g., temporary health bar slots for the caster and nearby allies) or offensive harassment (e.g., periodic damage and inflicted debuffs on enemies within radius).

This document outlines the lifecycle of auras, persistent entity tracking, round-based combat countdown, and universal cleanup upon aura expiration or deactivation.

---

## Aura Lifecycle & Architecture

### 1. Activation (`actor.activateAura(spellOrSkillItem, options)`)
When an aura item is cast or activated:
1. **Temporary Health Bar Slots**: Calculates granted temporary health bar count and HP per slot (e.g. for *Hot Stuff Aura*, slots equal CHA modifier, with HP per slot starting at 2 and scaling up to 4/6/8 at rank breaks R5/R10/R15).
2. **Caster Protection**: The caster receives their temporary health bars with `source: spellOrSkillItem.name`.
3. **Multi-Entity Discovery & Allied Protection**:
   - Evaluates target filter (`allies`, `enemies`, `both`).
   - For allied protection, discovers eligible allies via:
     - Direct caller input (`options.allies`).
     - Combatants in active combat tracker (`game.combat.combatants`).
     - Canvas placeables within burst radius (`canvas.tokens.placeables`).
   - Every ally within the burst radius receives temporary health bars initialized with `source: spellOrSkillItem.name`.
4. **Persistent Tracking (`system.appliedAllies`)**:
   - The IDs of all allies that received benefits from this aura are recorded in `item.system.appliedAllies` and cached on `item._appliedAllyActors`.
5. **Aura Duration Initialization**:
   - Sets `system.active = true` and `system.durationConfig.remainingRounds = durationConfig.rounds` (e.g. 2 rounds).
6. **Token Centering & Visual Template**:
   - Places a measured circular template centered directly on the caster's token (`target: 'self'`) flagged with `auraItemId`.

---

## Combat Clock Countdown & Expiration

Combat rounds decrement active durations via `combat.processRoundDurations(currentRound)`:

1. **Duration Decrement**:
   - At the end of each round, `remainingRounds` is decremented by 1.
2. **Expiration Trigger (`remainingRounds <= 0`)**:
   - When an aura item reaches 0 remaining rounds, `processRoundDurations()` marks the item expired and immediately calls:
     ```javascript
     await actor.deactivateAura(item, { combatants: this.combatants });
     ```
   - This ensures that rather than solely modifying the caster's stats, the complete multi-entity deactivation pipeline is executed.

---

## Universal Multi-Entity Cleanup (`actor.deactivateAura(item, options)`)

When an aura expires naturally or is manually dismissed:

### 1. Item State Reset
- `system.active` is set to `false`.
- `system.durationConfig.remainingRounds` is set to `0`.
- `system.appliedAllies` is reset to `[]`.

### 2. Caster Cleanup
- If the caster's current temporary health bars originate from this aura (`tempBars.source === auraName`), they are reset to 0 count, 0 current slot HP, and empty source.

### 3. Comprehensive Entity Discovery
The system discovers all candidate entities that may have been affected by this aura through:
- In-memory cached entities (`item._appliedAllyActors`).
- Direct options (`options.allies`, `options.combatants`).
- Combat tracker combatants (`game.combat.combatants`).
- Canvas tokens (`canvas.tokens.placeables`).
- Persisted IDs in `system.appliedAllies` resolved via `game.actors`.
- World actors in `game.actors` whose `tempBars.source === auraName`.

### 4. Allied Protection Stripping
For every discovered ally:
- If their `system.attributes.hp.tempBars.source` matches `auraName` (case-insensitive) OR their ID was tracked in `appliedAllies`:
  - `grantTempBars({ count: 0, hpPerSlot: 0 })` is invoked, clearing all temporary health bars and resetting temporary HP to 0.

### 5. Offensive Debuff Removal
For every entity within the aura:
- If they possess debuff or condition items with:
  - `system.duration === "${auraName} Aura"`,
  - `system.source === auraName`, or
  - `flags['carl-rpg'].auraItemId === item.id`
- Those condition items are automatically deleted via `deleteEmbeddedDocuments('Item', ids)`.

### 6. Template Cleanup
- Measured templates on the scene matching `flags['carl-rpg'].auraItemId` are automatically removed.

---

## Verification & Testing

The aura expiration and multi-entity cleanup workflow is verified by tests in `tests/aura-workflow.test.mjs`:
- **Test 16**: Expiration via `combat.processRoundDurations(round)` when remaining rounds reaches 0 cleans up temporary health bars from caster AND all allies.
- **Test 17**: Manual `deactivateAura()` cleans up temporary health bars from all allies across combatants and tracked `appliedAllies` without requiring options to be passed.
- **Test 18**: Deactivating an offensive aura automatically deletes aura-inflicted conditions (e.g. *Burning*) from hostile entities.
