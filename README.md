# Platinum Pulse × VOID Creator Hub

## Start the website on Windows

Extract the ZIP, then double-click `OPEN-ME-IN-VSCODE.code-workspace`. You can
double-click `START-WEBSITE.bat` to install the packages and start the website
from the correct main folder.

A responsive creator performance dashboard for Platinum Pulse and VOID. It includes:

- creator login using only their imported TikTok username
- a private personal dashboard for LIVE hours, diamonds and valid LIVE days
- a day-by-day monthly breakdown of each creator's LIVE hours and diamonds
- sortable global leaderboards for all three performance measures
- incentives and TikTok Campaign Centre pages
- a ban appeal help page with a WhatsApp link for denied appeals
- **Arranged Battles**, merged in from the standalone battle-booker tool: creators book their own availability on a monthly calendar, the admin pairs bookings into 1v1 matches, and everyone sees the upcoming lineup
- creators see their own next arranged battle as a card on their dashboard
- protected admin dashboard with spreadsheet import, export, quick editing and Clear Data, plus the arranged-battle pairing/clear controls — all behind the one shared admin login
- responsive desktop, tablet and mobile layouts

## Start it in VS Code

1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Install Node.js 22 or newer.
4. Run:

```bash
npm install
npm run dev
```

The app opens at `http://localhost:3000`. This is a standard Next.js project.

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, paste everything from `supabase/schema.sql`, and run it.
3. Open the included `.env.local` file in the main project folder.
4. Replace its two placeholder values with the project URL and anon key from
   **Project Settings → API**.
5. Save the file.
6. Stop the server with `Ctrl + C`, then run `npm run dev` again.

Never put the Supabase service-role key in this project or any browser-side
environment variable.

## Creator logins

Creators do not need Supabase Auth accounts or passwords. Import the TikTok
Creator Data spreadsheet in the admin area. Any username present in
`creator_metrics` can then enter that TikTok username to open its dashboard.

## Create the admin account

Create one admin Auth user with:

- Email: `admin@login.platinumpulse.app`
- Password: `ppn777`
- Username metadata: `admin`

The included SQL recognises that exact email and assigns its admin permissions
automatically. You do not need a separate admin SQL query.

The supplied `supabase/schema.sql` is the only SQL file you need. It deletes
the old leaderboard tables and rebuilds the totals, daily data, arranged
battle bookings/matches, admin access and RLS rules together. It keeps your
Authentication admin user.

There is only one login box. Creators enter their TikTok username. Entering
`ppn777` into that same box signs into the Supabase admin account and opens
Agency Controls. It is not added to the creator table or leaderboard. This
same admin login also unlocks the Arranged Battles pairing/clear controls —
there is no separate admin password for that feature.

## Arranged Battles

This is the standalone "battle-booker" tool, merged directly into the hub as
a page under Campaigns. Creators tap a day on the calendar to book their
1v1 availability, and can upload a photo so people
recognise them on the match cards. The admin opens **Arranged Battles** while
signed in as `ppn777`, assigns open bookings to Team A / Team B under **Match
creators**, and clicks **Approve pairing** to post the matchup — visible to
everyone at the top of the page. Creators with an upcoming paired battle also
see it as a card on their own dashboard.

Unlike the rest of this hub, arranged-battle bookings are not gated by a
separate creator roster — anyone who can already log in (i.e. anyone in
`creator_metrics`) can book. Bookings and matches stay readable/writable by
the published anon key, the same trust model the standalone battle-booker
tool used, since creators don't hold a real Supabase Auth session here.

## Import creator data

Sign in as `ppn777`, open **Admin**, and choose **Import creator data**. The
import recognises the supplied TikTok Creator Data headings, including:

- `Creator's username`
- `Creator ID`
- `Data period`
- `Group`
- `Creator Network manager`
- `Diamonds`
- `LIVE duration`
- `Valid go LIVE days`
- `LIVE streams`
- `Matches`
- `Profile picture URL` (optional)

Rows are matched by creator username. Every TikTok export is also saved as a
dated snapshot. Uploads do not replace earlier snapshots: they remain stacked
until **Clear data** is used.

Profile pictures are pulled automatically from each TikTok username. If one
does not resolve, the admin can paste a direct image URL into the creator's
quick-edit panel.

## Fill the daily boxes

1. Export the normal TikTok **Creator Data** report for a date range, such as
   `2026-07-01 ~ 2026-07-21`, and import it. This becomes the baseline.
2. Keep the same start date, extend the end date by one day, then export and
   import again, for example `2026-07-01 ~ 2026-07-22`.
3. The hub subtracts each creator's previous totals from the new totals and
   saves the difference into 22 July's box.
4. Repeat with each newer report. Every upload remains stacked.

A single-day report also works and writes its figures directly into that date.
Importing the same period again safely updates that snapshot rather than making
a duplicate.

## Incentive tiers

The same automatic tier calculation is used on the creator's private panel,
progress bars and leaderboards. A creator must meet all three requirements in
the same reporting period:

- Tier 1: 15 LIVE hours, 25,000 diamonds and 7 valid LIVE days
- Tier 2: 25 LIVE hours, 50,000 diamonds and 10 valid LIVE days
- Tier 3: 40 LIVE hours, 100,000 diamonds and 15 valid LIVE days
- Tier 4: 60 LIVE hours, 250,000 diamonds and 20 valid LIVE days
- Tier 5: 100 LIVE hours, 500,000 diamonds and 30 valid LIVE days

Meeting only one or two requirements does not unlock a tier.

