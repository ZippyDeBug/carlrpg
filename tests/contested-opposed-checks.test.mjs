import './setup.mjs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DCCActor, getDCCStatModifier } from '../src/documents/actor.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { SkillDataModel } from '../src/models/items/skill-model.mjs';
import { SpellDataModel } from '../src/models/items/spell-model.mjs';
import { getItemAllTags } from '../src/data/tags.mjs';
import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';

describe('Feature #3: Contested / Opposed Spell & Skill Checks', () => {

  describe('1. Schema & Data Model Validation', () => {
    test('template.json contains contest schema for skill and spell', () => {
      const templateRaw = fs.readFileSync('template.json', 'utf8');
      const template = JSON.parse(templateRaw);

      assert.ok(template.Item.skill.contest, 'Item.skill must have contest schema');
      assert.equal(template.Item.skill.contest.hasContest, false);
      assert.equal(template.Item.skill.contest.contestType, 'dc');
      assert.equal(template.Item.skill.contest.targetStat, 'dex');
      assert.equal(template.Item.skill.contest.targetSkill, '');
      assert.equal(template.Item.skill.contest.customDC, 0);

      assert.ok(template.Item.spell.contest, 'Item.spell must have contest schema');
      assert.equal(template.Item.spell.contest.hasContest, false);
      assert.equal(template.Item.spell.contest.contestType, 'dc');
      assert.equal(template.Item.spell.contest.targetStat, 'dex');

      // Rank breaks must have contest milestone fields
      for (const rankKey of ['rank5', 'rank10', 'rank15', 'rank20']) {
        assert.ok(template.Item.skill.rankBreaks[rankKey].contest, `Item.skill.rankBreaks.${rankKey} must have contest schema`);
        assert.equal(template.Item.skill.rankBreaks[rankKey].contest.dcBonus, 0);
        assert.ok(template.Item.spell.rankBreaks[rankKey].contest, `Item.spell.rankBreaks.${rankKey} must have contest schema`);
        assert.equal(template.Item.spell.rankBreaks[rankKey].contest.dcBonus, 0);
      }
    });

    test('SkillDataModel & SpellDataModel defineSchema initialize contest fields', () => {
      const skillModel = new SkillDataModel({});
      assert.equal(skillModel.contest?.hasContest, false);
      assert.equal(skillModel.contest?.contestType, 'dc');
      assert.equal(skillModel.contest?.targetStat, 'dex');
      assert.equal(skillModel.rankBreaks?.rank5?.contest?.dcBonus, 0);

      const spellModel = new SpellDataModel({});
      assert.equal(spellModel.contest?.hasContest, false);
      assert.equal(spellModel.contest?.contestType, 'dc');
      assert.equal(spellModel.contest?.targetStat, 'dex');
      assert.equal(spellModel.rankBreaks?.rank10?.contest?.dcBonus, 0);
    });
  });

  describe('2. Unified Tag System Integration', () => {
    test('derives action.contested and contest.dc tags for DC challenge', () => {
      const spell = new DCCItem({
        name: 'Grasping Vines',
        type: 'spell',
        system: {
          contest: {
            hasContest: true,
            contestType: 'dc',
            targetStat: 'str'
          }
        }
      });

      const tags = getItemAllTags(spell);
      assert.ok(tags.has('action.contested'), 'Must derive action.contested');
      assert.ok(tags.has('contest.dc'), 'Must derive contest.dc');
      assert.ok(tags.has('contest.str'), 'Must derive contest.str');
      assert.equal(tags.has('contest.opposed'), false);
    });

    test('derives action.opposed and contest.opposed tags for roll vs roll opposed check', () => {
      const skill = new DCCItem({
        name: 'Grapple Lock',
        type: 'skill',
        system: {
          contest: {
            hasContest: true,
            contestType: 'opposed',
            targetStat: 'dex',
            targetSkill: 'Escape Artist'
          }
        }
      });

      const tags = getItemAllTags(skill);
      assert.ok(tags.has('action.contested'), 'Must derive action.contested');
      assert.ok(tags.has('action.opposed'), 'Must derive action.opposed');
      assert.ok(tags.has('contest.opposed'), 'Must derive contest.opposed');
      assert.ok(tags.has('contest.dex'), 'Must derive contest.dex');
      assert.equal(tags.has('contest.dc'), false);
    });
  });

  describe('3. Actor getContestData & DC Calculation', () => {
    test('calculates DC using strict DCC RPG math: 10 + rank + statMod', () => {
      const caster = new DCCActor({
        name: 'Carl',
        system: {
          abilities: {
            int: { value: 25, mod: 5 }, // 20-49 is +5 in CarlRPG
            dex: { value: 14, mod: 4 }
          }
        }
      });

      const spell = new DCCItem({
        name: 'Mind Shackle',
        type: 'spell',
        system: {
          rank: 3,
          stat: 'int',
          contest: {
            hasContest: true,
            contestType: 'dc',
            targetStat: 'int',
            onFailDebuff: 'Stunned',
            onFailNotes: 'Target cannot act for 1 round',
            onSuccessNotes: 'Target takes half effect'
          }
        }
      });

      const data = caster.getContestData(spell);
      assert.ok(data);
      assert.equal(data.rank, 3);
      assert.equal(data.statMod, 5);
      // DC = 10 + 3 (rank) + 5 (INT mod) = 18
      assert.equal(data.dc, 18);
      assert.equal(data.onFailDebuff, 'Stunned');
      assert.equal(data.onFailNotes, 'Target cannot act for 1 round');
      assert.equal(data.onSuccessNotes, 'Target takes half effect');
    });

    test('applies milestone rank break dcBonus and upgraded onFailDebuff', () => {
      const crawler = new DCCActor({
        name: 'Donut',
        system: {
          abilities: {
            cha: { value: 65, mod: 6 } // 50-99 is +6
          }
        }
      });

      const screamSkill = new DCCItem({
        name: 'Piercing Shriek',
        type: 'skill',
        system: {
          rank: 12,
          modifiedRank: 12,
          stat: 'cha',
          contest: {
            hasContest: true,
            contestType: 'dc',
            targetStat: 'con',
            onFailDebuff: 'Dazed'
          },
          rankBreaks: {
            rank5: {
              rank: 5,
              contest: { dcBonus: 2, onFailDebuff: '' }
            },
            rank10: {
              rank: 10,
              contest: { dcBonus: 3, onFailDebuff: 'Deafened' }
            },
            rank15: {
              rank: 15,
              contest: { dcBonus: 4, onFailDebuff: 'Stunned' }
            }
          }
        }
      });

      const data = crawler.getContestData(screamSkill);
      assert.ok(data);
      assert.equal(data.rank, 12);
      assert.equal(data.statMod, 6);
      // At rank 12, milestones rank5 (+2) and rank10 (+3) are active (+5 total bonus). Rank 15 (+4) is not reached.
      assert.equal(data.dcBonus, 5);
      // DC = 10 + 12 (rank) + 6 (statMod) + 5 (dcBonus) = 33
      assert.equal(data.dc, 33);
      // Upgraded fail debuff from rank 10 is Deafened (replaces Dazed)
      assert.equal(data.onFailDebuff, 'Deafened');
    });

    test('customDC override replaces calculated formula when customDC > 0', () => {
      const caster = new DCCActor({
        name: 'Prepotente',
        system: {
          abilities: {
            int: { value: 12, mod: 4 }
          }
        }
      });

      const spell = new DCCItem({
        name: 'Ancient Seal',
        type: 'spell',
        system: {
          rank: 2,
          stat: 'int',
          contest: {
            hasContest: true,
            customDC: 25,
            targetStat: 'str'
          }
        }
      });

      const data = caster.getContestData(spell);
      assert.ok(data);
      assert.equal(data.customDC, 25);
      assert.equal(data.dc, 25);
    });
  });

  describe('4. Chat Card Presentation in rollSpell & rollSkill', () => {
    test('rollSpell renders .dcc-contested-challenge section with .dcc-roll-contest-btn', async () => {
      const caster = new DCCActor({
        name: 'Mordecai',
        system: {
          attributes: { mana: { value: 50, max: 50 } },
          abilities: { int: { value: 22, mod: 5 } }
        }
      });

      const spell = new DCCItem({
        name: 'Frost Shackles',
        type: 'spell',
        system: {
          manaCost: 5,
          stat: 'int',
          rank: 4,
          contest: {
            hasContest: true,
            contestType: 'dc',
            targetStat: 'str',
            onFailDebuff: 'Frozen',
            onFailNotes: 'Target movement reduced to 0'
          }
        }
      }, caster);

      const msg = await caster.rollSpell(spell);
      assert.ok(msg, 'rollSpell should return a ChatMessage');
      const html = msg.content;
      assert.ok(html.includes('dcc-contested-challenge'), 'Must render .dcc-contested-challenge container');
      assert.ok(html.includes('dcc-roll-contest-btn'), 'Must render .dcc-roll-contest-btn button');
      assert.ok(html.includes('data-target-stat="str"'), 'Must specify target stat str');
      assert.ok(html.includes('data-dc="19"'), 'Must calculate DC 10 + 4 + 5 = 19');
      assert.ok(html.includes('Frozen'), 'Must specify on-fail debuff Frozen');
      assert.ok(msg.flags['carl-rpg']?.contest, 'Flag carl-rpg.contest must be stored');
    });

    test('rollSkill renders .dcc-contested-challenge section with opposed initiator roll total', async () => {
      const actor = new DCCActor({
        name: 'Carl',
        system: {
          abilities: { str: { value: 30, mod: 5 } }
        }
      });

      const grappleSkill = new DCCItem({
        name: 'Grapple Maneuver',
        type: 'skill',
        system: {
          rank: 5,
          stat: 'str',
          contest: {
            hasContest: true,
            contestType: 'opposed',
            targetStat: 'str',
            targetSkill: 'Escape Artist',
            onFailDebuff: 'Grappled',
            onFailNotes: 'Target is restrained'
          }
        }
      }, actor);

      const msg = await actor.rollSkill(grappleSkill);
      assert.ok(msg);
      const html = msg.content;
      assert.ok(html.includes('dcc-contested-challenge'), 'Must render contested container');
      assert.ok(html.includes('OPPOSED CONTEST'), 'Must display OPPOSED CONTEST badge');
      assert.ok(html.includes('Escape Artist (STR)'), 'Must display target skill label');
      assert.ok(html.includes('data-contest-type="opposed"'), 'Must have contest type opposed in button');
      assert.ok(html.includes('Grappled'), 'Must include fail debuff');
    });
  });

  describe('5. Defensive Contest Response: actor.rollContestResponse', () => {
    test('evaluates DC challenge success when defender meets or beats DC', async () => {
      const defender = new DCCActor({
        name: 'Goblin Bruiser',
        system: {
          abilities: {
            str: { value: 16, mod: 4 }
          }
        }
      });

      const msg = await defender.rollContestResponse({
        initiatorName: 'Carl',
        itemName: 'Trip Wire',
        contestType: 'dc',
        targetStat: 'str',
        dc: 12,
        onFailDebuff: 'Prone',
        onSuccessNotes: 'Defender keeps footing'
      });

      assert.ok(msg);
      assert.ok(msg.flags['carl-rpg']?.isContestRoll);
      const rollTotal = msg.flags['carl-rpg']?.rollTotal;
      assert.ok(typeof rollTotal === 'number');

      if (rollTotal >= 12) {
        assert.equal(msg.flags['carl-rpg'].isContestSuccess, true);
        assert.ok(msg.content.includes('SUCCESS'));
        assert.ok(msg.content.includes('Defender keeps footing'));
        assert.equal(msg.content.includes('Apply [Prone]'), false, 'Debuff button should not appear on success');
      } else {
        assert.equal(msg.flags['carl-rpg'].isContestSuccess, false);
        assert.ok(msg.content.includes('FAILED'));
        assert.ok(msg.content.includes('Apply [Prone]'), 'Debuff button must appear on failure');
      }
    });

    test('evaluates opposed roll contest against initiator total', async () => {
      const defender = new DCCActor({
        name: 'Katya',
        system: {
          abilities: {
            dex: { value: 18, mod: 4 }
          }
        }
      });

      // Provide defender with Escape Artist skill
      const escapeSkill = new DCCItem({
        name: 'Escape Artist',
        type: 'skill',
        system: {
          rank: 6,
          modifiedRank: 6,
          stat: 'dex'
        }
      }, defender);
      defender.items.push(escapeSkill);

      // Initiator total is 20
      const msg = await defender.rollContestResponse({
        initiatorName: 'Boss Minotaur',
        itemName: 'Bear Hug',
        contestType: 'opposed',
        targetStat: 'dex',
        targetSkill: 'Escape Artist',
        initiatorTotal: 20,
        onFailDebuff: 'Restrained',
        onFailNotes: 'Takes 2 bars crushing damage per round'
      });

      assert.ok(msg);
      assert.ok(msg.content.includes('Escape Artist'));
      const rollTotal = msg.flags['carl-rpg']?.rollTotal;
      assert.equal(msg.flags['carl-rpg'].targetThreshold, 20);

      if (rollTotal >= 20) {
        assert.equal(msg.flags['carl-rpg'].isContestSuccess, true);
        assert.ok(msg.content.includes('SUCCESS'));
      } else {
        assert.equal(msg.flags['carl-rpg'].isContestSuccess, false);
        assert.ok(msg.content.includes('FAILED'));
        assert.ok(msg.content.includes('Apply [Restrained]'));
      }
    });
  });

  describe('6. Item Sheet Context & Progressive Disclosure', () => {
    test('_prepareContext populates contest configuration context and detects active contest', async () => {
      const spell = new DCCItem({
        name: 'Paralyzing Hex',
        type: 'spell',
        system: {
          contest: {
            hasContest: true,
            contestType: 'dc',
            targetStat: 'con',
            onFailDebuff: 'Paralyzed'
          }
        }
      });

      const sheet = new DCCItemSheet(spell);
      const context = await sheet._prepareContext();

      assert.equal(context.hasContestConfigured, true, 'hasContestConfigured must be true when contest is enabled');
      assert.ok(Array.isArray(context.contestStats), 'contestStats array must exist');
      assert.ok(context.contestStats.some(s => s.id === 'str'), 'contestStats must include STR');
      assert.ok(context.contestStats.some(s => s.id === 'con'), 'contestStats must include CON');

      assert.ok(Array.isArray(context.contestTypes), 'contestTypes array must exist');
      assert.ok(context.contestTypes.some(t => t.id === 'dc'), 'contestTypes must include DC Challenge');
      assert.ok(context.contestTypes.some(t => t.id === 'opposed'), 'contestTypes must include Opposed');
    });

    test('_prepareContext detects rank breaks with contest bonuses', async () => {
      const skill = new DCCItem({
        name: 'Subdue',
        type: 'skill',
        system: {
          contest: {
            hasContest: false
          },
          rankBreaks: {
            rank5: {
              rank: 5,
              contest: {
                dcBonus: 2,
                onFailDebuff: 'Stunned'
              }
            }
          }
        }
      });

      const sheet = new DCCItemSheet(skill);
      const context = await sheet._prepareContext();

      assert.equal(context.hasRankBreaksConfigured, true, 'hasRankBreaksConfigured must be true when contest bonus is set on rank break');
    });
  });
});
