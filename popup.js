document
    .getElementById('summarize-btn')
    .addEventListener('click', async function clickSummary() {
        const btnSummary = document.getElementById('summarize-btn');
        const textarea = document.getElementById('summary');

        // Update button text to indicate the process has started
        btnSummary.innerText = 'Summarizing...';
        btnSummary.disabled = true;

        try {
            // Identify the active tab in the current browser window
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });

            // Execute script to get the page text and links
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Get all text content from the page
                    const text = document.body.innerText || document.body.textContent;
                    
                    // Get all links
                    const links = Array.from(document.querySelectorAll('a[href]'))
                        .map(a => ({
                            text: a.textContent.trim(),
                            href: a.href
                        }))
                        .filter(link => link.text && link.href.startsWith('http'));
                    
                    return {
                        text: text.trim(),
                        links: links
                    };
                },
            });

            const pageData = results[0].result;

            if (!pageData.text || pageData.text.length < 100) {
                alert('Not enough text found on this page to summarize.');
                btnSummary.innerText = 'Summarize';
                btnSummary.disabled = false;
                return;
            }

            // Summarize the text and include links
            const summary = await getSummary(pageData.text, pageData.links);
            textarea.value = summary;
            btnSummary.innerText = 'Summarize';
            btnSummary.disabled = false;
        } catch (error) {
            console.log(`Error: ${error}`);
            alert('An error occurred while summarizing. Please try again.');
            btnSummary.innerText = 'Summarize';
            btnSummary.disabled = false;
        }
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


