import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enMessages from '@/assets/locales/en.json';

export enum TranslationLanguageEnum {
    English = 'en',
}

const resources = {
    [TranslationLanguageEnum.English]: { translation: enMessages },
};

export const getDeviceLanguage = (): string => {
    try {
        // Get the primary language code from device locales
        const locales = Localization.getLocales();
        const languageCode = locales[0]?.languageCode?.toLowerCase() || TranslationLanguageEnum.English;
        return languageCode;
    } catch {
        // Fallback to Intl API if expo-localization fails
        try {
            const locale = Intl.DateTimeFormat().resolvedOptions().locale;
            return locale.split(/[-_]/)[0].toLowerCase() || TranslationLanguageEnum.English;
        } catch {
            return TranslationLanguageEnum.English;
        }
    }
};

// Using i18n instance method, not the named export 'use'
// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: TranslationLanguageEnum.English,
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;    