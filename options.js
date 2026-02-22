document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settings-form');
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('save-btn');

    // Load saved settings
    chrome.storage.sync.get(['summaryLength', 'outputLanguage', 'aiModel', 'darkMode', 'apiKey'], (result) => {
        document.getElementById('summary-length').value = result.summaryLength || 'medium';
        document.getElementById('output-language').value = result.outputLanguage || 'en';
        document.getElementById('ai-model').value = result.aiModel || 'Summerizer';
        document.getElementById('api-key').value = result.apiKey || '';
        document.getElementById('dark-mode').checked = result.darkMode !== false; // Default to true

        // Apply dark mode immediately
        document.body.classList.toggle('light-mode', result.darkMode === false);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="material-icons-round">sync</i> Saving...';

        const settings = {
            summaryLength: document.getElementById('summary-length').value,
            outputLanguage: document.getElementById('output-language').value,
            aiModel: document.getElementById('ai-model').value,
            apiKey: document.getElementById('api-key').value,
            darkMode: document.getElementById('dark-mode').checked
        };

        chrome.storage.sync.set(settings, () => {
            document.body.classList.toggle('light-mode', !settings.darkMode);

            status.innerHTML = '<i class="material-icons-round" style="vertical-align: bottom; font-size: 16px;">check_circle</i> Settings applied successfully!';

            setTimeout(() => {
                status.innerHTML = '';
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="material-icons-round">save</i> Save Configuration';
            }, 2000);
        });
    });
});