## Clear uploaded data

In Agency Controls, choose **Clear data** and confirm the warning. This deletes
all creator leaderboard rows, daily rows and stacked upload snapshots. It does
not delete the Supabase tables, SQL setup or admin Authentication user.

## Production environment

Set these two public environment variables in the hosting platform before
building:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Then build with:

```bash
npm run build
```

The included SQL uses Row Level Security. Creator metrics can be read for the
username-only dashboard and leaderboard, while only the authenticated admin can
import or edit performance records.


## v22 duplicate-safe data import
TikTok exports can occasionally include duplicate usernames. The admin importer now deduplicates creator rows and snapshot conflict keys before Supabase upserts. `supabase/DAILY-BACKFILL-AUGUST-2026.sql` now stages and deduplicates all rows before applying the backfill, preventing PostgreSQL error 21000 (`ON CONFLICT DO UPDATE command cannot affect row a second time`).

## Automatic daily breakdown (v23)

For an existing Supabase project, run `supabase/DAILY-AUTO-REBUILD-MIGRATION.sql` **once** in the Supabase SQL Editor. This installs the database function used by the importer. It is non-destructive and does not clear creator totals, snapshots, profiles, or arranged battles.

After that, normal admin imports automatically save the cumulative TikTok snapshot and rebuild daily metrics from all saved history. The calculation is date-agnostic and works across future days, months and years. A daily row is only calculated when the previous day's cumulative export exists for the same period start, so a missing export is never incorrectly assigned to a single day.

You do not need a new backfill SQL for each month or year.

## v27 audited build

This build was audited against the v26 source. Key fixes retained/added:
- Daily metrics are paginated past Supabase's 1,000-row response limit.
- Daily rebuilding is date-agnostic across months and years.
- Historical valid LIVE days are now calculated from TikTok's cumulative valid-day field, not guessed from LIVE minutes.
- Dashboard upcoming battle lookup loads match entries separately and ignores battles whose time has already passed today.
- Arranged Battles loads matches + entries separately, orders Next Up by scheduled date/time, and refreshes after pairing.
- Dashboard poster remains a dropdown; VOID group creators get VOID artwork; all other/no-group creators get Platinum artwork.
- Sidebar now shows the signed-in creator's own group instead of the first leaderboard creator's group.
- Agency Chat remains removed.

### Required one-time database step for v27
Run `supabase/V27-AUDIT-SAFE-MIGRATION.sql` in the existing Supabase SQL Editor. It is non-destructive and adds daily valid-day history, then replaces the rebuild function. After running it, upload/stack the latest cumulative export once to rebuild daily history with valid-day values.

### Important architecture note
Creator login is username-only by design. This is convenient for the agency workflow but is not strong identity authentication: someone who knows another creator's username could view that creator's dashboard. Do not treat username-only access as suitable for private/sensitive data without adding creator authentication.

## Owner login on Vercel (v29)

Owner access is intentionally separated from the real Supabase Auth password.
Set these in **Vercel → Project → Settings → Environment Variables** for Production, Preview and Development as needed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_LOGIN_CODE` — the code typed into the creator login box for Owner access (for example your existing owner code).
- `ADMIN_SUPABASE_EMAIL` — normally `admin@login.platinumpulse.app`.
- `ADMIN_SUPABASE_PASSWORD` — the actual password currently set on that Supabase Authentication user.

Do not put `ADMIN_SUPABASE_PASSWORD` into GitHub or any `NEXT_PUBLIC_` variable. Redeploy after changing Vercel environment variables.


### v29 owner-login compatibility

The owner-login route normalises accidental wrapping quotes/whitespace in Vercel environment variables. It first tries `ADMIN_SUPABASE_PASSWORD`; if that Supabase sign-in fails it also tries the submitted Owner code as the Supabase password for backwards compatibility with the original `ppn777` admin setup. Failed logins now report the actual Supabase Auth error and the Supabase project host (never the password/key), which makes wrong-project or wrong-credential deployments easier to diagnose.

## V31 Quick Manager / Manager Chat upgrade
After deploying this version, run `supabase/V31-QUICK-MANAGER-CHAT.sql` once in the Supabase SQL Editor.

New features:
- Creator Quick Manager FAQ bot (approved answers, including correct Frags vs Diamonds wording)
- Private per-creator support threads with escalation to management
- Multiple Manager logins created by the Owner
- Managers can reply to creator support and pair arranged battles
- Managers cannot access Owner Admin import/export/edit controls
- In-dashboard notification bell for management replies, support requests and newly paired battles

Owner login remains the existing `ppn777` flow (set through `ADMIN_LOGIN_CODE`). Manager accounts use a separate username/password created in Owner Admin.

Security note: creator access in this project intentionally remains username-only, as it was before V31. Chat threads are separated by creator username in the UI/API, but username-only login cannot provide strong identity verification if another person knows a creator's username. For cryptographically private creator chat, creator authentication (OTP/password/magic link) should be added later.

## V32 upgrade
After the V31 migration, run `supabase/V32-UNIFIED-LOGIN-CAMPAIGNS.sql` once in Supabase SQL Editor. Managers now sign in through the same Creator & Manager login card using their manager username + password; creators leave the password blank. Owner login remains separate. Manager accounts are stored in Supabase Auth/profiles and never in imported creator performance rows. Admin can assign each manager to Platinum Pulse or VOID. Campaign banners uploaded by Owner are stored in the `campaign-banners` Supabase Storage bucket and appear on creator dashboards under the arranged-battle poster dropdown.
