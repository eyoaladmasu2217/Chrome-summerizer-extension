(function() {
    'use strict';

    // constants
    const DEFAULT_MODEL = 'Summerizer';
    const MIN_SELECTION_LEN = 50;
    const OVERLAY_ID = 'summary-overlay';

    // state
    let overlay = null;
    let currentSelectedText = '';

    /**
     * simple promisified wrapper over chrome.storage.sync.get
     * @param {string|string[]} keys
     */
    const storageGet = (keys) => new Promise(resolve => chrome.storage.sync.get(keys, resolve));


/**
 * Request a summary for a given text snippet from the external AI API.
 * @param {string} text - selected text from the page
 * @returns {Promise<string>} AI-generated summary
 * @throws Will throw an error if the API key is missing or network fails.
 */
const getSelectionSummary = async (text) => {
    const settings = await storageGet(['summaryLength', 'outputLanguage', 'aiModel', 'apiKey']);
    const model = settings.aiModel || DEFAULT_MODEL;
    const length = settings.summaryLength || 'short';
    const language = settings.outputLanguage || 'en';
    const apiKey = settings.apiKey;

    if (!apiKey) throw new Error('API Key missing. Please set it in options.');

    const payload = {
        model,
        messages: [
            {
                role: 'system',
                content: `You are a helpful reading assistant. Briefly summarize this selected text snippet in ${language}. 
                Aim for 2-3 bullet points. Use a helpful, informative tone.`
            },
            {
                role: 'user',
                content: `Selected text: "${text}"`
            }
        ]
    };


    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('API failed');
    const data = await response.json();
    return data.choices[0].message.content;
};

const createSummaryOverlay = () => {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'summary-overlay';

    // Load dark mode
    storageGet(['darkMode']).then(result => {
        if (result.darkMode === false) {
            overlay.classList.add('light-mode');
        }
    }).catch(err => {
        console.error('Failed to read darkMode', err);
    });

    // Inject Material Icons if not present
    if (!document.getElementById('summarize-ai-icons')) {
        const link = document.createElement('link');
        link.id = 'summarize-ai-icons';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
        document.head.appendChild(link);
    }

    const summaryButton = document.createElement('button');
    summaryButton.id = 'summary-button';
    summaryButton.innerHTML = '<i class="material-icons-round" style="font-size: 16px;">auto_awesome</i> Summarize Selection';

    overlay.appendChild(summaryButton);
    document.body.appendChild(overlay);

    summaryButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        const originalContent = summaryButton.innerHTML;
        summaryButton.innerHTML = '<i class="material-icons-round" style="font-size: 16px;">sync</i> Summarizing...';
        summaryButton.disabled = true;

        try {
            const summary = await getSelectionSummary(currentSelectedText);
            const prev = overlay.querySelector('.summary-content');
            if (prev) prev.remove();

            const content = document.createElement('div');
            content.className = 'summary-content';
            content.innerHTML = summary.replace(/\n/g, '<br>');
            overlay.appendChild(content);
            summaryButton.innerHTML = originalContent;
        } catch (error) {
            summaryButton.innerHTML = '<i class="material-icons-round" style="font-size: 16px;">error</i> Error - Try Again';
        } finally {
            summaryButton.disabled = false;
        }
    });
};


const showOverlay = (x, y) => {
    if (!overlay) createSummaryOverlay();
    overlay.style.display = 'flex';
    overlay.style.position = 'absolute';
    overlay.style.top = `${y}px`;
    overlay.style.left = `${x}px`;
    overlay.style.zIndex = OVERLAY_Z_INDEX;
};

const hideOverlay = () => {
    if (overlay) {
        overlay.style.display = 'none';
        const content = overlay.querySelector('.summary-content');
        if (content) content.remove();
    }
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_DATA') {
        const text = extractCleanText();
        const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({
                text: a.textContent.trim(),
                href: a.href,
                hostname: new URL(a.href).hostname
            }))
            .filter(l => l.text.length > 5 && l.href.startsWith('http'))
            .slice(0, 15);
        sendResponse({ text, links, title: document.title });
    }
    return true;
});

const extractCleanText = () => {
    // Try to find main content areas
    const mainContentSelectors = ['article', '[role="main"]', 'main', '.content', '.article', '.post-content', '#content', '.entry-content'];
    let contentElement = null;

    for (const sel of mainContentSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.length > 400) {
            contentElement = el;
            break;
        }
    }

    const target = contentElement || document.body;
    const clone = target.cloneNode(true);

    const selectorsToRemove = [
        'script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript', 'aside',
        '.ads', '#ads', '.comments', '.sidebar', '.menu', '.nav', '.social-share',
        '.cookie-banner', '#cookie-banner', '.newsletter', '.popup-overlay'
    ];
    selectorsToRemove.forEach(sel => {
        clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    return (clone.innerText || clone.textContent || '').trim().replace(/\s+/g, ' ');
};

document.addEventListener('mouseup', (e) => {
    if (overlay && overlay.contains(e.target)) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > MIN_SELECTION_LEN) {
        currentSelectedText = selectedText;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showOverlay(rect.left + window.scrollX, rect.bottom + window.scrollY + 10);
    } else {
        hideOverlay();
    }
});

})();

