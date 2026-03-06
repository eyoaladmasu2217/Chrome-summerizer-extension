# ⚡ Summarize AI

[![Version](https://img.shields.io/badge/version-1.0-blue.svg)](https://github.com/eyoaladmasu2217/Chrome-summerizer-extension)
[![Manifest](https://img.shields.io/badge/manifest-MV3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Summarize AI** is an advanced browser extension that transforms long-form web content into concise, actionable intelligence. Built with a focus on productivity and premium aesthetics, it leverages state-of-the-art LLMs to provide structured summaries and intelligent link discovery.

---

## 💎 Core Capabilities

### 📄 Intelligent Web Summarization
Transform any webpage into a structured report with a single click. Our AI identifies:
- **💡 Key Takeaways**: 3-5 high-impact bullet points with contextual emojis.
- **📝 Core Summary**: A balanced overview tailored to your preferred length.
- **🔗 Contextual References**: Natural integration of relevant sources found on the page.

### 🖱️ Smart Selection Overlay
Highlight any snippet (>50 characters) to trigger the **Summarize Selection** engine. A beautifully animated glassmorphism overlay provides instant insights without leaving your reading flow.

### 🔗 Deep Link Discovery
Automatically crawls the active DOM to extract and categorize unique web links.
- **Unique Filtering**: Avoids duplicate and "junk" links (javascript:void(0), etc.).
- **Card-based UI**: Displays links with their respective hostnames and metadata.
- **Top 20 Extraction**: Prioritizes key navigational and reference content.

### 🌗 Smart Theme Toggle
Seamlessly switch between Dark and Light modes via a dedicated header toggle. Your preference is persisted across sessions for a consistent reading experience.

### ⏱️ Real-time Progress Tracking
A brand new multi-step status indicator provides transparency during the summarization process, tracking page reading, AI analysis, and formatting steps.

### 🧹 Advanced History & Management
- **Persistence**: Remembers up to 50 previous summaries via `chrome.storage.local`.
- **Searchable History**: Review title, date, and content of past sessions.
- **Bulk Cleanup**: New "Clear All" option to securely wipe your history with one click.
- **Quick Actions**: Individual "Copy" and "Delete" buttons for every history entry.

### 📄 Premium PDF Reports
Generated reports now include:
- **Source Attribution**: Clickable links back to the original article.
- **Metadata**: Date, time, and page title.
- **Pagination**: Professional multi-page support with automatic footer numbering.

### 💬 AI Contextual Chat
Engage in a follow-up conversation with the AI about the summary. 
- **Chat Persistence**: Remembers context within the session.
- **Export History**: Download your entire AI conversation as a Markdown file.
- **Quick Copy**: One-click to copy the whole chat for your notes.
- **Auto-Navigation**: "Scroll to bottom" helper for long conversations.

### 🎙️ AI Voice Reader
Listen to your summaries on the go. High-quality text-to-speech engine with customizable voices and real-time playback controls (Play/Pause/Stop).

### 🔍 Smart Content Insights
Instant categorization (e.g., News, Educational, Tech), sentiment analysis (Positive, Neutral, Negative), and **Keyword Extraction** for every page you summarize.

### 👶 ELI5 (Explain Like I'm 5)
A specialized summarization mode that simplifies complex topics into child-friendly language with relatable analogies.

### ⌨️ Keyboard Mastery
Power users can now use **Ctrl + Enter** to quickly trigger a new summary from the main interface.

### 🛡️ Professional Error Handling
Robust retry mechanism and inline API Key detection to ensure a smooth, uninterrupted discovery flow.

---

## 🎨 Premium Experience

- **Glassmorphism Design**: Modern UI utilizing background blurs, subtle borders, and harmonious gradients.
- **Micro-Animations**: Smooth transitions, shimmer loading states, and bounce-in success indicators.
- **Adaptive Layout**: Optimized for varying browser window sizes and side panels.
- **Intelligent Feedback**: Real-time status steps and haptic-inspired visual cues.

---

## ⚙️ Advanced Configuration

Tailor the extension to your specific needs via the **Options Dashboard**:
- **AI Engines**: Switch between `Native Summarizer`, `GPT-4o`, `Claude 3.5 Sonnet`, and more.
- **Localization**: Summarize and translate content into 8 languages (EN, ES, FR, DE, IT, PT, JA, ZH).
- **Personalization**: Adjust preferred summary depth (Short, Balanced, Long).

---

## 🛠️ Technical Architecture

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Extension Engine** | Chrome MV3 | Security, performance, and API consistency. |
| **Logic Layer** | Vanilla JavaScript (ES6+) | Tab communication, DOM crawling, and API orchestration. |
| **UI Framework** | HTML5 / CSS3 (Grid & Flex) | Responsive layouts and premium glassmorphism styling. |
| **AI Integration** | AIML API | Interface for GPT-4 and Claude model families. |
| **Export Engine** | jsPDF Library | Dynamic PDF generation with custom branding. |
| **Storage** | Chrome Storage API | Sync settings across devices & Local history persistence. |

---

## 🧱 Development & Contribution

We follow consistent code style and quality checks throughout the repository.  
- **ESLint** is configured via `.eslintrc.json`; simply run `npx eslint "**/*.js"` to lint JavaScript files.  
- A GitHub Action (`.github/workflows/lint.yml`) automatically lints new commits on `main`.  
- Please open pull requests if you'd like to propose changes; small, atomic commits make the review process easier.  

## 🚀 Quick Setup

1. **Clone the repository**: `git clone https://github.com/eyoaladmasu2217/Chrome-summerizer-extension.git`
2. **Developer Mode**: Go to `chrome://extensions/` and toggle **Developer mode**.
3. **Load**: Click **Load unpacked** and select the project folder.
4. **Authenticate**: Ensure your API key is correctly configured in `popup.js` and `script.js`.

---

## 📤 Export & Share

- **PDF Export**: Generates professional branded reports with automatic line-wrapping and metadata.
- **HTML Sharing**: Create non-expiring `data:URI` links to share summaries instantly in any browser.
- **Text/Clip**: Quick-copy or download options for integration into notes apps (Notion, Obsidian, etc.).

---

## 📄 MIT License

Copyright (c) 2026 Summarize AI Team. Built with passion for the modern web.
