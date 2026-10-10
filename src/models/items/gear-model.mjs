import { BaseItemDataModel } from './base-item-model.mjs';

/**
 * Data Model for DCC RPG Gear and Equipment Items.
 */
export class GearDataModel extends BaseItemDataModel {
  static defineSchema() {
    const fields = globalThis.foundry.data.fields;
    const abilityModifierField = () => new fields.SchemaField({
      value: new fields.NumberField({ integer: true, initial: 0 }),
      type: new fields.StringField({ initial: 'flat' })
    });

    return {
      ...super.defineSchema(),
      slot: new fields.StringField({ initial: 'torso' }),
      quantity: new fields.NumberField({ integer: true, min: 0, initial: 1 }),
      value: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
      equipped: new fields.BooleanField({ initial: false }),
      handsRequired: new fields.NumberField({ integer: true, min: 0, initial: 1 }),
      isWeapon: new fields.BooleanField({ initial: false }),
      wieldMode: new fields.StringField({
        initial: 'one_handed',
        choices: ['one_handed', 'two_handed', 'two_handed_disadv_1h']
      }),
      weaponCategory: new fields.StringField({ initial: '' }),
      weaponType: new fields.StringField({ initial: '' }),
      associatedSkills: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      appliesTo: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      requires: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      proficiencyMode: new fields.StringField({
        initial: 'highest',
        choices: ['highest', 'synergy', 'manual']
      }),
      selectedSkill: new fields.StringField({ initial: '' }),
      critMultiplier: new fields.NumberField({ integer: true, min: 1 }),
      optionalEffects: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      selectedEffect: new fields.StringField({ initial: '' }),
      drBonus: new fields.NumberField({ integer: true, initial: 0 }),
      evadeBonus: new fields.NumberField({ integer: true, initial: 0 }),
      abilityModifiers: new fields.SchemaField({
        str: abilityModifierField(),
        int: abilityModifierField(),
        con: abilityModifierField(),
        dex: abilityModifierField(),
        cha: abilityModifierField()
      }),
      skillModifiers: new fields.ArrayField(new fields.ObjectField(), { initial: [] }),
      damageParts: new fields.ArrayField(new fields.ObjectField(), { initial: [] }),
      hasActivatedAbility: new fields.BooleanField({ initial: false }),
      executionMode: new fields.StringField({ initial: 'all' }),
      cooldown: new fields.StringField({ initial: 'None' }),
      charges: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0 }),
        max: new fields.NumberField({ integer: true, initial: 0 })
      }),
      outcomes: new fields.ArrayField(new fields.ObjectField(), { initial: [] }),
      area: new fields.SchemaField({
        hasArea: new fields.BooleanField({ initial: false }),
        shape: new fields.StringField({ initial: 'burst', choices: ['burst', 'cone', 'line'] }),
        radius: new fields.NumberField({ initial: 5, min: 0 }),
        origin: new fields.StringField({ initial: 'caster', choices: ['caster', 'placed'] }),
        targetFilter: new fields.StringField({ initial: 'allies', choices: ['allies', 'enemies', 'both'] }),
        absorbElement: new fields.StringField({ initial: '' }),
        hasPeriodicDamage: new fields.BooleanField({ initial: false }),
        periodicDamageFormula: new fields.StringField({ initial: '' }),
        periodicDamageType: new fields.StringField({ initial: '' }),
        inflictDebuff: new fields.StringField({ initial: '' })
      }),
      tempBars: new fields.SchemaField({
        hasTempBars: new fields.BooleanField({ initial: false }),
        slotsFormula: new fields.StringField({ initial: '' }),
        hpPerSlot: new fields.NumberField({ initial: 0, min: 0 })
      }),
      notes: new fields.HTMLField({ initial: '' }),
      rankBreaks: new fields.ObjectField({ initial: {} }),
      description: new fields.HTMLField({ initial: '' })
    };
  }
}
