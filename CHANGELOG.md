# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-11-19

### 🎉 Major Restructure

Complete professional restructure of the project following Node.js best practices.

### Added

- **Modular Architecture**
  - `src/api/` - API route handlers
  - `src/config/` - Configuration management
  - `src/constants/` - Shared constants
  - `src/services/` - Business logic layer
  - `src/utils/` - Utility functions
  - `public/` - Static files directory
  - `scripts/` - CLI scripts
  - `tests/` - Test directory structure

- **Development Tooling**
  - ESLint for code linting
  - Prettier for code formatting
  - Nodemon for development auto-reload
  - Professional npm scripts

- **Documentation**
  - Comprehensive README.md
  - API documentation
  - Contributing guidelines (CONTRIBUTING.md)
  - Migration guide (MIGRATION.md)
  - Architecture overview

- **Configuration**
  - Centralized config management (`src/config/index.js`)
  - Configuration validation on startup
  - Better environment variable handling
  - `.env.example` template

- **Utilities**
  - Structured logging utility
  - Date helper functions
  - Better error handling

- **API Endpoints**
  - `GET /api/health` - Health check endpoint
  - `GET /api/provinces` - Get all provinces

### Changed

- **File Organization**
  - `server.js` → `src/server.js` (refactored)
  - `scraper.js` → `src/services/weatherScraper.js` (refactored)
  - `js.js` → `scripts/scrape.js` (renamed and refactored)
  - `index.html` → `public/index.html` (moved)
  - `js.js` (client) → `public/client.js` (renamed and moved)

- **npm Scripts**
  - `start` now runs `src/server.js`
  - `dev` now uses nodemon with auto-reload
  - `scrape` now runs from `scripts/`
  - Added `lint`, `lint:fix`, `format`, `format:check`

- **Dependencies**
  - Updated package.json structure
  - Removed unused `express` dependency
  - Added dev dependencies: eslint, prettier, nodemon

- **Code Quality**
  - Better separation of concerns
  - Improved error handling
  - Consistent code style
  - Better logging throughout

### Fixed

- Improved error messages
- Better duplicate detection
- More robust database connections
- Graceful server shutdown handling

### Removed

- Monolithic file structure
- Express.js dependency (using native http module)
- Redundant code

## [1.0.0] - Previous

### Initial Release

- Basic weather scraping functionality
- Supabase integration
- Simple server setup
- Basic API endpoints

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
