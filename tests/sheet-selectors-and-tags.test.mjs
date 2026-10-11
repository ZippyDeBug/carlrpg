import test from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';
import { DCCCrawlerSheet } from '../src/sheets/crawler-sheet.mjs';
import fs from 'fs';

test('Sheet Selectors & Tag Pickers Integration', async (t) => {
  await t.test('1. DCCItemSheet._prepareContext populates standard precomputed options and lists', async () => {
    const spell = new DCCItem({
      name: 'Flame Lance',
      type: 'spell',
      system: {
        spellType: 'Attack',
        duration: 'Instantaneous',
        cooldown: '1/Round',
        target: 'enemies',
        damageType: 'Fire',
        favored: 'Mage',
        healing: {
          hasHealing: true,
          cleanseDebuffs: ['Burning', 'Poisoned']
        },
        optionalEffects: ['Empower', 'Split Target']
      }
    });

    const sheet = new DCCItemSheet(spell);
    const context = await sheet.getData();

    // Verify precomputed options
    assert.ok(Array.isArray(context.spellTypeOptions), 'spellTypeOptions must be an array');
    const selectedSpellType = context.spellTypeOptions.find(o => o.selected);
    assert.equal(selectedSpellType?.value, 'Attack');

    assert.ok(Array.isArray(context.durationOptions), 'durationOptions must be an array');
    const selectedDuration = context.durationOptions.find(o => o.selected);
    assert.equal(selectedDuration?.value, 'Instantaneous');

    assert.ok(Array.isArray(context.cooldownOptions), 'cooldownOptions must be an array');
    const selectedCooldown = context.cooldownOptions.find(o => o.selected);
    assert.equal(selectedCooldown?.value, '1/Round');

    assert.ok(Array.isArray(context.damageTypeOptions), 'damageTypeOptions must be an array');
    const selectedDamageType = context.damageTypeOptions.find(o => o.selected);
    assert.equal(selectedDamageType?.value, 'Fire');

    assert.ok(Array.isArray(context.favoredArchetypeOptions), 'favoredArchetypeOptions must be an array');
    const selectedFavored = context.favoredArchetypeOptions.find(o => o.selected);
    assert.equal(selectedFavored?.value, 'Mage');

    // Verify cleanse debuffs pill list and string
    assert.deepEqual(context.cleanseDebuffsList, ['Burning', 'Poisoned']);
    assert.equal(context.cleanseDebuffsString, 'Burning, Poisoned');

    // Verify optional effects pill list and string
    assert.deepEqual(context.optionalEffectsList, ['Empower', 'Split Target']);
    assert.equal(context.optionalEffectsString, 'Empower, Split Target');
  });

  await t.test('2. DCCItemSheet._prepareContext supports skill, buff/debuff, class, and race options', async () => {
    // Skill item
    const skill = new DCCItem({
      name: 'Heavy Cleave',
      type: 'skill',
      system: {
        checkType: 'Attack vs Evade',
        appliesTo: ['Broadsword', 'Battleaxe'],
        techniqueConfig: {
          cooldown: 'Once per Scene / Combat'
        }
      }
    });
    const skillSheet = new DCCItemSheet(skill);
    const skillContext = await skillSheet.getData();

    assert.ok(Array.isArray(skillContext.checkTypeOptions), 'checkTypeOptions must be an array');
    const selectedCheckType = skillContext.checkTypeOptions.find(o => o.selected);
    assert.equal(selectedCheckType?.value, 'Attack vs Evade');
    assert.deepEqual(skillContext.appliesToList, ['Broadsword', 'Battleaxe']);
    assert.equal(skillContext.appliesToString, 'Broadsword, Battleaxe');

    // Buff / Debuff item with scopeOptions
    const buff = new DCCItem({
      name: 'Heroism',
      type: 'buff',
      system: {
        duration: 'Combat Rounds',
        affects: ['attacks', 'str', 'con']
      }
    });
    const buffSheet = new DCCItemSheet(buff);
    const buffContext = await buffSheet.getData();

    assert.ok(Array.isArray(buffContext.scopeOptions), 'scopeOptions must be an array');
    const selectedScopes = buffContext.scopeOptions.filter(o => o.selected).map(o => o.id);
    assert.deepEqual(selectedScopes.sort(), ['attacks', 'con', 'str'].sort());
    assert.equal(buffContext.affectsString, 'attacks, str, con');

    // Class item
    const cls = new DCCItem({
      name: 'Berserker',
      type: 'class',
      system: {
        classType: 'Fighter'
      }
    });
    const clsSheet = new DCCItemSheet(cls);
    const clsContext = await clsSheet.getData();
    const selectedClass = clsContext.classTypeOptions.find(o => o.selected);
    assert.equal(selectedClass?.value, 'Fighter');

    // Race item
    const race = new DCCItem({
      name: 'Giant',
      type: 'race',
      system: {
        size: 'Large (8)'
      }
    });
    const raceSheet = new DCCItemSheet(race);
    const raceContext = await raceSheet.getData();
    const selectedSize = raceContext.sizeOptions.find(o => o.selected);
    assert.equal(selectedSize?.value, 'Large (8)');
  });

  await t.test('3. DCCItemSheet outcome items receive precomputed damageTypeOptions', async () => {
    const gear = new DCCItem({
      name: 'Fire Wand',
      type: 'gear',
      system: {
        outcomes: [
          { type: 'damage', damage: '2d8', damageType: 'Fire', weight: 50 },
          { type: 'damage', damage: '1d6', damageType: 'Electric', weight: 50 }
        ]
      }
    });
    const sheet = new DCCItemSheet(gear);
    const context = await sheet.getData();

    const outcomes = context.system.outcomes;
    assert.equal(outcomes.length, 2);
    assert.ok(Array.isArray(outcomes[0].damageTypeOptions));
    const out0Dmg = outcomes[0].damageTypeOptions.find(o => o.selected);
    assert.equal(out0Dmg?.value, 'Fire');

    assert.ok(Array.isArray(outcomes[1].damageTypeOptions));
    const out1Dmg = outcomes[1].damageTypeOptions.find(o => o.selected);
    assert.equal(out1Dmg?.value, 'Electric');
  });

  await t.test('4. DCCCrawlerSheet._prepareContext populates floor, mob classifications, and creature types', async () => {
    const mob = new DCCActor({
      name: 'Goblin Warlord',
      type: 'mob',
      system: {
        details: {
          classification: 'Boss',
          creatureType: 'Humanoid',
          floor: 'Floor 3'
        }
      }
    });

    const sheet = new DCCCrawlerSheet(mob);
    const context = await sheet.getData();

    assert.ok(Array.isArray(context.floorOptions), 'floorOptions must be an array');
    const selFloor = context.floorOptions.find(o => o.selected);
    assert.equal(selFloor?.value, 'Floor 3');

    assert.ok(Array.isArray(context.mobClassifications), 'mobClassifications must be an array');
    const selClass = context.mobClassifications.find(o => o.selected);
    assert.equal(selClass?.value, 'Boss');

    assert.ok(Array.isArray(context.mobCreatureTypes), 'mobCreatureTypes must be an array');
    const selCreature = context.mobCreatureTypes.find(o => o.selected);
    assert.equal(selCreature?.value, 'Humanoid');
  });

  await t.test('5. Form serialization integrity: page2-hotlist has no duplicate name attributes with page4-inventory', () => {
    const hotlistTmpl = fs.readFileSync(new URL('../templates/actors/parts/page2-hotlist.hbs', import.meta.url), 'utf8');
    const invTmpl = fs.readFileSync(new URL('../templates/actors/parts/page4-inventory.hbs', import.meta.url), 'utf8');

    // Extract all input/textarea name attributes from hotlist
    const hotlistNames = [...hotlistTmpl.matchAll(/name=["']([^"']+)["']/g)].map(m => m[1]);
    const invNames = [...invTmpl.matchAll(/name=["']([^"']+)["']/g)].map(m => m[1]);

    // Check for any duplicates of system.gearSlots in hotlist
    const hotlistGearSlots = hotlistNames.filter(n => n.startsWith('system.gearSlots'));
    assert.equal(hotlistGearSlots.length, 0, 'Hotlist tab should not have name="system.gearSlots.*" inputs that collide with inventory');

    // Confirm inventory has them
    const invGearSlots = invNames.filter(n => n.startsWith('system.gearSlots'));
    assert.ok(invGearSlots.length >= 6, 'Inventory tab should have gearSlots inputs');
  });
});
