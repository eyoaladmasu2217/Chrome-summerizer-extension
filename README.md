# Chrome Text Summarizer Extension

A powerful Chrome extension that leverages AI to provide intelligent summaries of web content. Extract key insights from entire webpages or selected text passages with a clean interface.

## Features

- **Full Page Summarization**: Click the extension icon to summarize the entire content of the current active tab
- **Selective Text Summarization**: Highlight any text (200-7000 characters) on a webpage to get a focused summary
- **Link Extraction**: Automatically identifies and includes all hyperlinks from the page in the summary
- **AI-Powered**: Uses advanced natural language processing via AIML API for high-quality summaries
- **Modern UI**: Clean, professional interface
- **HTML Formatting**: Summaries include proper formatting with headings, lists, and structured content

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `Chrome-summerizer-extension` folder
5. The extension will appear in your Chrome toolbar

## Usage

### Summarizing an Entire Page
1. Navigate to any webpage you want to summarize
2. Click the Text Summarizer extension icon in your Chrome toolbar
3. Click the "Summarize" button in the popup
4. The AI-generated summary will appear in the text area, including all links found on the page

### Summarizing Selected Text
1. On any webpage, highlight a portion of text (between 200-7000 characters)
2. An overlay will automatically appear with a "Summarize" button
3. Click the button to get a summary of just the selected text
4. The summary displays in a clean overlay on the page

## How It Works

The extension uses the AIML API to process text content through advanced AI models. When summarizing:

- **Page Content**: Extracts all readable text from `document.body`
- **Links**: Collects all anchor tags with valid HTTP/HTTPS URLs
- **AI Processing**: Sends content to AIML API with structured prompts for comprehensive summaries
- **Output**: Returns HTML-formatted summaries with proper headings, paragraphs, and link sections

## Requirements

- Google Chrome browser
- Internet connection for API calls
- Valid AIML API key (configured in `popup.js` and `script.js`)

## File Structure

```
Chrome-summerizer-extension/
├── manifest.json      # Chrome extension manifest
├── popup.html         # Extension popup interface
├── popup.js           # Popup functionality and API integration
├── script.js          # Content script for text selection overlay
├── styles.css         # styling
└── README.md          # This file
```

## Privacy

- All text processing occurs locally in your browser
- Content is sent to AIML API for summarization only
- No personal data or browsing history is stored
- API calls are made securely over HTTPS

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

