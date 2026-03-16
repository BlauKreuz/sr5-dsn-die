/**
 * sr5-dsn-fix.js
 *
 * Fixes the Shadowrun 5e system integration with Dice So Nice without modifying
 * the system's bundle.js.
 *
 * Problems solved:
 *   1. All DSN appearance systems (Dot Black, Spectrum, etc.) are greyed out for
 *      the SR5 "ds" die in DSN's settings UI. Root cause: DSN's filterSystems()
 *      only enables a system option when system.dice.has("ds") is true, but the
 *      SR5 system only registers "ds" under "standard".
 *
 *   2. No way to use plain d6 dot/image faces — the system always forces text
 *      labels ("1","2","3","4","5","6") onto the ds die.
 *
 * To use as a standalone module, create a module.json with:
 *   "esmodules": ["scripts/sr5-dsn-fix.js"]
 *   "system": "shadowrun5e"  (optional, limits activation to SR5 worlds)
 */

const MODULE_ID = "sr5-dsn-fix";
const SR5_SYSTEM_ID = "shadowrun5e";
const DS_TYPE = "ds"; // SR5Die.DENOMINATION = "s", so the die type is "ds"

// ── Settings registration ─────────────────────────────────────────────────────

Hooks.once("init", () => {
  if (game.system?.id !== SR5_SYSTEM_ID) return;
  if (!game.modules.get("dice-so-nice")?.active) return;

  game.settings.register(MODULE_ID, "disableCustomLabels", {
    name: "SR5: Disable custom die face labels",
    hint: "Prevents Shadowrun 5e from applying custom text labels (1,2,3,4,5,6) to the SR5 die (ds) in Dice So Nice. The die will use the standard d6 face images of whichever appearance system you select.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  });
});

// ── Dice So Nice ready ────────────────────────────────────────────────────────

// This hook fires AFTER the SR5 system's own diceSoNiceReady handler because:
//   - The system registers its handler during its `init` hook
//   - This module registers its handler during its own `init` hook, which fires
//     after the system's init (systems load before modules in Foundry)
// So we can safely override whatever the system set.

Hooks.once("diceSoNiceReady", (dice3d) => {
  if (!dice3d) return;
  if (game.system?.id !== SR5_SYSTEM_ID) return;

  const factory = dice3d.DiceFactory;

  // Fix 1: Register "ds" in every non-standard DSN system pointing to that
  // system's own d6 preset. This makes DSN's filterSystems() stop greying out
  // Dot Black, Spectrum, and other systems in the appearance settings UI.
  for (const [sysId, system] of factory.systems) {
    if (sysId !== "standard" && !system.dice.has(DS_TYPE)) {
      const d6 = system.dice.get("d6");
      if (d6) system.dice.set(DS_TYPE, d6);
    }
  }

  // Fix 2: If the user opted to disable custom labels, replace the system's
  // custom-labeled ds preset in "standard" with the plain d6 preset so that
  // whichever appearance system is selected shows dot/image faces instead of
  // text numbers.
  const disable = game.settings.get(MODULE_ID, "disableCustomLabels");
  if (disable) {
    const standardD6 = factory.systems.get("standard")?.dice.get("d6");
    if (standardD6) {
      factory.systems.get("standard").dice.set(DS_TYPE, standardD6);
    }
  }
});
