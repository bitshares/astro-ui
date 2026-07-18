import { useCallback } from "react";
import { debounce } from "@/lib/common.js";

/**
 * Custom hook providing debounced input handlers for percentage and max commission fields.
 *
 * @returns {{ debouncedPercent: Function, debouncedMax: Function }}
 */
export function useDebouncedFormInputs({ commission, maxSupply }) {
  const debouncedMax = useCallback(
    debounce((input, setMaxCommissionFunction) => {
      let parsedInput = parseFloat(input);
      if (isNaN(parsedInput) || parsedInput <= 0 || commission <= 0) {
        setMaxCommissionFunction(0);
        return;
      }

      const maximum = maxSupply * (commission / 100);
      if (parsedInput > maximum) {
        setMaxCommissionFunction(maximum);
      }
    }, 500),
    [commission, maxSupply]
  );

  const debouncedPercent = useCallback(
    debounce((input, setCommissionFunction, maxPercentage = 100) => {
      let parsedInput = parseFloat(input);
      if (isNaN(parsedInput) || parsedInput <= 0) {
        setCommissionFunction(0);
        return;
      }

      const split = parsedInput.toString().split(".");
      if (split.length > 1) {
        const decimals = split[1].length;
        if (decimals > 2) {
          parsedInput = parseFloat(parsedInput.toFixed(2));
        }
      }

      if (parsedInput > maxPercentage) {
        setCommissionFunction(maxPercentage);
      } else if (parsedInput < 0.01) {
        setCommissionFunction(0.01);
      } else {
        setCommissionFunction(parsedInput);
      }
    }, 500),
    []
  );

  return { debouncedPercent, debouncedMax };
}
