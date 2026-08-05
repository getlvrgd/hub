# Hub

One private front door for every LVRGD dashboard, hub and tool — plus what the agency
has generated. Open it, type two letters, press `↵`, and you're where you were going.

Behind a login, and synced: what you add on the laptop is there on the phone.

## What's here

- **Search first.** The box is focused the moment the page opens. Type `sales`, `srh`,
  or part of a note, press `↵`, and the top hit opens.
- **Add things as you build them.** `+ Add`, or paste a URL straight into the search
  box and it offers to add it with the name filled in.
- **Sections you arrange.** Collapse the ones you're not using, drag cards between
  them, reorder or rename them.
- **Pin what you use daily.** Pinned cards move to the top row and answer to `1`–`9`.
- **Quick links go one level deeper.** A card can carry paths inside the app it points
  at — `/hub`, `/login` — resolved against that card's own domain.
- **Agency revenue.** Log what comes in; the panel totals it all-time, this month,
  this year, average and biggest, with the last twelve months as a strip.

## Keyboard

| | |
| --- | --- |
| `⌘K` or `/` | Jump to search |
| `↑` `↓` | Move through results |
| `↵` | Open the highlighted one |
| `1`–`9` | Launch that pinned card |
| `n` | Add a destination |
| `Esc` | Clear the search, or close what's open |

## Deploying it

It's a Next.js app on Postgres — same shape as `sales-rep-hubs`, so the deploy is the
one you've already done.

1. **Vercel → New Project** → import `getlvrgd/hub`.
2. **Storage → Create Database → Neon.** Connect it to the project; Vercel sets
   `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you.
3. Add one more environment variable:

   ```
   AUTH_SECRET=<paste the output of: openssl rand -base64 32>
   ```

4. Deploy. `npm run build` runs `prisma migrate deploy` first, so the schema applies
   itself on the first deploy.
5. Open the URL. It sends you to **`/setup`** — set your email and password there.

That page closes permanently the moment the account exists, so there is never a public
page that mints access. After that, every visit is `/login`.

### Running it locally

Needs a Postgres. Put both in `.env`:

```
DATABASE_URL="postgresql://…"
AUTH_SECRET="…"          # 32+ characters; the app refuses to start without it
```

```bash
npm install
npx prisma migrate deploy
npm run dev
```

## How the login works

Accounts live in this app's own Postgres. Passwords are bcrypt-hashed at cost 12, and
the session is a signed JWT in an HttpOnly cookie — no third-party auth console.

A few deliberate choices:

- **A wrong password and an unknown email give the same message, in the same time.**
  Neither the wording nor the clock can be used to work out which addresses have
  accounts.
- **A valid signature isn't enough.** Every request re-reads the account and compares a
  session epoch. Changing your password, or hitting **Sign out other devices**, bumps
  that epoch and every cookie already out there stops working. Without it a stolen
  cookie would stay good for its full 30 days, and this app holds revenue figures.
- **Server actions check for themselves.** A server action is a public POST endpoint;
  hiding a button is not access control. Every mutation calls `requireOwner()` first,
  and `deleteRevenue` is scoped by `userId` as well as `id`, so a guessed id from
  another account is a no-op rather than a delete.

## How your data is stored

Two shapes, because they're used differently — see `prisma/schema.prisma`.

**The board** — sections and destinations — is one JSON document per user. Every
interaction changes the *arrangement* rather than one field, so it's read and written
whole. It also means the shape in `src/lib/board.ts` can gain a field without a
migration. Same call the Sales Rep Hub makes for its hub content.

**Revenue is rows.** It only grows, it gets aggregated by month, and "what did we book
in March" should be a SQL question.

Nothing that comes back out of the database is trusted: `normaliseBoard` coerces every
field on the way in and the way out, so an older blob, a hand-edit, or a restored
export can't put a shape on screen the renderer doesn't expect.

Money is integer cents everywhere. Floats lose a penny around the fourth deal and then
the total stops matching the bank.

### Backups

The ⋯ menu exports the whole board as JSON and imports it back. Revenue is not in that
file — it lives in Postgres, and Neon keeps its own backups.

## Notes on how it behaves

**Only `http(s)` URLs are stored.** A `javascript:` or `data:` address is dropped on
the way in and on the way out, so a hand-edited or imported file can't turn a card into
a script that runs when you click it.

**Quick links starting with `/` resolve against their card's URL.** Set the Sales Rep
Hub to its real domain and its `/hub` and `/login` links follow automatically.

**Pinning moves a card, it doesn't copy it.** A pinned card leaves its section and
lives in the top row; unpin, or drag it back, and it goes home.

**Empty sections are just a heading.** The drop target only appears while you're
actually dragging something.

**Edits save about half a second after you stop.** Local state is authoritative while
you work, so a drag doesn't wait on a round trip. Coming back to the tab picks up what
another device did, unless you have unsaved changes in front of you.

## Layout

```
src/app/         page.tsx (the hub), login, setup, actions.ts (every mutation)
src/lib/         auth, board document + normalising, revenue maths, money, db
src/components/  Hub.tsx and the dialogs
prisma/          schema + migrations
legacy/          the original single-file localStorage version, frozen
```

`legacy/` is the standalone `index.html` this started as. It still opens and works with
no server, but it has no login and no sync, and nothing new goes into it.
