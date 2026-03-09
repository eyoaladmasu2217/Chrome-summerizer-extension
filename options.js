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
    const promptsTab = document.getElementById('prompts-tab');
    const statsTab = document.getElementById('stats-tab');
    const settingsSection = document.getElementById('settings-section');
    const promptsSection = document.getElementById('prompts-section');
    const statsSection = document.getElementById('stats-section');

    settingsTab.addEventListener('click', () => {
        settingsTab.classList.add('active');
        promptsTab.classList.remove('active');
        statsTab.classList.remove('active');
        settingsSection.classList.add('active');
        promptsSection.classList.remove('active');
        statsSection.classList.remove('active');
        settingsTab.setAttribute('aria-selected', 'true');
        promptsTab.setAttribute('aria-selected', 'false');
        statsTab.setAttribute('aria-selected', 'false');
    });

    promptsTab.addEventListener('click', () => {
        promptsTab.classList.add('active');
        settingsTab.classList.remove('active');
        statsTab.classList.remove('active');
        promptsSection.classList.add('active');
        settingsSection.classList.remove('active');
        statsSection.classList.remove('active');
        promptsTab.setAttribute('aria-selected', 'true');
        settingsTab.setAttribute('aria-selected', 'false');
        statsTab.setAttribute('aria-selected', 'false');
        loadCustomPrompts();
    });

    statsTab.addEventListener('click', () => {
        statsTab.classList.add('active');
        settingsTab.classList.remove('active');
        promptsTab.classList.remove('active');
        statsSection.classList.add('active');
        settingsSection.classList.remove('active');
        promptsSection.classList.remove('active');
        statsTab.setAttribute('aria-selected', 'true');
        settingsTab.setAttribute('aria-selected', 'false');
        promptsTab.setAttribute('aria-selected', 'false');
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

const loadCustomPrompts = () => {
    chrome.storage.sync.get(['customPrompts'], (result) => {
        const prompts = result.customPrompts || [];
        const promptsList = document.getElementById('prompts-list');
        promptsList.innerHTML = '';

        if (prompts.length === 0) {
            promptsList.innerHTML = `
                <div class="empty-state">
                    <i class="material-icons-round">edit</i>
                    <p>No custom prompts yet</p>
                    <p class="sub-text">Create your first custom prompt to get started</p>
                </div>
            `;
            return;
        }

        prompts.forEach((prompt, index) => {
            const promptDiv = document.createElement('div');
            promptDiv.className = 'prompt-item';
            promptDiv.innerHTML = `
                <div class="prompt-header">
                    <h4>${prompt.name}</h4>
                    <div class="prompt-actions">
                        <button class="edit-prompt-btn" data-index="${index}">
                            <i class="material-icons-round">edit</i>
                        </button>
                        <button class="delete-prompt-btn" data-index="${index}">
                            <i class="material-icons-round">delete</i>
                        </button>
                    </div>
                </div>
                <p class="prompt-description">${prompt.description || ''}</p>
                <div class="prompt-content">${prompt.content}</div>
            `;
            promptsList.appendChild(promptDiv);
        });
    });

    // Add prompt button handler
    document.getElementById('add-prompt-btn').addEventListener('click', () => {
        showPromptEditor();
    });

    // Edit and delete handlers (delegated)
    document.getElementById('prompts-list').addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-prompt-btn');
        const deleteBtn = e.target.closest('.delete-prompt-btn');

        if (editBtn) {
            const index = parseInt(editBtn.dataset.index);
            chrome.storage.sync.get(['customPrompts'], (result) => {
                const prompts = result.customPrompts || [];
                showPromptEditor(prompts[index], index);
            });
        }

        if (deleteBtn) {
            const index = parseInt(deleteBtn.dataset.index);
            if (confirm('Delete this custom prompt?')) {
                chrome.storage.sync.get(['customPrompts'], (result) => {
                    const prompts = result.customPrompts || [];
                    prompts.splice(index, 1);
                    chrome.storage.sync.set({ customPrompts: prompts }, () => {
                        loadCustomPrompts();
                    });
                });
            }
        }
    });
};

const showPromptEditor = (existingPrompt = null, index = null) => {
    const isEditing = existingPrompt !== null;
    const promptName = existingPrompt?.name || '';
    const promptDescription = existingPrompt?.description || '';
    const promptContent = existingPrompt?.content || '';

    const editorHTML = `
        <div class="prompt-editor-overlay" id="prompt-editor-overlay">
            <div class="prompt-editor-modal">
                <div class="prompt-editor-header">
                    <h3>${isEditing ? 'Edit Prompt' : 'Create Custom Prompt'}</h3>
                    <button id="close-editor">
                        <i class="material-icons-round">close</i>
                    </button>
                </div>
                <form id="prompt-editor-form">
                    <div class="form-group">
                        <label for="prompt-name">Prompt Name</label>
                        <input type="text" id="prompt-name" value="${promptName}" required>
                    </div>
                    <div class="form-group">
                        <label for="prompt-description">Description (optional)</label>
                        <input type="text" id="prompt-description" value="${promptDescription}">
                    </div>
                    <div class="form-group">
                        <label for="prompt-content">Prompt Content</label>
                        <textarea id="prompt-content" rows="8" required>${promptContent}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancel-editor" class="buttons secondary-btn">Cancel</button>
                        <button type="submit" class="buttons">${isEditing ? 'Update' : 'Create'} Prompt</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', editorHTML);

    // Form submission
    document.getElementById('prompt-editor-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('prompt-name').value.trim();
        const description = document.getElementById('prompt-description').value.trim();
        const content = document.getElementById('prompt-content').value.trim();

        if (!name || !content) return;

        chrome.storage.sync.get(['customPrompts'], (result) => {
            const prompts = result.customPrompts || [];
            const promptData = { name, description, content };

            if (isEditing) {
                prompts[index] = promptData;
            } else {
                prompts.push(promptData);
            }

            chrome.storage.sync.set({ customPrompts: prompts }, () => {
                document.getElementById('prompt-editor-overlay').remove();
                loadCustomPrompts();
            });
        });
    });

    // Close handlers
    document.getElementById('close-editor').addEventListener('click', () => {
        document.getElementById('prompt-editor-overlay').remove();
    });
    document.getElementById('cancel-editor').addEventListener('click', () => {
        document.getElementById('prompt-editor-overlay').remove();
    });
    document.getElementById('prompt-editor-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'prompt-editor-overlay') {
            document.getElementById('prompt-editor-overlay').remove();
        }
    });
};

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
