const AIML_API_KEY = '99bd4f0072414eabb3f62da667581f7b';
const MODEL = 'Summerizer';

let overlay = null;

const getSummary = async (text, links = []) => {
    try {
        const headers = {
            Authorization: `Bearer ${AIML_API_KEY}`,
            'Content-Type': 'application/json',
        };
        
        let linksSection = '';
        if (links.length > 0) {
            linksSection = `\n\nLinks found on the page:\n${links.map(link => `- [${link.text}](${link.href})`).join('\n')}`;
        }

        // Get settings from storage (note: in content script, use chrome.storage.sync)
        const settings = await chrome.storage.sync.get(['summaryLength', 'outputLanguage', 'aiModel']);
        const model = settings.aiModel || MODEL;
        const length = settings.summaryLength || 'medium';
        const language = settings.outputLanguage || 'en';

        const prompt = `Please summarize the following text in ${language}. Make it ${length} length: ${text}${linksSection}`;
        
        const jsonData = {
            model: model,
            messages: [
                {
                    role: 'assistant',
                    content:
                        `You are an AI assistant who 
                        provides summaries for long texts. 
                        You are using HTML tags to format 
                        your response. Include a "Links" section 
                        at the end if links are provided.`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        };
        const response = await fetch(
            'https://api.aimlapi.com/v1/chat/completions',
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(jsonData),
            }
        );
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.log(`Error: ${error}`);
        throw error;
    }
};

const createSummaryOverlay = text => {
    if (overlay) {
        try { overlay.remove(); } catch (e) {}
        overlay = null;
    }

    overlay = document.createElement('div');
    overlay.id = 'summary-overlay';
    overlay.style.display = 'none';

    const summaryButton = document.createElement('button');
    summaryButton.id = 'summary-button';
    summaryButton.textContent = 'Summarize';

    overlay.appendChild(summaryButton);
    document.body.appendChild(overlay);

        summaryButton.addEventListener('click', async () => {
            summaryButton.textContent = 'Summarizing...';
            summaryButton.disabled = true;
            try {
                const summary = await getSummary(text);
                summaryButton.textContent = 'Summarize';
                summaryButton.disabled = false;
                // remove previous summary if present
                const prev = overlay.querySelector('.summary-content');
                if (prev) prev.remove();
                const summaryContainer = document.createElement('div');
                summaryContainer.className = 'summary-content';
                summaryContainer.innerHTML = summary;
                overlay.appendChild(summaryContainer);
            } catch (error) {
                console.log(`Error: ${error}`);
                summaryButton.textContent = 'Error - Try Again';
                summaryButton.disabled = false;
            }
        });
};

const showOverlay = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    overlay.style.display = 'flex';
    overlay.style.top = `${window.scrollY + rect.top - 50}px`;
    overlay.style.left = `${rect.left}px`;
};

// Respond to popup requests for page data
chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'GET_PAGE_DATA') return;
    try {
        const text = document.body.innerText || document.body.textContent || '';
        const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({ text: a.textContent.trim(), href: a.href }))
            .filter(l => l.text && (l.href.startsWith('http') || l.href.startsWith('https')));
        sendResponse({ text: text.trim(), links });
    } catch (err) {
        sendResponse({ text: '', links: [] });
    }
    // indicate we'll respond synchronously
    return true;
});

document.addEventListener('mouseup', event => {
    if (event.target.closest && event.target.closest('#summary-overlay')) return;

    const selection = window.getSelection && window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (selectedText.length > 200 && selectedText.length < 7000) {
        if (!overlay) createSummaryOverlay(selectedText);
        else overlay.dataset.text = selectedText;

        showOverlay();
    } else if (overlay) {
        try { overlay.remove(); } catch (e) {}
        overlay = null;
    }
});