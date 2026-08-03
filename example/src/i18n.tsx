import React, {createContext, useContext, useMemo, type PropsWithChildren} from 'react';

export type Language = 'zh' | 'en';

type I18nValue = {
  language: Language;
  tr: (zh: string, en: string) => string;
};

const I18nContext = createContext<I18nValue>({
  language: 'zh',
  tr: (zh: string) => zh,
});

export function detectSystemLanguage(): Language {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    return locale.startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'zh';
  }
}

export function I18nProvider({
  language,
  children,
}: PropsWithChildren<{language: Language}>) {
  const value = useMemo<I18nValue>(
    () => ({
      language,
      tr: (zh: string, en: string) => (language === 'zh' ? zh : en),
    }),
    [language],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
