import test from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';
import { MockActor, MockItem } from './setup.mjs';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';

test('DCC RPG — Progressive Disclosure UI & Single Engine Unified Tagging', async (t) => {
  await t.test('1. Spell Sheets: progressive disclosure flags reflect configured vs default states', async () => {
    // Default bare spell
    const bareSpell = new MockItem({
      name: 'Zap',
      type: 'spell',
      system: {
        rank: 1,
        manaCost: 5,
        range: 'Close',
        target: '1 Target'
      }
    });

    const sheetBare = new DCCItemSheet(bareSpell);
    const ctxBare = await sheetBare._prepareContext();

    assert.equal(ctxBare.hasAuraConfigured, false, 'Bare spell has hasAuraConfigured = false');
    assert.equal(ctxBare.hasDamageModifiersConfigured, false, 'Bare spell has hasDamageModifiersConfigured = false');
    assert.equal(ctxBare.hasConditionTriggersConfigured, false, 'Bare spell has hasConditionTriggersConfigured = false');
    assert.equal(ctxBare.hasRankBreaksConfigured, false, 'Bare spell has hasRankBreaksConfigured = false');

    // Configured aura spell with rank breaks and condition triggers
    const auraSpell = new MockItem({
      name: 'Hot Stuff Aura',
      type: 'spell',
      system: {
        rank: 5,
        manaCost: 15,
        area: {
          hasArea: true,
          shape: 'burst',
          radius: 10,
          origin: 'caster',
          targetFilter: 'allies'
        },
        damageModifiers: [
          { type: 'Fire', value: 3, dice: '1d6', minRank: 5 }
        ],
        critMultiplierR5: 2,
        onHitDebuff: 'Burning',
        rankBreaks: {
          rank5: { tempBars: { hpPerSlot: 4 } },
          rank10: { area: { radiusBonus: 5 } }
        }
      }
    });

    const sheetAura = new DCCItemSheet(auraSpell);
    const ctxAura = await sheetAura._prepareContext();

    assert.equal(ctxAura.hasAuraConfigured, true, 'Aura spell has hasAuraConfigured = true');
    assert.equal(ctxAura.hasDamageModifiersConfigured, true, 'Aura spell has hasDamageModifiersConfigured = true');
    assert.equal(ctxAura.hasConditionTriggersConfigured, true, 'Aura spell has hasConditionTriggersConfigured = true');
    assert.equal(ctxAura.hasRankBreaksConfigured, true, 'Aura spell has hasRankBreaksConfigured = true');
  });

  await t.test('2. Attack Sheets: progressive disclosure flags reflect weapon proficiency and optional effects', async () => {
    const defaultAttack = new MockItem({
      name: 'Basic Punch',
      type: 'attack',
      system: {
        toHit: 0,
        damageFormula: '1d4'
      }
    });

    const sheetDefault = new DCCItemSheet(defaultAttack);
    const ctxDefault = await sheetDefault._prepareContext();

    assert.equal(ctxDefault.hasProficiencyConfigured, false, 'Default attack has hasProficiencyConfigured = false');
    assert.equal(ctxDefault.hasDamagePartsConfigured, false, 'Default attack has hasDamagePartsConfigured = false');
    assert.equal(ctxDefault.hasOptionalEffectsConfigured, false, 'Default attack has hasOptionalEffectsConfigured = false');

    const warhammerAttack = new MockItem({
      name: 'Heavy Warhammer',
      type: 'attack',
      system: {
        toHit: 2,
        damageFormula: '1d10',
        weaponCategory: 'Bashing',
        weaponType: 'Warhammer',
        wieldMode: 'two_handed',
        associatedSkills: ['Bashing Weapons', 'Power Strike'],
        damageParts: [
          { formula: '1d10', type: 'Bludgeoning' },
          { formula: '1d6', type: 'Sonic' }
        ],
        optionalEffects: ['Skullcracker', 'Shatter Armor']
      }
    });

    const sheetWarhammer = new DCCItemSheet(warhammerAttack);
    const ctxWarhammer = await sheetWarhammer._prepareContext();

    assert.equal(ctxWarhammer.hasProficiencyConfigured, true, 'Warhammer attack has hasProficiencyConfigured = true');
    assert.equal(ctxWarhammer.hasDamagePartsConfigured, true, 'Warhammer attack has hasDamagePartsConfigured = true');
    assert.equal(ctxWarhammer.hasOptionalEffectsConfigured, true, 'Warhammer attack has hasOptionalEffectsConfigured = true');
  });

  await t.test('3. Gear Sheets: progressive disclosure and single-engine gear auras', async () => {
    const basicShirt = new MockItem({
      name: 'Cloth Shirt',
      type: 'gear',
      system: {
        value: 5,
        equipped: true
      }
    });

    const sheetShirt = new DCCItemSheet(basicShirt);
    const ctxShirt = await sheetShirt._prepareContext();

    assert.equal(ctxShirt.hasAbilityModifiers, false, 'Cloth shirt has hasAbilityModifiers = false');
    assert.equal(ctxShirt.hasSkillModifiersConfigured, false, 'Cloth shirt has hasSkillModifiersConfigured = false');
    assert.equal(ctxShirt.hasDamagePartsConfigured, false, 'Cloth shirt has hasDamagePartsConfigured = false');
    assert.equal(ctxShirt.hasAuraConfigured, false, 'Cloth shirt has hasAuraConfigured = false');
    assert.equal(ctxShirt.hasActivatedAbilityConfigured, false, 'Cloth shirt has hasActivatedAbilityConfigured = false');
    assert.equal(ctxShirt.hasProficiencyConfigured, false, 'Cloth shirt has hasProficiencyConfigured = false');

    // Advanced gear with aura emission, skill modifiers, and stat bonuses
    const phoenixCloak = new MockItem({
      name: 'Cloak of the Phoenix',
      type: 'gear',
      system: {
        equipped: true,
        abilityModifiers: {
          con: { value: 2, type: 'flat' }
        },
        skillModifiers: [
          { name: 'Fire Resistance', bonus: 5 }
        ],
        area: {
          hasArea: true,
          shape: 'burst',
          radius: 15,
          origin: 'caster',
          targetFilter: 'allies'
        },
        tempBars: {
          hasTempBars: true,
          slotsFormula: 'con',
          hpPerSlot: 3
        }
      }
    });

    const sheetCloak = new DCCItemSheet(phoenixCloak);
    const ctxCloak = await sheetCloak._prepareContext();

    assert.equal(ctxCloak.hasAbilityModifiers, true, 'Phoenix cloak has hasAbilityModifiers = true');
    assert.equal(ctxCloak.hasSkillModifiersConfigured, true, 'Phoenix cloak has hasSkillModifiersConfigured = true');
    assert.equal(ctxCloak.hasAuraConfigured, true, 'Phoenix cloak has hasAuraConfigured = true');
  });

  await t.test('4. Single Engine Aura Execution: actor.activateAura supports gear items seamlessly', async () => {
    const crawler = new DCCActor({
      id: 'crawler-auragear',
      name: 'Paladin Vance',
      type: 'crawler',
      system: {
        abilities: { con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const radiantShield = new MockItem({
      name: 'Aegis of the Sun',
      type: 'gear',
      system: {
        equipped: true,
        area: {
          hasArea: true,
          shape: 'burst',
          radius: 10,
          origin: 'caster',
          targetFilter: 'allies'
        },
        tempBars: {
          hasTempBars: true,
          slotsFormula: 'con',
          hpPerSlot: 4
        }
      }
    }, crawler);
    crawler.items.push(radiantShield);

    // Mock canvas and scene for aura execution
    globalThis.canvas = {
      scene: {
        grid: { distance: 5 },
        createEmbeddedDocuments: async () => [],
        deleteEmbeddedDocuments: async () => []
      },
      tokens: {
        placeables: [
          {
            actor: crawler,
            document: { disposition: 1 },
            center: { x: 100, y: 100 },
            x: 100,
            y: 100,
            w: 50,
            h: 50
          }
        ]
      }
    };

    // Activate aura via single engine
    const result = await crawler.activateAura(radiantShield);

    assert.equal(result.active, true, 'Gear aura successfully activated');
    assert.equal(result.radius, 10, 'Gear aura radius is 10 ft');
    assert.equal(result.tempBarsGranted?.slots, 4, 'Granted 4 slots based on CON mod');
    assert.equal(result.tempBarsGranted?.hpPerSlot, 4, 'Granted 4 HP per slot');

    // Deactivate aura
    const deact = await crawler.deactivateAura(radiantShield);
    assert.equal(deact.deactivated, true, 'Gear aura successfully deactivated');
  });

  await t.test('5. Skill Sheets: progressive disclosure flags reflect techniques, rank breaks, and damage mods', async () => {
    const passiveSkill = new MockItem({
      name: 'Cooking',
      type: 'skill',
      system: {
        rank: 3,
        skillType: 'Utility'
      }
    });

    const sheetPassive = new DCCItemSheet(passiveSkill);
    const ctxPassive = await sheetPassive._prepareContext();

    assert.equal(ctxPassive.hasTechniqueConfigured, false, 'Utility skill has hasTechniqueConfigured = false');
    assert.equal(ctxPassive.hasRankBreaksConfigured, false, 'Utility skill has hasRankBreaksConfigured = false');
    assert.equal(ctxPassive.hasDamageModifiersConfigured, false, 'Utility skill has hasDamageModifiersConfigured = false');

    const techniqueSkill = new MockItem({
      name: 'Pugilism',
      type: 'skill',
      system: {
        rank: 10,
        skillType: 'Hand to Hand',
        isTechnique: true,
        techniqueConfig: {
          isDamageEffect: true,
          damageBonus: '1d6'
        },
        damageModifiers: [
          { type: 'Bludgeoning', value: 2, minRank: 5 }
        ],
        rankBreaks: {
          rank5: { damageDice: '1d4' },
          rank10: { buffsResistances: '+2 Bludgeoning Resistance' }
        }
      }
    });

    const sheetTech = new DCCItemSheet(techniqueSkill);
    const ctxTech = await sheetTech._prepareContext();

    assert.equal(ctxTech.hasTechniqueConfigured, true, 'Technique skill has hasTechniqueConfigured = true');
    assert.equal(ctxTech.hasRankBreaksConfigured, true, 'Technique skill has hasRankBreaksConfigured = true');
    assert.equal(ctxTech.hasDamageModifiersConfigured, true, 'Technique skill has hasDamageModifiersConfigured = true');
  });
});
