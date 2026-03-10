// Utility helpers shared across popup and content scripts

/**
 * A small wrapper around chrome.storage.sync.get that returns a Promise.
 * @param {string|string[]} keys
 * @returns {Promise<Object>}
 */
export function storageGet(keys) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (result) => {
            resolve(result);
        });
    });
}

/**
 * Wrapper for chrome.storage.sync.set returning a Promise.
 * @param {Object} items
 * @returns {Promise<void>}
 */
export function storageSet(items) {
    return new Promise((resolve) => {
        chrome.storage.sync.set(items, () => {
            resolve();
        });
    });
}

/**
 * Display a transient toast message in the popup UI.
 * @param {string} message
 * @param {'success'|'error'} [type='success']
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check_circle' : 'error';
    toast.innerHTML = `<i class="material-icons-round">${icon}</i><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Add a brief pulse animation to an element for haptic feedback.
 * @param {HTMLElement} element
 */
export function triggerHaptic(element) {
    if (!element) return;
    element.classList.remove('haptic-pulse');
    void element.offsetWidth; // force reflow
    element.classList.add('haptic-pulse');
}

/**
 * Update the theme toggle icon based on dark mode state.
 * @param {boolean} isDark
 */
export function updateThemeIcon(isDark) {
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
}

/**
 * Convenience helper to format a timestamp as a relative string.
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
export function getRelativeTime(timestamp) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-days, 'day');
}
/**
 * Send a simple analytics event using the Measurement Protocol (GA4).
 * The background service worker will usually call this, but popups/pages can
 * also forward messages via runtime.sendMessage.
 *
 * @param {string} eventName
 * @param {Object} [params]
 * @returns {Promise<void>}
 */
export async function sendAnalyticsEvent(eventName, params = {}) {
    try {
        // NOTE: analytics ID is imported by caller to avoid circular dependency
        const { ANALYTICS_ID } = await import('./constants.js');
        if (!ANALYTICS_ID || ANALYTICS_ID.startsWith('G-XXXXXXXX')) {
            // analytics disabled or not configured
            return;
        }

        const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ANALYTICS_ID}&api_secret=${encodeURIComponent('REPLACE_WITH_SECRET')}`;
        const payload = {
            client_id: chrome.runtime.id,
            events: [{ name: eventName, params }]
        };

        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Analytics send failed', err);
    }
}