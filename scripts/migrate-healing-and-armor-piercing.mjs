import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DCC_SPELLS } from '../src/data/spells.mjs';
import { DCC_SKILLS } from '../src/data/skills.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function migrateSpells() {
  const filePath = path.resolve(__dirname, '../src/data/spells.mjs');
  const updatedSpells = DCC_SPELLS.map(spell => {
    const sys = { ...spell.system };
    const name = (spell.name || '').toLowerCase().trim();

    // Healing configuration
    let healingConfig = sys.healing || {
      hasHealing: false,
      barsFormula: '2',
      targetFilter: 'allies',
      isHoT: false,
      hotRounds: 3,
      cleanseDebuffs: []
    };

    if (name === 'heal' || name === 'heal self') {
      healingConfig = {
        hasHealing: true,
        barsFormula: '2',
        targetFilter: 'self',
        isHoT: false,
        hotRounds: 3,
        cleanseDebuffs: []
      };
    } else if (name === 'heal others' || name === 'heal critter') {
      healingConfig = {
        hasHealing: true,
        barsFormula: '2',
        targetFilter: 'allies',
        isHoT: false,
        hotRounds: 3,
        cleanseDebuffs: []
      };
    } else if (name === "nature's breath") {
      healingConfig = {
        hasHealing: true,
        barsFormula: '1',
        targetFilter: 'allies',
        isHoT: true,
        hotRounds: 3,
        cleanseDebuffs: []
      };
    } else if (name === 'intimate touches') {
      healingConfig = {
        hasHealing: true,
        barsFormula: '1',
        targetFilter: 'allies',
        isHoT: false,
        hotRounds: 1,
        cleanseDebuffs: []
      };
    } else if (name === 'solsplash') {
      healingConfig = {
        hasHealing: true,
        barsFormula: '2',
        targetFilter: 'allies',
        isHoT: false,
        hotRounds: 1,
        cleanseDebuffs: ['Darkness', 'Blind']
      };
    }

    // Armor Piercing / Ignore DR configuration
    let ignoreDR = sys.ignoreDR ?? false;
    const rb = { ...sys.rankBreaks };

    for (const rankKey of ['rank5', 'rank10', 'rank15', 'rank20']) {
      if (rb[rankKey]) {
        rb[rankKey] = {
          ...rb[rankKey],
          isArmorPiercing: rb[rankKey].isArmorPiercing ?? false,
          healing: rb[rankKey].healing || { barsBonus: 0, cleanseDebuff: '' }
        };
      }
    }

    if (name === 'icicles' || name === "paladin's smite") {
      if (rb.rank15) {
        rb.rank15.isArmorPiercing = true;
      }
    }

    return {
      ...spell,
      system: {
        ...sys,
        ignoreDR,
        healing: healingConfig,
        rankBreaks: rb
      }
    };
  });

  const content = `/**\n * Dungeon Crawler Carl RPG - Official Spells Dataset\n * Derived from the official DCC Spells Overview & Cheat Sheet.\n */\n\nexport const DCC_SPELLS = ${JSON.stringify(updatedSpells, null, 2)};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully migrated ${updatedSpells.length} spells to ${filePath}`);
}

export function migrateSkills() {
  const filePath = path.resolve(__dirname, '../src/data/skills.mjs');
  const updatedSkills = DCC_SKILLS.map(skill => {
    const sys = { ...skill.system };
    const name = (skill.name || '').toLowerCase().trim();

    // Technique config
    const techniqueConfig = {
      ...(sys.techniqueConfig || {}),
      isArmorPiercing: sys.techniqueConfig?.isArmorPiercing ?? false
    };

    // Healing config
    let healingConfig = sys.healing || {
      hasHealing: false,
      barsFormula: '1',
      targetFilter: 'allies',
      isHoT: false,
      hotRounds: 3,
      cleanseDebuffs: []
    };

    if (name === 'first aid') {
      healingConfig = {
        hasHealing: true,
        barsFormula: '1',
        targetFilter: 'allies',
        isHoT: false,
        hotRounds: 3,
        cleanseDebuffs: ['Bleed', 'Minor Injury']
      };
    } else if (name === 'regeneration') {
      healingConfig = {
        hasHealing: true,
        barsFormula: '1',
        targetFilter: 'self',
        isHoT: true,
        hotRounds: 5,
        cleanseDebuffs: []
      };
    }

    const rb = { ...sys.rankBreaks };
    for (const rankKey of ['rank5', 'rank10', 'rank15', 'rank20']) {
      if (rb[rankKey]) {
        rb[rankKey] = {
          ...rb[rankKey],
          isArmorPiercing: rb[rankKey].isArmorPiercing ?? false,
          healing: rb[rankKey].healing || { barsBonus: 0, cleanseDebuff: '' }
        };
      }
    }

    return {
      ...skill,
      system: {
        ...sys,
        techniqueConfig,
        healing: healingConfig,
        rankBreaks: rb
      }
    };
  });

  const content = `/**\n * Dungeon Crawler Carl RPG - Official Skills Dataset\n * Derived from the official DCC Combat & Exploration Action Quick Sheets and skills.txt.\n */\n\nexport const DCC_SKILLS = ${JSON.stringify(updatedSkills, null, 2)};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully migrated ${updatedSkills.length} skills to ${filePath}`);
}

migrateSpells();
migrateSkills();
