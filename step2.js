import fs from "fs";

import { itemSlots, enchantSlots, setBias } from "./userInput.js";
import { enchantUsage } from "./enchantUsage.js";

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

let setItemsEffectMult = [1, 1, 1.05, 1.1, 1.14, 1.19, 1.25, 1.35, 1.5];
let setItems = {};
for (let item of items) {
  item.setEffectMult = 0;
  if (item.setKind !== "Nothing") {
    if (!setItems[item.setKind]) {
      setItems[item.setKind] = {
        newSetItemValue: 0,
        activeSetItems: 0,
      };
    }
    setItems[item.setKind][item.kind] = false;
  }
}

const findBestItem = (part) => {
  for (let item of items) {
    if (item.part === part) {
      //items is sorted, so we just return the first which matches the part
      return item;
    }
  }

  return null;
};

const addItemToTotalEse = (item) => {
  for (let effectKind in item.relEffects) {
    if (item.relEffects[effectKind] === 0) {
      continue;
    }

    totalEse[effectKind] += item.relEffects[effectKind] * item.setEffectMult;
  }
};

const addItem = (item) => {
  if (!setItems[item.setKind][item.kind]) {
    setItems[item.setKind][item.kind] = true;
    setItems[item.setKind].activeSetItems++;

    //update all set item strength
    for (let setItem of items) {
      if (setItem.setKind === item.setKind) {
        setItem.setEffectMult =
          setItemsEffectMult[setItems[item.setKind].activeSetItems];
      }
    }

    //recalculate totalEse with changed set strength
    for (let effectKind in totalEse) {
      totalEse[effectKind] = 0;
    }
    for (let part in bestItems) {
      for (let item in bestItems[part]) {
        addItemToTotalEse(item);
      }
    }
  }

  bestItems[item.part].push(item);

  //update the totalEse
  addItemToTotalEse(item);
};

//TODO return a object not a float
// have seperate values for dps and gains, ...
const getTotalEnchantsValue = (enchants, enchantsToAdd) => {
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
    if (enchantsToAdd && enchantsToAdd[effectKind]) {
      effectValue += enchantsToAdd[effectKind];
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

  //calcualte the average set effect mult, new enchants will use this one
  let averageSetEffectMult = 1;
  let equippedItemCount = 0;
  for (let part in bestItems) {
    for (let item of bestItems[part]) {
      equippedItemCount++;

      if (equippedItemCount === 1) averageSetEffectMult = item.setEffectMult;
      else averageSetEffectMult += item.setEffectMult;
    }
  }
  if (equippedItemCount > 0) {
    averageSetEffectMult /= equippedItemCount;
  }

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

    //TODO include average setEffectMult
    totalEseWithEnchants[lowestEffectKind] += averageSetEffectMult;
    enchantsToSpent--;
  }
  //TODO do this for up to +7 enchants for item.ese.slots

  for (let item of items) {
    //TODO factor in item.ese.slots, choose the totalEseWithEnchants accordingly
    item.ese.updatedSum = getTotalEnchantsValue(
      totalEseWithEnchants,
      item.relEffects
    );
  }

  //after all new itemValues have been calculated, update the setItemValues
  //  and increase the value of items which are part of an incomplete set
  for (let setKind in setItems) {
    setItems[setKind].newSetItemValue = 0;
  }
  for (let itemPart in bestItems) {
    for (let item of bestItems[itemPart]) {
      setItems[item.setKind].newSetItemValue += item.ese.updatedSum * setBias;
    }
  }
  for (let item of items) {
    //if this is a new set item, add the value of the other items atop of it
    if (!setItems[item.setKind][item.kind]) {
      item.ese.updatedSum += setItems[item.setKind].newSetItemValue;
    }
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
    if (a.ese.sum < b.ese.sum) {
      return 1;
    }
    if (a.ese.sum > b.ese.sum) {
      return -1;
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

console.log({
    setItems,
    totalValue: getTotalEnchantsValue(totalEseWithEnchants),
});
//breakdown totalEseWithEnchants by sources



const fileSuffix = "";
fs.writeFileSync(
  `output/bestTotalEseWithEnchants${fileSuffix}.json`,
  JSON.stringify(totalEseWithEnchants, null, 2)
);
fs.writeFileSync(
  `output/bestEnchants${fileSuffix}.json`,
  JSON.stringify(bestEnchants, null, 2)
);
fs.writeFileSync(
  `output/bestItems${fileSuffix}.json`,
  JSON.stringify(bestItems, null, 2)
);
