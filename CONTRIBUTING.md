# Contributing to MOWRAM Weather Scraper

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run development server: `npm run dev`

## Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint:fix` before committing
- Run `npm run format` to format code
- Follow existing code patterns and structure

## Commit Guidelines

- Use clear, descriptive commit messages
- Reference issues in commits when applicable
- Keep commits focused and atomic

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Run linting and formatting
5. Submit PR with clear description
6. Wait for review

## Project Structure Guidelines

- Place new services in `src/services/`
- Place new API routes in `src/api/`
- Place utilities in `src/utils/`
- Place constants in `src/constants/`
- Add tests in `tests/` directory

## Questions?

Open an issue for discussion before making major changes.
