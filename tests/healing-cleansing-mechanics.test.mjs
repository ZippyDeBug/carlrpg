/**
 * Comprehensive Automated Tests for Data-Driven Healing, Health Bar Restoration,
 * HoT, and Cleansing Mechanics for Spells, Skills, and Consumables.
 */

import './setup.mjs';
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';
import { SpellDataModel } from '../src/models/items/spell-model.mjs';
import { SkillDataModel } from '../src/models/items/skill-model.mjs';

describe('Data-Driven Healing & Cleansing Subsystem', () => {
  let actor;

  before(() => {
    CONFIG.Actor.documentClass = DCCActor;
    CONFIG.Item.documentClass = DCCItem;
  });

  beforeEach(() => {
    actor = new DCCActor({
      name: 'Carl',
      type: 'crawler',
      system: {
        abilities: {
          con: { value: 16, mod: 4 }, // 4 HP per bar, 10 bars = 40 max HP
          int: { value: 14, mod: 4 }
        },
        attributes: {
          hp: { value: 12, max: 40, temp: 0, pct: 30 },
          mana: { value: 20, max: 20, pct: 100 }
        }
      }
    });
  });

  describe('1. Data Models and Schema Definitions', () => {
    it('SpellDataModel initializes healing schema defaults', () => {
      const model = new SpellDataModel();
      assert.ok(model.healing);
      assert.equal(model.healing.hasHealing, false);
      assert.equal(model.healing.barsFormula, '2');
      assert.equal(model.healing.targetFilter, 'allies');
      assert.equal(model.healing.isHoT, false);
      assert.equal(model.healing.hotRounds, 3);
      assert.deepEqual(model.healing.cleanseDebuffs, []);
    });

    it('SkillDataModel initializes healing schema defaults', () => {
      const model = new SkillDataModel();
      assert.ok(model.healing);
      assert.equal(model.healing.hasHealing, false);
      assert.equal(model.healing.barsFormula, '1');
      assert.equal(model.healing.targetFilter, 'allies');
      assert.equal(model.healing.isHoT, false);
      assert.equal(model.healing.hotRounds, 3);
      assert.deepEqual(model.healing.cleanseDebuffs, []);
    });
  });

  describe('2. DCCItemSheet Context Preparation and Form Handling', () => {
    it('prepares hasHealingConfigured and cleanseDebuffsString', async () => {
      const item = new DCCItem({
        name: 'Nature Breath',
        type: 'spell',
        system: {
          healing: {
            hasHealing: true,
            barsFormula: '1 + int',
            cleanseDebuffs: ['Poison', 'Bleed']
          }
        }
      });
      const sheet = new DCCItemSheet(item);
      const ctx = await sheet._prepareContext();
      assert.equal(ctx.hasHealingConfigured, true);
      assert.equal(ctx.cleanseDebuffsString, 'Poison, Bleed');
    });

    it('_updateObject sanitizes cleanseDebuffs into an array and preserves rankBreaks healing', async () => {
      const item = new DCCItem({
        name: 'Test Heal',
        type: 'spell',
        system: { healing: { hasHealing: false, cleanseDebuffs: [] } }
      });
      const sheet = new DCCItemSheet(item);
      const formData = {
        'system.healing.hasHealing': true,
        'system.healing.cleanseDebuffs': 'Burn, Slow , Stun',
        'system.rankBreaks.rank5.healing.barsBonus': 1,
        'system.rankBreaks.rank5.healing.cleanseDebuff': 'Minor Injury'
      };
      await sheet._updateObject(new Event('submit'), formData);
      assert.deepEqual(item.system.healing.cleanseDebuffs, ['Burn', 'Slow', 'Stun']);
      assert.equal(item.system.rankBreaks.rank5.healing.barsBonus, 1);
      assert.equal(item.system.rankBreaks.rank5.healing.cleanseDebuff, 'Minor Injury');
    });
  });

  describe('3. Actor Direct Methods: applyHealingBars, applyHoT, and cleanseDebuff', () => {
    it('applyHealingBars heals health bars according to con mod and caps at max HP', async () => {
      // Actor has 12 HP, 4 HP/bar, max 40 HP
      const res = await actor.applyHealingBars(3); // 3 * 4 = 12 HP
      assert.equal(res.actualHealed, 12);
      assert.equal(res.newHp, 24);
      assert.equal(actor.system.attributes.hp.value, 24);

      // Heal beyond max (e.g. 10 bars = 40 HP)
      const res2 = await actor.applyHealingBars(10);
      assert.equal(res2.newHp, 40);
      assert.equal(res2.actualHealed, 16);
      assert.equal(actor.system.attributes.hp.value, 40);
    });

    it('cleanseDebuff removes specific debuffs by name', async () => {
      const debuff1 = new DCCItem({ id: 'deb-1', name: 'Poison', type: 'debuff', system: {} }, actor);
      const debuff2 = new DCCItem({ id: 'deb-2', name: 'Bleed', type: 'debuff', system: {} }, actor);
      actor.items = [debuff1, debuff2];

      const cleansed = await actor.cleanseDebuff('Poison');
      assert.deepEqual(cleansed, ['Poison']);
      assert.equal(actor.items.some(i => i.name === 'Poison'), false);
      assert.equal(actor.items.some(i => i.name === 'Bleed'), true);
    });

    it('cleanseDebuff removes all debuffs when name is empty', async () => {
      const debuff1 = new DCCItem({ id: 'deb-1', name: 'Poison', type: 'debuff', system: {} }, actor);
      const debuff2 = new DCCItem({ id: 'deb-2', name: 'Bleed', type: 'debuff', system: {} }, actor);
      actor.items = [debuff1, debuff2];

      const cleansed = await actor.cleanseDebuff('');
      assert.equal(cleansed.length, 2);
      assert.equal(actor.items.filter(i => i.type === 'debuff').length, 0);
    });

    it('applyHoT adds a Heal Over Time buff to the actor', async () => {
      actor.items = [];
      const buff = await actor.applyHoT({ name: 'Nature Blessing (HoT)', healBars: 2, rounds: 4 });
      assert.ok(buff);
      assert.equal(buff.type, 'buff');
      assert.equal(buff.system.buffType, 'heal');
      assert.equal(buff.system.durationRounds, 4);
      assert.ok(buff.system.healingPerRound.includes('2'));
    });
  });

  describe('4. Spell Casting with Data-Driven Healing & Milestone Rank Breaks', () => {
    it('casts formula-scaled heal spell (1 + int mod) and cleanses configured debuff', async () => {
      const poison = new DCCItem({ id: 'deb-p', name: 'Poison', type: 'debuff', system: {} }, actor);
      actor.items = [poison];

      const spell = new DCCItem({
        id: 'spell-divine-light',
        name: 'Divine Light',
        type: 'spell',
        system: {
          manaCost: 3,
          healing: {
            hasHealing: true,
            barsFormula: '1 + int', // 1 + 4 = 5 bars * 4 HP = 20 HP
            targetFilter: 'self',
            cleanseDebuffs: ['Poison']
          }
        }
      }, actor);

      const msg = await actor.rollSpell(spell);
      assert.ok(msg);
      const flags = msg.flags['carl-rpg'];
      assert.equal(flags.isHeal, true);
      assert.equal(flags.healInfo.barsToHeal, 5);
      assert.equal(flags.healInfo.actualHealed, 20); // 12 -> 32 HP
      assert.equal(actor.system.attributes.hp.value, 32);
      assert.deepEqual(flags.healInfo.cleansedDebuffs, ['Poison']);
      assert.equal(actor.items.some(i => i.name === 'Poison'), false);
    });

    it('applies rank break milestone healing bonuses at Rank 10', async () => {
      const spell = new DCCItem({
        id: 'spell-radiance',
        name: 'Radiance',
        type: 'spell',
        system: {
          manaCost: 4,
          rank: 10,
          healing: {
            hasHealing: true,
            barsFormula: '2',
            targetFilter: 'self'
          },
          rankBreaks: {
            rank5: { healing: { barsBonus: 1 } },
            rank10: { healing: { barsBonus: 2, cleanseDebuff: 'Bleed' } }
          }
        }
      }, actor);

      const bleed = new DCCItem({ id: 'deb-b', name: 'Bleed', type: 'debuff', system: {} }, actor);
      actor.items = [bleed];

      const msg = await actor.rollSpell(spell);
      const flags = msg.flags['carl-rpg'];
      assert.equal(flags.healInfo.barsToHeal, 5); // 2 base + 1 (R5) + 2 (R10) = 5 bars
      assert.deepEqual(flags.healInfo.cleansedDebuffs, ['Bleed']);
    });

    it('rolls ally-targeted healing spell without auto-applying self healing and creates action buttons', async () => {
      const spell = new DCCItem({
        id: 'spell-heal-other',
        name: 'Heal Other',
        type: 'spell',
        system: {
          manaCost: 2,
          healing: {
            hasHealing: true,
            barsFormula: '3',
            targetFilter: 'allies'
          }
        }
      }, actor);

      const prevHp = actor.system.attributes.hp.value;
      const msg = await actor.rollSpell(spell);
      assert.equal(actor.system.attributes.hp.value, prevHp, 'HP must not change on caster for ally spell');
      assert.ok(msg.content.includes('dcc-apply-healing-btn'));
      assert.ok(msg.content.includes('data-bars="3"'));
    });
  });

  describe('5. Skill Execution with Data-Driven Healing', () => {
    it('rolls healing skill (First Aid) restoring health and generating healing chat card', async () => {
      const skill = new DCCItem({
        id: 'skill-first-aid',
        name: 'First Aid',
        type: 'skill',
        system: {
          rank: 3,
          stat: 'int',
          healing: {
            hasHealing: true,
            barsFormula: '2',
            targetFilter: 'self',
            cleanseDebuffs: ['Minor Injury']
          }
        }
      }, actor);

      const injury = new DCCItem({ id: 'deb-inj', name: 'Minor Injury', type: 'debuff', system: {} }, actor);
      actor.items = [injury];

      const msg = await actor.rollSkill(skill);
      assert.ok(msg);
      assert.ok(msg.content.includes('dcc-heal-effect'));
      assert.ok(msg.content.includes('Healed +8 HP')); // 2 bars * 4 = 8 HP
      assert.equal(actor.system.attributes.hp.value, 20); // 12 + 8 = 20 HP
      assert.equal(actor.items.some(i => i.name === 'Minor Injury'), false);
    });
  });
});
