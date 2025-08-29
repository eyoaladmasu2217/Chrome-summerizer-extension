document
    .getElementById('summarize-btn')
    .addEventListener('click', async function clickSummary() {
        const bntSummary = document.getElementById('summarize-btn');
        // Update button text to indicate the process has started
        bntSummary.innerText = 'Summarizing...'; 
        // Prevent multiple clicks during execution
        bntSummary.removeEventListener('click', clickSummary); 
         // Change button style for feedback
        bntSummary.style.backgroundColor = '#0053ac';

        // Identify the active tab in the current browser window
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });

        // Execute the summarizeText function 
        //in the context of the active tab
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            // Function to run in the tab's environment
            func: summarizeText, 
        });
    });


