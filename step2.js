import fs from "fs";

import { itemSlots, enchantSlots } from "./userInput.js";
import enchantUsage from "./enchantUsage.json" assert { type: "json" };

import items from "./output/ese.json" assert { type: "json" };

let totalEse = {};
let totalEseWithEnchants = {};
for (let effectKind in enchantUsage) {
  totalEse[effectKind] = 0;
  if (enchantUsage[effectKind]) {
    totalEseWithEnchants[effectKind] = 0;
  }
}
let bestItems = {
  Jewelry: [],
  Armor: [],
  Weapon: [],
};

const findBestItem = (part) => {
  for (let item of items) {
    if (item.part === part) {
      return item;
    }
  }

  return null;
};

const addItem = (item) => {
  bestItems[item.part].push(item);

  //update the totalEse
  for (let effectKind in item.relEffects) {
    if (!enchantUsage[effectKind]) {
      continue;
    }
    if (item.relEffects[effectKind] === 0) {
      continue;
    }

    if (typeof totalEse[effectKind] === "undefined") {
      totalEse[effectKind] = 0;
    }
    totalEse[effectKind] += item.relEffects[effectKind];
  }
};

const getTotalEnchantsValue = (enchants, enchants2) => {
  let total = 1;

  //TODO improve the accuracy
  // consider base enchant value
  // consider outleir like fury
  //consider target caps for dps and crit chance
  for (let effectKind in enchants) {
    //if we dont care for these dont include them in the value
    if (!enchantUsage[effectKind]) {
      continue;
    }

    let effectValue = enchants[effectKind];
    if (enchants2 && enchants2[effectKind]) {
      effectValue += enchants2[effectKind];
    }

    total *= 1 + effectValue;
  }

  return total;
};
const updateEse = () => {
  //reset totalEseWithEnchants
  totalEseWithEnchants = {};
  for (let effectKind in totalEse) {
    totalEseWithEnchants[effectKind] = totalEse[effectKind];
  }

  //TODO add enchants where they are ideal
  //totalEseWithEnchants
  let enchantsToSpent = enchantSlots;
  while (enchantsToSpent > 0) {
    let lowestEffectKind = "";
    let lowestEnchantValue = Number.MAX_VALUE;

    for (let effectKind in enchantUsage) {
      if (enchantUsage[effectKind]) {
        if (totalEseWithEnchants[effectKind] < lowestEnchantValue) {
          lowestEffectKind = effectKind;
          lowestEnchantValue = totalEseWithEnchants[effectKind];
        }
      }
    }

    totalEseWithEnchants[lowestEffectKind]++;
    enchantsToSpent--;
  }
  //TODO do this for up to +7 enchants for item.ese.slots

  //TODO improve the ese sum for items which work towards an incomplete set

  for (let item of items) {
    //TODO factor in item.ese.slots, choose the totalEseWithEnchants accordingly
    item.ese.updatedSum = getTotalEnchantsValue(
      totalEseWithEnchants,
      item.relEffects
    );
  }

  items.sort((a, b) => {
    return b.ese.updatedSum - a.ese.updatedSum;
  });
};

const constructBestItems = () => {
  while (true) {
    let bestPart = "";
    let bestPartFreeSlots = 0;

    for (let part in itemSlots) {
      let freeSlots = itemSlots[part] - bestItems[part].length;
      if (freeSlots > bestPartFreeSlots) {
        bestPart = part;
        bestPartFreeSlots = freeSlots;
      }
    }

    //no more items to add, we are done
    if (bestPart === "") {
      return;
    }

    let bestItem = findBestItem(bestPart);
    addItem(bestItem);

    updateEse();
  }
};

constructBestItems();
for (let part in bestItems) {
  bestItems[part].sort((a, b) => {
    if (a.kind < b.kind) {
      return -1;
    }
    if (a.kind > b.kind) {
      return 1;
    }
    return 0;
  });

  for (let item of bestItems[part]) {
    //cleanup for reduced output file
    delete item.relEffects;
    delete item.ese;
    delete item.part;
  }
}

let bestEnchants = {};
for (let effectKind in totalEseWithEnchants) {
  if (enchantUsage[effectKind]) {
    bestEnchants[effectKind] = Math.round(
      totalEseWithEnchants[effectKind] - totalEse[effectKind]
    );
  }
}

fs.writeFileSync("output/bestTotalEse.json", JSON.stringify(totalEse, null, 2));
fs.writeFileSync(
  "output/bestEnchants.json",
  JSON.stringify(bestEnchants, null, 2)
);
fs.writeFileSync("output/bestItems.json", JSON.stringify(bestItems, null, 2));
