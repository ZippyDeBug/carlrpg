import test from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';
import { MockActor, MockItem } from './setup.mjs';
import { DCC_SPELLS } from '../src/data/spells.mjs';
import { DCCEffectsPanel } from '../src/apps/effects-panel.mjs';

test('DCC RPG — PF2e-Style Effects Panel Unit Tests', async (t) => {
  await t.test('1. Singleton instance is created and retrievable via get()', () => {
    const panel = DCCEffectsPanel.get();
    assert.ok(panel instanceof DCCEffectsPanel, 'Should return DCCEffectsPanel instance');
    assert.equal(DCCEffectsPanel.get(), panel, 'Subsequent get() should return identical singleton');
  });

  await t.test('2. Collects active Hot Stuff Aura as Aura Emitter with correct duration and details', async () => {
    const actor = new MockActor({
      name: 'Carl Caster',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 10, mod: 4 }, con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const hotStuffDef = structuredClone(DCC_SPELLS.find(s => s.name === 'Hot Stuff Aura'));
    const spellItem = new MockItem(hotStuffDef, actor);
    actor.items.push(spellItem);

    await actor.activateAura(spellItem);

    const panel = DCCEffectsPanel.get();
    const effects = panel.collectEffects(actor);

    assert.equal(effects.length, 1, 'Should have exactly 1 active effect');
    const aura = effects[0];
    assert.equal(aura.name, 'Hot Stuff Aura');
    assert.equal(aura.type, 'aura-emitter');
    assert.equal(aura.isAuraEmitter, true);
    assert.equal(aura.isAuraReceiver, false);
    assert.equal(aura.typeBadge, '[AURA EMITTER]');
    assert.equal(aura.sourceName, 'Self');
    assert.equal(aura.remainingRounds, 2);
    assert.equal(aura.durationLabel, '2r');
    assert.match(aura.fullDurationText, /2 Combat Rounds/i);
    assert.match(aura.detailsText, /5ft/i);
    assert.match(aura.detailsText, /4 Temp Bars/i);
    assert.equal(aura.canDismiss, true, 'Caster should be permitted to dismiss their aura');
  });

  await t.test('3. Collects active Hot Stuff Aura on ally as Aura Receiver with caster reference', async () => {
    const caster = new MockActor({
      id: 'caster-carl',
      name: 'Carl Caster',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 10, mod: 4 }, con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const ally = new MockActor({
      id: 'ally-donut',
      name: 'Princess Donut',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 10, mod: 4 }, con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const hotStuffDef = structuredClone(DCC_SPELLS.find(s => s.name === 'Hot Stuff Aura'));
    const spellItem = new MockItem(hotStuffDef, caster);
    caster.items.push(spellItem);

    // Mock canvas with template and actors
    globalThis.canvas = {
      scene: {
        templates: [
          {
            flags: {
              'carl-rpg': {
                auraItemId: spellItem.id,
                actorId: caster.id,
                isAura: true
              }
            }
          }
        ]
      }
    };
    globalThis.game = globalThis.game || {};
    globalThis.game.actors = {
      get: (id) => (id === caster.id ? caster : id === ally.id ? ally : null)
    };

    // Ally gets temp bars from caster's Hot Stuff Aura
    await ally.grantTempBars({ count: 4, hpPerSlot: 2, source: 'Hot Stuff Aura' });

    const panel = DCCEffectsPanel.get();
    const effects = panel.collectEffects(ally);

    assert.equal(effects.length, 1, 'Ally should have 1 active effect');
    const auraEffect = effects[0];
    assert.equal(auraEffect.name, 'Hot Stuff Aura');
    assert.equal(auraEffect.type, 'aura-receiver');
    assert.equal(auraEffect.isAuraEmitter, false);
    assert.equal(auraEffect.isAuraReceiver, true);
    assert.equal(auraEffect.typeBadge, '[AURA PROTECTED]');
    assert.equal(auraEffect.sourceName, 'Carl Caster');
    assert.equal(auraEffect.durationLabel, '2r');
    assert.match(auraEffect.detailsText, /4 Bonus Health Bars/i);
  });

  await t.test('4. Correctly sorts Debuffs, Aura Emitters, Aura Receivers, and Buffs', async () => {
    const actor = new MockActor({
      name: 'Carl Mixed',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    // 1. Aura emitter
    const hotStuffDef = structuredClone(DCC_SPELLS.find(s => s.name === 'Hot Stuff Aura'));
    const spellItem = new MockItem(hotStuffDef, actor);
    actor.items.push(spellItem);
    await actor.activateAura(spellItem);

    // 2. Active buff item
    const buffItem = new MockItem({
      name: 'Cat’s Grace',
      type: 'buff',
      system: {
        active: true,
        duration: '10 Minutes',
        description: '+2 DEX'
      }
    }, actor);
    actor.items.push(buffItem);

    // 3. Active debuff item
    const debuffItem = new MockItem({
      name: 'Acid Burn',
      type: 'debuff',
      system: {
        severity: 'Major',
        duration: '3 Rounds',
        description: 'Takes 1d6 acid per round'
      }
    }, actor);
    actor.items.push(debuffItem);

    const panel = DCCEffectsPanel.get();
    const effects = panel.collectEffects(actor);

    assert.equal(effects.length, 3, 'Should collect all 3 active effects');
    assert.equal(effects[0].type, 'debuff', 'Debuff should have highest priority');
    assert.equal(effects[1].type, 'aura-emitter', 'Aura emitter should be next');
    assert.equal(effects[2].type, 'buff', 'Buff should be last');
  });

  await t.test('5. Dismissing an aura calls deactivateAura and updates state', async () => {
    const actor = new MockActor({
      name: 'Carl Caster',
      type: 'crawler',
      system: {
        abilities: { cha: { value: 10, mod: 4 }, con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const hotStuffDef = structuredClone(DCC_SPELLS.find(s => s.name === 'Hot Stuff Aura'));
    const spellItem = new MockItem(hotStuffDef, actor);
    actor.items.push(spellItem);

    await actor.activateAura(spellItem);
    assert.equal(spellItem.system.active, true);

    const panel = DCCEffectsPanel.get();
    await panel.dismissEffect(actor, spellItem.id);

    assert.equal(spellItem.system.active, false, 'Spell should now be inactive');
    assert.equal(actor.system.attributes.hp.tempBars.count, 0, 'Temp bars should be cleared');

    const effects = panel.collectEffects(actor);
    assert.equal(effects.length, 0, 'No active effects should remain');
  });
});
