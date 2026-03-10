import { storageGet, storageSet, sendAnalyticsEvent } from './src/utils.js';
import { WELCOME_PAGE } from './src/constants.js';

// background.js runs as a service worker under MV3.  It remains dormant
// until an event wakes it up (install, alarm, message, contextmenu, etc.).

// ----- installation & onboarding -----
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // open welcome page in new tab
        try {
            await chrome.tabs.create({ url: WELCOME_PAGE });
        } catch (e) {
            console.error('Unable to open welcome page', e);
        }
        // set some defaults if they don't exist
        const existing = await storageGet(['summaryLength']);
        if (existing.summaryLength === undefined) {
            await storageSet({ summaryLength: 'medium', darkMode: true });
        }
        sendAnalyticsEvent('install');
    } else if (details.reason === 'update') {
        sendAnalyticsEvent('update');
    }
});

// migrate storage schema if needed (example placeholder)

// uninstall URL is set in manifest, but we double check
chrome.runtime.setUninstallURL('https://yourdomain.com/uninstall-feedback?ext=summarize-ai');

// ----- context menus -----
function createContextMenus() {
    chrome.contextMenus.create({
        id: 'summarize-selection',
        title: 'Summarize selection',
        contexts: ['selection']
    });
    chrome.contextMenus.create({
        id: 'summarize-page',
        title: 'Summarize this page',
        contexts: ['page']
    });
}

chrome.runtime.onInstalled.addListener(() => {
    createContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'summarize-selection' && info.selectionText) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text) => {
                window.postMessage({ type: 'SUMMARIZE_FROM_CM', text }, '*');
            },
            args: [info.selectionText]
        });
        sendAnalyticsEvent('context_menu_selection');
    } else if (info.menuItemId === 'summarize-page') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                window.postMessage({ type: 'SUMMARIZE_FROM_CM', text: null }, '*');
            }
        });
        sendAnalyticsEvent('context_menu_page');
    }
});

// ----- keyboard shortcuts -----
chrome.commands.onCommand.addListener((command) => {
    if (command === 'summarize-selection' || command === 'open-popup') {
        chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            if (tabs[0]) {
                chrome.action.openPopup();
            }
        });
        sendAnalyticsEvent('keyboard_' + command);
    }
});

// ----- messaging / analytics bridge -----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'ANALYTICS') {
        sendAnalyticsEvent(message.event, message.payload);
    }
    // keep worker awake until we send response
    return true;
});

// simple alarm example for periodic sync or cleanup
chrome.alarms.create('dailyCheck', { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyCheck') {
        sendAnalyticsEvent('alarm_daily');
    }
});
