import { useEffect } from "react";

/**
 * Custom hook that enforces permission -> flag cascade logic.
 * When a permission is disabled, its corresponding flag is forced off.
 *
 * @param {Array} cascades - Array of { perm, setPerm, flag, setFlag, isDisableBit? }
 *   - perm: current permission boolean value
 *   - setPerm: setter for permission
 *   - flag: current flag boolean value
 *   - setFlag: setter for flag
 *   - isDisableBit: if true, the cascade is inverted (permission ON -> flag OFF)
 * @param {Array} mutualExclusions - Array of { flagA, setFlagB } pairs
 *   When flagA is true, setFlagB(false). Applied bidirectionally by passing both directions.
 */
export function usePermissionFlagCascade(cascades = [], mutualExclusions = []) {
  // Standard cascades: if permission off, force flag off
  useEffect(() => {
    for (const { perm, setFlag, isDisableBit } of cascades) {
      if (isDisableBit) {
        // Disable-bit: if permission is ON, force flag OFF
        if (perm) setFlag(false);
      } else {
        // Enable-bit: if permission is OFF, force flag OFF
        if (!perm) setFlag(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, cascades.map((c) => c.perm));

  // Mutual exclusions: when flagA turns on, turn flagB off
  useEffect(() => {
    for (const { flagA, setFlagB } of mutualExclusions) {
      if (flagA) setFlagB(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, mutualExclusions.map((m) => m.flagA));
}
