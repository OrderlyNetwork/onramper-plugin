import React from "react";
import { createInterceptor } from "@orderly.network/plugin-core";
import type { OrderlySDK, ApplicationState } from "@orderly.network/plugin-core";
import { BuyCryptoIcon } from "./components/icons";
import { OnrampForm } from "./components/onrampForm";
import { OnrampConfigProvider } from "./context/OnrampConfigContext";
import { LocaleProvider } from "./i18n";
import { i18n } from "@orderly.network/i18n";

export interface OnrampPluginOptions {
  title?: string;
  icon?: React.ReactNode;
  apiKey: string;
  secretKey: string;
  workerUrl?: string;
}

const defaultIcon = (
  <div className="oui-flex oui-items-center oui-justify-center">
    <BuyCryptoIcon width={11} height={11} className="oui-mt-0.5 oui-ml-0.5" />
  </div>
);

/**
 * Keep only the first tab per id to prevent duplicate tab growth across rerenders.
 */
function dedupeTabsById(tabs: any[]) {
  const seen = new Set<string>();
  return tabs.filter((tab) => {
    const tabId = String(tab?.id ?? "");
    if (!tabId || seen.has(tabId)) {
      return false;
    }
    seen.add(tabId);
    return true;
  });
}

export function registerOnrampPlugin(options: OnrampPluginOptions) {
  return (SDK: OrderlySDK,) => {



    SDK.registerPlugin({
      id: "orderly-onramp",
      name: i18n.t("onramp.pluginName"),
      version: "1.0.0",
      interceptors: [
        createInterceptor("Transfer.DepositAndWithdraw" as any, (Original, props) => {
          if (!options.apiKey || !options.secretKey) {
            return <Original {...props} />;
          }


          const onrampTab = {
            id: "onramp",
            title: options.title ?? i18n.t("onramp.tabTitle"),
            icon: options.icon ?? defaultIcon,
            component: (props: any) => (
              <OnrampConfigProvider
                config={{
                  apiKey: options.apiKey,
                  secretKey: options.secretKey,
                  workerUrl: options.workerUrl,
                }}
              // state={state}
              >
                <OnrampForm {...props} />
              </OnrampConfigProvider>
            ),
            order: 30,
          };
          const extraTabs = dedupeTabsById([
            ...(Array.isArray(props.extraTabs) ? props.extraTabs : []),
            onrampTab,
          ]);
          return (
            <LocaleProvider>
              <Original {...props} extraTabs={extraTabs} />
            </LocaleProvider>
          );
        }),
      ],
    });
  };
}
