
//TODO let the user set these

//item level which is used to calcualte the equipment effects
export let itemLevel = 120;
//are the items mastered?
export let includeMastery = true;
//do we have maxes curse anvil?
export let curseAnvil = true;
//do we use lottery scrolls to max out the enchants?
export let lottery = true;
//how many item slots to fill
export let itemSlots = {
  Jewelry: 19,
  Armor: 19,
  Weapon: 19,
};
//how many enchants to use
export let enchantSlots = 342;
//how highly we value to complete a set
//  0.06 is about the moth math accurate
//  but because we are adding one item after another there might be edge cases and its worth testing out which one gives the best totalValue
export let setBias = 0.075;