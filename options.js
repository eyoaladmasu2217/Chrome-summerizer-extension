"use strict";

import { storageGet, storageSet } from './src/utils.js';

// entry point
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settings-form');
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('save-btn');

    // display current extension version
    const versionLabel = document.getElementById('version-label');
    if (versionLabel && chrome.runtime && chrome.runtime.getManifest) {
        versionLabel.textContent = `v${chrome.runtime.getManifest().version}`;
    }
    // Tab switching
    const settingsTab = document.getElementById('settings-tab');
    const statsTab = document.getElementById('stats-tab');
    const settingsSection = document.getElementById('settings-section');
    const statsSection = document.getElementById('stats-section');

    settingsTab.addEventListener('click', () => {
        settingsTab.classList.add('active');
        statsTab.classList.remove('active');
        settingsSection.classList.add('active');
        statsSection.classList.remove('active');
        settingsTab.setAttribute('aria-selected', 'true');
        statsTab.setAttribute('aria-selected', 'false');
    });

    statsTab.addEventListener('click', () => {
        statsTab.classList.add('active');
        settingsTab.classList.remove('active');
        statsSection.classList.add('active');
        settingsSection.classList.remove('active');
        statsTab.setAttribute('aria-selected', 'true');
        settingsTab.setAttribute('aria-selected', 'false');
        loadStatistics();
    });

    // Reset stats button
    const resetStatsBtn = document.getElementById('reset-stats-btn');
    resetStatsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all statistics? This will clear your summary history.')) {
            chrome.storage.local.set({ summaries: [] }, () => {
                loadStatistics();
                status.innerHTML = '<i class="material-icons-round" style="vertical-align: bottom; font-size: 16px;">check_circle</i> Statistics reset successfully!';
                setTimeout(() => status.innerHTML = '', 2000);
            });
        }
    });

    // Load saved settings
    (async () => {
        try {
            const result = await storageGet([
                'summaryLength',
                'summaryTone',
                'outputLanguage',
                'aiModel',
                'darkMode',
                'autoCopy',
                'autoTag',
                'apiKey'
            ]);
            document.getElementById('summary-length').value = result.summaryLength || 'medium';
            document.getElementById('summary-tone').value = result.summaryTone || 'professional';
            document.getElementById('output-language').value = result.outputLanguage || 'en';
            document.getElementById('ai-model').value = result.aiModel || 'Summerizer';
            document.getElementById('api-key').value = result.apiKey || '';
            document.getElementById('dark-mode').checked = result.darkMode !== false; // Default true
            document.getElementById('auto-copy').checked = result.autoCopy || false;
            document.getElementById('auto-tag').checked = result.autoTag || false;

            // Apply dark mode immediately
            document.body.classList.toggle('light-mode', result.darkMode === false);
        } catch (e) {
            Logger.error('Unable to load saved settings', e);
        }
    })();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="material-icons-round">sync</i> Saving...';

        const settings = {
            summaryLength: document.getElementById('summary-length').value,
            summaryTone: document.getElementById('summary-tone').value,
            outputLanguage: document.getElementById('output-language').value,
            aiModel: document.getElementById('ai-model').value,
            apiKey: document.getElementById('api-key').value,
            darkMode: document.getElementById('dark-mode').checked,
            autoCopy: document.getElementById('auto-copy').checked,
            autoTag: document.getElementById('auto-tag').checked
        };

        try {
            await storageSet(settings);
            document.body.classList.toggle('light-mode', !settings.darkMode);
            status.innerHTML = '<i class="material-icons-round" style="vertical-align: bottom; font-size: 16px;">check_circle</i> Settings applied successfully!';
        } catch (err) {
            Logger.error('Unable to save options', err);
            status.textContent = 'Error saving settings';
        } finally {
            setTimeout(() => {
                status.innerHTML = '';
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="material-icons-round">save</i> Save Configuration';
            }, 2000);
        }
    });
});

const loadStatistics = () => {
    chrome.storage.local.get(['summaries'], (result) => {
        const summaries = result.summaries || [];
        const totalSummaries = summaries.length;
        const bookmarkedCount = summaries.filter(s => s.bookmarked).length;
        const totalTime = summaries.reduce((sum, s) => sum + (s.readingTime || 0), 0);
        const aiInteractions = summaries.length; // Assuming each summary is an AI interaction

        document.getElementById('total-summaries').textContent = totalSummaries;
        document.getElementById('total-time').textContent = `${totalTime}m`;
        document.getElementById('bookmarked-count').textContent = bookmarkedCount;
        document.getElementById('ai-interactions').textContent = aiInteractions;

        // Recent activity
        const recentActivity = document.getElementById('recent-activity');
        recentActivity.innerHTML = '';
        const recent = summaries.slice(0, 10);
        recent.forEach(item => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
                <span class="activity-title">${item.title || 'Untitled'}</span>
                <span class="activity-date">${new Date(item.date).toLocaleDateString()}</span>
            `;
            recentActivity.appendChild(div);
        });
    });
};
