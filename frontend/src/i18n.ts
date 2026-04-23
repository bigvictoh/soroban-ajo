import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'es', 'fr', 'sw', 'pt', 'ar'] as const;
export type Locale = (typeof locales)[number];

/** Languages that use right-to-left text direction */
export const rtlLocales: ReadonlySet<Locale> = new Set(['ar']);

export function isRtl(locale: Locale): boolean {
  return rtlLocales.has(locale);
}

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
