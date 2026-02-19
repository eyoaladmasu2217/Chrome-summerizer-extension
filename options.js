document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settings-form');
    const status = document.getElementById('status');

    // Load saved settings
    chrome.storage.sync.get(['summaryLength', 'outputLanguage', 'aiModel'], (result) => {
        document.getElementById('summary-length').value = result.summaryLength || 'medium';
        document.getElementById('output-language').value = result.outputLanguage || 'en';
        document.getElementById('ai-model').value = result.aiModel || 'Summerizer';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const settings = {
            summaryLength: document.getElementById('summary-length').value,
            outputLanguage: document.getElementById('output-language').value,
            aiModel: document.getElementById('ai-model').value
        };
        chrome.storage.sync.set(settings, () => {
            status.textContent = 'Settings saved!';
            setTimeout(() => status.textContent = '', 2000);
        });
    });
});