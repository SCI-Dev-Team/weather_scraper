# Migration Guide - v1.0 to v2.0

This document helps you migrate from the old structure to the new professional structure.

## What Changed?

### Directory Structure

**Old Structure:**

```
weather_scraper/
├── server.js         # Monolithic server file
├── scraper.js        # Scraper logic mixed with DB
├── js.js             # CLI script
├── index.html        # HTML file in root
└── package.json
```

**New Structure:**

```
weather_scraper/
├── src/
│   ├── api/          # API routes separated
│   ├── config/       # Configuration management
│   ├── constants/    # Constants and mappings
│   ├── services/     # Business logic
│   ├── utils/        # Utility functions
│   └── server.js     # Clean server entry point
├── public/           # Static files
├── scripts/          # CLI scripts
└── tests/            # Test files
```

### File Mappings

| Old File     | New Location                     | Notes                        |
| ------------ | -------------------------------- | ---------------------------- |
| `server.js`  | `src/server.js`                  | Refactored, cleaner          |
| `scraper.js` | `src/services/weatherScraper.js` | Better separation            |
| `js.js`      | `scripts/scrape.js`              | More intuitive name          |
| `index.html` | `public/index.html`              | Proper static files location |
| N/A          | `src/config/`                    | New: Configuration layer     |
| N/A          | `src/utils/`                     | New: Utility functions       |
| N/A          | `src/constants/`                 | New: Shared constants        |

### Breaking Changes

1. **Entry Point Changed**:
   - Old: `node server.js`
   - New: `npm start` or `node src/server.js`

2. **Dev Command Changed**:
   - Old: `node server.js`
   - New: `npm run dev` (with auto-reload)

3. **Scrape Command Changed**:
   - Old: `node js.js`
   - New: `npm run scrape`

4. **Import Paths Changed**:
   If you have custom code importing from old files, update:

   ```javascript
   // Old
   import { scrapeAllAreas } from './scraper.js';

   // New
   import { scrapeAllAreas } from './src/services/weatherScraper.js';
   ```

### New Features

1. **Configuration Validation**: Automatic validation on startup
2. **Better Logging**: Structured logging with emojis
3. **Error Handling**: Improved error handling throughout
4. **Development Tools**: ESLint, Prettier, Nodemon
5. **Better Documentation**: Comprehensive README and API docs

## Migration Steps

### For Development

1. **Backup your `.env` file** (it remains the same)

2. **Pull latest changes**:

   ```bash
   git pull origin main
   ```

3. **Install new dependencies**:

   ```bash
   npm install
   ```

4. **Update your commands**:
   - Replace `node server.js` with `npm run dev`
   - Replace `node js.js` with `npm run scrape`

5. **Verify everything works**:
   ```bash
   npm run dev
   # In another terminal:
   curl http://localhost:3001/api/health
   ```

### For Production (Vercel)

The `vercel.json` has been updated automatically. Just redeploy:

```bash
vercel deploy --prod
```

### For Supabase Edge Functions

No changes needed - the edge function remains separate in `supabase/functions/`.

## Cleanup (Optional)

After confirming everything works, you can remove old files:

```bash
# These files are now ignored by .gitignore
rm server.js scraper.js
# js.js and index.html have been moved already
```

## Rollback

If you need to rollback:

```bash
git checkout <previous-commit-hash>
npm install
```

## Need Help?

- Check the [README.md](./README.md) for full documentation
- Open an issue on GitHub
- Review the [CONTRIBUTING.md](./CONTRIBUTING.md) guide

## Benefits of v2.0

✅ **Modular**: Easy to understand and maintain  
✅ **Professional**: Follows Node.js best practices  
✅ **Testable**: Structure supports easy testing  
✅ **Documented**: Comprehensive documentation  
✅ **Tooling**: ESLint, Prettier, Nodemon included  
✅ **Scalable**: Easy to add new features

---

Welcome to v2.0! 🎉
