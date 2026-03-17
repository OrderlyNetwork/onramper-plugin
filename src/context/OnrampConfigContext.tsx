import React, { createContext, useContext } from "react";

export interface OnrampConfig {
  apiKey: string;
  secretKey: string;
  workerUrl?: string;
}

const OnrampConfigContext = createContext<OnrampConfig | null>(null);

export function OnrampConfigProvider({
  config,
  children,
}: {
  config: OnrampConfig;
  children: React.ReactNode;
}) {
  return (
    <OnrampConfigContext.Provider value={config}>
      {children}
    </OnrampConfigContext.Provider>
  );
}

export function useOnrampConfig(): OnrampConfig {
  const config = useContext(OnrampConfigContext);
  if (!config) {
    throw new Error("useOnrampConfig must be used within OnrampConfigProvider");
  }
  return config;
}
