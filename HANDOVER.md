# BreakText AI - Asset Handover & Operational Manual

Congratulations on acquiring **BreakText AI**. This document provides everything required to maintain, operate, and scale the application with zero prior onboarding.

---

## 1. Quick Architecture Summary

- **Backend:** Node.js & Express (ESM).
- **Frontend:** React (Vite) + Tailwind CSS (bundled statically into `client/dist`).
- **Database:** SQLite (`better-sqlite3` / `node:sqlite`) with **Write-Ahead Logging (WAL)** enabled for zero-maintenance concurrency.
- **Hosting:** Pre-configured for Railway.app with persistent volume mounting (`breaktext-ai-volume-dfos`).
- **Payments:** Dual-rail infrastructure:
  - **Stripe:** Global credit/debit cards, Apple Pay, Google Pay.
  - **Razorpay:** Domestic Indian UPI, QR codes, and Netbanking.
- **AI Engine:** OpenAI `gpt-4o-mini` with a rule-based fallback algorithm (`freeHumanize`) that guarantees 100% uptime even if API credits lapse.

---

## 2. Environment Variables Reference

To update keys in Railway or your own hosting provider, go to **Variables** and configure:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Container binding port | `5000` (auto-set by Railway) |
| `NODE_ENV` | Runtime environment | `production` |
| `OPENAI_API_KEY` | OpenAI secret API key | `sk-proj-...` |
| `STRIPE_SECRET_KEY` | Stripe Live Secret Key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret | `whsec_...` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | `your_razorpay_secret` |
| `DATABASE_PATH` | Path to persistent volume | `/app/data/breaktext.db` |
| `APP_URL` | Live production URL or custom domain | `https://yourdomain.com` |

---

## 3. Zero-Maintenance Maintenance Guarantee

1. **Self-Healing AI:** If the OpenAI API returns rate-limits, insufficient quota, or network timeouts, the server automatically routes user text through the local `freeHumanize` syntax engine without returning HTTP 500 errors.
2. **Database Concurrency:** SQLite is tuned with `PRAGMA journal_mode = WAL` and a `5000ms` busy timeout, preventing concurrency deadlocks under traffic spikes.
3. **Data Persistence:** User accounts, word balances, and payment ledgers persist across all deployments via the attached Railway volume.
4. **Health Monitoring:** You or any automated uptime monitor (UptimeRobot, BetterStack) can ping `/api/health` at any time to verify application and database status.

---

## 4. How to Scale & Market

- **SEO Keyword Targets:** Focus landing page blogs on high-intent search terms: `"bypass turnitin AI detector"`, `"humanize chatgpt essay"`, `"undetectable AI tool"`.
- **Short-Form Video Arbitrage:** Create 15-second screen recordings testing AI text before and after BreakText AI on GPTZero and Turnitin. Post across TikTok, YouTube Shorts, and Instagram Reels.
- **Micro-SaaS Multiplier:** At ₹100 ($1.20) per 50,000 words, conversion friction is near zero. Adding an optional $9.99/mo unlimited subscription can convert heavy academic users into recurring MRR.

---

## 5. Support & Legal Disclaimer

BreakText AI is sold as a fully functional, as-is software asset with 100% intellectual property transfer. All third-party brand names (Turnitin, GPTZero, CopyLeaks) are registered trademarks of their respective owners and used strictly for descriptive comparison purposes.
