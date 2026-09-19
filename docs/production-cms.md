# Production portfolio CMS

## Rollout status — September 18, 2026

The approved callback is saved, and OAuth credential version 1 and session-key version 1 are stored in Secret Manager. The temporary OAuth download was removed; the previous OAuth secret remains untouched. The dedicated runtime identity has scoped access to the private/versioned content bucket and the two secrets. Existing CI permissions already include `actAs`, so no additional IAM grant was needed.

Revision `portfolio-cms-20260918-v2` is live at 100% latest traffic after passing staged and canonical-domain health, public-content and unauthorized-write checks. Build `dc717bc0-37c0-46d7-98b3-bff4f23797f8` passed and produced digest `sha256:0b225b399505ce06690fd73925baa753f973d39756f3222a9594406f3b9246c2`. The previous public revision `portfolio-00006-5jj` remains available for rollback. With explicit user approval, Google's email-only consent was completed for `jacketjicky@gmail.com`; the callback succeeded and the authenticated production editor opened with the correct account and Publish controls. No portfolio content was published during deployment. Publishing is regression-tested with the storage SDK mocked; a live content-changing publish was deliberately not performed.

The existing GitHub trigger `d5eced06-c08d-40e4-9ca1-eee743dc1761` now has the new inline build definition. Its ID, repository binding, `^main$` filter, build identity and log-status setting were preserved. The API rejected updates until the obsolete trigger-level `REPO_NAME` override was removed; the new definition uses an explicit image path and does not depend on it. Other substitutions were preserved. The first production image was built directly from this workspace; subsequent GitHub-triggered builds use the committed source on `main`.

## Access and publishing

- Visit `https://julianmangual.dev/admin`. Google sign-in uses only `openid email`; no Gmail, Drive or offline access is requested.
- Only verified `jacketjicky@gmail.com` is authorized. A Google login hint or a frontend check is not an access control.
- `/api/admin/*` checks the signed session on every request. Writes and logout also require a same-origin request and a per-session CSRF token.
- Authentication uses Google’s library to exchange and verify tokens, plus state, nonce and PKCE checks. HTTPS-only, HttpOnly, SameSite cookies expire in at most one hour. Google tokens are not stored.
- Signing out clears the browser cookie. A copied signed session remains valid until its expiry; rotate the session key and replace running revisions to invalidate all sessions immediately. Enable Google 2-Step Verification/passkeys on the admin account.
- Public pages and `GET /api/content` remain accessible without sign-in. No admin secret is bundled into React, embedded in the image or supplied as a build argument.
- Existing local browser drafts stay local. Production edits are in-memory previews until **Publish**; refreshing discards unpublished changes. Version conflicts reject the publish instead of overwriting another session. Download a draft backup before reloading to review the latest published content. The backup is JSON for recovery/reference, not an automatic merge.
- Production images, logos and videos must use HTTPS or site-root paths; plain HTTP media is rejected because browsers block mixed content. External image URLs are rendered by the browser, never fetched by the server.
- If published content cannot be loaded, the public site intentionally falls back to bundled source content for availability. Admin fails closed instead and cannot publish until the authoritative content/version are loaded.

## GCP resources

Project: `optical-genre-468001-v1`; Cloud Run service: `portfolio`; region: `us-central1`.

| Resource | Purpose |
| --- | --- |
| `portfolio-cms@optical-genre-468001-v1.iam.gserviceaccount.com` | Dedicated runtime identity |
| `gs://optical-genre-468001-v1-portfolio-cms` | Private content bucket, uniform access and public-access prevention |
| `portfolio/content.json` | Published overrides/additions; source defaults remain in `src/data.js` |
| `portfolio-google-oauth` | Secret Manager JSON downloaded for the Google web OAuth client (`web.client_id` and `web.client_secret`) |
| `portfolio-cms-session-key` | Secret Manager random session key (at least 32 random bytes, encoded) |

Bucket object versioning is enabled. Grant the runtime `roles/storage.objectUser` **only on this bucket**, and `roles/secretmanager.secretAccessor` **only on the two secrets**. Do not use the default compute service account or download service-account keys. Storage/secret usage incurs normal GCP usage charges.

Register exactly `https://julianmangual.dev/admin/auth/callback` in the OAuth web client's redirect URIs. JavaScript origins are not required for the server-side authorization-code flow. Do not put the OAuth client secret in chat, a `.env` committed to git, frontend environment variables, or CI substitutions. Download/store it directly in Secret Manager through a secure local workflow. The OAuth consent configuration must allow the chosen account.

Runtime settings:

```text
CMS_ORIGIN=https://julianmangual.dev
CMS_ADMIN_EMAIL=jacketjicky@gmail.com
CMS_CONTENT_BUCKET=optical-genre-468001-v1-portfolio-cms
GOOGLE_OAUTH_CLIENT_JSON=<Secret Manager reference>
CMS_SESSION_KEY=<Secret Manager reference>
```

An entirely unconfigured server serves the public site and disables admin with 503. Partial authentication configuration fails startup. The production server has no authentication bypass, including when listening on loopback.

## Verification and CI

```sh
npm ci --prefix cms-server
npm test --prefix cms-server
CI=true npm test -- --watchAll=false --runInBand --testPathPattern='DeveloperMode|cmsDrafts|useCmsDrafts|usePortfolioCms|PortfolioItem|cmsAbout|About.*test'
npm run build
```

The narrowly scoped `gaxios@6` → `uuid@11.1.1+` override removes a transitive vulnerability; that client only uses the compatible `v4()` API. Recheck the override when updating the GCS SDK.

`cloudbuild.yaml` builds an immutable `$BUILD_ID` image, runs backend tests and references pinned Secret Manager versions at runtime. The existing GCP trigger uses a synchronized inline build definition. Later configuration changes must update that inline definition explicitly, or switch the trigger to the checked-in filename after pushing the new source. Its default compute build identity already has `iam.serviceAccounts.actAs` through an existing role; the setup added no further project-wide grants. Do not alter the public invoker policy to secure `/admin`; the application protects that route while the rest of the site stays public.

For the initial rollout, `cloudbuild.stage.yaml` builds/tests an image without deploying. Deploy it as a **no-traffic** tagged revision and validate `/api/health`, public content and unauthorized API rejection. Then shift traffic and immediately verify Google sign-in through the canonical domain, retaining the previous revision for rollback if that check fails. The tagged admin URL intentionally redirects to the canonical domain; a complete OAuth round trip cannot be tested on the tag with the production callback. Do not automatically publish browser drafts as part of deployment. Cloud Run reserves some paths ending in `z`, so the health route is `/api/health`, not `/healthz`.

## Recovery

Cloud Run image rollback: shift traffic to the previously verified revision. Content rollback is separate: inspect object generations in the private bucket, then restore the selected generation using a conditional write to avoid overwriting concurrent work. Both are explicit operations, not automatic deletion. Version history is private and should not be served as a public bucket.

To revoke admin access, remove/change `CMS_ADMIN_EMAIL`, rotate `CMS_SESSION_KEY`, and ensure old revisions are not receiving traffic. To rotate OAuth credentials, add the new secret version, deploy a pinned reference, verify sign-in, then retire the old secret. Never log authorization codes, cookies or Google token errors.
