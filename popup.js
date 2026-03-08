"use strict";

// module imports
import {
    storageGet,
    storageSet,
    showToast,
    triggerHaptic,
    updateThemeIcon,
    getRelativeTime
} from './src/utils.js';
import { DEFAULT_MODEL, STORAGE_KEYS } from './src/constants.js';

/**
 * Professional logging system for debugging purposes. Toggle isDebug to
 * suppress console output in production.
 */
class Logger {
    static isDebug = true; // link this to a setting if you like

    static log(message, ...args) {
        if (this.isDebug) console.log(`[SummarizeAI][LOG] ${message}`, ...args);
    }

    static error(message, ...args) {
        console.error(`[SummarizeAI][ERROR] ${message}`, ...args);
    }

    static info(message, ...args) {
        if (this.isDebug) console.info(`[SummarizeAI][INFO] ${message}`, ...args);
    }

    static dev(message, ...args) {
        if (this.isDebug) console.debug(`[SummarizeAI][DEV] ${message}`, ...args);
    }
}

// State management
let currentSummary = '';
let chatHistory = [];
let synth = window.speechSynthesis;
let isReading = false;
let showBookmarksOnly = false;



window.addEventListener('DOMContentLoaded', () => {
    // Initial UI Setup
    initSettings();
    initTabs();
    initEventListeners();
    loadHistory();
    loadStats();
    checkApiKey();

    // warn if user has entered tags but hasn't summarized/bookmarked
    window.addEventListener('beforeunload', (e) => {
        const tagInput = document.getElementById('summary-tags');
        if (tagInput && tagInput.value.trim()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});

const checkApiKey = async () => {
    try {
        const result = await storageGet([STORAGE_KEYS.API_KEY]);
        const warning = document.getElementById('api-key-warning');
        if (!result.apiKey) {
            warning.style.display = 'flex';
        } else {
            warning.style.display = 'none';
        }
    } catch (err) {
        Logger.error('Failed to check API key', err);
    }
};

const loadStats = async () => {
    try {
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['stats'], resolve);
        });
        const stats = result.stats || { count: 0, timeSaved: 0 };
        document.getElementById('stat-count').textContent = stats.count;
        document.getElementById('stat-time').textContent = `${stats.timeSaved}m`;
    } catch (err) {
        Logger.error('Error loading stats', err);
    }
};

const updateStats = async (minutesSaved) => {
    try {
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['stats'], resolve);
        });
        const stats = result.stats || { count: 0, timeSaved: 0 };
        stats.count += 1;
        stats.timeSaved += minutesSaved;
        chrome.storage.local.set({ stats }, () => {
            document.getElementById('stat-count').textContent = stats.count;
            document.getElementById('stat-time').textContent = `${stats.timeSaved}m`;
        });
    } catch (err) {
        Logger.error('Error updating stats', err);
    }
};


/**
 * Visual Haptic Feedback
 * Triggers a subtle pulse animation on an element
 */
const triggerHaptic = (element) => {
    if (!element) return;
    element.classList.remove('haptic-pulse');
    void element.offsetWidth; // Force reflow
    element.classList.add('haptic-pulse');
};

const initSettings = () => {
    const themeToggle = document.getElementById('theme-toggle');
    const autocopyChip = document.getElementById('autocopy-chip');

    (async () => {
        try {
            const result = await storageGet([STORAGE_KEYS.DARK_MODE, STORAGE_KEYS.AUTO_COPY]);
                let darkMode;
                if (result.darkMode === undefined) {
                    // use system preference when not explicitly set
                    darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                } else {
                    darkMode = result.darkMode;
                }
                document.body.classList.toggle('light-mode', !darkMode);
                updateThemeIcon(darkMode);
                if (result.autoCopy && autocopyChip) {
                    autocopyChip.style.display = 'flex';
                }

                // listen for system changes when user hasn't locked preference
                const mql = window.matchMedia('(prefers-color-scheme: dark)');
                mql.addEventListener('change', e => {
                    if (result.darkMode === undefined) {
                        const sysDark = e.matches;
                        document.body.classList.toggle('light-mode', !sysDark);
                        updateThemeIcon(sysDark);
                    }
                });
    })();

    themeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.body.classList.contains('light-mode');
        const newDarkMode = isCurrentlyLight; // If light, change to dark (true)
        document.body.classList.toggle('light-mode');
        chrome.storage.sync.set({ darkMode: newDarkMode });
        updateThemeIcon(newDarkMode);
        showToast(`${newDarkMode ? 'Dark' : 'Light'} mode enabled`);
    });
};

const updateThemeIcon = (isDark) => {
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
};

const initTabs = () => {
    const summarizeTab = document.getElementById('summarize-tab');
    const historyTab = document.getElementById('history-tab');
    const summarizeSection = document.getElementById('summarize-section');
    const historySection = document.getElementById('history-section');

    const switchTab = (activeTab, inactiveTab, activeSection, inactiveSection) => {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        inactiveTab.classList.remove('active');
        inactiveTab.setAttribute('aria-selected', 'false');

        activeSection.style.display = 'block';
        inactiveSection.style.display = 'none';
        inactiveSection.classList.remove('active');

        // Trigger reflow then add active class for transition
        void activeSection.offsetWidth;
        activeSection.classList.add('active');

        if (activeTab.id === 'history-tab') {
            loadHistory();
        }
    };

    summarizeTab.addEventListener('click', () => switchTab(summarizeTab, historyTab, summarizeSection, historySection));
    historyTab.addEventListener('click', () => switchTab(historyTab, summarizeTab, historySection, summarizeSection));
};

