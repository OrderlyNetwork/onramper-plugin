import { useEffect, useMemo, useState } from "react";
import { useSWR } from "@orderly.network/hooks";
import type { OnrampPartner } from "../components/partnerSelect";
import type { PaymentMethod } from "../components/paymentMethodSelect";
import { useOnrampConfig } from "../context/OnrampConfigContext";

const ONRAMPER_BASE = "https://api.onramper.com/quotes";

/** Maps chain IDs to Onramper USDC token identifiers. */
const CHAIN_TO_ONRAMPER_TOKEN: Record<number, string> = {
  1: "usdc_ethereum", // Ethereum
  10: "usdc_optimism", // Optimism
  56: "usdc_bsc", // BNB Smart Chain
  100: "usdc_gnosis", // Gnosis
  137: "usdc_polygon", // Polygon
  143: "usdc_monad", // Monad Mainnet
  324: "usdc_zksync", // zkSync Era
  2020: "usdc_ronin", // Ronin
  8453: "usdc_base", // Base
  42161: "usdc_arbitrum", // Arbitrum One
  42220: "usdc_celo", // Celo
  43114: "usdc_avaxc", // Avalanche C-Chain
  57073: "usdc_ink", // Ink
  59144: "usdc_linea", // Linea
  900900900: "usdc_solana", // Solana Mainnet
};

export const ONRAMP_SUPPORTED_CHAIN_IDS = new Set(
  Object.keys(CHAIN_TO_ONRAMPER_TOKEN).map(Number),
);

export function getOnramperToken(chainId: number): string | undefined {
  return CHAIN_TO_ONRAMPER_TOKEN[chainId];
}

export type OnrampQuotePaymentMethod = {
  paymentTypeId: string;
  name: string;
  icon: string;
  details: {
    currencyStatus: string;
    limits: Record<string, { min: number; max: number }>;
  };
};

export type OnrampQuoteError = {
  type: string;
  errorId: number;
  message: string;
  onramp?: string;
  parameter?: string;
  value?: string;
  name: string;
};

export type OnrampQuoteItem = {
  rate?: number;
  networkFee?: number;
  transactionFee?: number;
  payout?: number;
  availablePaymentMethods?: OnrampQuotePaymentMethod[];
  ramp: string;
  paymentMethod?: string;
  quoteId: string;
  errors?: OnrampQuoteError[];
  recommendations?: string[];
};

const onrampFetcher = async (
  url: string,
  apiKey: string,
): Promise<OnrampQuoteItem[]> => {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      Authorization: apiKey,
    },
  });
  if (!res.ok) {
    throw new Error(`Onramper API error: ${res.status}`);
  }
  return res.json();
};

const buildQuoteUrl = (
  currency: string,
  amount: number | string,
  onramperToken: string,
): string =>
  `${ONRAMPER_BASE}/${currency.toLowerCase()}/${onramperToken}?amount=${amount}`;

function filterValidRamps(items: OnrampQuoteItem[]): OnrampQuoteItem[] {
  return items.filter((item) => !item.errors);
}

function toPartners(items: OnrampQuoteItem[]): OnrampPartner[] {
  return items.map((item) => ({
    id: item.ramp,
    name: item.ramp.charAt(0).toUpperCase() + item.ramp.slice(1),
    rate: item.rate ?? 0,
    payout: item.payout ?? 0,
    recommendations: item.recommendations ?? [],
  }));
}

function toPaymentMethods(items: OnrampQuoteItem[]): PaymentMethod[] {
  const seen = new Set<string>();
  const methods: PaymentMethod[] = [];
  for (const item of items) {
    if (!item.availablePaymentMethods) continue;
    for (const pm of item.availablePaymentMethods) {
      if (!seen.has(pm.paymentTypeId)) {
        seen.add(pm.paymentTypeId);
        methods.push({
          id: pm.paymentTypeId,
          name: pm.name,
          icon: pm.icon,
        });
      }
    }
  }
  return methods;
}

