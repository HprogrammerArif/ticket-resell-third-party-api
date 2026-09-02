# Homepage Banners — Design

**Date:** 2026-09-02
**Status:** Awaiting review
**Source:** Steven's UI notes, 2026-09-02

---

## Goal

A scrolling set of homepage banners that Steven uploads and manages himself from the admin dashboard, each linking somewhere and carrying one large **BUY TICKETS** button in the lower centre.

His note asked for three specific banners — US Open, NFL, Usher & Chris Brown. Arif has already designed those in Figma. **This builds the mechanism, not the artwork**: Steven uploads whatever he wants, whenever, without a deploy.

---

## Why this is not just an image tag

The requirement that shapes everything is *"Steven will be able to upload banners over time."* That turns a piece of static markup into a small content system: a place to keep files, an upload path, a record of what exists and in what order, and an admin screen. Each of those has a decision behind it.

---

## Decisions

### D1 — Files on a Docker volume, not Cloudinary or S3

Three candidates were considered.

| | Verdict |
|---|---|
| **Docker named volume + Multer** | **Chosen** |
| Cloudflare R2 / Backblaze B2 | The upgrade path, not now |
| Cloudinary | Rejected |

**Cloudinary is rejected** because we would be paying, in a new account and a new dependency, for resizing and format negotiation that `next/image` already does for us. It earns its place on sites without an image pipeline. We have one, and it is already serving Ticketmaster and Wikimedia files.

**A named volume is chosen** because the scale genuinely is small: a handful of banners, changed occasionally. A volume survives every redeploy — `pgdata` and `caddy_data` already prove the pattern in this stack — and it adds no account, no credential, no monthly cost and no third party that can have an outage.

**What we give up, stated plainly.** Files live on one machine. If the VPS is lost, the banners go with it, and Steven re-uploads them. That is an inconvenience, not a data loss: the originals are in his Figma, and nothing else depends on them. Compare that with `GiftCard.balance`, which is real money and is why the database has off-server backups.

**When to switch to R2.** If banners grow into a media library, or if Steven wants them to survive losing the server. R2 is nearly free at this size, and the project is already standing up R2 or B2 for database backups — so it would be one account doing both. The upload code is behind one module either way; changing it is a day, not a rewrite.

### D2 — Serve through the existing image proxy path, not a new public directory

Express serves the uploaded file from the volume on an authenticated-free read route, and the browser reaches it through `next/image` like every other image on the site.

**Why not a public static directory in Next.** The file is uploaded to the API container, so Next would have to reach across to it anyway. Serving from Express keeps one copy of the file and one place that knows where uploads live.

### D3 — Banners are ordered, and a banner can be off without being deleted

Steven will want to prepare a banner before it runs, and to stop one without losing it. Both are cheap now and awkward to retrofit, because retrofitting means a migration on a table that already has rows he cares about.

So: an integer `position` for ordering, and an `isActive` flag. The homepage reads only active banners, ordered.

### D4 — The link target is a plain URL, entered by Steven

Not a picker over the TicketNetwork catalogue. A banner might point at a performer page, a category, a specific event, or an outside campaign page, and a picker would have to model all of those while being wrong about the fifth case.

Validated as a relative path or an `https` URL, so a banner cannot become an open redirect.

### D5 — Validate the upload by content, not by filename

An upload endpoint that trusts the extension is how a server ends up hosting someone else's HTML or SVG. SVG especially: it is an image to a human and a script host to a browser.

- Accept `image/jpeg`, `image/png`, `image/webp` only. **No SVG.**
- Check the magic bytes, not the declared MIME type or the extension.
- 5 MB cap, enforced by Multer before the file is written.
- The stored filename is generated, never taken from the client.

Only an authenticated admin can reach the endpoint, so this is defence in depth rather than the primary control — but the primary control is one stolen session away from being absent.

### D6 — The homepage degrades to what it does today

If no banners are active, or the API is unreachable, the homepage renders exactly as it does now. The banner section is additive.

This matters more than it sounds: the banner is the first thing on the page, and a failure there must not be a blank screen above the fold.

---

## Data model

```prisma
/// Homepage banners, uploaded and ordered by an administrator.
model Banner {
  id        String   @id @default(cuid())
  title     String                  // shown to admins; also the image alt text
  filename  String                  // generated, on the uploads volume
  linkUrl   String                  // relative path or https URL
  position  Int      @default(0)
  isActive  Boolean  @default(true)
  width     Int
  height    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive, position])
}
```

`width` and `height` are recorded at upload so `next/image` can reserve space and avoid a layout shift as the carousel loads.

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/banners` | none | Active banners, ordered — what the homepage reads |
| GET | `/api/banners/file/:filename` | none | The image bytes |
| GET | `/api/admin/banners` | admin | All banners, including inactive |
| POST | `/api/admin/banners` | admin | Upload, multipart |
| PUT | `/api/admin/banners/:id` | admin | Title, link, position, active |
| DELETE | `/api/admin/banners/:id` | admin | Remove the record and the file |

## Compose

```yaml
  api:
    volumes:
      - uploads:/app/uploads

volumes:
  uploads:
```

## Frontend

- `client/src/components/home/BannerCarousel.tsx` — the scrolling banners, each with the oversized BUY TICKETS button in the lower centre per Steven's note.
- `client/src/app/admin/(dashboard)/banners/page.tsx` — list, upload, reorder, activate, delete.

The carousel autoplays and pauses on hover and on focus. It must be operable by keyboard and must respect `prefers-reduced-motion` — a carousel that moves under someone reading it is the most common accessibility complaint about this pattern.

---

## Testing

| Test | Why it matters |
|---|---|
| Upload rejects an SVG | D5. An SVG is a script host |
| Upload rejects a file whose bytes are not an image | D5. The extension proves nothing |
| Upload rejects over 5 MB | Before the bytes are written |
| Upload requires an admin token | The whole boundary |
| `linkUrl` rejects `javascript:` and a foreign host | D4, open redirect |
| `GET /api/banners` returns only active, in position order | D3 |
| Delete removes the file as well as the row | Or the volume fills with orphans |
| Homepage renders normally when there are no banners | D6 |
| Homepage renders normally when the API fails | D6 |

---

## Tasks

1. `Banner` model, migration, compose volume.
2. Upload module: Multer, magic-byte validation, generated filenames. Tests first.
3. Admin endpoints behind `authenticateAdmin`.
4. Public endpoints and file serving.
5. Admin dashboard screen — upload, reorder, activate, delete.
6. `BannerCarousel` on the homepage, with the reduced-motion and keyboard behaviour.
7. Verify in a browser: upload a real banner, confirm it appears, reorder it, deactivate it. **Not by HTTP status** — that check has now missed two rendering faults on this project.

---

## Out of scope

Scheduling a banner to start and stop on dates. Steven has not asked, and `isActive` covers the immediate need.

Per-locale banners. English and French share one set until someone asks otherwise.

Cropping or editing in the browser. Steven produces finished artwork in Figma.

Analytics on banner clicks. Worth doing eventually — it is how you learn which banner works — but it needs somewhere to send the events, and there is no analytics in the project yet.
