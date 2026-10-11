/**
 * Comprehensive Automated Tests for Armor-Piercing / Ignore Damage Resistance (DR) Mechanics
 * Verifies attacks, weapons, spells, techniques, rank break milestones, and combat metrics bypass DR.
 */

import './setup.mjs';
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';
import { DCCCombatMetrics } from '../src/apps/combat-metrics.mjs';
import { AttackDataModel } from '../src/models/items/attack-model.mjs';
import { GearDataModel } from '../src/models/items/gear-model.mjs';
import { SpellDataModel } from '../src/models/items/spell-model.mjs';
import { SkillDataModel } from '../src/models/items/skill-model.mjs';

describe('Armor-Piercing / Ignore DR Subsystem', () => {
  let attacker;
  let defender;

  before(() => {
    CONFIG.Actor.documentClass = DCCActor;
    CONFIG.Item.documentClass = DCCItem;
  });

  beforeEach(() => {
    attacker = new DCCActor({
      name: 'Carl',
      type: 'crawler',
      system: {
        abilities: {
          str: { value: 16, mod: 4 },
          dex: { value: 14, mod: 4 },
          con: { value: 14, mod: 4 },
          int: { value: 14, mod: 4 }
        },
        attributes: {
          hp: { value: 40, max: 40 },
          mana: { value: 20, max: 20 }
        }
      }
    });

    defender = new DCCActor({
      name: 'Armored Goblin',
      type: 'mob',
      system: {
        abilities: {
          dex: { value: 10, mod: 2 },
          con: { value: 10, mod: 2 }
        },
        attributes: {
          hp: { value: 30, max: 30, temp: 0 },
          dr: { value: 5, physical: 5, fire: 5, magic: 5 } // 5 DR across the board
        }
      }
    });
  });

  describe('1. Data Models and Schema Definitions', () => {
    it('AttackDataModel and GearDataModel define ignoreDR defaults', () => {
      const attack = new AttackDataModel();
      assert.equal(attack.ignoreDR, false);

      const gear = new GearDataModel();
      assert.equal(gear.ignoreDR, false);
    });

    it('SpellDataModel and SkillDataModel define ignoreDR and technique isArmorPiercing defaults', () => {
      const spell = new SpellDataModel();
      assert.equal(spell.ignoreDR, false);

      const skill = new SkillDataModel();
      assert.equal(skill.techniqueConfig.isArmorPiercing, false);
    });
  });

  describe('2. DCCItemSheet UI and Form Handling', () => {
    it('prepares hasArmorPiercingConfigured in _prepareContext', async () => {
      const attack = new DCCItem({
        name: 'Armor Piercing Dagger',
        type: 'attack',
        system: { ignoreDR: true }
      });
      const sheet = new DCCItemSheet(attack);
      const ctx = await sheet._prepareContext();
      assert.equal(ctx.hasArmorPiercingConfigured, true);
    });

    it('_updateObject persists ignoreDR and rank break isArmorPiercing milestones', async () => {
      const spell = new DCCItem({
        name: 'Icicles',
        type: 'spell',
        system: { ignoreDR: false }
      });
      const sheet = new DCCItemSheet(spell);
      const formData = {
        'system.ignoreDR': true,
        'system.rankBreaks.rank15.isArmorPiercing': true
      };
      await sheet._updateObject(new Event('submit'), formData);
      assert.equal(spell.system.ignoreDR, true);
      assert.equal(spell.system.rankBreaks.rank15.isArmorPiercing, true);
    });
  });

  describe('3. Attack Rolls and Weapon Armor-Piercing Evaluation', () => {
    it('attack with ignoreDR: true displays [ARMOR-PIERCING] badge and sets data-ignore-dr on button', async () => {
      const attack = new DCCItem({
        id: 'atk-pierce',
        name: 'Armor Piercing Strike',
        type: 'attack',
        system: {
          rank: 2,
          stat: 'str',
          formula: '1d6 + Str',
          ignoreDR: true
        }
      }, attacker);

      attacker.items = [attack];
      const msg = await attacker.rollAttack(attack, 'damage');
      assert.ok(msg);
      assert.ok(msg.content.includes('[ARMOR-PIERCING]'), 'Must include [ARMOR-PIERCING] badge');
      assert.ok(msg.content.includes('data-ignore-dr="true"'), 'Primary damage button must include data-ignore-dr="true"');
      assert.ok(msg.content.includes('data-is-armor-piercing="true"'), 'Card root dataset must indicate armor piercing');
    });

    it('attack using equipped weapon gear with ignoreDR: true gains armor-piercing', async () => {
      const weapon = new DCCItem({
        id: 'gear-lance',
        name: 'Piercing Lance',
        type: 'gear',
        system: {
          equipped: true,
          ignoreDR: true
        }
      }, attacker);

      const attack = new DCCItem({
        id: 'atk-lance',
        name: 'Lance Thrust',
        type: 'attack',
        system: {
          rank: 1,
          formula: '1d8 + Str'
        }
      }, attacker);

      attacker.items = [weapon, attack];
      const msg = await attacker.rollAttack(attack, 'damage');
      assert.ok(msg.content.includes('[ARMOR-PIERCING]'));
      assert.ok(msg.content.includes('data-ignore-dr="true"'));
    });

    it('attack with active technique having techniqueConfig.isArmorPiercing: true gains armor-piercing', async () => {
      const technique = new DCCItem({
        id: 'skill-pierce-tech',
        name: 'Armor Cracker',
        type: 'skill',
        system: {
          isTechnique: true,
          active: true,
          techniqueConfig: {
            isDamageEffect: true,
            isArmorPiercing: true,
            appliesToTags: ['Heavy Punch']
          }
        }
      }, attacker);

      const attack = new DCCItem({
        id: 'atk-punch',
        name: 'Heavy Punch',
        type: 'attack',
        system: {
          rank: 1,
          formula: '1d4 + Str'
        }
      }, attacker);

      attacker.items = [technique, attack];
      const msg = await attacker.rollAttack(attack, 'damage', { techniques: [technique] });
      assert.ok(msg.content.includes('[ARMOR-PIERCING]'));
      assert.ok(msg.content.includes('data-ignore-dr="true"'));
    });

    it('attack with associated skill at Rank 15 having rank15.isArmorPiercing: true gains armor-piercing', async () => {
      const weaponSkill = new DCCItem({
        id: 'skill-swords',
        name: 'Swords',
        type: 'skill',
        system: {
          rank: 15,
          stat: 'str',
          rankBreaks: {
            rank15: { isArmorPiercing: true }
          }
        }
      }, attacker);

      const attack = new DCCItem({
        id: 'atk-sword',
        name: 'Longsword Strike',
        type: 'attack',
        system: {
          rank: 15,
          associatedSkills: ['Swords'],
          formula: '1d8 + Str'
        }
      }, attacker);

      attacker.items = [weaponSkill, attack];
      const msg = await attacker.rollAttack(attack, 'damage');
      assert.ok(msg.content.includes('[ARMOR-PIERCING]'));
      assert.ok(msg.content.includes('data-ignore-dr="true"'));
    });
  });

  describe('4. Spell Damage and Rank Break Armor-Piercing Milestones', () => {
    it('spell with ignoreDR: true rolls damage with [ARMOR-PIERCING] badge and data-ignore-dr', async () => {
      const icicles = new DCCItem({
        id: 'spell-icicles',
        name: 'Icicles',
        type: 'spell',
        system: {
          rank: 1,
          damageType: 'Cold',
          baseDamage: '1d8',
          ignoreDR: true
        }
      }, attacker);

      attacker.items = [icicles];
      const msg = await attacker.rollSpellDamage(icicles);
      assert.ok(msg.content.includes('[ARMOR-PIERCING]'));
      assert.ok(msg.content.includes('data-ignore-dr="true"'));
    });

    it('spell with tag action.armor_piercing automatically triggers armor-piercing', async () => {
      const spell = new DCCItem({
        id: 'spell-pierce',
        name: 'Penetrating Bolt',
        type: 'spell',
        system: {
          rank: 1,
          damageType: 'Force',
          baseDamage: '1d6',
          tags: ['action.armor_piercing']
        }
      }, attacker);

      attacker.items = [spell];
      const msg = await attacker.rollSpellDamage(spell);
      assert.ok(msg.content.includes('[ARMOR-PIERCING]'));
      assert.ok(msg.content.includes('data-ignore-dr="true"'));
    });

    it('spell rank break milestone triggers armor-piercing at Rank 15 but NOT at Rank 10', async () => {
      const smiteRank10 = new DCCItem({
        id: 'spell-smite-10',
        name: "Paladin's Smite",
        type: 'spell',
        system: {
          rank: 10,
          damageType: 'Radiant',
          baseDamage: '2d8',
          rankBreaks: {
            rank15: { isArmorPiercing: true }
          }
        }
      }, attacker);

      attacker.items = [smiteRank10];
      const msg10 = await attacker.rollSpellDamage(smiteRank10);
      assert.equal(msg10.content.includes('[ARMOR-PIERCING]'), false, 'Rank 10 should not have armor piercing');
      assert.equal(msg10.content.includes('data-is-armor-piercing="true"'), false);
      assert.equal(msg10.content.includes('(Ignores DR)'), false);

      const smiteRank15 = new DCCItem({
        id: 'spell-smite-15',
        name: "Paladin's Smite",
        type: 'spell',
        system: {
          rank: 15,
          damageType: 'Radiant',
          baseDamage: '3d8',
          rankBreaks: {
            rank15: { isArmorPiercing: true }
          }
        }
      }, attacker);

      attacker.items = [smiteRank15];
      const msg15 = await attacker.rollSpellDamage(smiteRank15);
      assert.ok(msg15.content.includes('[ARMOR-PIERCING]'), 'Rank 15 milestone must activate armor piercing');
      assert.ok(msg15.content.includes('data-is-armor-piercing="true"'));
      assert.ok(msg15.content.includes('(Ignores DR)'));
    });
  });

  describe('5. DCCCombatMetrics Damage Application with DR Bypass', () => {
    it('normal damage against 5 DR absorbs 5 damage, dealing reduced net damage', async () => {
      defender.system.attributes.hp.value = 30;
      // 12 raw physical damage against 5 DR -> 7 net damage applied
      const res = await DCCCombatMetrics.applyDamageToTarget({
        targetActor: defender,
        rawDamage: 12,
        damageType: 'physical',
        ignoreDR: false
      });
      assert.equal(res.effectiveDR, 5);
      assert.equal(res.netDamage, 7);
      assert.equal(res.barsRemoved, 3);
      assert.equal(defender.system.attributes.hp.value, 24);
    });

    it('armor-piercing damage (ignoreDR: true) completely bypasses 5 DR, dealing full 12 damage', async () => {
      defender.system.attributes.hp.value = 30;
      const res = await DCCCombatMetrics.applyDamageToTarget({
        targetActor: defender,
        rawDamage: 12,
        damageType: 'physical',
        ignoreDR: true
      });
      assert.equal(res.effectiveDR, 0, 'Effective DR must be 0 when ignoreDR is true');
      assert.equal(res.netDamage, 12, 'Full damage must penetrate');
      assert.equal(defender.system.attributes.hp.value, 18);
    });
  });
});