const initEventListeners = () => {
    const summarizeBtn = document.getElementById('summarize-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const pdfBtn = document.getElementById('pdf-btn');
    const shareBtn = document.getElementById('share-btn');
    const settingsTrigger = document.getElementById('settings-trigger');
    const textarea = document.getElementById('summary');
    const historySearch = document.getElementById('history-search');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const markdownBtn = document.getElementById('markdown-btn');
    const jsonBtn = document.getElementById('json-btn');
    const csvBtn = document.getElementById('csv-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const copyAllLinksBtn = document.getElementById('copy-all-links');
    const chatInput = document.getElementById('chat-input');
    const readAloudBtn = document.getElementById('read-aloud-btn');
    const pauseTtsBtn = document.getElementById('pause-tts-btn');
    const stopTtsBtn = document.getElementById('stop-tts-btn');
    const voiceSelect = document.getElementById('voice-select');

    const readingModeToggle = document.getElementById('reading-mode-toggle');
    const exitReadingModeBtn = document.getElementById('exit-reading-mode');

    const emailBtn = document.getElementById('email-btn');
    const configureKeyBtn = document.getElementById('configure-key-btn');

    configureKeyBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    const eli5Btn = document.getElementById('eli5-btn');
    const retryBtn = document.getElementById('retry-btn');

    retryBtn.addEventListener('click', () => handleSummarize());

    summarizeBtn.addEventListener('click', () => handleSummarize());
    regenerateBtn.addEventListener('click', () => handleSummarize());
    eli5Btn.addEventListener('click', () => handleSummarize(true));

    const openNewTabBtn = document.getElementById('open-new-tab-btn');

    openNewTabBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;
        const html = `<html><head><title>Summary</title><style>body{font-family:sans-serif;padding:40px;background:#f8fafc;color:#0f172a;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><h1>Summary</h1><pre>${text}</pre></body></html>`;
        const newWin = window.open();
        if (newWin) {
            newWin.document.write(html);
            newWin.document.close();
        }
    });

    const tweetBtn = document.getElementById('tweet-btn');
    tweetBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;
        const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twUrl, '_blank');
    });

    emailBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;
        const subject = encodeURIComponent('Summary from Summarize AI');
        const body = encodeURIComponent(text);
        window.open(`mailto:?subject=${subject}&body=${body}`);
    });

    readingModeToggle.addEventListener('click', () => {
        if (!textarea.value) {
            showToast('Generate a summary first!', 'error');
            return;
        }
        document.body.classList.add('reading-mode');
    });

    exitReadingModeBtn.addEventListener('click', () => {
        document.body.classList.remove('reading-mode');
    });

    sendChatBtn.addEventListener('click', handleChat);
    const clearChatBtn = document.getElementById('clear-chat-btn');
    clearChatBtn.addEventListener('click', () => {
        if (chatHistory.length === 0) return;
        if (confirm('Are you sure you want to clear the conversation?')) {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.style.opacity = '0';
            chatMessages.style.transform = 'translateY(10px)';

            setTimeout(() => {
                chatMessages.innerHTML = '';
                chatMessages.style.opacity = '1';
                chatMessages.style.transform = 'translateY(0)';
                chatHistory = [];
                showToast('Chat cleared');
            }, 300);
        }
    });
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChat();
    });

    const chatMessages = document.getElementById('chat-messages');
    const chatScrollBottom = document.getElementById('chat-scroll-bottom');

    chatMessages.addEventListener('scroll', () => {
        const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 50;
        chatScrollBottom.style.display = isAtBottom ? 'none' : 'flex';
    });

    chatScrollBottom.addEventListener('click', () => {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    });

    const copyChatBtn = document.getElementById('copy-chat-btn');
    copyChatBtn.addEventListener('click', () => {
        if (chatHistory.length === 0) return;
        const formatted = chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
        navigator.clipboard.writeText(formatted).then(() => {
            triggerHaptic(copyChatBtn);
            showToast('Chat history copied!');
        });
    });

    const exportChatBtn = document.getElementById('export-chat-btn');
    exportChatBtn.addEventListener('click', async () => {
        if (chatHistory.length === 0) return;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const title = tab?.title || 'Web Content';

        let mdContent = `# Chat History: ${title}\n\n`;
        mdContent += `*Source: ${tab?.url || 'N/A'}*\n`;
        mdContent += `*Date: ${new Date().toLocaleString()}*\n\n---\n\n`;

        mdContent += chatHistory.map(m => `### ${m.role === 'user' ? '👤 User' : '🤖 AI'}\n${m.content}`).join('\n\n');

        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Chat history exported as Markdown');
    });

    readAloudBtn.addEventListener('click', handleToggleSpeech);
    pauseTtsBtn.addEventListener('click', handlePauseSpeech);
    stopTtsBtn.addEventListener('click', handleStopSpeech);

    // Initialize voices
    setTimeout(populateVoices, 100);
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoices;
    }


    markdownBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Markdown file exported');
    });

    jsonBtn.addEventListener('click', async () => {
        const text = textarea.value;
        if (!text) return;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const data = {
            title: tab?.title || 'Summary',
            url: tab?.url || '',
            summary: text,
            timestamp: new Date().toISOString(),
            wordCount: text.split(/\s+/).length
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('JSON file exported');
    });

    csvBtn.addEventListener('click', async () => {
        const text = textarea.value;
        if (!text) return;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const csv = `Title,URL,Summary,Timestamp,Word Count\n"${(tab?.title || 'Summary').replace(/"/g, '""')}",${tab?.url || ''},"${text.replace(/"/g, '""')}",${new Date().toISOString()},${text.split(/\s+/).length}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV file exported');
    });

    copyAllLinksBtn.addEventListener('click', () => {
        const links = Array.from(document.querySelectorAll('#links-list .link-card'))
            .map(a => `${a.querySelector('.link-title').textContent}: ${a.href}`)
            .join('\n');
        if (links) {
            navigator.clipboard.writeText(links).then(() => {
                showToast('All links copied!');
            });
        }
    });

    historySearch.addEventListener('input', (e) => {
        const query = e.target.value;
        loadHistory(query);
        clearSearchBtn.style.display = query ? 'flex' : 'none';
    });

    const filterBookmarkBtn = document.getElementById('filter-bookmark-btn');

    filterBookmarkBtn.addEventListener('click', () => {
        showBookmarksOnly = !showBookmarksOnly;
        filterBookmarkBtn.classList.toggle('active');
        filterBookmarkBtn.querySelector('i').textContent = showBookmarksOnly ? 'bookmark' : 'bookmark_border';
        loadHistory(historySearch.value);
    });

    clearSearchBtn.addEventListener('click', () => {
        historySearch.value = '';
        loadHistory('');
        clearSearchBtn.style.display = 'none';
        historySearch.focus();
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all summarization history?')) {
            chrome.storage.local.set({ summaries: [] }, () => {
                loadHistory();
                showToast('History cleared');
            });
        }
    });

    const exportAllHistory = (format = 'txt') => {
        chrome.storage.local.get(['summaries'], (result) => {
            const summaries = result.summaries || [];
            if (summaries.length === 0) {
                showToast('No history to export', 'error');
                return;
            }

            let content, mimeType, extension;
            if (format === 'json') {
                content = JSON.stringify(summaries, null, 2);
                mimeType = 'application/json';
                extension = 'json';
            } else if (format === 'csv') {
                const headers = ['Title', 'URL', 'Summary', 'Date', 'Model', 'Sentiment', 'Reading Time', 'Tags'];
                const csvRows = summaries.map(s => [
                    `"${(s.title || '').replace(/"/g, '""')}"`,
                    s.url || '',
                    `"${(s.summary || '').replace(/"/g, '""')}"`,
                    s.date || '',
                    s.model || '',
                    s.sentiment || '',
                    s.readingTime || 0,
                    `"${(s.tags || []).join(', ').replace(/"/g, '""')}"`
                ]);
                content = [headers, ...csvRows].map(row => row.join(',')).join('\n');
                mimeType = 'text/csv';
                extension = 'csv';
            } else {
                content = summaries.map(s => 
                    `Title: ${s.title}\nURL: ${s.url}\nDate: ${new Date(s.date).toLocaleString()}\nModel: ${s.model}\nSentiment: ${s.sentiment}\nReading Time: ${s.readingTime || 0} min\nTags: ${(s.tags||[]).join(', ')}\n\n${s.summary}\n\n---\n\n`
                ).join('');
                mimeType = 'text/plain';
                extension = 'txt';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `summaries-export-${Date.now()}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('History exported successfully!');
        });
    };

    const clearAllHistory = () => {
        chrome.storage.local.set({ summaries: [] }, () => {
            loadHistory();
            showToast('History cleared');
        });
    };

    const bookmarkSummary = async (summary) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const settings = await chrome.storage.sync.get(['aiModel']);
        const model = settings.aiModel || DEFAULT_MODEL;
        // gather tags at time of bookmarking as well
        const tagInput = document.getElementById('summary-tags');
        let bookmarkTags = [];
        if (tagInput && tagInput.value.trim()) {
            bookmarkTags = tagInput.value.split(',').map(t => t.trim()).filter(Boolean);
        }
        const bookmark = {
            id: Date.now().toString(),
            title: tab?.title || 'Bookmarked Summary',
            url: tab?.url || '',
            summary: summary,
            tags: bookmarkTags,
            date: Date.now(),
            model: model,
            bookmarked: true
        };

        chrome.storage.local.get(['summaries'], (result) => {
            const summaries = result.summaries || [];
            summaries.unshift(bookmark);
            // Keep only last 50 summaries
            if (summaries.length > 50) summaries.splice(50);
            chrome.storage.local.set({ summaries }, () => {
                showToast('Summary bookmarked!');
                updateBookmarkIcon(true);
                loadHistory(); // Refresh history to show the bookmark
            });
        });
    };

    const updateBookmarkIcon = (isBookmarked) => {
        const icon = bookmarkBtn.querySelector('i');
        if (icon) {
            icon.textContent = isBookmarked ? 'bookmark' : 'bookmark_border';
        }
    };

    settingsTrigger.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Quick Actions Menu
    const quickActionsBtn = document.getElementById('quick-actions-btn');
    const quickActionsMenu = document.getElementById('quick-actions-menu');
    const quickSummarize = document.getElementById('quick-summarize');
    const quickCopy = document.getElementById('quick-copy');
    const quickExport = document.getElementById('quick-export');
    const quickExportJson = document.getElementById('quick-export-json');
    const quickExportCsv = document.getElementById('quick-export-csv');
    const quickClear = document.getElementById('quick-clear');

    const bookmarkBtn = document.getElementById('bookmark-btn');

    quickActionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = quickActionsMenu.style.display !== 'none';
        quickActionsMenu.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!quickActionsBtn.contains(e.target) && !quickActionsMenu.contains(e.target)) {
            quickActionsMenu.style.display = 'none';
        }
    });

    quickSummarize.addEventListener('click', () => {
        quickActionsMenu.style.display = 'none';
        handleSummarize();
    });

    quickCopy.addEventListener('click', () => {
        quickActionsMenu.style.display = 'none';
        const summary = document.getElementById('summary').value;
        if (summary) {
            navigator.clipboard.writeText(summary).then(() => {
                showToast('Summary copied to clipboard!');
            });
        } else {
            showToast('No summary to copy', 'error');
        }
    });

    quickExport.addEventListener('click', () => {
        quickActionsMenu.style.display = 'none';
        exportAllHistory('txt');
    });

    quickExportJson.addEventListener('click', () => {
        quickActionsMenu.style.display = 'none';
        exportAllHistory('json');
    });

    quickExportCsv.addEventListener('click', () => {
        quickActionsMenu.style.display = 'none';
        exportAllHistory('csv');
    });

    quickClear.addEventListener('click', () => {
        quickActionsMenu.style.display = 'none';
        if (confirm('Are you sure you want to clear all history?')) {
            clearAllHistory();
        }
    });

    bookmarkBtn.addEventListener('click', () => {
        const summary = document.getElementById('summary').value;
        if (!summary) {
            showToast('No summary to bookmark', 'error');
            return;
        }
        bookmarkSummary(summary);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const summarizeBtn = document.getElementById('summarize-btn');
            if (!summarizeBtn.disabled) {
                handleSummarize();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
            e.preventDefault();
            const isVisible = quickActionsMenu.style.display !== 'none';
            quickActionsMenu.style.display = isVisible ? 'none' : 'block';
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            const summary = document.getElementById('summary').value;
            if (summary) {
                bookmarkSummary(summary);
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
            e.preventDefault();
            const tagField = document.getElementById('summary-tags');
            if (tagField) tagField.focus();
        }
    });

    copyBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;
        triggerHaptic(copyBtn);
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="material-icons" style="vertical-align: middle; margin-right: 8px;">check</i>Copied!';
            setTimeout(() => copyBtn.innerHTML = originalText, 2000);
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (!textarea.value) return;
        const blob = new Blob([textarea.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    pdfBtn.addEventListener('click', async () => {
        const text = textarea.value;
        if (!text) return;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const sourceUrl = tab?.url || 'N/A';
        const sourceTitle = tab?.title || 'Web Content';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('Summarize AI Analytics', 20, 28);

        // Metadata
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);

        doc.setTextColor(99, 102, 241);
        doc.text(`Source: ${sourceTitle}`, 20, 55);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.textWithLink(sourceUrl.substring(0, 100) + (sourceUrl.length > 100 ? '...' : ''), 20, 60, { url: sourceUrl });

        // Content
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, 20, 75);

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount} | Summarize AI Extension`, 20, 285);
        }

        doc.save(`summary-${Date.now()}.pdf`);
        showToast('PDF Report generated');
    });

    shareBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text) return;

        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Summarize AI Recap</title><style>body{font-family:sans-serif;background:#f8fafc;padding:40px;color:#0f172a;line-height:1.6;} .card{background:white;padding:40px;border-radius:24px;box-shadow:0 10px 40px rgba(0,0,0,0.05);max-width:800px;margin:0 auto;} h1{color:#6366f1;margin-top:0;} pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><div class="card"><h1>Recap</h1><pre>${text}</pre></div></body></html>`;
        const shareUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            const original = shareBtn.innerHTML;
            shareBtn.innerHTML = '<i class="material-icons-round">link</i> Link Copied';
            setTimeout(() => shareBtn.innerHTML = original, 2000);
        });
    });

    const scrollTopBtn = document.getElementById('scroll-top-btn');
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.style.display = 'flex';
        } else {
            scrollTopBtn.style.display = 'none';
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
};

