# ⚡ Quick Start Guide

Get your weather scraper up and running in 5 minutes!

## Prerequisites

- ✅ Node.js >= 18.0.0
- ✅ npm
- ✅ Supabase account

## 🚀 Setup in 5 Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
# Add your Supabase URL and service role key
```

**Required variables:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Set Up Database

1. Go to your Supabase project
2. Open SQL Editor
3. Copy content from `supabase/supabase_schema.sql`
4. Run the SQL script

### Step 4: Start Development Server

```bash
npm run dev
```

Server starts at: `http://localhost:3001`

### Step 5: Test It!

```bash
# In a new terminal window:

# Check health
curl http://localhost:3001/api/health

# Get provinces
curl http://localhost:3001/api/provinces

# Trigger scraping
curl -X POST http://localhost:3001/api/scrape

# Check status
curl http://localhost:3001/api/scrape/status
```

## 🎉 You're Done!

Visit `http://localhost:3001` in your browser to see the UI.

---

## 📚 Next Steps

### Learn More

- Read the full [README.md](./README.md)
- Check [API.md](./API.md) for API documentation
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

### Development

```bash
# Format code
npm run format

# Check code quality
npm run lint

# Fix linting issues
npm run lint:fix

# Run scraper manually
npm run scrape
```

### Deploy

```bash
# Deploy to Vercel
vercel deploy --prod
```

---

## ❓ Common Issues

### Port Already in Use

```bash
# Change port in .env
PORT=3002
```

### Database Connection Failed

- Check your Supabase URL
- Verify service role key is correct
- Ensure database schema is created

### Scraping Fails

- Check internet connection
- Verify cambodiameteo.com is accessible
- Check Supabase has write permissions

---

## 💡 Tips

1. **Use development mode** for auto-reload: `npm run dev`
2. **Check logs** for debugging information
3. **Use health endpoint** to verify server is running
4. **Format before committing**: `npm run format`

---

## 🆘 Need Help?

1. Check the [README.md](./README.md)
2. Review [API.md](./API.md)
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
4. Open a GitHub issue

---

**Happy Coding! 🚀**
