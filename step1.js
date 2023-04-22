import fs from "fs";

import { itemLevel, includeMastery, curseAnvil, lottery } from "./userInput.js";

import data from "./data.json" assert { type: "json" };

import { enchantUsage } from "./enchantUsage.js";

let enchantUsageAddedNew = false;

let enchantMap = {};
for (let enchant of data.enchants) {
  enchantMap[enchant.kind] = enchant;

  if (typeof enchantUsage[enchant.kind] === "undefined") {
    console.warn("found new enchant not listed in enchantUsage", enchant.kind);
    enchantUsage[enchant.kind] = "";
    enchantUsageAddedNew = true;
  }
}

if (enchantUsageAddedNew) {
  console.warn("=============================================================");
  console.warn("====================printing enchantUsage====================");
  console.warn("=============================================================");
  console.warn(enchantUsage);
  console.warn(enchantUsage);
  console.warn("=============================================================");
  console.warn("=============================================================");
  console.warn("=============================================================");
}

let items = [];
for (let item of data.items) {
  //filter out very bad items
  if (item.setKind === "Nothing") {
    continue;
  }

  items.push(item);
}

const calcItemEffectValue = (effect) => {
  let itemEffectValue = effect.initValue + effect.baseValue * itemLevel;

  if (itemEffectValue < 0 && curseAnvil) {
    //this is a cursed effect, if we add curse anvils it will be nullified
    return 0;
  }

  return itemEffectValue;
};
const calcEnchantEffectValue = (effect) => {
  let enchant = enchantMap[effect.kind];
  let enchantEffectValue = enchant.maxValue;
  if (lottery) {
    enchantEffectValue = enchant.maxValueLottery;
  }

  return enchantEffectValue;
};

for (let item of items) {
  let ese = {
    slots: 4,
    masteries: 0,
    effects: 0,
    sum: 0,
  };

  let relEffects = {};

  for (let effect of item.effects) {
    if (typeof relEffects[effect.kind] === "undefined") {
      relEffects[effect.kind] = 0;
    }
    let itemEffectValue = calcItemEffectValue(effect);
    let enchantEffectValue = calcEnchantEffectValue(effect);
    relEffects[effect.kind] += (itemEffectValue / enchantEffectValue);

    //if we care about this effect, include in the ese
    if (enchantUsage[effect.kind]) {
      ese.effects += (itemEffectValue / enchantEffectValue);
    }
  }

  if (includeMastery) {
    for (let effect of item.levelMaxEffects) {
      //effect.kind Nothing are enchant Slots
      if (effect.kind === "Nothing") {
        if (effect.initValue === 3) {
          ese.slots = 7;
        } else {
          ese.slots = 6;
        }
        continue;
      }

      if (typeof relEffects[effect.kind] === "undefined") {
        relEffects[effect.kind] = 0;
      }
      let itemEffectValue = calcItemEffectValue(effect);
      relEffects[effect.kind] += itemEffectValue;

      //if we care about this effect, include in the ese
      if (enchantUsage[effect.kind]) {
        ese.masteries += itemEffectValue / calcEnchantEffectValue(effect);
      }
    }
  }

  ese.sum = ese.slots + ese.masteries + ese.effects;

  item.ese = ese;

  //cleanup for reduced output
  delete item.effects;
  delete item.levelMaxEffects;

  item.relEffects = relEffects;
}

items.sort((a, b) => {
  return b.ese.sum - a.ese.sum;
});

fs.writeFileSync("output/ese.json", JSON.stringify(items, null, 2));
