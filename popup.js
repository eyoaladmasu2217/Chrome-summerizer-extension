window.addEventListener('DOMContentLoaded', () => {
    const summarizeBtn = document.getElementById('summarize-btn');
    const textarea = document.getElementById('summary');
    const linksList = document.getElementById('links-list');
    const linksSection = document.getElementById('links-section');

    summarizeBtn.addEventListener('click', async () => {
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

            const summary = await getSummary(pageData.text, pageData.links);
            textarea.value = summary;

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
            alert('An error occurred while summarizing. See console for details.');
            summarizeBtn.innerText = 'Summarize';
            summarizeBtn.disabled = false;
        }
    });
});

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
        
        const jsonData = {
            model: MODEL,
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
                    content: 
                    	`Please summarize the following 
                        text: ${text}${linksSection}`,
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


