// AIML_API_KEY removed for security. Now retrieved from storage.
const DEFAULT_MODEL = 'Summerizer';

// State management
let currentSummary = '';

window.addEventListener('DOMContentLoaded', () => {
    // Initial UI Setup
    initSettings();
    initTabs();
    initEventListeners();
    loadHistory();
});

const initSettings = () => {
    chrome.storage.sync.get(['darkMode'], (result) => {
        const darkMode = result.darkMode || false;
        document.body.classList.toggle('light-mode', !darkMode);
    });
};

const initTabs = () => {
    const summarizeTab = document.getElementById('summarize-tab');
    const historyTab = document.getElementById('history-tab');
    const summarizeSection = document.getElementById('summarize-section');
    const historySection = document.getElementById('history-section');

    const switchTab = (activeTab, inactiveTab, activeSection, inactiveSection) => {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        inactiveTab.classList.remove('active');
        inactiveTab.setAttribute('aria-selected', 'false');
        activeSection.style.display = 'block';
        inactiveSection.style.display = 'none';

        if (activeTab.id === 'history-tab') {
            loadHistory();
        }
    };

    summarizeTab.addEventListener('click', () => switchTab(summarizeTab, historyTab, summarizeSection, historySection));
    historyTab.addEventListener('click', () => switchTab(historyTab, summarizeTab, historySection, summarizeSection));
};

const initEventListeners = () => {
    const summarizeBtn = document.getElementById('summarize-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const pdfBtn = document.getElementById('pdf-btn');
    const shareBtn = document.getElementById('share-btn');
    const settingsTrigger = document.getElementById('settings-trigger');
    const textarea = document.getElementById('summary');

    summarizeBtn.addEventListener('click', handleSummarize);

    settingsTrigger.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    copyBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="material-icons" style="vertical-align: middle; margin-right: 8px;">check</i>Copied!';
            setTimeout(() => copyBtn.innerHTML = originalText, 2000);
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (!textarea.value) return;
        const blob = new Blob([textarea.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    pdfBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('Summarize AI Analytics', 20, 28);

        doc.setTextColor(148, 163, 184);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, 20, 65);

        doc.save(`summary-${Date.now()}.pdf`);
    });

    shareBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;

        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Summarize AI Recap</title><style>body{font-family:sans-serif;background:#f8fafc;padding:40px;color:#0f172a;line-height:1.6;} .card{background:white;padding:40px;border-radius:24px;box-shadow:0 10px 40px rgba(0,0,0,0.05);max-width:800px;margin:0 auto;} h1{color:#6366f1;margin-top:0;} pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><div class="card"><h1>Recap</h1><pre>${text}</pre></div></body></html>`;
        const shareUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            const original = shareBtn.innerHTML;
            shareBtn.innerHTML = '<i class="material-icons-round">link</i> Link Copied';
            setTimeout(() => shareBtn.innerHTML = original, 2000);
        });
    });
};


const handleSummarize = async () => {
    const summarizeBtn = document.getElementById('summarize-btn');
    const textarea = document.getElementById('summary');
    const readingTime = document.getElementById('reading-time');
    const linksList = document.getElementById('links-list');
    const linksSection = document.getElementById('links-section');

    summarizeBtn.innerText = 'Summarizing...';
    summarizeBtn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const pageData = await getPageData(tab.id);

        if (!pageData || !pageData.text || pageData.text.length < 50) {
            throw new Error('Not enough text found on this page.');
        }

        // Calculate reading time
        const wordCount = pageData.text.trim().split(/\s+/).length;
        const minutes = Math.ceil(wordCount / 200);
        readingTime.textContent = `Estimated reading time: ${minutes} min${minutes !== 1 ? 's' : ''}`;
        readingTime.style.display = 'block';

        const summary = await getSummary(pageData.text, pageData.links);
        textarea.value = summary.replace(/<[^>]*>/g, ''); // Simple strip for textarea
        currentSummary = summary;

        // Save to local storage
        const historyItem = {
            id: Date.now(),
            url: tab.url,
            title: tab.title,
            summary: summary,
            date: new Date().toISOString()
        };

        chrome.storage.local.get(['summaries'], (result) => {
            const summaries = result.summaries || [];
            summaries.unshift(historyItem);
            chrome.storage.local.set({ summaries: summaries.slice(0, 50) });
        });

        // Display links
        linksList.innerHTML = '';
        if (pageData.links?.length > 0) {
            pageData.links.forEach(link => {
                const a = document.createElement('a');
                a.className = 'link-card';
                a.href = link.href;
                a.target = '_blank';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'link-title';
                titleSpan.textContent = link.text || 'Untitled Link';

                const hostSpan = document.createElement('span');
                hostSpan.className = 'link-host';

                const icon = document.createElement('i');
                icon.className = 'material-icons-round';
                icon.style.fontSize = '12px';
                icon.textContent = 'link';

                hostSpan.appendChild(icon);
                hostSpan.appendChild(document.createTextNode(` ${link.hostname || 'link'}`));

                a.appendChild(titleSpan);
                a.appendChild(hostSpan);
                linksList.appendChild(a);
            });
            linksSection.style.display = 'block';
        } else {
            linksSection.style.display = 'none';
        }


    } catch (error) {
        console.error('Summary error:', error);
        alert(error.message || 'An error occurred during summarization.');
    } finally {
        summarizeBtn.innerText = 'Summarize';
        summarizeBtn.disabled = false;
    }
};

