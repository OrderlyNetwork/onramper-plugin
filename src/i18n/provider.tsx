import { FC, PropsWithChildren } from "react";
import {
  AsyncResources,
  ExternalLocaleProvider,
  importLocaleJsonModule,
  LocaleCode,
  LocaleEnum,
  preloadDefaultResource,
  type LocaleJsonModule,
} from "@orderly.network/i18n";
import { LocaleMessages } from "./module";

/**
 * One explicit dynamic import per locale so webpack/Next can statically resolve chunks.
 * Vite accepts the same pattern; avoid variable-path dynamic imports for locale JSON.
 *
 * @see packages/i18n/docs/guide/examples.md — Async resources (Next.js and webpack)
 */
type LocaleJsonLoader = () => Promise<LocaleJsonModule>;

const localeJsonLoaders: Record<LocaleEnum, LocaleJsonLoader | undefined> = {
  [LocaleEnum.en]: undefined,
  [LocaleEnum.zh]: () => import("./locales/zh.json"),
  [LocaleEnum.ja]: () => import("./locales/ja.json"),
  [LocaleEnum.es]: () => import("./locales/es.json"),
  [LocaleEnum.ko]: () => import("./locales/ko.json"),
  [LocaleEnum.vi]: () => import("./locales/vi.json"),
  [LocaleEnum.de]: () => import("./locales/de.json"),
  [LocaleEnum.fr]: () => import("./locales/fr.json"),
  [LocaleEnum.ru]: () => import("./locales/ru.json"),
  [LocaleEnum.id]: () => import("./locales/id.json"),
  [LocaleEnum.tr]: () => import("./locales/tr.json"),
  [LocaleEnum.it]: () => import("./locales/it.json"),
  [LocaleEnum.pt]: () => import("./locales/pt.json"),
  [LocaleEnum.uk]: () => import("./locales/uk.json"),
  [LocaleEnum.pl]: () => import("./locales/pl.json"),
  [LocaleEnum.nl]: () => import("./locales/nl.json"),
  [LocaleEnum.tc]: () => import("./locales/tc.json"),
};

// Seed fallback messages before async locale chunks load to avoid flashing i18n keys.
preloadDefaultResource(LocaleMessages);

const resources: AsyncResources = (lang: LocaleCode, _ns: string) => {
  if (lang === LocaleEnum.en) {
    return Promise.resolve(LocaleMessages);
  }
  const loader = localeJsonLoaders[lang as LocaleEnum];
  return importLocaleJsonModule(loader);
};

export const LocaleProvider: FC<PropsWithChildren> = (props) => {
  return (
    <ExternalLocaleProvider resources={resources}>
      {props.children}
    </ExternalLocaleProvider>
  );
};
