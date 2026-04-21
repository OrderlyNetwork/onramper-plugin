import { FC, PropsWithChildren, useEffect, useState } from "react";
import {
  AsyncResources,
  i18n,
  LocaleCode,
  LocaleEnum,
  parseI18nLang,
  registerResources,
  Resources,
  defaultNS,
  ExternalLocaleProvider,
} from "@orderly.network/i18n";
import { LocaleMessages } from "./module";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import tr from "./locales/tr.json";
import vi from "./locales/vi.json";
import id from "./locales/id.json";
import pl from "./locales/pl.json";
import nl from "./locales/nl.json";
import tc from "./locales/tc.json";
import uk from "./locales/uk.json";

// registerDefaultResource(LocaleMessages);

const resources = {
  [LocaleEnum.en]: LocaleMessages,
  [LocaleEnum.zh]: zh,
  [LocaleEnum.ja]: ja,
  [LocaleEnum.es]: es,
  [LocaleEnum.ko]: ko,
  [LocaleEnum.vi]: vi,
  [LocaleEnum.de]: de,
  [LocaleEnum.fr]: fr,
  [LocaleEnum.ru]: ru,
  [LocaleEnum.id]: id,
  [LocaleEnum.tr]: tr,
  [LocaleEnum.it]: it,
  [LocaleEnum.pt]: pt,
  [LocaleEnum.uk]: uk,
  [LocaleEnum.pl]: pl,
  [LocaleEnum.nl]: nl,
  [LocaleEnum.tc]: tc,
};

Object.entries(resources).forEach(([locale, messages]) => {
  i18n.addResourceBundle(locale, defaultNS, messages, true, true);
});

// const resources: AsyncResources = async (lang: LocaleCode) => {
//   if (lang === LocaleEnum.en) {
//     return {};
//   }
//   return import(`./locales/${lang}.json`).then((res) => res.default);
// };

export const LocaleProvider: FC<PropsWithChildren> = (props) => {
  return props.children;
  // return (
  //   <ExternalLocaleProvider resources={resources}>
  //     {props.children}
  //   </ExternalLocaleProvider>
  // );
};
