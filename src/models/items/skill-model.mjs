import { BaseItemDataModel } from './base-item-model.mjs';

/**
 * Data Model for DCC RPG Skill Items.
 */
export class SkillDataModel extends BaseItemDataModel {
  static defineSchema() {
    const fields = globalThis.foundry.data.fields;
    return {
      ...super.defineSchema(),
      rank: new fields.NumberField({ integer: true, min: 0, initial: 1 }),
      boonBonus: new fields.NumberField({ integer: true, initial: 0 }),
      itemBonus: new fields.NumberField({ integer: true, initial: 0 }),
      typeBonus: new fields.NumberField({ integer: true, initial: 0 }),
      modifiedRank: new fields.NumberField({ integer: true, initial: 1 }),
      stat: new fields.StringField({ initial: 'str' }),
      skillType: new fields.StringField({ initial: 'Utility' }),
      type: new fields.StringField({ initial: 'Utility' }),
      checkType: new fields.StringField({ initial: 'Stat Check' }),
      category: new fields.StringField({ initial: 'Utility' }),
      canGainRanks: new fields.BooleanField({ initial: true }),
      isAttack: new fields.BooleanField({ initial: false }),
      hasDamage: new fields.BooleanField({ initial: false }),
      cooldown: new fields.StringField({ initial: 'None' }),
      baseDamage: new fields.StringField({ initial: '' }),
      notes: new fields.HTMLField({ initial: '' }),
      description: new fields.HTMLField({ initial: '' }),
      upgrades: new fields.StringField({ initial: '' }),
      damageModifiers: new fields.ArrayField(new fields.ObjectField(), { initial: [] }),
      checked: new fields.BooleanField({ initial: false }),
      investedHours: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      isTechnique: new fields.BooleanField({ initial: false }),
      appliesTo: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      requires: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      techniqueConfig: new fields.SchemaField({
        isDamageEffect: new fields.BooleanField({ initial: false }),
        appliesToTags: new fields.ArrayField(new fields.StringField(), { initial: [] }),
        baseDiceCountMod: new fields.StringField({ initial: '' }),
        baseDiceSidesMod: new fields.StringField({ initial: '' }),
        flatDamageMod: new fields.StringField({ initial: '' }),
        damageBonus: new fields.StringField({ initial: '' }),
        damageType: new fields.StringField({ initial: '' }),
        debuffName: new fields.StringField({ initial: '' }),
        cooldown: new fields.StringField({ initial: 'None' }),
        isArmorPiercing: new fields.BooleanField({ initial: false })
      }),
      optionalEffects: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      selectedEffect: new fields.StringField({ initial: '' }),
      fumbleDebuff: new fields.StringField({ initial: '' }),
      onHitDebuff: new fields.StringField({ initial: '' }),
      onHitDebuffMinRank: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      critMultiplierR5: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
      critMultiplierR15: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
      healing: new fields.SchemaField({
        hasHealing: new fields.BooleanField({ initial: false }),
        barsFormula: new fields.StringField({ initial: '1' }),
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
      rankBreaks: new fields.SchemaField({
        rank5: new fields.SchemaField({
          rank: new fields.NumberField({ integer: true, min: 1, max: 20, initial: 5 }),
          critMultiplier: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
          damageDice: new fields.StringField({ initial: '' }),
          baseDiceCountMod: new fields.StringField({ initial: '' }),
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
          baseDiceCountMod: new fields.StringField({ initial: '' }),
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
          baseDiceCountMod: new fields.StringField({ initial: '' }),
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
          baseDiceCountMod: new fields.StringField({ initial: '' }),
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
        shape: new fields.StringField({ initial: 'burst', choices: ['burst', 'cone', 'line'] }),
        radius: new fields.NumberField({ initial: 5, min: 0 }),
        coneAngle: new fields.NumberField({ initial: 53.13 }),
        lineLength: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        lineWidth: new fields.NumberField({ integer: true, min: 0, initial: 5 }),
        origin: new fields.StringField({ initial: 'caster', choices: ['caster', 'placed'] }),
        targetFilter: new fields.StringField({ initial: 'allies', choices: ['allies', 'enemies', 'both'] }),
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
        slotsFormula: new fields.StringField({ initial: 'con' }),
        hpPerSlot: new fields.NumberField({ integer: true, min: 0, initial: 2 })
      }),
      durationConfig: new fields.SchemaField({
        type: new fields.StringField({ initial: 'instant' }),
        rounds: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        minutes: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        hours: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        remainingRounds: new fields.NumberField({ integer: true, min: 0, initial: 0 })
      }),
      active: new fields.BooleanField({ initial: false })
    };
  }

  /**
   * Calculates total effective rank including all bonus sources.
   * @type {number}
   */
  get totalRank() {
    return (this.rank || 0) + (this.boonBonus || 0) + (this.itemBonus || 0) + (this.typeBonus || 0);
  }
}
