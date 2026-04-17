import { useMemo } from "react";
import type { OnrampPartner } from "../components/partnerSelect";
import type { FiatCurrency } from "../constants";

/**
 * Converts fiat spend into received token quantity using the current partner rate.
 */
function toReceiveQuantity(amount: string, rate?: number): string {
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0 || !rate || rate <= 0) {
    return "";
  }
  return (parsedAmount / rate).toFixed(2);
}

/**
 * Derives the "You Receive" section display values from spend + selection state.
 * Encapsulates receiveQuantity, receiveQuantityPlaceholder, and exchangeRateText.
 */
export function useReceiveDisplay({
  spendAmount,
  spendAmountError,
  selectedPartner,
  selectedCurrency,
  effectiveSpendAmountForQuote,
}: {
  spendAmount: string;
  spendAmountError: string;
  selectedPartner: OnrampPartner | null;
  selectedCurrency: FiatCurrency;
  effectiveSpendAmountForQuote: string;
}) {
  const receiveQuantity = useMemo(() => {
    if (spendAmountError) return "";
    return toReceiveQuantity(spendAmount, selectedPartner?.rate);
  }, [spendAmount, spendAmountError, selectedPartner?.rate]);

  const receiveQuantityPlaceholder = useMemo(() => {
    return toReceiveQuantity(effectiveSpendAmountForQuote, selectedPartner?.rate);
  }, [effectiveSpendAmountForQuote, selectedPartner?.rate]);

  const exchangeRateText = useMemo(() => {
    if (!selectedPartner?.rate) return "";
    return `1 USDC ≈ ${selectedPartner.rate.toFixed(4)} ${selectedCurrency}`;
  }, [selectedPartner, selectedCurrency]);

  return { receiveQuantity, receiveQuantityPlaceholder, exchangeRateText };
}
