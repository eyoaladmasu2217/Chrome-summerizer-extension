// Centralized constants for the extension

export const DEFAULT_MODEL = 'Summerizer';
export const MIN_SELECTION_LENGTH = 50;
export const OVERLAY_Z_INDEX = 2147483647;

export const STORAGE_KEYS = {
    SUMMARY_LENGTH: 'summaryLength',
    OUTPUT_LANGUAGE: 'outputLanguage',
    AI_MODEL: 'aiModel',
    API_KEY: 'apiKey',
    DARK_MODE: 'darkMode',
    AUTO_COPY: 'autoCopy',
    AUTO_TAG: 'autoTag'
};

// analytics measurement ID (Google Analytics 4 or similar)
export const ANALYTICS_ID = 'G-XXXXXXXXXX';

// small helper urls used across the extension
export const WELCOME_PAGE = chrome.runtime.getURL('welcome.html');

