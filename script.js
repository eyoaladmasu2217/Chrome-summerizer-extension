const AIML_API_KEY = '99bd4f0072414eabb3f62da667581f7b';
const DEFAULT_MODEL = 'Summerizer';

let overlay = null;
let currentSelectedText = '';

const getSelectionSummary = async (text) => {
    const settings = await chrome.storage.sync.get(['summaryLength', 'outputLanguage', 'aiModel']);
    const model = settings.aiModel || DEFAULT_MODEL;
    const length = settings.summaryLength || 'short';
    const language = settings.outputLanguage || 'en';

    const payload = {
        model,
        messages: [
            {
                role: 'system',
                content: `Provide a very concise ${length} summary of the selected text in ${language}. Use bullet points.`
            },
            {
                role: 'user',
                content: text
            }
        ]
    };

    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AIML_API_KEY}`,
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

    const summaryButton = document.createElement('button');
    summaryButton.id = 'summary-button';
    summaryButton.textContent = 'Summarize Selection';

    overlay.appendChild(summaryButton);
    document.body.appendChild(overlay);

    summaryButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        summaryButton.textContent = 'Summarizing...';
        summaryButton.disabled = true;

        try {
            const summary = await getSelectionSummary(currentSelectedText);
            const prev = overlay.querySelector('.summary-content');
            if (prev) prev.remove();

            const content = document.createElement('div');
            content.className = 'summary-content';
            content.innerHTML = summary.replace(/\n/g, '<br>');
            overlay.appendChild(content);
            summaryButton.textContent = 'Summarize Selection';
        } catch (error) {
            summaryButton.textContent = 'Error - Try Again';
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
    overlay.style.zIndex = '2147483647';
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
        const text = document.body.innerText || '';
        const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({ text: a.textContent.trim(), href: a.href }))
            .filter(l => l.text && l.href.startsWith('http'));
        sendResponse({ text: text.trim(), links });
    }
    return true;
});

document.addEventListener('mouseup', (e) => {
    if (overlay && overlay.contains(e.target)) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 50) {
        currentSelectedText = selectedText;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showOverlay(rect.left + window.scrollX, rect.bottom + window.scrollY + 10);
    } else {
        hideOverlay();
    }
});