const updateStepStatus = (stepNumber, status) => {
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        if (parseInt(step.dataset.step) === stepNumber) {
            step.classList.remove('active', 'completed');
            if (status === 'active') step.classList.add('active');
            if (status === 'completed') step.classList.add('completed');
        }
    });
};

const handleSummarize = async (isEli5 = false) => {
    const summarizeBtn = document.getElementById('summarize-btn');
    const textarea = document.getElementById('summary');
    const tagInput = document.getElementById('summary-tags');
    const readingTime = document.getElementById('reading-time');
    const linksList = document.getElementById('links-list');
    const linksSection = document.getElementById('links-section');
    const skeleton = document.getElementById('skeleton-loader');
    const statusSteps = document.getElementById('status-steps');
    const errorContainer = document.getElementById('error-container');

    // read auto-tag setting early
    let autoTagEnabled = true;
    try {
        const cfg = await chrome.storage.sync.get(['autoTag']);
        autoTagEnabled = cfg.autoTag !== false;
    } catch (e) {
        // ignore, default to true
    }

    summarizeBtn.innerText = 'Summarizing...';
    summarizeBtn.disabled = true;
    textarea.style.display = 'none';
    statusSteps.style.display = 'flex';
    errorContainer.style.display = 'none';

    // Reset steps
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'completed'));

    try {
        updateStepStatus(1, 'active');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const pageData = await getPageData(tab.id);

        if (!pageData || !pageData.text || pageData.text.length < 50) {
            throw new Error('Not enough text found on this page.');
        }
        updateStepStatus(1, 'completed');

        // Calculate reading time
        const wordCount = pageData.text.trim().split(/\s+/).length;
        const minutes = Math.ceil(wordCount / 200);
        readingTime.textContent = `Estimated reading time: ${minutes} min${minutes !== 1 ? 's' : ''}`;
        readingTime.style.display = 'block';

        updateStepStatus(2, 'active');
        const summary = await getSummary(pageData.text, pageData.links, isEli5);
        updateStepStatus(2, 'completed');
        updateStats(minutes);

        updateStepStatus(3, 'active');

        // Extract metadata if present
        let category = 'General';
        let sentiment = 'Neutral';
        let keywords = 'N/A';
        let displaySummary = summary;

        const metadataMatch = summary.match(/\[METADATA\]:\s*CATEGORY:\s*([^,]+),\s*SENTIMENT:\s*([^,]+),\s*KEYWORDS:\s*([^\n]+)/i);
        if (metadataMatch) {
            category = metadataMatch[1].trim();
            sentiment = metadataMatch[2].trim();
            keywords = metadataMatch[3].trim();
            displaySummary = summary.replace(/\[METADATA\]:[^\n]+\n?/, '').trim();
        } else {
            // Fallback for older metadata format if any
            const oldMatch = summary.match(/\[METADATA\]:\s*CATEGORY:\s*([^,]+),\s*SENTIMENT:\s*([^\n]+)/i);
            if (oldMatch) {
                category = oldMatch[1].trim();
                sentiment = oldMatch[2].trim();
                displaySummary = summary.replace(/\[METADATA\]:[^\n]+\n?/, '').trim();
            }
        }

        // auto-tags from keywords metadata if enabled
        let autoTags = [];
        if (autoTagEnabled && keywords && keywords !== 'N/A') {
            autoTags = keywords.split(',').map(t => t.trim()).filter(Boolean);
        }

        document.getElementById('content-category').textContent = category;
        document.getElementById('content-sentiment').textContent = sentiment;
        document.getElementById('content-keywords').textContent = keywords;
        document.getElementById('insights-bar').style.display = 'flex';

        const cleanText = displaySummary.replace(/<[^>]*>/g, '');
        textarea.value = cleanText;
        currentSummary = displaySummary;

        // Update counts
        const charCount = cleanText.length;
        const summaryWordCount = cleanText.trim().split(/\s+/).filter(w => w.length > 0).length;
        const sumMinutes = Math.max(1, Math.ceil(summaryWordCount / 200));
        document.getElementById('char-count').textContent = `${charCount} characters`;
        document.getElementById('word-count').textContent = `${summaryWordCount} words`;
        document.getElementById('sum-reading-time').textContent = `~${sumMinutes} min read`;
        document.getElementById('count-container').style.display = 'flex';
        document.getElementById('regenerate-btn').style.display = 'flex';
        document.getElementById('eli5-btn').style.display = 'flex';
        document.getElementById('chat-container').style.display = 'flex';
        document.getElementById('tts-controls').style.display = 'flex';
        chatHistory = []; // Reset chat history for new summary
        document.getElementById('chat-messages').innerHTML = ''; // Clear old messages

        const now = new Date().toLocaleTimeString();
        document.getElementById('last-updated-time').textContent = `Summarized at ${now}`;
        document.getElementById('last-updated-container').style.display = 'flex';

        // compute tags from input and metadata keywords (later)
        let userTags = [];
        if (tagInput && tagInput.value.trim()) {
            userTags = tagInput.value.split(',').map(t => t.trim()).filter(Boolean);
        }

        // Brief delay for visual feedback
        await new Promise(r => setTimeout(r, 600));
        updateStepStatus(3, 'completed');
        await new Promise(r => setTimeout(r, 400));

        // Auto-copy if enabled
        chrome.storage.sync.get(['autoCopy'], (result) => {
            if (result.autoCopy) {
                navigator.clipboard.writeText(summary.replace(/<[^>]*>/g, '')).then(() => {
                    showToast('Copied to clipboard automatically!');
                });
            }
        });

        // Save to local storage
        const allTags = [...new Set([...(userTags || []), ...(autoTags || [])])];
        const historyItem = {
            id: Date.now(),
            url: tab.url,
            title: tab.title,
            summary: summary,
            tags: allTags,
            model: settings.aiModel || DEFAULT_MODEL,
            sentiment: sentiment,
            date: new Date().toISOString(),
            readingTime: minutes
        };
        if (tagInput) tagInput.value = ''; // clear tag field after saving

        chrome.storage.local.get(['summaries'], (result) => {
            const summaries = result.summaries || [];
            summaries.unshift(historyItem);
            chrome.storage.local.set({ summaries: summaries.slice(0, 50) });
        });

        // Display links
        linksList.innerHTML = '';
        if (pageData.links?.length > 0) {
            pageData.links.forEach(link => {
                const a = document.createElement('a');
                a.className = 'link-card';
                a.href = link.href;
                a.target = '_blank';

                const titleSpan = document.createElement('span');
                titleSpan.className = 'link-title';
                titleSpan.textContent = link.text || 'Untitled Link';

                const hostSpan = document.createElement('span');
                hostSpan.className = 'link-host';

                const icon = document.createElement('i');
                icon.className = 'material-icons-round';
                icon.style.fontSize = '12px';
                icon.textContent = 'link';

                hostSpan.appendChild(icon);
                hostSpan.appendChild(document.createTextNode(` ${link.hostname || 'link'}`));

                a.appendChild(titleSpan);
                a.appendChild(hostSpan);
                linksList.appendChild(a);
            });
            linksSection.style.display = 'block';
        } else {
            linksSection.style.display = 'none';
        }


    } catch (error) {
        Logger.error('Summary error:', error);
        document.getElementById('error-message').textContent = error.message || 'An error occurred during summarization.';
        document.getElementById('error-container').style.display = 'flex';
        document.getElementById('status-steps').style.display = 'none';
        showToast(error.message || 'An error occurred during summarization.', 'error');
    } finally {
        summarizeBtn.innerText = 'Generate Summary';
        summarizeBtn.disabled = false;
        textarea.style.display = 'block';
        statusSteps.style.display = 'none';
        skeleton.style.display = 'none';
    }
};

