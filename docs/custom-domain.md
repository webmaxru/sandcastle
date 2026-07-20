# Custom domain — `sandcastle.isainative.dev` (Cloudflare → Azure Static Web Apps)

Sandcastle's frontend runs on an Azure **Static Web App (Free)**. This guide wires the custom
domain **`sandcastle.isainative.dev`** (a subdomain of a zone hosted on **Cloudflare**) to it, with a
free auto‑renewing TLS certificate.

The domain is **already registered on the Static Web App** (status `Validating`) — you only need to
add two DNS records in Cloudflare. No further Azure commands are required; Azure auto‑validates and
issues the certificate once the records resolve.

| Thing | Value |
| --- | --- |
| Custom domain | `sandcastle.isainative.dev` |
| DNS provider | Cloudflare (zone `isainative.dev`) |
| Static Web App | `swa-sandcastle-dlagu2f6mknfy` (RG `rg-sandcastle`, Free SKU) |
| SWA default hostname (CNAME target) | `mango-island-0bf66000f.7.azurestaticapps.net` |
| Validation | DNS TXT token (already issued) |

---

## 1. Add these two DNS records in Cloudflare

In the Cloudflare dashboard → zone **`isainative.dev`** → **DNS** → **Records** → **Add record**.

### Record A — routing (CNAME)

| Field | Value |
| --- | --- |
| **Type** | `CNAME` |
| **Name** | `sandcastle` |
| **Target** | `mango-island-0bf66000f.7.azurestaticapps.net` |
| **Proxy status** | **DNS only** — grey cloud ☁️ (NOT proxied / orange) |
| **TTL** | Auto |

### Record B — ownership validation (TXT)

| Field | Value |
| --- | --- |
| **Type** | `TXT` |
| **Name** | `_dnsauth.sandcastle` |
| **Content** | `_iyycku1ta5tqc25fyxah186mgy4xbli` |
| **TTL** | Auto |

> **The single most important setting:** the CNAME **must be "DNS only" (grey cloud)**, not proxied.
> See [§3](#3-why-dns-only-grey-cloud-matters) for why the orange cloud breaks this.

Cloudflare normalises names to the zone, so entering `sandcastle` and `_dnsauth.sandcastle` yields the
full records `sandcastle.isainative.dev` and `_dnsauth.sandcastle.isainative.dev`.

---

## 2. Wait for Azure to validate

Once both records resolve (usually a few minutes on Cloudflare), Azure automatically:

1. Verifies the TXT token → the domain flips from **`Validating`** to **`Ready`**.
2. Issues a **free, auto‑renewing managed TLS certificate** (via the CNAME).
3. Serves the app at **https://sandcastle.isainative.dev**.

Check status any time:

```bash
az staticwebapp hostname show \
  -n swa-sandcastle-dlagu2f6mknfy -g rg-sandcastle \
  --hostname sandcastle.isainative.dev \
  --query "{status:status, errorMessage:errorMessage}" -o table
```

Confirm the records from your machine:

```bash
nslookup -type=CNAME sandcastle.isainative.dev
nslookup -type=TXT _dnsauth.sandcastle.isainative.dev
```

When `status` is `Ready`:

```bash
curl -sI https://sandcastle.isainative.dev | findstr /i "HTTP strict-transport"
```

> If the TXT token ever expires before the records propagate, re‑fetch a fresh one with
> `az staticwebapp hostname show ... --query "validationToken"` (re‑running `hostname set` with
> `--validation-method dns-txt-token` reissues it) and update **Record B**.

---

## 3. Why "DNS only" (grey cloud) matters

Cloudflare's **orange cloud** (proxied) makes `sandcastle.isainative.dev` resolve to *Cloudflare's* edge
IPs instead of the Static Web App. That breaks two things:

- **Domain validation & certificate issuance** — Azure follows the CNAME to confirm the target is the
  SWA and to run the ACME challenge for the managed cert. Behind Cloudflare's proxy it can't, so
  validation and cert issuance fail or never renew.
- **Double CDN / TLS confusion** — SWA already fronts your app with a global CDN + managed TLS. Proxying
  through Cloudflare on top adds a second TLS hop that, unless set to **Full (strict)**, causes redirect
  loops or `525/526` errors.

**Recommendation: leave it DNS only (grey cloud).** You still keep Cloudflare as your registrar/DNS host
and get Azure's free CDN + TLS. If you later want Cloudflare's proxy/WAF in front, enable the orange cloud
**only after** the domain is `Ready`, and set Cloudflare **SSL/TLS mode → Full (strict)**.

---

## 4. `.dev` is HTTPS‑only (HSTS preload)

The entire `.dev` TLD is on the browsers' **HSTS preload list**, so `http://` is never allowed — visitors
are always upgraded to `https://`. No action needed: the SWA managed certificate covers this, and
Sandcastle sets `Strict-Transport-Security` in `staticwebapp.config.json`.

---

## 5. Backend CORS (already handled)

Sandcastle's browser app calls the backend (Azure Container Apps) **cross‑origin**, so the backend must
allow the new origin. `https://sandcastle.isainative.dev` has **already been added** to the backend's
CORS allow‑list, both:

- **live** — `SANDCASTLE_CORS_ORIGINS` on Container App `ca-sandcastle-dlagu2f6mknfy` now lists both the
  default SWA host and the custom domain, and
- **in code** — `infra/main.bicep` (`frontendCustomDomain` parameter) so it survives a full redeploy.

Without this, `/api/*` calls would fail with a CORS error on the custom domain even after DNS is `Ready`.

---

## Appendix — exact Azure commands used

For reproducibility, these are the commands that registered the domain and updated CORS (already run):

```bash
# Register the custom domain (TXT‑token validation, non‑blocking)
az staticwebapp hostname set \
  -n swa-sandcastle-dlagu2f6mknfy -g rg-sandcastle \
  --hostname sandcastle.isainative.dev \
  --validation-method dns-txt-token --no-wait

# Allow the new origin on the backend (Container Apps)
az containerapp update \
  --name ca-sandcastle-dlagu2f6mknfy --resource-group rg-sandcastle \
  --set-env-vars 'SANDCASTLE_CORS_ORIGINS=https://mango-island-0bf66000f.7.azurestaticapps.net,https://sandcastle.isainative.dev'
```

### Alternative: single‑CNAME validation

If you'd rather manage **one** DNS record instead of two, delete the pending registration and use
CNAME‑delegation — the routing CNAME then doubles as ownership proof. Add **Record A** first (DNS only),
then run:

```bash
az staticwebapp hostname set \
  -n swa-sandcastle-dlagu2f6mknfy -g rg-sandcastle \
  --hostname sandcastle.isainative.dev \
  --validation-method cname-delegation
```

The Free SKU allows **2 custom domains** per app, so you can also keep the `www`/apex variants if needed.
