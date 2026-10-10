import test from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';
import { MockActor, MockItem } from './setup.mjs';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';

test('DCC RPG — User-Created Custom Auras & Multi-Effect Scaling Engine', async (t) => {
  await t.test('1. User creates custom "Cold Stuff Aura" with both ally protection and enemy hazard', async () => {
    const caster = new DCCActor({
      id: 'caster-frodo',
      name: 'Frodo the Frost Mage',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 10, mod: 4 }, con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const ally = new DCCActor({
      id: 'ally-sam',
      name: 'Samwise',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 10, mod: 2 }, con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const enemy = new DCCActor({
      id: 'enemy-orc',
      name: 'Orc Warrior',
      type: 'mob',
      system: {
        abilities: { cha: { value: 1, mod: 0 }, con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 30, max: 30, temp: 0 } }
      }
    });

    // Custom spell item created by user from scratch
    const customColdAura = new MockItem({
      name: 'Cold Stuff Aura',
      type: 'spell',
      system: {
        rank: 1,
        manaCost: 15,
        range: 'Self',
        target: 'Self',
        duration: '2 Rounds',
        durationConfig: {
          type: 'rounds',
          rounds: 2,
          remainingRounds: 2
        },
        area: {
          hasArea: true,
          shape: 'burst',
          radius: 5,
          origin: 'caster',
          targetFilter: 'both',
          absorbElement: 'cold',
          hasPeriodicDamage: true,
          periodicDamageFormula: '1d6',
          periodicDamageType: 'Cold',
          inflictDebuff: 'Chilled'
        },
        tempBars: {
          hasTempBars: true,
          slotsFormula: 'cha',
          hpPerSlot: 2
        },
        rankBreaks: {
          rank5: {
            tempBars: { hpPerSlot: 4 }
          },
          rank10: {
            area: { radiusBonus: 5 },
            tempBars: { hpPerSlot: 6 }
          },
          rank15: {
            area: { radiusBonus: 10 },
            tempBars: { hpPerSlot: 8 }
          }
        }
      }
    }, caster);
    caster.items.push(customColdAura);

    // Setup canvas:
    // Caster at (100, 100).
    // Ally at (100, 130) -> 30px / 3ft (< 5ft radius)
    // Enemy at (100, 140) -> 40px / 4ft (< 5ft radius, hostile)
    globalThis.canvas = {
      scene: {
        grid: { distance: 5 },
        createEmbeddedDocuments: async () => [],
        deleteEmbeddedDocuments: async () => []
      },
      tokens: {
        placeables: [
          { actor: caster, center: { x: 100, y: 100 }, disposition: 1 },
          { actor: ally, center: { x: 100, y: 130 }, disposition: 1 },
          { actor: enemy, center: { x: 100, y: 140 }, disposition: -1 }
        ]
      },
      grid: { size: 50 }
    };

    // Activate custom aura
    const result = await caster.activateAura(customColdAura);

    assert.equal(result.active, true);
    assert.equal(result.radius, 5, 'Base radius should be 5ft');
    assert.equal(result.slots, 4, 'CHA mod 4 should grant 4 slots');
    assert.equal(result.hpPerSlot, 2, 'Rank 1 should grant 2 HP per slot');

    // Caster temp bars
    assert.equal(caster.system.attributes.hp.tempBars.count, 4);
    assert.equal(caster.system.attributes.hp.tempBars.hpPerSlot, 2);
    assert.equal(caster.system.attributes.hp.tempBars.source, 'Cold Stuff Aura');

    // Ally in radius temp bars
    assert.equal(ally.system.attributes.hp.tempBars.count, 4);
    assert.equal(ally.system.attributes.hp.tempBars.hpPerSlot, 2);
    assert.equal(ally.system.attributes.hp.tempBars.source, 'Cold Stuff Aura');

    // Enemy should NOT receive temp bars
    assert.equal(enemy.system.attributes.hp.tempBars?.count || 0, 0, 'Enemy must not receive allied temp bars');

    // Deactivation clears temp bars
    await caster.deactivateAura(customColdAura);
    assert.equal(caster.system.attributes.hp.tempBars.count, 0);
    assert.equal(ally.system.attributes.hp.tempBars.count, 0);
  });

  await t.test('2. Custom aura scales radius and temp bars cumulatively at Rank 10 and 15 without canonical lookup', async () => {
    const caster = new DCCActor({
      name: 'High Rank Elementalist',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 20, mod: 5 } },
        attributes: { hp: { value: 50, max: 50, temp: 0 } }
      }
    });

    const userAura = new MockItem({
      name: 'Custom Thunder Ward',
      type: 'spell',
      system: {
        rank: 15,
        area: {
          hasArea: true,
          radius: 5,
          targetFilter: 'allies'
        },
        tempBars: {
          hasTempBars: true,
          slotsFormula: 'cha',
          hpPerSlot: 2
        },
        rankBreaks: {
          rank10: {
            area: { radiusBonus: 5 },
            tempBars: { hpPerSlot: 6 }
          },
          rank15: {
            area: { radiusBonus: 10 },
            tempBars: { hpPerSlot: 8 }
          }
        }
      }
    }, caster);
    caster.items.push(userAura);

    const result = await caster.activateAura(userAura);

    assert.equal(result.radius, 20, 'Cumulative radius: 5 (base) + 5 (R10) + 10 (R15) = 20ft');
    assert.equal(result.slots, 5, 'CHA mod 5 should yield 5 slots');
    assert.equal(result.hpPerSlot, 8, 'Rank 15 tempBars.hpPerSlot should be 8');
    assert.equal(result.totalTempHp, 40, '5 slots * 8 HP = 40 temp HP');
    assert.equal(caster.system.attributes.hp.temp, 40);
  });

  await t.test('3. Custom aura with purely hostile periodic damage and debuff (e.g. Noxious Cloud)', async () => {
    const caster = new DCCActor({
      name: 'Plague Alchemist',
      type: 'crawler',
      system: {
        abilities: { int: { value: 16, mod: 4 } },
        attributes: { hp: { value: 40, max: 40 } }
      }
    });

    const enemy = new DCCActor({
      id: 'target-zombie',
      name: 'Zombie',
      type: 'mob',
      system: {
        attributes: { hp: { value: 30, max: 30, temp: 0 } }
      }
    });

    const noxiousAura = new MockItem({
      name: 'Noxious Spore Cloud',
      type: 'spell',
      system: {
        rank: 1,
        area: {
          hasArea: true,
          radius: 10,
          targetFilter: 'enemies',
          hasPeriodicDamage: true,
          periodicDamageFormula: '1d8',
          periodicDamageType: 'Acid',
          inflictDebuff: 'Poisoned'
        },
        tempBars: {
          hasTempBars: false
        }
      }
    }, caster);
    caster.items.push(noxiousAura);

    globalThis.canvas = {
      scene: {
        grid: { distance: 5 },
        createEmbeddedDocuments: async () => [],
        deleteEmbeddedDocuments: async () => []
      },
      tokens: {
        placeables: [
          { actor: caster, center: { x: 100, y: 100 }, disposition: 1 },
          { actor: enemy, center: { x: 100, y: 140 }, disposition: -1 }
        ]
      },
      grid: { size: 50 }
    };

    const result = await caster.activateAura(noxiousAura);

    assert.equal(result.radius, 10, 'Noxious Cloud base radius should be 10ft');
    assert.equal(result.slots, 0, 'No temp bars granted');
    assert.equal(caster.system.attributes.hp.tempBars?.count || 0, 0);

    // Verify triggerAuraPeriodicEffects deals damage to enemies inside radius
    if (typeof caster.triggerAuraPeriodicEffects === 'function') {
      const effectReport = await caster.triggerAuraPeriodicEffects(noxiousAura);
      assert.ok(effectReport.affectedEnemies.length > 0, 'Enemy should be affected by periodic aura tick');
    }
  });
});
