import React from "react";
import { createInterceptor } from "@orderly.network/plugin-core";
import type { OrderlySDK } from "@orderly.network/plugin-core";
import { BuyCryptoIcon } from "./components/icons";
import { OnrampForm } from "./components/onrampForm";
import { OnrampConfigProvider } from "./context/OnrampConfigContext";

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

export function registerOnrampPlugin(options: OnrampPluginOptions) {
  return (SDK: OrderlySDK) => {
    SDK.registerPlugin({
      id: "orderly-onramp",
      name: "Buy Crypto (Onramper)",
      version: "1.0.0",
      interceptors: [
        createInterceptor("Transfer.DepositAndWithdraw", (Original, props) => {
          if (!options.apiKey || !options.secretKey) {
            return <Original {...props} />;
          }

          const onrampTab = {
            id: "onramp",
            title: options.title ?? "Buy Crypto",
            icon: options.icon ?? defaultIcon,
            component: (props: any) => (
              <OnrampConfigProvider
                config={{
                  apiKey: options.apiKey,
                  secretKey: options.secretKey,
                  workerUrl: options.workerUrl,
                }}
              >
                <OnrampForm {...props} />
              </OnrampConfigProvider>
            ),
            order: 30,
          };
          const extraTabs = [
            ...(Array.isArray(props.extraTabs) ? props.extraTabs : []),
            onrampTab,
          ];
          return <Original {...props} extraTabs={extraTabs} />;
        }),
      ],
    });
  };
}