const getPageData = (tabId) => {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_DATA' }, (response) => {
            if (!chrome.runtime.lastError && response) {
                return resolve(response);
            }
            chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    const text = document.body.innerText || '';
                    const seen = new Set();
                    const links = Array.from(document.querySelectorAll('a[href]'))
                        .map(a => ({
                            text: a.textContent.trim(),
                            href: a.href,
                            hostname: new URL(a.href).hostname
                        }))
                        .filter(l => {
                            const isNew = !seen.has(l.href);
                            const isWeb = l.href.startsWith('http');
                            const hasText = l.text.length > 2;
                            if (isNew && isWeb && hasText) {
                                seen.add(l.href);
                                return true;
                            }
                            return false;
                        })
                        .slice(0, 20);
                    return { text: text.trim(), links, title: document.title };
                }
            }, (results) => {
                resolve(results?.[0]?.result || { text: '', links: [], title: '' });
            });
        });
    });
};


const getSummary = async (text, links = [], isEli5 = false) => {
    const settings = await chrome.storage.sync.get(['summaryLength', 'summaryTone', 'outputLanguage', 'aiModel', 'apiKey']);
    const model = settings.aiModel || DEFAULT_MODEL;
    const length = settings.summaryLength || 'medium';
    const tone = settings.summaryTone || 'professional';
    const language = settings.outputLanguage || 'en';
    const apiKey = settings.apiKey;

    if (!apiKey) {
        throw new Error('Please set your API Key in the settings page.');
    }

    let lengthInstruction = '';
    switch (length) {
        case 'short': lengthInstruction = 'Provide a very concise summary (3-5 sentences).'; break;
        case 'long': lengthInstruction = 'Provide a detailed, in-depth summary with multiple sections.'; break;
        default: lengthInstruction = 'Provide a well-balanced summary of the main points.';
    }

    if (isEli5) {
        toneInstruction = 'Explain this like I am 5 years old. Use very simple language, relatable analogies, and avoid any technical jargon.';
    } else {
        switch (tone) {
            case 'casual': toneInstruction = 'Use a casual, friendly, and conversational tone.'; break;
            case 'creative': toneInstruction = 'Use a creative, engaging, and enthusiastic tone.'; break;
            case 'minimalist': toneInstruction = 'Be extremely brief and use ultra-minimalist language.'; break;
            default: toneInstruction = 'Use a professional, academic, and informative tone.';
        }
    }

    const payload = {
        model,
        messages: [
            {
                role: 'system',
                content: `You are an expert content analyst. Your task is to summarize the provided text in ${language}. 
                Follow this structure:
                [METADATA]: CATEGORY: <Single Word Category>, SENTIMENT: <Single Word Sentiment>, KEYWORDS: <3-5 comma separated keywords>
                1. **💡 Key Takeaways**: List 3-5 most important points as bullet points with emojis.
                2. **📝 Summary**: ${lengthInstruction} ${toneInstruction}
                3. **🔗 References**: If links are provided, mention the most relevant ones naturally.
                
                Use Markdown for formatting. Avoid fluff.`
            },
            {
                role: 'user',
                content: `Please analyze and summarize the following content:\n\n${text}${links.length > 0 ? '\n\nSource links:\n' + links.slice(0, 5).map(l => `- ${l.text}: ${l.href}`).join('\n') : ''}`
            }
        ],
        temperature: 0.7
    };

    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'AI API request failed');
    }
    const data = await response.json();
    return data.choices[0].message.content;
};


