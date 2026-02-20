window.addEventListener('DOMContentLoaded', () => {
    // Load dark mode setting
    chrome.storage.sync.get(['darkMode'], (result) => {
        const darkMode = result.darkMode || false;
        document.body.classList.toggle('light-mode', !darkMode);
    });
    const summarizeBtn = document.getElementById('summarize-btn');
    const textarea = document.getElementById('summary');
    const linksList = document.getElementById('links-list');
    const linksSection = document.getElementById('links-section');
    const summarizeTab = document.getElementById('summarize-tab');
    const historyTab = document.getElementById('history-tab');
    const summarizeSection = document.getElementById('summarize-section');
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const pdfBtn = document.getElementById('pdf-btn');
    const readingTime = document.getElementById('reading-time');
    const shareBtn = document.getElementById('share-btn');

    // Tab switching
    summarizeTab.addEventListener('click', () => {
        summarizeTab.classList.add('active');
        historyTab.classList.remove('active');
        summarizeSection.style.display = 'block';
        historySection.style.display = 'none';
    });

    historyTab.addEventListener('click', () => {
        historyTab.classList.add('active');
        summarizeTab.classList.remove('active');
        summarizeSection.style.display = 'none';
        historySection.style.display = 'block';
        loadHistory();
    });

    summarizeBtn.addEventListener('click', async () => {
        if (summarizeBtn.innerText === 'Retry Summarize') {
            summarizeBtn.innerText = 'Summarize';
        }
        summarizeBtn.innerText = 'Summarizing...';
        summarizeBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // Helper: try to get page data via message; fall back to scripting.executeScript if needed
            const getPageData = async (tabId) => {
                return new Promise((resolve) => {
                    // First try content script message
                    chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_DATA' }, (response) => {
                        if (!chrome.runtime.lastError && response) {
                            console.debug('Received page data via sendMessage');
                            return resolve(response);
                        }

                        // Fallback: try chrome.scripting.executeScript if available
                        if (chrome.scripting && chrome.scripting.executeScript) {
                            console.debug('sendMessage failed, falling back to scripting.executeScript');
                            chrome.scripting.executeScript(
                                { target: { tabId }, func: () => {
                                    const text = document.body.innerText || document.body.textContent || '';
                                    const links = Array.from(document.querySelectorAll('a[href]'))
                                        .map(a => ({ text: a.textContent.trim(), href: a.href }))
                                        .filter(l => l.text && (l.href.startsWith('http') || l.href.startsWith('https')));
                                    return { text: text.trim(), links };
                                }},
                                (results) => {
                                    if (chrome.runtime.lastError || !results || !results[0]) {
                                        console.warn('scripting.executeScript returned no result or lastError', chrome.runtime.lastError);
                                        return resolve({ text: '', links: [] });
                                    }
                                    return resolve(results[0].result || { text: '', links: [] });
                                }
                            );
                        } else {
                            console.warn('No content script response and chrome.scripting unavailable');
                            return resolve({ text: '', links: [] });
                        }
                    });
                });
            };

            const pageData = await getPageData(tab.id);

            if (!pageData || !pageData.text || pageData.text.length < 100) {
                alert('Not enough text found on this page to summarize.');
                summarizeBtn.innerText = 'Summarize';
                summarizeBtn.disabled = false;
                return;
            }

            // Calculate reading time
            const wordCount = pageData.text.trim().split(/\s+/).length;
            const readingTimeMinutes = Math.ceil(wordCount / 200); // Average 200 words per minute
            readingTime.textContent = `Estimated reading time: ${readingTimeMinutes} minute${readingTimeMinutes !== 1 ? 's' : ''}`;
            readingTime.style.display = 'block';

            const summary = await getSummary(pageData.text, pageData.links);
            textarea.value = summary;

            // Save to history
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
                if (summaries.length > 50) summaries.pop(); // Keep only last 50
                chrome.storage.local.set({ summaries });
            });

            // Populate links section
            linksList.innerHTML = '';
            if (pageData.links && pageData.links.length > 0) {
                pageData.links.forEach(link => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = link.href;
                    a.textContent = link.text || link.href;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    li.appendChild(a);
                    linksList.appendChild(li);
                });
                linksSection.style.display = 'block';
            } else {
                linksSection.style.display = 'none';
            }

            summarizeBtn.innerText = 'Summarize';
            summarizeBtn.disabled = false;
        } catch (error) {
            console.error(error);
            let errorMessage = 'An error occurred while summarizing.';
            if (error.message.includes('API request failed')) {
                errorMessage = 'Failed to connect to AI service. Please check your internet connection.';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'API rate limit exceeded. Please try again later.';
            }
            alert(errorMessage + ' See console for details.');
            summarizeBtn.innerText = 'Retry Summarize';
            summarizeBtn.disabled = false;
        }
    });
});

const loadHistory = () => {
    chrome.storage.local.get(['summaries'], (result) => {
        const summaries = result.summaries || [];
        historyList.innerHTML = '';
        if (summaries.length === 0) {
            historyList.innerHTML = '<p>No summaries yet.</p>';
            return;
        }
        summaries.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <h4>${item.title}</h4>
                <p><small>${new Date(item.date).toLocaleString()}</small></p>
                <p>${item.summary.substring(0, 100)}...</p>
                <button class="view-btn" data-id="${item.id}">View Full</button>
                <button class="delete-btn" data-id="${item.id}">Delete</button>
            `;
            historyList.appendChild(div);
        });

        // Add event listeners for view and delete
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = summaries.find(s => s.id === id);
                if (item) {
                    textarea.value = item.summary;
                    summarizeTab.click();
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const newSummaries = summaries.filter(s => s.id !== id);
                chrome.storage.local.set({ summaries: newSummaries }, () => {
                    loadHistory();
                });
            });
        });
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(textarea.value).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
        });
    });

    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([textarea.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'summary.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    pdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.text('Page Summary', 20, 30);
        
        // Add summary text
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(textarea.value, 170);
        doc.text(lines, 20, 50);
        
        // Save the PDF
        doc.save('summary.pdf');
    });

    shareBtn.addEventListener('click', () => {
        const summaryData = encodeURIComponent(textarea.value);
        const shareUrl = `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html>
<head><title>Shared Summary</title></head>
<body>
<h1>Shared Page Summary</h1>
<pre>${textarea.value}</pre>
</body>
</html>
`)}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            shareBtn.textContent = 'Link Copied!';
            setTimeout(() => shareBtn.textContent = 'Share', 2000);
        });
    });
};

// Define getSummary function here as well, or import it
const AIML_API_KEY = '99bd4f0072414eabb3f62da667581f7b';
const MODEL = 'Summerizer';

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

        // Get settings from storage
        const settings = await chrome.storage.sync.get(['summaryLength', 'outputLanguage', 'aiModel']);
        const model = settings.aiModel || MODEL;
        const length = settings.summaryLength || 'medium';
        const language = settings.outputLanguage || 'en';

        const prompt = `Please summarize the following text in ${language}. Make it ${length} length. Also extract 5-7 key keywords or phrases from the text and include them at the top of the summary in bold. Format the summary with proper HTML tags for headings and paragraphs: ${text}${linksSection}`;
        
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
                        at the end if links are provided.
                        Always extract 5-7 key keywords or phrases 
                        and list them in bold at the top of the summary.`,
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


