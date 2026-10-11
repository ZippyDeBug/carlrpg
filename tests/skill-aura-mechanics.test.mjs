import test from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';
import { MockActor, MockItem } from './setup.mjs';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';
import { DCCEffectsPanel } from '../src/apps/effects-panel.mjs';
import { SkillDataModel } from '../src/models/items/skill-model.mjs';

test('Skill Aura Mechanics & Build Engine Unification', async (t) => {
  await t.test('1. SkillDataModel initializes area, tempBars, durationConfig, and rank break aura scaling', () => {
    const skillModel = new SkillDataModel({});

    // Area defaults
    assert.equal(skillModel.area.hasArea, false);
    assert.equal(skillModel.area.shape, 'burst');
    assert.equal(skillModel.area.radius, 5);
    assert.equal(skillModel.area.origin, 'caster');
    assert.equal(skillModel.area.targetFilter, 'allies');
    assert.equal(skillModel.area.hasPeriodicDamage, false);
    assert.equal(skillModel.area.periodicDamageFormula, '');
    assert.equal(skillModel.area.periodicDamageType, '');
    assert.equal(skillModel.area.inflictDebuff, '');
    assert.equal(skillModel.area.absorbElement, '');

    // Temp bars defaults
    assert.equal(skillModel.tempBars.hasTempBars, false);
    assert.equal(skillModel.tempBars.slotsFormula, 'con');
    assert.equal(skillModel.tempBars.hpPerSlot, 2);

    // Duration and active state
    assert.equal(skillModel.active, false);
    assert.equal(skillModel.durationConfig.remainingRounds, 0);

    // Rank break milestones
    assert.equal(skillModel.rankBreaks.rank5.area.radiusBonus, 0);
    assert.equal(skillModel.rankBreaks.rank5.tempBars.hpPerSlot, 0);
    assert.equal(skillModel.rankBreaks.rank10.area.radiusBonus, 0);
    assert.equal(skillModel.rankBreaks.rank10.tempBars.hpPerSlot, 0);
    assert.equal(skillModel.rankBreaks.rank15.area.radiusBonus, 0);
    assert.equal(skillModel.rankBreaks.rank15.tempBars.hpPerSlot, 0);
    assert.equal(skillModel.rankBreaks.rank20.area.radiusBonus, 0);
    assert.equal(skillModel.rankBreaks.rank20.tempBars.hpPerSlot, 0);
  });

  await t.test('2. DCCItemSheet._prepareContext recognizes configured auras on skills', async () => {
    const item = new DCCItem({
      name: 'Iron Shell Aura',
      type: 'skill',
      system: {
        rank: 5,
        stat: 'con',
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
        },
        rankBreaks: {
          rank10: {
            area: { radiusBonus: 5 },
            tempBars: { hpPerSlot: 6 }
          }
        }
      }
    });

    const sheet = new DCCItemSheet(item);

    const context = await sheet._prepareContext({ item, system: item.system });
    assert.equal(context.hasAuraConfigured, true, 'hasAuraConfigured should be true');
    assert.equal(context.hasRankBreaksConfigured, true, 'hasRankBreaksConfigured should be true');
  });

  await t.test('3. actor.activateAura scales radius and temporary health bars using skill rank & CON mod', async () => {
    const actor = new DCCActor({
      name: 'Carl Brawler',
      type: 'crawler',
      system: {
        abilities: {
          con: { value: 16, mod: 4 },
          str: { value: 14, mod: 4 }
        },
        attributes: {
          hp: { value: 40, max: 40, temp: 0 }
        }
      }
    });

    const skillItem = new DCCItem({
      name: 'Iron Shell Aura',
      type: 'skill',
      system: {
        rank: 10,
        modifiedRank: 10,
        stat: 'con',
        area: {
          hasArea: true,
          shape: 'burst',
          radius: 5,
          targetFilter: 'allies'
        },
        tempBars: {
          hasTempBars: true,
          slotsFormula: 'con',
          hpPerSlot: 2
        },
        rankBreaks: {
          rank5: {
            tempBars: { hpPerSlot: 4 }
          },
          rank10: {
            area: { radiusBonus: 5 },
            tempBars: { hpPerSlot: 6 }
          }
        }
      }
    });
    skillItem.actor = actor;
    actor.items.push(skillItem);

    // Mock getSkillRank to return 10
    actor.getSkillRank = (name) => 10;

    const auraResult = await actor.activateAura(skillItem);
    assert.equal(auraResult.active, true);
    assert.equal(skillItem.system.active, true, 'Skill should become active');
    assert.equal(auraResult.slots, 4, 'CON mod 4 should yield 4 slots');
    assert.equal(auraResult.hpPerSlot, 6, 'Rank 10 break should scale hpPerSlot to 6');
    assert.equal(auraResult.totalTempHp, 24, '4 slots * 6 HP = 24 temp HP');
    assert.equal(auraResult.radius, 10, 'Base 5ft + Rank 10 bonus 5ft = 10ft');

    assert.equal(actor.system.attributes.hp.tempBars.count, 4);
    assert.equal(actor.system.attributes.hp.tempBars.hpPerSlot, 6);
    assert.equal(actor.system.attributes.hp.tempBars.source, 'Iron Shell Aura');
    assert.equal(actor.system.attributes.hp.temp, 24);
  });

  await t.test('4. actor.deactivateAura clears skill aura and temporary health bars', async () => {
    const actor = new DCCActor({
      name: 'Carl Brawler',
      type: 'crawler',
      system: {
        abilities: { con: { value: 16, mod: 4 } },
        attributes: {
          hp: {
            value: 40,
            max: 40,
            temp: 24,
            tempBars: {
              count: 4,
              maxCount: 4,
              hpPerSlot: 6,
              currentSlotHp: 6,
              source: 'Iron Shell Aura'
            }
          }
        }
      }
    });

    const skillItem = new DCCItem({
      name: 'Iron Shell Aura',
      type: 'skill',
      system: {
        active: true,
        area: { hasArea: true, radius: 10 }
      }
    });
    skillItem.actor = actor;
    actor.items.push(skillItem);

    const deactResult = await actor.deactivateAura(skillItem);
    assert.equal(deactResult.active, false);
    assert.equal(skillItem.system.active, false);
    assert.equal(actor.system.attributes.hp.tempBars.count, 0);
    assert.equal(actor.system.attributes.hp.temp, 0);
  });

  await t.test('5. actor.rollSkill toggles and dismisses active aura skills', async () => {
    const actor = new DCCActor({
      name: 'Carl Brawler',
      type: 'crawler',
      system: {
        abilities: { con: { value: 10, mod: 4 } },
        attributes: {
          hp: {
            value: 40,
            max: 40,
            temp: 8,
            tempBars: {
              count: 4,
              maxCount: 4,
              hpPerSlot: 2,
              currentSlotHp: 2,
              source: 'Iron Shell Aura'
            }
          }
        }
      }
    });

    const skillItem = new DCCItem({
      name: 'Iron Shell Aura',
      type: 'skill',
      system: {
        active: true,
        rank: 5,
        stat: 'con',
        area: { hasArea: true, radius: 5 }
      }
    });
    skillItem.actor = actor;
    actor.items.push(skillItem);

    const msg = await actor.rollSkill(skillItem);
    assert.ok(msg, 'Should return a ChatMessage');
    assert.equal(msg.flags['carl-rpg'].isAuraDismiss, true, 'Flags should mark aura dismissed');
    assert.equal(skillItem.system.active, false, 'Skill should now be inactive');
    assert.equal(actor.system.attributes.hp.tempBars.count, 0, 'Temp bars should be cleared');
  });

  await t.test('6. actor.rollSkill activates non-active aura skill and returns activation card', async () => {
    const actor = new DCCActor({
      name: 'Carl Brawler',
      type: 'crawler',
      system: {
        abilities: { con: { value: 10, mod: 4 } },
        attributes: { hp: { value: 40, max: 40, temp: 0 } }
      }
    });

    const skillItem = new DCCItem({
      name: 'Iron Shell Aura',
      type: 'skill',
      system: {
        active: false,
        rank: 1,
        stat: 'con',
        area: { hasArea: true, radius: 5, targetFilter: 'allies' },
        tempBars: { hasTempBars: true, slotsFormula: 'con', hpPerSlot: 2 },
        durationConfig: { rounds: 3 }
      }
    });
    skillItem.actor = actor;
    actor.items.push(skillItem);

    const msg = await actor.rollSkill(skillItem);
    assert.ok(msg, 'Should return a ChatMessage');
    assert.equal(msg.flags['carl-rpg'].isAuraActive, true, 'Flags should mark aura active');
    assert.equal(skillItem.system.active, true, 'Skill should now be active');
    assert.equal(actor.system.attributes.hp.tempBars.count, 4, 'Should grant 4 temp bars');
    assert.ok(msg.content.includes('Aura Active: 5ft Radius'), 'Chat content should describe active aura');
    assert.ok(msg.content.includes('dcc-dismiss-aura-btn'), 'Chat content should include dismiss button');
  });

  await t.test('7. DCCEffectsPanel collects active skill auras as aura-emitter effects', () => {
    const panel = new DCCEffectsPanel();
    const actor = new MockActor({
      name: 'Carl Brawler',
      type: 'crawler',
      system: {
        attributes: {
          hp: {
            value: 40,
            max: 40,
            temp: 8,
            tempBars: {
              count: 4,
              maxCount: 4,
              hpPerSlot: 2,
              currentSlotHp: 2,
              source: 'Iron Shell Aura'
            }
          }
        }
      }
    });

    const activeSkill = new MockItem({
      name: 'Iron Shell Aura',
      type: 'skill',
      system: {
        active: true,
        area: { hasArea: true, radius: 10 },
        durationConfig: { rounds: 3, remainingRounds: 2 }
      }
    }, actor);
    actor.items.push(activeSkill);

    const effects = panel.collectEffects(actor);
    const emitter = effects.find(e => e.name === 'Iron Shell Aura');
    assert.ok(emitter, 'Active skill aura should be in effects list');
    assert.equal(emitter.type, 'aura-emitter');
    assert.equal(emitter.isAuraEmitter, true);
    assert.equal(emitter.remainingRounds, 2);
    assert.equal(emitter.durationLabel, '2r');
    assert.ok(emitter.detailsText.includes('10ft radius'), 'Details should include radius');
    assert.ok(emitter.detailsText.includes('Active: +4 Temp Bars'), 'Details should include temp bars');
  });
});
