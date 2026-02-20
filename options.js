document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settings-form');
    const status = document.getElementById('status');

    // Load saved settings
    chrome.storage.sync.get(['summaryLength', 'outputLanguage', 'aiModel', 'darkMode'], (result) => {
        document.getElementById('summary-length').value = result.summaryLength || 'medium';
        document.getElementById('output-language').value = result.outputLanguage || 'en';
        document.getElementById('ai-model').value = result.aiModel || 'Summerizer';
        document.getElementById('dark-mode').checked = result.darkMode || false;
        
        // Apply dark mode
        document.body.classList.toggle('light-mode', !result.darkMode);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const settings = {
            summaryLength: document.getElementById('summary-length').value,
            outputLanguage: document.getElementById('output-language').value,
            aiModel: document.getElementById('ai-model').value,
            darkMode: document.getElementById('dark-mode').checked
        };
        chrome.storage.sync.set(settings, () => {
            status.textContent = 'Settings saved!';
            setTimeout(() => status.textContent = '', 2000);
        });
    });
});