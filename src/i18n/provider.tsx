import { FC, PropsWithChildren } from "react";
import {
  preloadDefaultResource,
  ExternalLocaleProvider,
  LocaleCode,
} from "@orderly.network/i18n";
import { TemplateLocales, TTemplateLocales } from "./module";

preloadDefaultResource(TemplateLocales);

const resources = (lang: LocaleCode) => {
  return import(`./locales/${lang}.json`).then(
    (res) => res.default as TTemplateLocales
  );
};

export const TemplateLocaleProvider: FC<PropsWithChildren> = (props) => {
  return (
    <ExternalLocaleProvider resources={resources}>
      {props.children}
    </ExternalLocaleProvider>
  );
};