function getPaymentMethodsForPartner(
  items: OnrampQuoteItem[],
  partnerId: string,
): PaymentMethod[] {
  const item = items.find((i) => i.ramp === partnerId);
  if (!item?.availablePaymentMethods) return [];
  return item.availablePaymentMethods.map((pm) => ({
    id: pm.paymentTypeId,
    name: pm.name,
    icon: pm.icon,
  }));
}

/** paymentMethodId → { min, max } (from aggregatedLimit) */
export type PaymentMethodLimitsMap = Record<
  string,
  { min: number; max: number }
>;

function extractAllLimits(items: OnrampQuoteItem[]): PaymentMethodLimitsMap {
  const result: PaymentMethodLimitsMap = {};
  for (const item of items) {
    if (!item.availablePaymentMethods) continue;
    for (const pm of item.availablePaymentMethods) {
      const agg = pm.details?.limits?.aggregatedLimit;
      if (agg && !result[pm.paymentTypeId]) {
        result[pm.paymentTypeId] = agg;
      }
    }
  }
  return result;
}

const DEFAULT_AMOUNT = 100;
export function useOnrampQuotes(
  currency: string,
  onramperToken?: string,
) {
  const { apiKey } = useOnrampConfig();
  const token = onramperToken || "";
  const requestKey = `${currency.toLowerCase()}-${token}`;
  // Use a stable amount so user typing does not trigger quote refetches.
  const url = buildQuoteUrl(currency, DEFAULT_AMOUNT, token);

  const { data, error, isLoading, isValidating } = useSWR<OnrampQuoteItem[]>(
    `onramp-quote-${requestKey}`,
    () => onrampFetcher(url, apiKey),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
      dedupingInterval: 1_000,
    },
  );

  const validRamps = useMemo(
    () => (data ? filterValidRamps(data) : []),
    [data],
  );

  const latestLimits = useMemo(
    () => extractAllLimits(validRamps),
    [validRamps],
  );

  // Accumulate limits across fetches so they persist even when we stop querying
  const [accumulatedLimits, setAccumulatedLimits] =
    useState<PaymentMethodLimitsMap>({});
  const [cachedRequestKey, setCachedRequestKey] = useState(requestKey);
  const [accumulatedValidRamps, setAccumulatedValidRamps] = useState<
    OnrampQuoteItem[]
  >([]);

  useEffect(() => {
    if (cachedRequestKey !== requestKey) {
      // Currency/token switches need a fresh scope so stale quotes and limits do
      // not bleed into the next market.
      setCachedRequestKey(requestKey);
      setAccumulatedLimits({});
      setAccumulatedValidRamps([]);
    }
  }, [cachedRequestKey, requestKey]);

  useEffect(() => {
    if (Object.keys(latestLimits).length > 0) {
      setAccumulatedLimits((prev) => ({ ...prev, ...latestLimits }));
    }
  }, [latestLimits]);

  useEffect(() => {
    // Preserve last valid ramps so transient API errors do not clear selection UI.
    if (validRamps.length > 0) {
      setAccumulatedValidRamps(validRamps);
    }
  }, [validRamps]);

  const isCurrentRequestScope = cachedRequestKey === requestKey;
  const rampsForUi =
    validRamps.length > 0
      ? validRamps
      : isCurrentRequestScope
        ? accumulatedValidRamps
        : [];
  const paymentMethodLimitsForUi = isCurrentRequestScope ? accumulatedLimits : {};

  return {
    // Keep form usable with cached valid ramps when latest fetch contains errors.
    isAvailable: rampsForUi.length > 0,
    partners: toPartners(rampsForUi),
    paymentMethods: toPaymentMethods(rampsForUi),
    paymentMethodLimits: paymentMethodLimitsForUi,
    isLoading,
    error,
    validRamps: rampsForUi,
    isValidating,
    getPaymentMethodsForPartner: (partnerId: string) =>
      getPaymentMethodsForPartner(rampsForUi, partnerId),
  };
}

export function useOnrampAvailability(currency: string) {
  return useOnrampQuotes(currency);
}