const loadHistory = (searchQuery = '') => {
    chrome.storage.local.get(['summaries'], (result) => {
        const historyList = document.getElementById('history-list');
        const badge = document.getElementById('history-badge');
        let summaries = result.summaries || [];

        if (badge) badge.textContent = summaries.length;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            summaries = summaries.filter(item =>
                (item.title || '').toLowerCase().includes(query) ||
                (item.summary || '').toLowerCase().includes(query) ||
                (item.tags || []).some(t => t.toLowerCase().includes(query))
            );
        }

        if (showBookmarksOnly) {
            summaries = summaries.filter(item => item.bookmarked);
        }

        historyList.innerHTML = summaries.length === 0 ?
            `<div class="empty-state">
                <i class="material-icons-round">${showBookmarksOnly ? 'bookmark_border' : 'history_toggle_off'}</i>
                <p>${showBookmarksOnly ? 'No bookmarked summaries yet.' : (searchQuery ? 'No summaries match your search.' : 'Your summary history will appear here.')}</p>
                ${(searchQuery || showBookmarksOnly) ? '' : '<p class="sub-text">Generate your first summary to get started!</p>'}
            </div>` : '';

        summaries.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.dataset.id = item.id;

            const header = document.createElement('div');
            header.className = 'history-header';

            const sourceGroup = document.createElement('div');
            sourceGroup.className = 'history-source-group';

            const favicon = document.createElement('img');
            favicon.className = 'history-favicon';
            favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32`;
            favicon.alt = '';

            const title = document.createElement('h4');
            title.textContent = item.title || 'Untitled';

            const modelBadge = document.createElement('span');
            modelBadge.className = 'model-badge';
            modelBadge.textContent = item.model || DEFAULT_MODEL;

            sourceGroup.appendChild(favicon);
            sourceGroup.appendChild(title);
            sourceGroup.appendChild(modelBadge);

            const date = document.createElement('span');
            date.className = 'history-date';
            date.textContent = getRelativeTime(item.date);

            header.appendChild(sourceGroup);

            const metaGroup = document.createElement('div');
            metaGroup.className = 'history-meta-group';

            if (item.sentiment) {
                const sentimentIcon = document.createElement('i');
                sentimentIcon.className = 'material-icons-round sentiment-dot';
                sentimentIcon.style.fontSize = '12px';

                const s = item.sentiment.toLowerCase();
                if (s.includes('pos')) { sentimentIcon.textContent = 'sentiment_very_satisfied'; sentimentIcon.classList.add('pos'); }
                else if (s.includes('neg')) { sentimentIcon.textContent = 'sentiment_very_dissatisfied'; sentimentIcon.classList.add('neg'); }
                else { sentimentIcon.textContent = 'sentiment_neutral'; sentimentIcon.classList.add('neu'); }

                metaGroup.appendChild(sentimentIcon);
            }

            metaGroup.appendChild(date);
            header.appendChild(metaGroup);

            const preview = document.createElement('p');
            preview.className = 'history-preview';
            preview.textContent = (item.summary || '').substring(0, 80).replace(/<[^>]*>/g, '') + '...';

            // tags display
            if (item.tags && item.tags.length) {
                const tagContainer = document.createElement('div');
                tagContainer.className = 'history-tags';
                item.tags.forEach(t => {
                    const span = document.createElement('span');
                    span.className = 'tag-chip';
                    span.textContent = t;
                    span.dataset.tag = t;
                    tagContainer.appendChild(span);
                });
                div.appendChild(tagContainer);
            }

            const actions = document.createElement('div');
            actions.className = 'history-actions';

            const viewBtn = document.createElement('button');
            viewBtn.className = 'view-btn';
            viewBtn.dataset.id = item.id;
            viewBtn.textContent = 'View';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.dataset.id = item.id;
            deleteBtn.textContent = 'Delete';

            const copyHistoryBtn = document.createElement('button');
            copyHistoryBtn.className = 'copy-history-btn';
            copyHistoryBtn.dataset.id = item.id;
            copyHistoryBtn.innerHTML = '<i class="material-icons-round" style="font-size: 14px;">content_copy</i>';
            copyHistoryBtn.title = 'Copy Summary';

            const copyUrlBtn = document.createElement('button');
            copyUrlBtn.className = 'copy-url-btn';
            copyUrlBtn.dataset.id = item.id;
            copyUrlBtn.innerHTML = '<i class="material-icons-round" style="font-size: 14px;">link</i>';
            copyUrlBtn.title = 'Copy Source URL';

            const bookmarkBtn = document.createElement('button');
            bookmarkBtn.className = `bookmark-btn ${item.bookmarked ? 'active' : ''}`;
            bookmarkBtn.dataset.id = item.id;
            bookmarkBtn.innerHTML = `<i class="material-icons-round" style="font-size: 14px;">${item.bookmarked ? 'bookmark' : 'bookmark_border'}</i>`;
            bookmarkBtn.title = item.bookmarked ? 'Remove bookmark' : 'Bookmark';

            actions.appendChild(viewBtn);
            actions.appendChild(bookmarkBtn);
            actions.appendChild(copyHistoryBtn);
            actions.appendChild(copyUrlBtn);
            actions.appendChild(deleteBtn);

            div.appendChild(header);
            div.appendChild(preview);
            div.appendChild(actions);
            historyList.appendChild(div);
        });

        // Event delegation for history actions
        historyList.onclick = (e) => {
            // tag click filtering / removal
            if (e.target.classList.contains('tag-chip')) {
                const tag = e.target.dataset.tag || e.target.textContent;
                // double click to remove
                if (e.detail === 2) {
                    const itemDiv = e.target.closest('.history-item');
                    const id = parseInt(itemDiv.dataset.id);
                    chrome.storage.local.get(['summaries'], (res) => {
                        const summaries = res.summaries || [];
                        const idx = summaries.findIndex(s => s.id === id);
                        if (idx !== -1) {
                            summaries[idx].tags = (summaries[idx].tags || []).filter(t => t !== tag);
                            chrome.storage.local.set({ summaries }, () => {
                                loadHistory(historySearch.value);
                                showToast('Tag removed');
                            });
                        }
                    });
                    return;
                }

                historySearch.value = tag;
                loadHistory(tag);
                clearSearchBtn.style.display = 'flex';
                return;
            }

            const btn = e.target.closest('button');
            if (!btn) return;

            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains('view-btn')) {
                const item = summaries.find(s => s.id === id);
                if (item) {
                    document.getElementById('summary').value = item.summary.replace(/<[^>]*>/g, '');
                    document.getElementById('summarize-tab').click();
                }
            } else if (btn.classList.contains('copy-history-btn')) {
                const item = summaries.find(s => s.id === id);
                if (item) {
                    triggerHaptic(btn);
                    navigator.clipboard.writeText(item.summary.replace(/<[^>]*>/g, '')).then(() => {
                        showToast('Copied history summary!');
                        const originalHtml = btn.innerHTML;
                        btn.innerHTML = '<i class="material-icons-round" style="font-size: 14px; color: var(--success);">check</i>';
                        setTimeout(() => btn.innerHTML = originalHtml, 2000);
                    });
                }
            } else if (btn.classList.contains('copy-url-btn')) {
                const item = summaries.find(s => s.id === id);
                if (item) {
                    navigator.clipboard.writeText(item.url).then(() => {
                        showToast('Source URL copied!');
                    });
                }
            } else if (btn.classList.contains('delete-btn')) {
                const updated = summaries.filter(s => s.id !== id);
                chrome.storage.local.set({ summaries: updated }, loadHistory);
            } else if (btn.classList.contains('bookmark-btn')) {
                const updated = summaries.map(s => {
                    if (s.id === id) {
                        return { ...s, bookmarked: !s.bookmarked };
                    }
                    return s;
                });
                chrome.storage.local.set({ summaries: updated }, () => loadHistory(document.getElementById('history-search').value));
            }
        };
    });
};

const appendMessage = (role, text) => {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-bubble ${role}`;

    if (role === 'ai') {
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        msgDiv.appendChild(textSpan);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'chat-copy-btn';
        copyBtn.innerHTML = '<i class="material-icons-round">content_copy</i>';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Answer copied!');
            });
        };
        msgDiv.appendChild(copyBtn);
    } else {
        msgDiv.textContent = text;
    }

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const showChatLoading = (show) => {
    const chatMessages = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('send-chat-btn');
    let loading = document.getElementById('chat-loading-indicator');

    if (show) {
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'chat-loading-indicator';
            loading.className = 'chat-loading';
            loading.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
            chatMessages.appendChild(loading);
        }
        sendBtn.disabled = true;
        sendBtn.querySelector('i').textContent = 'sync';
        sendBtn.querySelector('i').classList.add('rotating');
    } else {
        if (loading) loading.remove();
        sendBtn.disabled = false;
        sendBtn.querySelector('i').textContent = 'send';
        sendBtn.querySelector('i').classList.remove('rotating');
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const handleChat = async () => {
    const chatInput = document.getElementById('chat-input');
    const question = chatInput.value.trim();
    if (!question || !currentSummary) return;

    appendMessage('user', question);
    chatInput.value = '';
    showChatLoading(true);

    try {
        const settings = await chrome.storage.sync.get(['apiKey', 'aiModel']);
        const apiKey = settings.apiKey;
        const model = settings.aiModel || DEFAULT_MODEL;

        if (!apiKey) throw new Error('API Key missing');

        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant discussing the following web content summary: "${currentSummary}". 
                Answer the user's questions based on this summary and general knowledge. Keep answers concise.`
            },
            ...chatHistory,
            { role: 'user', content: question }
        ];

        const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages, temperature: 0.7 })
        });

        if (!response.ok) throw new Error('Chat failed');
        const data = await response.json();
        const answer = data.choices[0].message.content;

        showChatLoading(false);
        appendMessage('ai', answer);

        chatHistory.push({ role: 'user', content: question });
        chatHistory.push({ role: 'assistant', content: answer });

    } catch (error) {
        showChatLoading(false);
        showToast(error.message, 'error');
    }
};

