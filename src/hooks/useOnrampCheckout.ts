import { useMemo, useCallback, useRef, useEffect } from "react";
import { toast } from "@orderly.network/ui";
import { useTranslation } from "@orderly.network/i18n";
import type { OnrampPartner } from "../components/partnerSelect";
import type { PaymentMethod } from "../components/paymentMethodSelect";
import type { FiatCurrency } from "../constants";
import { useOnrampConfig } from "../context/OnrampConfigContext";
import { buildOnramperIframeUrl } from "../utils/buildOnramperUrl";

/**
 * Manages the onramper checkout flow:
 * creates an iframe overlay via DOM API appended to document.body,
 * escaping any parent dialog stacking context.
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
  isReceiverAddressLoading,
  close,
}: {
  spendAmount: string;
  selectedCurrency: FiatCurrency;
  spendAmountError: string;
  onramperToken: string | undefined;
  selectedPartner: OnrampPartner | null;
  selectedPaymentMethod: PaymentMethod | null;
  address: string | undefined;
  isLoading: boolean;
  isReceiverAddressLoading?: boolean;
  close?: () => void;
}) {
  const { t } = useTranslation();
  const { apiKey, secretKey } = useOnrampConfig();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Cleanup overlay & close button on unmount
  useEffect(() => {
    return () => {
      overlayRef.current?.remove();
      closeBtnRef.current?.remove();
    };
  }, []);

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
      isReceiverAddressLoading ||
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
      isReceiverAddressLoading,
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

    const url = buildOnramperIframeUrl({
      spendAmount,
      selectedCurrency,
      onramperToken,
      selectedPaymentMethod,
      selectedPartner,
      address,
      apiKey,
      secretKey,
    });

    // Create fullscreen overlay
    const overlay = document.createElement("div");
    overlay.className = "oui-fixed oui-inset-0 oui-z-[100] oui-flex oui-flex-col oui-bg-black/80";
    overlayRef.current = overlay;

    const removeOverlay = () => {
      overlay.remove();
      closeBtn.remove();
      overlayRef.current = null;
      closeBtnRef.current = null;
    };

    // Close button (bottom-right)
    const closeBtn = document.createElement("button");
    closeBtnRef.current = closeBtn;
    closeBtn.className =
      "oui-fixed oui-bottom-6 oui-right-6 oui-z-[101] oui-flex oui-h-10 oui-w-10 oui-items-center oui-justify-center oui-rounded-full oui-bg-white/20 oui-text-white oui-backdrop-blur oui-transition-colors hover:oui-bg-white/30 oui-cursor-pointer oui-border-none oui-outline-none";
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.onclick = removeOverlay;

    // Loading spinner
    const spinner = document.createElement("div");
    spinner.className = "oui-absolute oui-inset-0 oui-flex oui-items-center oui-justify-center";
    spinner.innerHTML = `<div class="oui-h-8 oui-w-8 oui-animate-spin oui-rounded-full oui-border-[3px] oui-border-white/20 oui-border-t-white"></div>`;

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = t("onramp.iframeTitle");
    iframe.sandbox.add(
      "allow-forms",
      "allow-popups",
      "allow-scripts",
      "allow-same-origin",
      "allow-top-navigation-by-user-activation",
    );
    iframe.allow =
      "accelerometer; autoplay; camera; gyroscope; payment; microphone";
    iframe.className = "oui-w-full oui-flex-1 oui-border-none";
    iframe.addEventListener("load", () => spinner.remove());

    overlay.appendChild(spinner);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
    document.body.appendChild(closeBtn);

    // Clear refs before closing parent dialog — close() triggers unmount,
    // which fires the cleanup effect. We don't want it to remove the overlay.
    overlayRef.current = null;
    closeBtnRef.current = null;

    // Close the parent dialog
    close?.();
  }, [
    spendAmount,
    selectedCurrency,
    onramperToken,
    selectedPartner,
    selectedPaymentMethod,
    address,
    apiKey,
    secretKey,
    close,
    t,
  ]);

  return {
    onContinue,
    isContinueDisabled,
  };
}
