-- Remove the seeded image-editor app (installed shops cascade on app delete).
DELETE FROM apps WHERE key = 'image-editor';