const populateVoices = () => {
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect) return;

    const voices = synth.getVoices();
    voiceSelect.innerHTML = '';

    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        if (voice.default) option.selected = true;
        voiceSelect.appendChild(option);
    });
};

const handleToggleSpeech = () => {
    const text = document.getElementById('summary').value;
    if (!text) return;

    if (synth.speaking && !synth.paused) {
        handlePauseSpeech();
        return;
    }

    if (synth.paused) {
        synth.resume();
        updateTtsUI(true);
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoiceName = document.getElementById('voice-select').value;
    const voices = synth.getVoices();
    utterance.voice = voices.find(v => v.name === selectedVoiceName);

    utterance.onend = () => {
        updateTtsUI(false);
        isReading = false;
    };

    utterance.onerror = () => {
        updateTtsUI(false);
        isReading = false;
    };

    synth.speak(utterance);
    updateTtsUI(true);
    isReading = true;
};

const handlePauseSpeech = () => {
    if (synth.speaking && !synth.paused) {
        synth.pause();
        updateTtsUI(false, true);
    }
};

const handleStopSpeech = () => {
    synth.cancel();
    updateTtsUI(false);
    isReading = false;
};

const updateTtsUI = (playing, paused = false) => {
    const readAloudBtn = document.getElementById('read-aloud-btn');
    const pauseTtsBtn = document.getElementById('pause-tts-btn');
    const stopTtsBtn = document.getElementById('stop-tts-btn');
    const icon = readAloudBtn.querySelector('i');

    if (playing) {
        icon.textContent = 'pause';
        readAloudBtn.classList.add('playing');
        pauseTtsBtn.style.display = 'none';
        stopTtsBtn.style.display = 'flex';
    } else if (paused) {
        icon.textContent = 'play_arrow';
        readAloudBtn.classList.remove('playing');
        stopTtsBtn.style.display = 'flex';
    } else {
        icon.textContent = 'volume_up';
        readAloudBtn.classList.remove('playing');
        pauseTtsBtn.style.display = 'none';
        stopTtsBtn.style.display = 'none';
    }
};



