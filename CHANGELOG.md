# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-03-06

### Added
- ESLint configuration for code quality
- Centralized constants module (`src/constants.js`)
- Shared utilities module (`src/utils.js`)
- GitHub Actions workflow for automated linting
- Package.json with lint scripts
- Simple validation script for extension files
- Development and contribution guidelines in README

### Changed
- Refactored popup.js to use ES modules and async/await
- Modernized options.js with promise-based storage access
- Wrapped script.js in IIFE for better scoping
- Improved code organization and documentation
- Updated manifest description for dev build

### Fixed
- Consistent use of storage helpers across files
- Removed duplicate utility functions

## [1.3.0] - 2026-02-15

### Added
- AI contextual chat feature
- Text-to-speech functionality
- Advanced export options (JSON, CSV, Markdown)
- Reading mode toggle
- Bookmark summaries feature

### Changed
- Enhanced UI with glassmorphism design
- Improved error handling and user feedback

## [1.2.0] - 2026-01-10

### Added
- Smart content insights (sentiment, keywords)
- ELI5 summarization mode
- Keyboard shortcuts (Ctrl+Enter)

### Changed
- Updated AI models and API integration

## [1.1.0] - 2025-12-01

### Added
- History management with search and filtering
- PDF export functionality
- Link extraction and display

### Changed
- Improved selection overlay UI

## [1.0.0] - 2025-10-15

- Initial release with core summarization features