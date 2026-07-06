# IMAGE UPLOAD AUDIT

## Current Behavior
- Admin product form (`AdminProducts.tsx:185`) has a text input for "Image URL"
- Admin must manually paste a URL (typically from Pexels or external source)
- No file upload capability exists anywhere in the codebase
- No upload endpoint exists in `api/v1/`

## Root Cause
No upload infrastructure was ever built. The system was designed for URL-based image management only.

## Files Affected
- `src/pages/admin/AdminProducts.tsx` — needs file input + upload component
- `src/pages/admin/AdminCategories.tsx` — same for category images
- `src/pages/admin/AdminBanners.tsx` — same for banner images
- `api/v1/` — needs new `upload.php` endpoint
- `api/.htaccess` — needs to allow multipart/form-data

## Implementation Plan

### Backend: `api/v1/upload.php`
1. Accept `POST` with `multipart/form-data` (field name: `file`)
2. Require admin authentication
3. Validate: file type (jpg, jpeg, png, webp, gif), max size (5MB)
4. Generate unique filename: `upload_<timestamp>_<random>.<ext>`
5. Save to `uploads/` directory (create if not exists)
6. Return JSON: `{ success: true, url: "/uploads/<filename>" }`

### Backend: Directory
- Create `uploads/` at web root (same level as `api/`)
- Set permissions to 755 (Hostinger default)
- Add `.htaccess` in `uploads/` to prevent PHP execution

### Frontend: Reusable ImageUpload component
1. File input with drag-and-drop support
2. Preview before upload
3. Upload to `/api/v1/upload.php` on file select
4. Return URL to parent form
5. Replace text URL input in AdminProducts, AdminCategories, AdminBanners

### Security
- Validate MIME type server-side (not just extension)
- Generate random filename (prevent path traversal)
- Store outside API directory (in public_html/uploads/)
- Add `.htaccess` to disable PHP execution in uploads/
- Max file size: 5MB
- Allowed types: image/jpeg, image/png, image/webp, image/gif
