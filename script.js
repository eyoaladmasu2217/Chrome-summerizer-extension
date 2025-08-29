const AIML_API_KEY = '99bd4f0072414eabb3f62da667581f7b'; // Replace with your AIML_API_KEY
const MODEL = 'Summerizer';

let overlay = null;

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
    }
};

const createSummaryOverlay = text => {
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
            summaryButton.textContent = 'Summary';
            const summaryContainer = document.createElement('div');
            summaryContainer.innerHTML = summary;
            overlay.appendChild(summaryContainer);
        } catch (error) {
            console.log(`Error: ${error}`);
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

document.addEventListener('mouseup', event => {
    if (event.target.closest('#summary-overlay')) return;

    const selectedText = window.getSelection().toString().trim();

    if (selectedText.length > 200 && selectedText.length < 7000) {
        if (!overlay) createSummaryOverlay();

        showOverlay();
    } else if (overlay) {
        document.body.removeChild(overlay);
        overlay = null;
    }
});