const getPageData = (tabId) => {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_DATA' }, (response) => {
            if (!chrome.runtime.lastError && response) {
                return resolve(response);
            }
            chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    const text = document.body.innerText || '';
                    const seen = new Set();
                    const links = Array.from(document.querySelectorAll('a[href]'))
                        .map(a => ({
                            text: a.textContent.trim(),
                            href: a.href,
                            hostname: new URL(a.href).hostname
                        }))
                        .filter(l => {
                            const isNew = !seen.has(l.href);
                            const isWeb = l.href.startsWith('http');
                            const hasText = l.text.length > 2;
                            if (isNew && isWeb && hasText) {
                                seen.add(l.href);
                                return true;
                            }
                            return false;
                        })
                        .slice(0, 20);
                    return { text: text.trim(), links, title: document.title };
                }
            }, (results) => {
                resolve(results?.[0]?.result || { text: '', links: [], title: '' });
            });
        });
    });
};


const getSummary = async (text, links = []) => {
    const settings = await chrome.storage.sync.get(['summaryLength', 'outputLanguage', 'aiModel', 'apiKey']);
    const model = settings.aiModel || DEFAULT_MODEL;
    const length = settings.summaryLength || 'medium';
    const language = settings.outputLanguage || 'en';
    const apiKey = settings.apiKey;

    if (!apiKey) {
        throw new Error('Please set your API Key in the settings page.');
    }

    let lengthInstruction = '';
    switch (length) {
        case 'short': lengthInstruction = 'Provide a very concise summary (3-5 sentences).'; break;
        case 'long': lengthInstruction = 'Provide a detailed, in-depth summary with multiple sections.'; break;
        default: lengthInstruction = 'Provide a well-balanced summary of the main points.';
    }

    const payload = {
        model,
        messages: [
            {
                role: 'system',
                content: `You are an expert content analyst. Your task is to summarize the provided text in ${language}. 
                Follow this structure:
                1. **💡 Key Takeaways**: List 3-5 most important points as bullet points with emojis.
                2. **📝 Summary**: ${lengthInstruction} Use professional and engaging tone.
                3. **🔗 References**: If links are provided, mention the most relevant ones naturally.
                
                Use Markdown for formatting. Avoid fluff.`
            },
            {
                role: 'user',
                content: `Please analyze and summarize the following content:\n\n${text}${links.length > 0 ? '\n\nSource links:\n' + links.slice(0, 5).map(l => `- ${l.text}: ${l.href}`).join('\n') : ''}`
            }
        ],
        temperature: 0.7
    };

    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'AI API request failed');
    }
    const data = await response.json();
    return data.choices[0].message.content;
};


const loadHistory = () => {
    chrome.storage.local.get(['summaries'], (result) => {
        const historyList = document.getElementById('history-list');
        const summaries = result.summaries || [];

        historyList.innerHTML = summaries.length === 0 ? '<p class="empty-msg">No history yet.</p>' : '';

        summaries.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';

            const header = document.createElement('div');
            header.className = 'history-header';

            const title = document.createElement('h4');
            title.textContent = item.title || 'Untitled';

            const date = document.createElement('span');
            date.className = 'history-date';
            date.textContent = new Date(item.date).toLocaleDateString();

            header.appendChild(title);
            header.appendChild(date);

            const preview = document.createElement('p');
            preview.className = 'history-preview';
            preview.textContent = (item.summary || '').substring(0, 80).replace(/<[^>]*>/g, '') + '...';

            const actions = document.createElement('div');
            actions.className = 'history-actions';

            const viewBtn = document.createElement('button');
            viewBtn.className = 'view-btn';
            viewBtn.dataset.id = item.id;
            viewBtn.textContent = 'View';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.dataset.id = item.id;
            deleteBtn.textContent = 'Delete';

            actions.appendChild(viewBtn);
            actions.appendChild(deleteBtn);

            div.appendChild(header);
            div.appendChild(preview);
            div.appendChild(actions);
            historyList.appendChild(div);
        });

        // Event delegation for history actions
        historyList.onclick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains('view-btn')) {
                const item = summaries.find(s => s.id === id);
                if (item) {
                    document.getElementById('summary').value = item.summary.replace(/<[^>]*>/g, '');
                    document.getElementById('summarize-tab').click();
                }
            } else if (btn.classList.contains('delete-btn')) {
                const updated = summaries.filter(s => s.id !== id);
                chrome.storage.local.set({ summaries: updated }, loadHistory);
            }
        };
    });
};



