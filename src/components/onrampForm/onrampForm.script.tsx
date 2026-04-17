import { useMemo } from "react";
import { useTranslation } from "@orderly.network/i18n";
import type { API, NetworkId } from "@orderly.network/types";
import type { FiatCurrency } from "../../constants";
import { useOnrampCheckout } from "../../hooks/useOnrampCheckout";
import { useOnrampQuotes, getOnramperToken } from "../../hooks/useOnrampQuote";
import { useOnrampTransactionStatus } from "../../hooks/useOnrampTransactionStatus";
import type { WebhookEvent } from "../../hooks/useOnrampTransactionStatus";
import { usePartnerPaymentSelection } from "../../hooks/usePartnerPaymentSelection";
import { useReceiveDisplay } from "../../hooks/useReceiveDisplay";
import { useSpendAmount } from "../../hooks/useSpendAmount";
import { useWalletAddress } from "../../hooks/useWalletAddress";
import { useChainSelect } from "../chainSelect/useChainSelect";
import type { CurrentChain } from "../chainSelect/useChainSelect";
import type { OnrampPartner } from "../partnerSelect";
import type { PaymentMethod } from "../paymentMethodSelect";
import { useQuery, usePrivateQuery, useConfig } from "@orderly.network/hooks";
import { Arbitrum, ArbitrumSepolia } from "@orderly.network/types";

// --- State Return Type ---

export type OnrampFormState = {
  // "You Spend" section
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod: PaymentMethod | null;
  onPaymentMethodChange: (method: PaymentMethod) => void;

  fiatCurrencies: readonly string[];
  selectedCurrency: FiatCurrency;
  onCurrencyChange: (currency: FiatCurrency) => void;

  spendAmount: string;
  onSpendAmountChange: (value: string) => void;
  presetAmounts: readonly number[];

  // "You Receive" section
  chains: API.NetworkInfos[];
  selectedChain: CurrentChain | null;
  onChainChange: (chain: API.NetworkInfos) => Promise<void>;

  wallet: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  address?: string;

  receiveQuantity: string;
  receiveQuantityPlaceholder: string;

  partners: OnrampPartner[];
  selectedPartner: OnrampPartner | null;
  onPartnerChange: (partner: OnrampPartner) => void;

  exchangeRateText: string;

  /** True while SWR is fetching/revalidating (for countdown reset). */
  quoteIsValidating: boolean;

  // Availability
  isAvailable: boolean;
  isQuoteLoading: boolean;

  /** Error message when spend amount is outside min/max limits. */
  spendAmountError: string;

  // Onramper checkout
  onContinue: () => void;
  isContinueDisabled: boolean;

  // Transaction Status
  statusData: WebhookEvent | null | undefined;
  transactions: WebhookEvent[];
  pendingTransactions: WebhookEvent[];
  historyTransactions: WebhookEvent[];
  isStatusLoading: boolean;
};

// --- Hook ---

export const useOnrampFormScript = (close?: () => void): OnrampFormState => {
  const { t } = useTranslation();
  // "You Spend" section
  const spend = useSpendAmount();

  const networkId = useConfig("networkId") as NetworkId;

  const receiveChainId = useMemo(() => {
    return networkId === "mainnet" ? Arbitrum.id : ArbitrumSepolia.id;
  }, [networkId]);

  // "You Receive" — chain + network token
  const { chains, currentChain, onChainChange } = useChainSelect();

  const onramperToken = useMemo(
    () => (currentChain ? getOnramperToken(currentChain.id) : undefined),
    [currentChain],
  );



  // Quote fetching (paymentMethodLimits accumulated across fetches)
  const {
    isAvailable,
    partners,
    isLoading,
    getPaymentMethodsForPartner,
    paymentMethodLimits,
    isValidating,
  } = useOnrampQuotes(
    spend.selectedCurrency,
    onramperToken,
  );

  // Partner + payment method selection (auto-fallback to first available)
  const selection = usePartnerPaymentSelection(
    partners,
    getPaymentMethodsForPartner,
  );

  // const SUPPORTED_CHAIN_ID = ArbitrumSepolia.id;

  const { data: receiverAddress, isLoading: isReceiverAddressLoading } = usePrivateQuery<{ receiver_address: string }>(
    `/v1/client/asset/receiver_address?chain_id=${receiveChainId}`,
  );

  // console.log("receiverAddress", receiverAddress);

  // Spend amount validation against accumulated payment method limits
  const spendAmountError = useMemo(() => {
    if (!spend.spendAmount || !selection.selectedPaymentMethod) return "";
    const num = parseFloat(spend.spendAmount);
    if (isNaN(num) || num <= 0) return "";
    const limits = paymentMethodLimits[selection.selectedPaymentMethod.id];
    if (!limits) return "";
    if (num < limits.min || num > limits.max) {
      return t("onramp.amountBetween", {
        currency: spend.selectedCurrency,
        min: limits.min,
        max: limits.max,
      });
    }
    return "";
  }, [
    spend.spendAmount,
    spend.selectedCurrency,
    selection.selectedPaymentMethod,
    paymentMethodLimits,
    t,
  ]);

  // Wallet address (handles AGW chain special case)
  const { wallet, address } = useWalletAddress();

  // Transaction history + polling (by receiver address, not wallet address)
  const {
    transactions,
    pendingTransactions,
    historyTransactions,
    isLoading: isStatusLoading,
  } = useOnrampTransactionStatus(receiverAddress?.receiver_address ?? null);

  // Display values for "You Receive" section
  const { receiveQuantity, receiveQuantityPlaceholder, exchangeRateText } =
    useReceiveDisplay({
      spendAmount: spend.spendAmount,
      spendAmountError,
      selectedPartner: selection.selectedPartner,
      selectedCurrency: spend.selectedCurrency,
      effectiveSpendAmountForQuote: spend.effectiveSpendAmountForQuote,
    });

  // Checkout flow (iframe URL, dialog, continue button)
  const checkout = useOnrampCheckout({
    spendAmount: spend.spendAmount,
    selectedCurrency: spend.selectedCurrency,
    spendAmountError,
    onramperToken,
    selectedPartner: selection.selectedPartner,
    selectedPaymentMethod: selection.selectedPaymentMethod,
    address: receiverAddress?.receiver_address as string,
    isLoading,
    isReceiverAddressLoading: isReceiverAddressLoading,
    close,
  });

  return {
    paymentMethods: selection.paymentMethods,
    selectedPaymentMethod: selection.selectedPaymentMethod,
    onPaymentMethodChange: selection.onPaymentMethodChange,

    fiatCurrencies: spend.fiatCurrencies,
    selectedCurrency: spend.selectedCurrency,
    onCurrencyChange: spend.onCurrencyChange,

    spendAmount: spend.spendAmount,
    onSpendAmountChange: spend.onSpendAmountChange,
    presetAmounts: spend.presetAmounts,

    chains,
    selectedChain: currentChain,
    onChainChange,

    wallet,
    address,

    receiveQuantity,
    receiveQuantityPlaceholder,

    partners,
    selectedPartner: selection.selectedPartner,
    onPartnerChange: selection.onPartnerChange,

    exchangeRateText,
    quoteIsValidating: isValidating,

    isAvailable,
    isQuoteLoading: isLoading,
    spendAmountError,

    ...checkout,

    statusData:
      pendingTransactions.length > 0
        ? pendingTransactions[0]
        : historyTransactions.length > 0
          ? historyTransactions[0]
          : null,
    transactions,
    pendingTransactions,
    historyTransactions,
    isStatusLoading,
  };
};
