import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import './setup.mjs';

import { DCCItemSheet } from '../src/sheets/item-sheet.mjs';
import { SkillDataModel } from '../src/models/items/skill-model.mjs';
import { SpellDataModel } from '../src/models/items/spell-model.mjs';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { TAG_NAMESPACES, DCC_TAGS, computeDerivedTags } from '../src/data/tags.mjs';
import { hydrateRankBreaks } from '../src/data/rank-dice.mjs';

describe('DCC RPG - Rank Break Critical Milestones, Selectable Ranks 1–20 & Trigger Tags', () => {
  let templateData;

  before(async () => {
    const rawTemplate = await readFile(resolve(process.cwd(), 'template.json'), 'utf8');
    templateData = JSON.parse(rawTemplate);
  });

  describe('1. Schema Validation (template.json, SkillDataModel, SpellDataModel)', () => {
    it('template.json defines rank (1-20 default 5,10,15,20) and critMultiplier: 1 across rank breaks', () => {
      for (const itemType of ['skill', 'spell']) {
        const itemTemplate = templateData.Item?.[itemType];
        assert.ok(itemTemplate, `Item.${itemType} template must exist`);
        assert.ok(itemTemplate.rankBreaks, `Item.${itemType}.rankBreaks must exist`);

        const expectedRanks = { rank5: 5, rank10: 10, rank15: 15, rank20: 20 };
        for (const [tier, expectedRank] of Object.entries(expectedRanks)) {
          const breakConfig = itemTemplate.rankBreaks[tier];
          assert.ok(breakConfig, `Item.${itemType}.rankBreaks.${tier} must exist`);
          assert.equal(breakConfig.rank, expectedRank, `${tier} rank defaults to ${expectedRank}`);
          assert.equal(breakConfig.critMultiplier, 1, `${tier} critMultiplier defaults to 1`);
        }
      }
    });

    it('SkillDataModel instantiates with default rank and critMultiplier for all breaks', () => {
      const model = new SkillDataModel({});
      assert.equal(model.rankBreaks.rank5.rank, 5);
      assert.equal(model.rankBreaks.rank5.critMultiplier, 1);
      assert.equal(model.rankBreaks.rank10.rank, 10);
      assert.equal(model.rankBreaks.rank10.critMultiplier, 1);
      assert.equal(model.rankBreaks.rank15.rank, 15);
      assert.equal(model.rankBreaks.rank15.critMultiplier, 1);
      assert.equal(model.rankBreaks.rank20.rank, 20);
      assert.equal(model.rankBreaks.rank20.critMultiplier, 1);
    });

    it('SpellDataModel instantiates with default rank and critMultiplier for all breaks', () => {
      const model = new SpellDataModel({});
      assert.equal(model.rankBreaks.rank5.rank, 5);
      assert.equal(model.rankBreaks.rank5.critMultiplier, 1);
      assert.equal(model.rankBreaks.rank10.rank, 10);
      assert.equal(model.rankBreaks.rank10.critMultiplier, 1);
      assert.equal(model.rankBreaks.rank15.rank, 15);
      assert.equal(model.rankBreaks.rank15.critMultiplier, 1);
      assert.equal(model.rankBreaks.rank20.rank, 20);
      assert.equal(model.rankBreaks.rank20.critMultiplier, 1);
    });
  });

  describe('2. Unified Tag System: Triggers Namespace & Derivations', () => {
    it('registers trigger namespace and trigger tags in DCC_TAGS', () => {
      assert.ok('trigger' in TAG_NAMESPACES, 'trigger namespace must be registered');
      assert.ok(DCC_TAGS.some(t => t.id === 'trigger.crit'), 'trigger.crit tag must be defined');
      assert.ok(DCC_TAGS.some(t => t.id === 'trigger.fumble'), 'trigger.fumble tag must be defined');
      assert.ok(DCC_TAGS.some(t => t.id === 'trigger.on_hit'), 'trigger.on_hit tag must be defined');
    });

    it('computeDerivedTags derives trigger.crit when rank break critMultiplier > 1', () => {
      const spell = {
        type: 'spell',
        system: {
          rankBreaks: {
            rank10: { rank: 10, critMultiplier: 4 }
          }
        }
      };
      const tags = computeDerivedTags(spell);
      assert.ok(tags.has('trigger.crit'), 'must derive trigger.crit when a rank break has critMultiplier > 1');
    });

    it('computeDerivedTags derives trigger.crit from legacy critMultiplierR5 or critMultiplierR15', () => {
      const legacySpell = {
        type: 'spell',
        system: {
          critMultiplierR5: 2
        }
      };
      const tags = computeDerivedTags(legacySpell);
      assert.ok(tags.has('trigger.crit'), 'must derive trigger.crit from legacy critMultiplierR5');
    });

    it('computeDerivedTags derives trigger.fumble and trigger.on_hit from condition configs', () => {
      const item = {
        type: 'spell',
        system: {
          fumbleDebuff: 'Stunned',
          onHitDebuff: 'Burn'
        }
      };
      const tags = computeDerivedTags(item);
      assert.ok(tags.has('trigger.fumble'), 'must derive trigger.fumble when fumbleDebuff is present');
      assert.ok(tags.has('trigger.on_hit'), 'must derive trigger.on_hit when onHitDebuff is present');
    });
  });

  describe('3. DCCItemSheet Integration (Available Ranks 1-20 & Flags)', () => {
    it('_prepareContext provides availableRanks array from 1 to 20', async () => {
      const item = new DCCItem({
        id: 'test-spell-ranks',
        name: 'Fireblast',
        type: 'spell',
        system: {}
      });
      const sheet = new DCCItemSheet(item);
      const context = await sheet._prepareContext({});

      assert.ok(Array.isArray(context.availableRanks), 'availableRanks must be an array');
      assert.equal(context.availableRanks.length, 20);
      assert.equal(context.availableRanks[0], 1);
      assert.equal(context.availableRanks[19], 20);
    });

    it('hasRankBreaksConfigured detects critMultiplier > 1 on rank breaks', async () => {
      const item = new DCCItem({
        id: 'test-spell-crit',
        name: 'Crit Specialist',
        type: 'spell',
        system: {
          rankBreaks: {
            rank5: { rank: 5, critMultiplier: 3 }
          }
        }
      });
      const sheet = new DCCItemSheet(item);
      const context = await sheet._prepareContext({});
      assert.equal(context.hasRankBreaksConfigured, true, 'hasRankBreaksConfigured must be true when critMultiplier > 1');
    });
  });

  describe('4. Dynamic Rank Milestone Evaluation & Critical Multipliers in Actor Rolls', () => {
    it('applies custom crit multiplier at custom rank milestone (e.g. 4x at Rank 10)', async () => {
      const actor = new DCCActor({
        id: 'test-crawler-1',
        name: 'Carl',
        type: 'crawler',
        system: {
          attributes: { intelligence: 16 }
        }
      });

      const spell = new DCCItem({
        id: 'spell-custom-crit',
        name: 'Focused Beam',
        type: 'spell',
        system: {
          rank: 10,
          baseDamage: '2d6',
          rankBreaks: {
            rank10: {
              rank: 10,
              critMultiplier: 4
            }
          }
        }
      });

      const message = await actor.rollSpellDamage(spell);
      assert.ok(message, 'rollSpellDamage must return a message');
      assert.equal(message.flags['carl-rpg'].critMultiplier, 4, 'Crit multiplier must be 4 at Rank 10');
      assert.ok(message.content.includes('data-multiplier="4"'), 'chat card must contain data-multiplier="4"');
      assert.ok(message.content.includes('Crit (4x)'), 'chat card must display Crit (4x)');
    });

    it('does not apply custom crit multiplier if spell rank is below the configured milestone rank', async () => {
      const actor = new DCCActor({
        id: 'test-crawler-2',
        name: 'Carl',
        type: 'crawler',
        system: {
          attributes: { intelligence: 16 }
        }
      });

      const spell = new DCCItem({
        id: 'spell-high-crit',
        name: 'Mega Blast',
        type: 'spell',
        system: {
          rank: 8, // below milestone 10
          baseDamage: '2d6',
          rankBreaks: {
            rank10: {
              rank: 10,
              critMultiplier: 4
            }
          }
        }
      });

      const message = await actor.rollSpellDamage(spell);
      assert.equal(message.flags['carl-rpg'].critMultiplier, 2, 'Crit multiplier must default to 2x when below milestone rank 10');
      assert.ok(message.content.includes('data-multiplier="2"'), 'chat card must contain data-multiplier="2"');
    });

    it('evaluates custom non-traditional milestone rank (e.g. Rank 17) for both damage dice and crit multiplier', async () => {
      const actor = new DCCActor({
        id: 'test-crawler-3',
        name: 'Donut',
        type: 'crawler',
        system: {
          attributes: { charisma: 18 }
        }
      });

      const spell = new DCCItem({
        id: 'spell-rank-17',
        name: 'Cat Screech',
        type: 'spell',
        system: {
          rank: 17,
          baseDamage: '3d8',
          rankBreaks: {
            rank20: {
              rank: 17, // custom milestone rank 17
              critMultiplier: 6,
              damageDice: '2d8'
            }
          }
        }
      });

      const damageData = actor.getSpellDamageData(spell);
      assert.equal(damageData.dice, '5d8', '3d8 base + 2d8 from Rank 17 break must total 5d8');

      const message = await actor.rollSpellDamage(spell);
      assert.equal(message.flags['carl-rpg'].critMultiplier, 6, 'must apply 6x crit multiplier for milestone at Rank 17');
      assert.ok(message.content.includes('Crit (6x)'), 'chat card must display Crit (6x)');
    });

    it('takes the highest reached crit multiplier when multiple rank breaks specify multipliers', async () => {
      const actor = new DCCActor({
        id: 'test-crawler-4',
        name: 'Carl',
        type: 'crawler',
        system: {
          attributes: { intelligence: 14 }
        }
      });

      const spell = new DCCItem({
        id: 'spell-multi-crit',
        name: 'Multi Perk Spell',
        type: 'spell',
        system: {
          rank: 15,
          baseDamage: '1d6',
          rankBreaks: {
            rank5: { rank: 5, critMultiplier: 2 },
            rank10: { rank: 10, critMultiplier: 4 },
            rank15: { rank: 15, critMultiplier: 8 },
            rank20: { rank: 20, critMultiplier: 10 }
          }
        }
      });

      const message = await actor.rollSpellDamage(spell);
      assert.equal(message.flags['carl-rpg'].critMultiplier, 8, 'must take 8x at rank 15 and not 10x (rank 20 unreached)');
    });

    it('applies custom crit multiplier from matching skill to weapon attack', async () => {
      const brawlingSkill = new DCCItem({
        id: 'skill-brawling',
        name: 'Brawling',
        type: 'skill',
        system: {
          rank: 12,
          appliesTo: 'Unarmed',
          rankBreaks: {
            rank10: {
              rank: 10,
              critMultiplier: 5,
              debuff: 'Stunned'
            }
          }
        }
      });

      const actor = new DCCActor({
        id: 'test-crawler-brawler',
        name: 'Brawler Carl',
        type: 'crawler',
        system: {
          attributes: { strength: 16 }
        },
        items: [brawlingSkill]
      });

      const unarmedAttack = new DCCItem({
        id: 'attack-fist',
        name: 'Unarmed Strike',
        type: 'attack',
        system: {
          associatedSkills: 'Brawling',
          weaponCategory: 'Unarmed',
          damageParts: [{ dice: '1d4', stat: 'str', type: 'bludgeoning' }]
        }
      });

      const msg = await actor.rollAttack(unarmedAttack, 'damage');
      assert.ok(msg, 'rollAttack must return chat message');
      assert.equal(msg.flags['carl-rpg'].critMultiplier, 5, 'must apply 5x crit multiplier from Brawling rank 10 milestone');
      assert.ok(msg.content.includes('Crit (5x)'), 'card must show Crit (5x)');
      assert.ok(msg.content.includes('Inflict [Stunned]'), 'card must include on-hit debuff from Brawling rank break');
    });
  });

  describe('5. Backward Compatibility (Legacy critMultiplierR5 and critMultiplierR15)', () => {
    it('applies legacy critMultiplierR5 and critMultiplierR15 when rank break critMultiplier is not explicitly set', async () => {
      const actor = new DCCActor({
        id: 'test-crawler-legacy',
        name: 'Carl',
        type: 'crawler',
        system: {
          attributes: { intelligence: 14 }
        }
      });

      const legacySpell = new DCCItem({
        id: 'spell-legacy',
        name: 'Old Spell',
        type: 'spell',
        system: {
          rank: 15,
          baseDamage: '1d6',
          critMultiplierR5: 3,
          critMultiplierR15: 5,
          rankBreaks: {
            rank5: { rank: 5, critMultiplier: 1 },
            rank15: { rank: 15, critMultiplier: 1 }
          }
        }
      });

      const message = await actor.rollSpellDamage(legacySpell);
      assert.equal(message.flags['carl-rpg'].critMultiplier, 5, 'must fall back to legacy critMultiplierR15 (5x)');
    });

    it('hydrateRankBreaks preserves and hydrates critMultiplier and rank', () => {
      const rawBreaks = {
        rank5: { damageDice: '1d4' },
        rank10: { rank: 12, critMultiplier: 3 }
      };

      const hydrated = hydrateRankBreaks(rawBreaks);
      assert.equal(hydrated.rank5.rank, 5, 'rank5 defaults rank to 5');
      assert.equal(hydrated.rank5.critMultiplier, 1, 'rank5 defaults critMultiplier to 1');
      assert.equal(hydrated.rank10.rank, 12, 'rank10 retains custom rank 12');
      assert.equal(hydrated.rank10.critMultiplier, 3, 'rank10 retains custom critMultiplier 3');
      assert.equal(hydrated.rank15.rank, 15, 'rank15 defaults rank to 15');
      assert.equal(hydrated.rank20.rank, 20, 'rank20 defaults rank to 20');
    });
  });
});
