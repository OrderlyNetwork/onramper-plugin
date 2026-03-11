import type { TOnrampLocales } from "./module";

declare module "@orderly.network/i18n" {
  interface LocaleMessages extends TOnrampLocales {}
}
