import { useState, useMemo, useCallback } from "react";
import { toast } from "@orderly.network/ui";
import { useTranslation } from "@orderly.network/i18n";
import type { OnrampPartner } from "../components/partnerSelect";
import type { PaymentMethod } from "../components/paymentMethodSelect";
import type { FiatCurrency } from "../constants";
import { useOnrampConfig } from "../context/OnrampConfigContext";
import { buildOnramperIframeUrl } from "../utils/buildOnramperUrl";

/**
 * Manages the onramper checkout flow:
 * iframe URL construction, dialog open state, continue button state, and submit handler.
 */
export function useOnrampCheckout({
  spendAmount,
  selectedCurrency,
  spendAmountError,
  onramperToken,
  selectedPartner,
  selectedPaymentMethod,
  address,
  isLoading,
}: {
  spendAmount: string;
  selectedCurrency: FiatCurrency;
  spendAmountError: string;
  onramperToken: string | undefined;
  selectedPartner: OnrampPartner | null;
  selectedPaymentMethod: PaymentMethod | null;
  address: string | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const { apiKey, secretKey } = useOnrampConfig();
  const [iframeDialogOpen, setIframeDialogOpen] = useState(false);

  const onramperIframeUrl = useMemo(
    () =>
      buildOnramperIframeUrl({
        spendAmount,
        selectedCurrency,
        onramperToken,
        selectedPaymentMethod,
        selectedPartner,
        address,
        apiKey,
        secretKey,
      }),
    [
      spendAmount,
      selectedCurrency,
      onramperToken,
      selectedPaymentMethod,
      selectedPartner,
      address,
      apiKey,
      secretKey,
    ],
  );

  const isContinueDisabled = useMemo(
    () =>
      !spendAmount ||
      isNaN(parseFloat(spendAmount)) ||
      parseFloat(spendAmount) <= 0 ||
      !selectedCurrency ||
      !onramperToken ||
      !selectedPartner ||
      !selectedPaymentMethod ||
      !address ||
      isLoading ||
      !!spendAmountError,
    [
      spendAmount,
      selectedCurrency,
      spendAmountError,
      onramperToken,
      selectedPartner,
      selectedPaymentMethod,
      address,
      isLoading,
    ],
  );

  const onContinue = useCallback(() => {
    const missing: string[] = [];
    const num = parseFloat(spendAmount);
    if (!spendAmount || isNaN(num) || num <= 0)
      missing.push(t("onramp.missing.spendAmount"));
    if (!selectedCurrency)
      missing.push(t("onramp.missing.currency"));
    if (!onramperToken)
      missing.push(t("onramp.missing.network"));
    if (!selectedPartner)
      missing.push(t("onramp.missing.partner"));
    if (!selectedPaymentMethod)
      missing.push(t("onramp.missing.paymentMethod"));
    if (!address)
      missing.push(t("onramp.missing.address"));

    if (missing.length > 0) {
      const msg = t("onramp.missingRequiredInfo", {
        list: missing.join(", "),
      });
      toast.error(msg);
      console.error("[Onramp] Cannot continue –", msg);
      return;
    }
    setIframeDialogOpen(true);
  }, [
    spendAmount,
    selectedCurrency,
    onramperToken,
    selectedPartner,
    selectedPaymentMethod,
    address,
    t,
  ]);

  return {
    onramperIframeUrl,
    iframeDialogOpen,
    setIframeDialogOpen,
    isContinueDisabled,
    onContinue,
  };
}
