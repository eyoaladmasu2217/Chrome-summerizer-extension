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

            // Execute script to get the page text
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Get all text content from the page
                    const text = document.body.innerText || document.body.textContent;
                    return text.trim();
                },
            });

            const pageText = results[0].result;

            if (!pageText || pageText.length < 100) {
                alert('Not enough text found on this page to summarize.');
                btnSummary.innerText = 'Summarize';
                btnSummary.disabled = false;
                return;
            }

            // Summarize the text
            const summary = await getSummary(pageText);
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

const getSummary = async text => {
    try {
        const headers = {
            Authorization: `Bearer ${AIML_API_KEY}`,
            'Content-Type': 'application/json',
        };
        const jsonData = {
            model: MODEL,
            messages: [
                {
                    role: 'assistant',
                    content:
                        `You are an AI assistant who
                        provides summaries for long texts.
                        You are using HTML tags to format
                        your response.`,
                },
                {
                    role: 'user',
                    content:
                    	`Please summarize the following
                        text: ${text}`,
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


