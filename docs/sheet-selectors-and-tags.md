# Sheet Selectors, Controlled Dropdowns & Tag Widget Normalization

**System Version**: 3.2.11  
**Target Platform**: Foundry VTT v12+ (Pure ES Modules)

---

## 1. Overview

In CarlRPG 3.2.11, all non-narrative, non-lore free-form text areas across character and item sheets have been upgraded to controlled `<select>` elements, precomputed option groups, or interactive tag pill widgets. This ensures data consistency, avoids typos, leverages the unified tag taxonomy (`src/data/tags.mjs`), and eliminates duplicate input name form harvesting bugs.

*(Note: In accordance with project instructions, mounts and pets have been intentionally kept in their current state and deferred to a future dedicated phase).*

---

## 2. Precomputed Context Architecture (GEMINI.md Rule 8)

To avoid Handlebars variable shadowing in nested loops and guarantee consistent rendering in Foundry's template engine, all options are precomputed in `_prepareContext`:

```javascript
// Example: Precomputing options with selection state
context.durationOptions = [
  'Instantaneous', '1 Round', 'Combat Rounds', '1 Minute', '10 Minutes', '1 Hour',
  '2 Hours per Rank', 'Until End of Combat', 'Permanent / Sustained'
].map(d => ({ value: d, label: d, selected: currentDuration.toLowerCase() === d.toLowerCase() }));
```

If an item possesses a valid custom value not present in the default catalog, it is automatically appended to the option array as `${currentValue} (Custom)` with `selected: true`.

---

## 3. Scope of Normalized Fields

### Item Sheets (`DCCItemSheet`)
- **Spells (`spell.hbs`)**:
  - `system.spellType`: `spellTypeOptions` (Attack, Heal, Utility, Buff, Debuff, Passive, Interrupt, Reaction, Free Interrupt).
  - `system.duration`: `durationOptions` (Instantaneous, Combat Rounds, 1 Minute, 1 Hour, etc.).
  - `system.cooldown`: `cooldownOptions` (None, 1/Round, Once per Scene / Combat, 2h/Rank, 24 Hours, Until Rest).
  - `system.damageType`: `damageTypeOptions` (all CONFIG.DCC damage types).
  - `system.favored`: `favoredArchetypeOptions` (Mage, Fighter, Rogue, Cleric, Bard, etc.).
  - `system.healing.cleanseDebuffs`: Upgraded to interactive removable pill badges with canon debuff dropdown selector and custom input.
  - Rank breaks: Debuff cleanse inputs converted to dropdowns.
- **Skills (`skill.hbs`, `page3-skills.hbs`)**:
  - `system.checkType`: `checkTypeOptions` (Stat Check, Opposed Contest, Attack vs Evade, Saving Throw / Reaction, Passive, Tool / Crafting Check, None).
  - `system.appliesTo`: Interactive removable pill badges with auto-suggest and dropdown picker.
  - `system.techniqueConfig.cooldown`: `cooldownOptions`.
  - Base and milestone debuff cleansing converted to condition pill widgets.
- **Attacks (`attack.hbs`)**:
  - `system.weaponType`: `weaponTypeOptions`.
  - `system.associatedSkills`: Interactive tag pill badges with compendium skill dropdown and auto-suggest.
  - `system.optionalEffects`: Interactive technique pill badges with auto-suggest.
- **Gear & Loot (`gear.hbs`, `loot.hbs`)**:
  - `system.weaponType`: `weaponTypeOptions`.
  - `system.cooldown`: `cooldownOptions`.
  - Outcomes: `out.damageTypeOptions` precomputed for each individual outcome.
- **Buffs & Debuffs (`buff.hbs`, `debuff.hbs`)**:
  - `system.duration`: `durationOptions`.
  - `system.affects`: Multi-select scope toggle chips (`scopeOptions`: `all`, `attacks`, `spells`, `skills`, `str`, `dex`, `con`, `int`, `cha`).
- **Classes & Races (`class.hbs`, `race.hbs`)**:
  - `system.classType`: `classTypeOptions`.
  - `system.size`: `sizeOptions` (Tiny, Small, Medium, Large, Huge, Gargantuan).
- **Achievements (`achievement.hbs`)**:
  - `system.floor`: `floorOptions` (Floors 1–18, Overworld, Celestial).

### Character Sheet (`DCCCrawlerSheet`, `page1-core.hbs`, `page2-hotlist.hbs`)
- **Mob Header**:
  - `system.details.classification`: `mobClassifications` (Normal, Minion, Elite, Boss, World Boss, Unique).
  - `system.details.creatureType`: `mobCreatureTypes` (Beast, Undead, Construct, Humanoid, Aberration, Elemental, Demon, Celestial, Plant, Dragon, Monstrosity, Giant, Ooze).
  - `system.details.floor`: `floorOptions`.
- **Crawler Header**:
  - `system.details.floor`: `floorOptions`.
- **Hotlist Gear Slots (`page2-hotlist.hbs`)**:
  - Removed duplicate `name="system.gearSlots.*"` inputs that collided with `page4-inventory.hbs` causing array serialization bugs (GEMINI.md Rule 6).
  - Hotlist gear slot notes now edit cleanly via `.actor-inline-edit` without colliding with the primary inventory form harvest.

---

## 4. Verification

All additions and migrations are covered by unit tests in `tests/sheet-selectors-and-tags.test.mjs`, ensuring 100% test passing across the test suite (1,255 tests passing, 0 failures).
