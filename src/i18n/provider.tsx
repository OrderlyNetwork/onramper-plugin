import { FC, PropsWithChildren } from "react";
import {
  AsyncResources,
  ExternalLocaleProvider,
  LocaleCode,
  LocaleEnum,
} from "@orderly.network/i18n";
import { LocaleMessages } from "./module";

const resources: AsyncResources = async (lang: LocaleCode) => {
  if (lang === LocaleEnum.en) {
    return LocaleMessages;
  }
  return import(`./locales/${lang}.json`).then((res) => res.default);
};

export const LocaleProvider: FC<PropsWithChildren> = (props) => {
  return (
    <ExternalLocaleProvider resources={resources}>
      {props.children}
    </ExternalLocaleProvider>
  );
};
