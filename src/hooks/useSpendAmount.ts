import { useState, useMemo, useEffect } from "react";
import { FIAT_CURRENCIES, PRESET_AMOUNTS } from "../constants";
import type { FiatCurrency } from "../constants";

/**
 * Manages the "You Spend" section state:
 * - Selected fiat currency and raw amount input
 * - 500ms debounce before propagating the amount to dependent display state
 * - `effectiveSpendAmountForQuote`: the debounced amount used by downstream
 *   display logic, falling back to the first preset when the input is
 *   empty/invalid
 *
 * Spend amount validation (min/max limits) is computed in the orchestrator
 * so the form can reuse the cached limits fetched for the selected currency.
 */
export function useSpendAmount() {
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrency>("USD");
  const [spendAmount, setSpendAmount] = useState<string>("");
  const [debouncedSpendAmount, setDebouncedSpendAmount] = useState<string>(
    PRESET_AMOUNTS["USD"][0].toString(),
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSpendAmount(spendAmount);
    }, 500);
    return () => clearTimeout(handler);
  }, [spendAmount]);

  // When the input is empty or invalid, fall back to the first preset so the
  // receive-side placeholder still has a stable reference amount.
  const effectiveSpendAmountForQuote = useMemo(() => {
    const num = parseFloat(debouncedSpendAmount);
    if (!isNaN(num) && num > 0) return debouncedSpendAmount;
    return PRESET_AMOUNTS[selectedCurrency][0].toString();
  }, [debouncedSpendAmount, selectedCurrency]);

  const onCurrencyChange = (currency: FiatCurrency) => {
    // Preserve the current input so currency switches do not clear the paired
    // receive-side display and create mismatched form state.
    setSelectedCurrency(currency);
  };

  return {
    fiatCurrencies: FIAT_CURRENCIES,
    selectedCurrency,
    onCurrencyChange,
    spendAmount,
    onSpendAmountChange: setSpendAmount,
    presetAmounts: PRESET_AMOUNTS[selectedCurrency],
    effectiveSpendAmountForQuote,
  };
}
