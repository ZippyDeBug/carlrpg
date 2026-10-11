import test from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { DCCCombat } from '../src/documents/combat.mjs';

test('DCC RPG Interactive Chat Card Reaction Prompts Subsystem (#4)', async (t) => {

  await t.test('1. _getReactionPromptsHtml generates reaction prompts for targeted defender', async (sub) => {
    const attacker = new DCCActor({
      name: 'Goblin Bruiser',
      type: 'npc',
      system: { attributes: { hp: { value: 20, max: 20 } }, abilities: { str: { value: 14 }, dex: { value: 12 } } }
    });
    attacker.id = 'actor-goblin';

    const defender = new DCCActor({
      name: 'Donut',
      type: 'crawler',
      system: { attributes: { hp: { value: 30, max: 30 } }, abilities: { dex: { value: 16 } } }
    });
    defender.id = 'actor-donut';

    const shieldBlock = new DCCItem({
      name: 'Shield Block',
      type: 'skill',
      system: { checkType: 'Opposed, Interrupt', rank: 3, trigger: 'on_attack' }
    });
    shieldBlock.id = 'item-donut-sb';
    defender.items = [shieldBlock];

    const targetResults = [
      {
        actor: defender,
        actorId: defender.id,
        actorName: defender.name,
        targetDC: 14,
        isHit: true,
        diff: 2,
        outcome: 'Hit'
      }
    ];

    const promptsHtml = attacker._getReactionPromptsHtml(targetResults);
    assert.ok(promptsHtml.includes('dcc-interrupt-prompts-container'), 'Container markup must be generated');
    assert.ok(promptsHtml.includes('dcc-trigger-interrupt-btn'), 'Reaction button must be present');
    assert.ok(promptsHtml.includes('Shield Block'), 'Target Shield Block must be offered');
    assert.ok(promptsHtml.includes('Evade'), 'Target Evade must be offered');
    assert.ok(promptsHtml.includes(`data-actor-id="${defender.id}"`), 'Must bind defender actor ID');
  });

  await t.test('2. _getReactionPromptsHtml discovers allied bodyguard reactions (Catcher & Taunt)', async (sub) => {
    const attacker = new DCCActor({
      name: 'Goblin Bruiser',
      type: 'npc',
      system: { attributes: { hp: { value: 20, max: 20 } } }
    });
    attacker.id = 'actor-goblin';

    const defender = new DCCActor({
      name: 'Donut',
      type: 'crawler',
      system: { attributes: { hp: { value: 30, max: 30 } } }
    });
    defender.id = 'actor-donut';

    const ally = new DCCActor({
      name: 'Carl',
      type: 'crawler',
      system: { attributes: { hp: { value: 50, max: 50 } } }
    });
    ally.id = 'actor-carl';

    const combat = new DCCCombat({
      id: 'combat-prompts-test',
      round: 1,
      combatants: [
        { id: 'c-goblin', actorId: attacker.id, actor: attacker, name: 'Goblin' },
        { id: 'c-donut', actorId: defender.id, actor: defender, name: 'Donut' },
        { id: 'c-carl', actorId: ally.id, actor: ally, name: 'Carl' }
      ]
    });
    globalThis.game.combat = combat;

    const targetResults = [
      {
        actor: defender,
        actorId: defender.id,
        actorName: defender.name,
        targetDC: 14,
        isHit: true,
        diff: 3,
        outcome: 'Hit'
      }
    ];

    const promptsHtml = attacker._getReactionPromptsHtml(targetResults);
    assert.ok(promptsHtml.includes('Carl'), 'Ally Carl must be present in reaction options');
    assert.ok(promptsHtml.includes('Catcher'), 'Catcher bodyguard option must be offered for hit ally');
    assert.ok(promptsHtml.includes('Taunt'), 'Taunt option must be offered');
  });

  await t.test('3. Actor triggerInterrupt executes directly and creates ChatMessage', async (sub) => {
    const crawler = new DCCActor({
      name: 'Carl',
      type: 'crawler',
      system: { attributes: { hp: { value: 45, max: 45 } } }
    });
    crawler.id = 'actor-carl-direct-int';

    let lastCreatedMessage = null;
    globalThis.ChatMessage.create = async (msgData) => {
      lastCreatedMessage = msgData;
      return msgData;
    };

    const res = await crawler.triggerInterrupt('evade', { targetName: 'Goblin' });
    assert.equal(res.success, true);
    assert.equal(res.interrupt.name, 'Evade');
    assert.ok(lastCreatedMessage, 'Must create a ChatMessage');
    assert.ok(lastCreatedMessage.content.includes('INTERRUPT: EVADE'), 'Message content includes title');
    assert.equal(lastCreatedMessage.flags['carl-rpg'].isInterrupt, true);
  });

  await t.test('4. rollAttack embeds reaction prompts in output chat message', async (sub) => {
    const mobAttacker = new DCCActor({
      name: 'Goblin Champion',
      type: 'mob',
      system: {
        attributes: { hp: { value: 25, max: 25 } },
        abilities: { str: { value: 14, mod: 2 }, dex: { value: 12, mod: 1 } }
      }
    });
    mobAttacker.id = 'mob-champion';

    const crawlerTarget = new DCCActor({
      name: 'Donut',
      type: 'crawler',
      system: {
        attributes: { hp: { value: 30, max: 30 } },
        abilities: { dex: { value: 14, mod: 2 } }
      }
    });
    crawlerTarget.id = 'crawler-donut';

    const weaponAttack = new DCCItem({
      name: 'Spiked Club',
      type: 'attack',
      system: {
        toHitStat: 'str',
        damageParts: [{ dice: '1d8', stat: 'str', damageType: 'bludgeoning' }]
      }
    });
    weaponAttack.id = 'item-club';

    const chatMsg = await mobAttacker.rollAttack(weaponAttack, 'hit', {
      targets: [crawlerTarget],
      skipDialog: true
    });

    assert.ok(chatMsg, 'Chat message must be returned');
    assert.ok(chatMsg.content.includes('dcc-interrupt-prompts-container'), 'Card must contain interrupt prompts');
    assert.ok(chatMsg.content.includes('dcc-trigger-interrupt-btn'), 'Card must contain trigger buttons');
    assert.ok(chatMsg.content.includes('Donut'), 'Must include Donut as reaction candidate');
  });

});
