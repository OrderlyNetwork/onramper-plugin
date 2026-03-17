import { FC, PropsWithChildren } from "react";
import {
  preloadDefaultResource,
  ExternalLocaleProvider,
  LocaleCode,
} from "@orderly.network/i18n";
import { OnrampLocales, TOnrampLocales } from "./module";

preloadDefaultResource(OnrampLocales);

const resources = (lang: LocaleCode) => {
  return import(`./locales/${lang}.json`).then(
    (res) => res.default as TOnrampLocales
  );
};

export const OnrampLocaleProvider: FC<PropsWithChildren> = (props) => {
  return (
    <ExternalLocaleProvider resources={resources}>
      {props.children}
    </ExternalLocaleProvider>
  );
};
