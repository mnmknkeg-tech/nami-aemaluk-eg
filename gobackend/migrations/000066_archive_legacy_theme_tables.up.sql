-- Archive the legacy theme tables (000001 era). Nothing in the Go backend or
-- frontends reads them anymore — the builder uses shops.builder_config and
-- design tokens are managed in the builder config payload. Renaming instead
-- of dropping keeps any historical merchant data recoverable.
ALTER TABLE IF EXISTS shop_themes RENAME TO _archive_shop_themes;
ALTER TABLE IF EXISTS theme_templates RENAME TO _archive_theme_templates;
