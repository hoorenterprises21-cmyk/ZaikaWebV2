# ADMIN_API_URL_TRACE

Date: 2026-06-24
Project: ZaikaWebV2

## Summary

The admin login flow is wired to use the shared Axios instance `adminApi`, but the runtime behavior still points to the Vite dev-server origin (`http://localhost:5173`) when the code resolves a path that starts with `/api/v1`.

The key findings are:

- The source file [src/lib/api.ts](src/lib/api.ts) defines `adminApi` with a `baseURL` that should come from `import.meta.env.VITE_API_BASE_URL`.
- The current environment value in [.env](.env) is `http://localhost/ZaikaWebV2/api/v1`.
- There is no Vite proxy configured in [vite.config.ts](vite.config.ts), so `/api/v1` is not being rewritten to the XAMPP/PHP location.
- The existing built bundle in [public_html/assets/index-Pu1sQruw.js](public_html/assets/index-Pu1sQruw.js) still contains a hardcoded `"/api/v1"` base, which is consistent with requests being issued to the current origin (`localhost:5173`).

No code changes were applied.

---

## 1) Exact definition of adminApi

From [src/lib/api.ts](src/lib/api.ts):

```ts
export const adminApi = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('fh_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

The `BASE` constant is defined above as:

```ts
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/ZaikaWebV2/api/v1';
```

---

## 2) Actual baseURL used by adminApi

At runtime, `adminApi` uses:

```ts
baseURL: BASE
```

and `BASE` resolves to:

```ts
import.meta.env.VITE_API_BASE_URL || 'http://localhost/ZaikaWebV2/api/v1'
```

With the current environment file, the effective value is:

```text
http://localhost/ZaikaWebV2/api/v1
```

---

## 3) Whether adminApi uses VITE_API_BASE_URL

Yes.

The definition in [src/lib/api.ts](src/lib/api.ts) explicitly uses:

```ts
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/ZaikaWebV2/api/v1';
```

So `adminApi` is wired to respect `VITE_API_BASE_URL` when it is available.

---

## 4) Whether a separate axios instance exists for admin requests

Yes.

There are two Axios instances in [src/lib/api.ts](src/lib/api.ts):

- `api` for public/customer requests
- `adminApi` for admin requests

The admin login call in [src/lib/adminAuth.tsx](src/lib/adminAuth.tsx) uses `adminApi`:

```ts
const { data } = await adminApi.post('/auth.php?action=admin_login', { email, password });
```

---

## 5) Whether vite proxy configuration is overriding requests

No.

The current [vite.config.ts](vite.config.ts) contains no `server.proxy` or similar override:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'public_html',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

Because there is no proxy entry, a request such as `/api/v1/auth.php?...` is not being rewritten to the XAMPP/PHP path.

---

## 6) All locations where '/api/v1' is hardcoded

### Runtime/source locations

- [src/components/WhatsAppButton.tsx](src/components/WhatsAppButton.tsx)
  - Uses `fetch('/api/v1/settings.php')`

### Built artifact / stale bundle

- [public_html/assets/index-Pu1sQruw.js](public_html/assets/index-Pu1sQruw.js)
  - Contains a bundled hardcoded base of `"/api/v1"`

### Documentation / non-runtime references

- [README.md](README.md)
- [API_INVENTORY.md](API_INVENTORY.md)
- [LOCAL_SETUP_REPORT.md](LOCAL_SETUP_REPORT.md)
- [FUNCTIONAL_TEST_REPORT.md](FUNCTIONAL_TEST_REPORT.md)
- [PRODUCT_EXECUTION_TRACE.md](PRODUCT_EXECUTION_TRACE.md)
- [ORDER_EXECUTION_TRACE.md](ORDER_EXECUTION_TRACE.md)
- [HOSTINGER_DEPLOYMENT_REPORT.md](HOSTINGER_DEPLOYMENT_REPORT.md)

These documentation files are not the cause of the browser request URL, but they confirm the intended API path structure.

---

## 7) Why requests are still going to localhost:5173

The behavior is consistent with a relative path resolving against the current browser origin.

When a request uses a path like:

```ts
/api/v1/auth.php?action=admin_login
```

and the SPA is currently being served from:

```text
http://localhost:5173
```

then the browser resolves it to:

```text
http://localhost:5173/api/v1/auth.php?action=admin_login
```

That is why the request appears at `localhost:5173`.

The current source is partly correct because [src/lib/api.ts](src/lib/api.ts) should use `VITE_API_BASE_URL`, but the environment value is not being translated into a proxy or host rewrite. In addition, the existing built bundle still contains a hardcoded `/api/v1` base, so the production/dev bundle can continue to target the Vite origin rather than the XAMPP/PHP host.

In short:

1. There is no Vite proxy to redirect `/api/v1` to the PHP app.
2. A path beginning with `/api/v1` resolves to the current origin (`localhost:5173` in dev).
3. The stale built bundle still contains a hardcoded `/api/v1` base.

---

## 8) Exact code changes required (not applied)

To fix the issue, the following changes are required:

1. Ensure the frontend uses the correct absolute API base consistently.
   - In [src/lib/api.ts](src/lib/api.ts), keep `adminApi` and `api` tied to the same resolved base URL from `VITE_API_BASE_URL`.
   - The intended value should be either:
     - `http://localhost/ZaikaWebV2/api/v1` for local XAMPP usage, or
     - `/api/v1` when the app is served from the same host as the PHP backend.

2. Replace any remaining hardcoded `/api/v1` runtime calls with the shared base URL logic.
   - Example target: [src/components/WhatsAppButton.tsx](src/components/WhatsAppButton.tsx)
   - Replace the hardcoded request path with the same base resolution used by `adminApi`/`api`.

3. Rebuild the frontend so the generated assets in [public_html](public_html) do not contain the stale hardcoded `/api/v1` bundle.
   - The current built artifact appears to be stale and should be regenerated after the source is corrected.

4. If the app is still run from the Vite dev server on port 5173, add a Vite proxy for `/api` (or `/api/v1`) to your PHP/XAMPP host.
   - This is the only way to make requests that start with `/api/v1` resolve to the PHP backend while the app is served from `localhost:5173`.

---

## Full adminApi definition

```ts
export const adminApi = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('fh_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Full vite.config.ts

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'public_html',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

---

## Current VITE_API_BASE_URL value being read by Vite

From [.env](.env):

```text
VITE_API_BASE_URL=http://localhost/ZaikaWebV2/api/v1
```

---

## Cached or duplicate configuration discovered

- No second active `.env` file was found in the workspace.
- The file [.env.example](.env.example) contains a different example value (`/api/v1`), but it is not the active runtime configuration.
- The stale built artifact [public_html/assets/index-Pu1sQruw.js](public_html/assets/index-Pu1sQruw.js) appears to contain duplicated hardcoded API base logic that does not match the current source intent.
