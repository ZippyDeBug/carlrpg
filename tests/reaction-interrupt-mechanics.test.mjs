import test from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';
import { DCCActor } from '../src/documents/actor.mjs';
import { DCCItem } from '../src/documents/item.mjs';
import { DCCCombat, DCC_ACTION_TYPES } from '../src/documents/combat.mjs';
import { DCCCombatTracker } from '../src/apps/combat-tracker.mjs';
import { DCC_TAGS, computeDerivedTags, isValidTag } from '../src/data/tags.mjs';

test('DCC RPG Reaction and Interrupt Subsystem (#4)', async (t) => {

  await t.test('1. Tag Registry & Derived Tags for Reactions & Interrupt Triggers', async (sub) => {
    await sub.test('registers action.reaction and action.free_interrupt in DCC_TAGS', () => {
      assert.ok(isValidTag('action.reaction'), 'action.reaction must be a valid registered tag');
      assert.ok(isValidTag('action.free_interrupt'), 'action.free_interrupt must be a valid registered tag');
      assert.ok(isValidTag('action.interrupt'), 'action.interrupt is a valid registered tag');
    });

    await sub.test('registers reactive trigger tags in trigger namespace', () => {
      assert.ok(isValidTag('trigger.on_attack'), 'trigger.on_attack must be a valid tag');
      assert.ok(isValidTag('trigger.on_damage'), 'trigger.on_damage must be a valid tag');
      assert.ok(isValidTag('trigger.on_move'), 'trigger.on_move must be a valid tag');
      assert.ok(isValidTag('trigger.on_ally_hit'), 'trigger.on_ally_hit must be a valid tag');
    });

    await sub.test('computeDerivedTags derives action.interrupt and trigger tags from spell or skill item', () => {
      const spellItem = new DCCItem({
        name: 'Protective Shell',
        type: 'spell',
        system: {
          spellType: 'Interrupt',
          manaCost: 10,
          trigger: 'on_damage'
        }
      });
      const derived = computeDerivedTags(spellItem);
      assert.ok(derived.has('action.interrupt'), 'Derives action.interrupt from spellType Interrupt');
      assert.ok(derived.has('trigger.on_damage'), 'Derives trigger.on_damage from item trigger');
    });
  });

  await t.test('2. Actor getAvailableInterrupts() Discovery & State Evaluation', async (sub) => {
    const crawler = new DCCActor({
      name: 'Carl',
      type: 'crawler',
      system: {
        attributes: {
          hp: { value: 40, max: 40 },
          mp: { value: 20, max: 20 },
          aiFavor: 2
        },
        abilities: {
          str: { value: 16 },
          dex: { value: 14 },
          con: { value: 15 },
          int: { value: 12 },
          cha: { value: 10 }
        }
      }
    });
    crawler.id = 'actor-carl-interrupt';

    // Add Shield Block skill
    const shieldBlock = new DCCItem({
      name: 'Shield Block',
      type: 'skill',
      system: {
        checkType: 'Opposed, Interrupt',
        rank: 5,
        trigger: 'on_attack'
      }
    });
    shieldBlock.id = 'item-shield-block';

    // Add Parkour skill with Rank 10 free interrupt perk
    const parkour = new DCCItem({
      name: 'Parkour',
      type: 'skill',
      system: {
        checkType: 'Passive',
        rank: 10,
        rankBreaks: {
          rank10: {
            rank: 10,
            notes: 'Avoid Take Down or involuntary Move as free Interrupt.',
            isFreeInterrupt: true
          }
        }
      }
    });
    parkour.id = 'item-parkour';

    // Add Hole spell
    const holeSpell = new DCCItem({
      name: 'Hole',
      type: 'spell',
      system: {
        spellType: 'Interrupt',
        manaCost: 5,
        rank: 3
      }
    });
    holeSpell.id = 'item-hole';

    crawler.items = [shieldBlock, parkour, holeSpell];

    await sub.test('discovers built-in CarlRPG core interrupts (Evade, Taunt, Catcher, Intervene)', () => {
      const interrupts = crawler.getAvailableInterrupts();
      const ids = interrupts.map(i => i.id);

      assert.ok(ids.includes('evade'), 'Must include built-in Evade');
      assert.ok(ids.includes('taunt'), 'Must include built-in Taunt');
      assert.ok(ids.includes('catcher'), 'Must include built-in Catcher');
      assert.ok(ids.includes('intervene'), 'Must include built-in Intervene');

      const evade = interrupts.find(i => i.id === 'evade');
      assert.equal(evade.category, 'defensive');
      assert.equal(evade.isFree, false);
      assert.equal(evade.actionCost, 1);
    });

    await sub.test('discovers owned interrupt spells and skills', () => {
      const interrupts = crawler.getAvailableInterrupts();
      const shieldBlockOpt = interrupts.find(i => i.name === 'Shield Block');
      assert.ok(shieldBlockOpt, 'Shield Block must be discovered');
      assert.equal(shieldBlockOpt.type, 'skill');
      assert.equal(shieldBlockOpt.trigger, 'on_attack');

      const holeOpt = interrupts.find(i => i.name === 'Hole');
      assert.ok(holeOpt, 'Hole spell must be discovered');
      assert.equal(holeOpt.type, 'spell');
      assert.equal(holeOpt.manaCost, 5);
    });

    await sub.test('detects Free Interrupt perks (Parkour Rank 10)', () => {
      const interrupts = crawler.getAvailableInterrupts();
      const parkourOpt = interrupts.find(i => i.name.includes('Parkour'));
      assert.ok(parkourOpt, 'Parkour free interrupt option must be present');
      assert.equal(parkourOpt.isFree, true, 'Parkour Rank 10 is a free interrupt');
      assert.equal(parkourOpt.actionCost, 0, 'Action cost is 0');
    });

    await sub.test('evaluates canUse based on action budget and MP', () => {
      // With full budget
      let interrupts = crawler.getAvailableInterrupts({ actionsSpent: 0, actionsMax: 2 });
      const evade = interrupts.find(i => i.id === 'evade');
      assert.equal(evade.canUse, true);

      // With depleted budget: standard interrupts cannot be used, but free interrupt can
      interrupts = crawler.getAvailableInterrupts({ actionsSpent: 2, actionsMax: 2 });
      const evadeDepleted = interrupts.find(i => i.id === 'evade');
      assert.equal(evadeDepleted.canUse, false, 'Evade cannot be used when action budget is exhausted');

      const parkourFree = interrupts.find(i => i.name.includes('Parkour'));
      assert.equal(parkourFree.canUse, true, 'Free interrupt can still be used when budget is exhausted');
    });
  });

  await t.test('3. Combat Document triggerInterrupt() Action Execution', async (sub) => {
    const crawler = new DCCActor({
      name: 'Carl',
      type: 'crawler',
      system: { attributes: { hp: { value: 50, max: 50 }, mp: { value: 25, max: 25 } } }
    });
    crawler.id = 'actor-carl-combat';

    const shieldBlock = new DCCItem({
      name: 'Shield Block',
      type: 'skill',
      system: { checkType: 'Opposed, Interrupt', rank: 4 }
    });
    shieldBlock.id = 'item-sb-1';
    crawler.items = [shieldBlock];

    const combat = new DCCCombat({
      id: 'combat-interrupt-test',
      round: 1,
      combatants: [
        { id: 'c-carl', actorId: crawler.id, actor: crawler, name: 'Carl' }
      ]
    });

    await sub.test('triggerInterrupt spends 1 action slot for standard interrupt', async () => {
      const res = await combat.triggerInterrupt('c-carl', 'evade');
      assert.equal(res.success, true);
      assert.equal(res.isFree, false);

      const actions = combat.getCombatantActions('c-carl');
      assert.equal(actions.spent, 1, '1 action spent for Evade');
      assert.equal(actions.slots.length, 1);
      assert.equal(actions.slots[0].isInterrupt, true, 'Slot marked as interrupt');
      assert.equal(actions.slots[0].type, 'evade');
    });

    await sub.test('triggerInterrupt with owned item skill creates interrupt record', async () => {
      const res = await combat.triggerInterrupt('c-carl', 'item-sb-1');
      assert.equal(res.success, true);

      const actions = combat.getCombatantActions('c-carl');
      assert.equal(actions.spent, 2, '2 actions spent total');
      assert.equal(actions.slots[1].isInterrupt, true);
      assert.equal(actions.slots[1].label, 'Shield Block');
    });

    await sub.test('triggerInterrupt with Free Interrupt executes even when action budget is full', async () => {
      // Both base actions (2/2) are spent!
      const freeInterruptData = {
        id: 'free-dodge',
        name: 'Instinctive Roll',
        isFree: true,
        actionCost: 0
      };

      const res = await combat.triggerInterrupt('c-carl', freeInterruptData);
      assert.equal(res.success, true);
      assert.equal(res.isFree, true);

      // Actions spent should STILL be 2 (did not consume an action slot)
      const actions = combat.getCombatantActions('c-carl');
      assert.equal(actions.spent, 2, 'Spent action count did not increase for free interrupt');
    });
  });

  await t.test('4. Combat Tracker Data Preparation for Interrupt Drawer & Reaction State', async (sub) => {
    const crawler = new DCCActor({
      name: 'Donut',
      type: 'crawler',
      system: { attributes: { hp: { value: 30, max: 30 }, mp: { value: 20, max: 20 } } }
    });
    crawler.id = 'actor-donut-tracker';

    const holeSpell = new DCCItem({
      name: 'Hole',
      type: 'spell',
      system: { spellType: 'Interrupt', manaCost: 5 }
    });
    holeSpell.id = 'spell-hole-tracker';
    crawler.items = [holeSpell];

    const combat = new DCCCombat({
      id: 'combat-tracker-interrupts',
      round: 1,
      combatants: [
        { id: 'c-donut', actorId: crawler.id, actor: crawler, name: 'Donut' }
      ]
    });

    const tracker = new DCCCombatTracker();
    tracker.viewed = combat;

    await sub.test('populates reactionReady: true and availableInterrupts in tracker data', async () => {
      const data = await tracker.getData();
      const crawlerTurn = data.phases.find(p => !p.isMob).turns[0];

      assert.equal(crawlerTurn.reactionReady, true, 'Reaction ready when actions unspent');
      assert.ok(Array.isArray(crawlerTurn.availableInterrupts), 'availableInterrupts must be an array');
      assert.ok(crawlerTurn.availableInterrupts.length >= 4, 'Includes core interrupts and Hole');
      assert.ok(crawlerTurn.availableInterrupts.some(i => i.name === 'Hole'));
    });

    await sub.test('updates reactionReady to false when actions are exhausted without free interrupts', async () => {
      // Record 2 actions
      await combat.recordCombatantAction('c-donut', { type: 'move' });
      await combat.recordCombatantAction('c-donut', { type: 'cast' });

      const data = await tracker.getData();
      const crawlerTurn = data.phases.find(p => !p.isMob).turns[0];

      assert.equal(crawlerTurn.actions.spent, 2);
      assert.equal(crawlerTurn.reactionReady, false, 'Reaction ready false when all actions spent without free interrupt');
    });
  });

});
