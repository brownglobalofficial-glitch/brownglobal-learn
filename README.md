# Learn by BrownGlobal

Learn is BrownGlobal's online learning platform: structured self-paced courses, free live classes, practical business-building projects, and a separate application path to the BrownGlobal Venture Challenge on Wave.

## Product model

- **Free:** core courses, selected live classes, the Build Challenge, and eligibility to apply for the Venture Challenge.
- **Learn Plus:** full course library, replays, guided pathways, feedback, and completion records. Launch price: **$4.99/month or $49.99/year**.
- **BrownGlobal Business:** includes Learn Plus for eligible members; Learn does not require a second subscription.
- **Competition:** applying and competing never requires payment.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the shared BrownGlobal Supabase URL and publishable key.
3. Run `pnpm install` and `pnpm dev`.

Never place a Supabase service-role key in this frontend.

## Data and security

The migration in `supabase/migrations` creates courses, lessons, enrollments, progress, live-session registration, subscriptions, Build Challenge submissions, Venture Challenge applications, and certificates. Every learner-owned table uses Row Level Security. BrownGlobal Business access is recognized through the shared business membership records.

## Publishing without Lovable credits

The included GitHub Pages workflow builds and publishes on every push to `main`. In the repository settings:

1. Set the Pages source to **GitHub Actions**.
2. Add repository variable `VITE_SUPABASE_URL`.
3. Add repository secret `VITE_SUPABASE_PUBLISHABLE_KEY`.

A custom Learn domain can point to the GitHub Pages deployment later.

