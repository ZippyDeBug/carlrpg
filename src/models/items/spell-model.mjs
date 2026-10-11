import { BaseItemDataModel } from './base-item-model.mjs';

/**
 * Data Model for DCC RPG Spell Items.
 */
export class SpellDataModel extends BaseItemDataModel {
  static defineSchema() {
    const fields = globalThis.foundry.data.fields;
    return {
      ...super.defineSchema(),
      rank: new fields.NumberField({ integer: true, min: 0, initial: 1 }),
      stat: new fields.StringField({ initial: 'int' }),
      manaCost: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      range: new fields.StringField({ initial: '30 feet' }),
      target: new fields.StringField({ initial: 'Self' }),
      duration: new fields.StringField({ initial: 'Instantaneous' }),
      cooldown: new fields.StringField({ initial: 'None' }),
      spellType: new fields.StringField({ initial: 'Attack' }),
      damageType: new fields.StringField({ initial: '' }),
      baseDamage: new fields.StringField({ initial: '' }),
      damageModifiers: new fields.ArrayField(new fields.SchemaField({
        type: new fields.StringField({ initial: 'Fire' }),
        value: new fields.NumberField({ integer: true, initial: 0 }),
        dice: new fields.StringField({ initial: '' }),
        minRank: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        stat: new fields.StringField({ initial: '' })
      })),
      critMultiplierR5: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
      critMultiplierR15: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
      fumbleDebuff: new fields.StringField({ initial: '' }),
      onHitDebuff: new fields.StringField({ initial: '' }),
      onHitDebuffMinRank: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      optionalEffects: new fields.ArrayField(new fields.StringField()),
      selectedEffect: new fields.StringField({ initial: '' }),
      ignoreDR: new fields.BooleanField({ initial: false }),
      healing: new fields.SchemaField({
        hasHealing: new fields.BooleanField({ initial: false }),
        barsFormula: new fields.StringField({ initial: '2' }),
        targetFilter: new fields.StringField({ initial: 'allies' }),
        isHoT: new fields.BooleanField({ initial: false }),
        hotRounds: new fields.NumberField({ integer: true, min: 1, initial: 3 }),
        cleanseDebuffs: new fields.ArrayField(new fields.StringField(), { initial: [] })
      }),
      contest: new fields.SchemaField({
        hasContest: new fields.BooleanField({ initial: false }),
        contestType: new fields.StringField({ initial: 'dc' }),
        targetStat: new fields.StringField({ initial: 'dex' }),
        targetSkill: new fields.StringField({ initial: '' }),
        dcFormula: new fields.StringField({ initial: '10 + rank + stat' }),
        customDC: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        onFailDebuff: new fields.StringField({ initial: '' }),
        onFailNotes: new fields.StringField({ initial: '' }),
        onSuccessNotes: new fields.StringField({ initial: '' })
      }),
      aiFavor: new fields.NumberField({ integer: true, initial: 0 }),
      favored: new fields.StringField({ initial: '' }),
      limitations: new fields.StringField({ initial: '' }),
      quote: new fields.StringField({ initial: '' }),
      description: new fields.HTMLField({ initial: '' }),
      upgrades: new fields.SchemaField({
        rank5: new fields.StringField({ initial: '' }),
        rank10: new fields.StringField({ initial: '' }),
        rank15: new fields.StringField({ initial: '' }),
        rank20: new fields.StringField({ initial: '' })
      }),
      rankBreaks: new fields.SchemaField({
        rank5: new fields.SchemaField({
          rank: new fields.NumberField({ integer: true, min: 1, max: 20, initial: 5 }),
          critMultiplier: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
          damageDice: new fields.StringField({ initial: '' }),
          rankDamageDice: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
          buffsResistances: new fields.StringField({ initial: '' }),
          debuff: new fields.StringField({ initial: '' }),
          notes: new fields.StringField({ initial: '' }),
          isArmorPiercing: new fields.BooleanField({ initial: false }),
          healing: new fields.SchemaField({
            barsBonus: new fields.NumberField({ integer: true, initial: 0 }),
            cleanseDebuff: new fields.StringField({ initial: '' })
          }),
          contest: new fields.SchemaField({
            dcBonus: new fields.NumberField({ integer: true, initial: 0 }),
            onFailDebuff: new fields.StringField({ initial: '' })
          }),
          area: new fields.SchemaField({
            radiusBonus: new fields.NumberField({ integer: true, initial: 0 })
          }),
          tempBars: new fields.SchemaField({
            hpPerSlot: new fields.NumberField({ integer: true, initial: 0 })
          })
        }),
        rank10: new fields.SchemaField({
          rank: new fields.NumberField({ integer: true, min: 1, max: 20, initial: 10 }),
          critMultiplier: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
          damageDice: new fields.StringField({ initial: '' }),
          rankDamageDice: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
          buffsResistances: new fields.StringField({ initial: '' }),
          debuff: new fields.StringField({ initial: '' }),
          notes: new fields.StringField({ initial: '' }),
          isArmorPiercing: new fields.BooleanField({ initial: false }),
          healing: new fields.SchemaField({
            barsBonus: new fields.NumberField({ integer: true, initial: 0 }),
            cleanseDebuff: new fields.StringField({ initial: '' })
          }),
          contest: new fields.SchemaField({
            dcBonus: new fields.NumberField({ integer: true, initial: 0 }),
            onFailDebuff: new fields.StringField({ initial: '' })
          }),
          area: new fields.SchemaField({
            radiusBonus: new fields.NumberField({ integer: true, initial: 0 })
          }),
          tempBars: new fields.SchemaField({
            hpPerSlot: new fields.NumberField({ integer: true, initial: 0 })
          })
        }),
        rank15: new fields.SchemaField({
          rank: new fields.NumberField({ integer: true, min: 1, max: 20, initial: 15 }),
          critMultiplier: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
          damageDice: new fields.StringField({ initial: '' }),
          rankDamageDice: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
          buffsResistances: new fields.StringField({ initial: '' }),
          debuff: new fields.StringField({ initial: '' }),
          notes: new fields.StringField({ initial: '' }),
          isArmorPiercing: new fields.BooleanField({ initial: false }),
          healing: new fields.SchemaField({
            barsBonus: new fields.NumberField({ integer: true, initial: 0 }),
            cleanseDebuff: new fields.StringField({ initial: '' })
          }),
          contest: new fields.SchemaField({
            dcBonus: new fields.NumberField({ integer: true, initial: 0 }),
            onFailDebuff: new fields.StringField({ initial: '' })
          }),
          area: new fields.SchemaField({
            radiusBonus: new fields.NumberField({ integer: true, initial: 0 })
          }),
          tempBars: new fields.SchemaField({
            hpPerSlot: new fields.NumberField({ integer: true, initial: 0 })
          })
        }),
        rank20: new fields.SchemaField({
          rank: new fields.NumberField({ integer: true, min: 1, max: 20, initial: 20 }),
          critMultiplier: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
          damageDice: new fields.StringField({ initial: '' }),
          rankDamageDice: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
          buffsResistances: new fields.StringField({ initial: '' }),
          debuff: new fields.StringField({ initial: '' }),
          notes: new fields.StringField({ initial: '' }),
          isArmorPiercing: new fields.BooleanField({ initial: false }),
          healing: new fields.SchemaField({
            barsBonus: new fields.NumberField({ integer: true, initial: 0 }),
            cleanseDebuff: new fields.StringField({ initial: '' })
          }),
          contest: new fields.SchemaField({
            dcBonus: new fields.NumberField({ integer: true, initial: 0 }),
            onFailDebuff: new fields.StringField({ initial: '' })
          }),
          area: new fields.SchemaField({
            radiusBonus: new fields.NumberField({ integer: true, initial: 0 })
          }),
          tempBars: new fields.SchemaField({
            hpPerSlot: new fields.NumberField({ integer: true, initial: 0 })
          })
        })
      }),
      area: new fields.SchemaField({
        hasArea: new fields.BooleanField({ initial: false }),
        shape: new fields.StringField({ initial: 'burst' }),
        radius: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        coneAngle: new fields.NumberField({ initial: 53.13 }),
        lineLength: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        lineWidth: new fields.NumberField({ integer: true, min: 0, initial: 5 }),
        origin: new fields.StringField({ initial: 'caster' }),
        targetFilter: new fields.StringField({ initial: 'allies' }),
        radiusBonus: new fields.NumberField({ integer: true, initial: 0 }),
        absorbElement: new fields.StringField({ initial: '' }),
        hasPeriodicDamage: new fields.BooleanField({ initial: false }),
        periodicDamageFormula: new fields.StringField({ initial: '' }),
        periodicDamageType: new fields.StringField({ initial: '' }),
        inflictDebuff: new fields.StringField({ initial: '' })
      }),
      delivery: new fields.StringField({ initial: 'placed' }),
      tempBars: new fields.SchemaField({
        hasTempBars: new fields.BooleanField({ initial: false }),
        slotsFormula: new fields.StringField({ initial: '' }),
        hpPerSlot: new fields.NumberField({ integer: true, min: 0, initial: 0 })
      }),
      durationConfig: new fields.SchemaField({
        type: new fields.StringField({ initial: 'instant' }),
        rounds: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        minutes: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        hours: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        remainingRounds: new fields.NumberField({ integer: true, min: 0, initial: 0 })
      }),
      light: new fields.SchemaField({
        emits: new fields.BooleanField({ initial: false }),
        dim: new fields.NumberField({ min: 0, initial: 0 }),
        bright: new fields.NumberField({ min: 0, initial: 0 }),
        color: new fields.StringField({ initial: '' }),
        animation: new fields.StringField({ initial: '' })
      }),
      active: new fields.BooleanField({ initial: false }),
      outcomes: new fields.ArrayField(new fields.ObjectField(), { initial: [] }),
      grants: new fields.ArrayField(new fields.ObjectField(), { initial: [] })
    };
  }
}
