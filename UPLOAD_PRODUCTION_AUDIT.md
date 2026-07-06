# Upload Production Audit

## Status
Image uploads are supported and production-safe when the uploads folder is writable and protected from PHP execution.

## Requirements
- Create uploads/ inside the public web root.
- Set directory permissions to 755.
- Add an .htaccess file that disables PHP execution for uploaded files.
- Keep the upload size limit at 5MB.

## Recommendation
Use the uploads directory under the public web root so that generated image URLs remain accessible from the frontend.
