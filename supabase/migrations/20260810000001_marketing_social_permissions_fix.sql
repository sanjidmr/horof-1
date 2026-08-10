-- ============================================================
-- FIX: Seed social_media + meta_pixel permissions
--
-- PROBLEM:
--   The Admin Sidebar and route->permission map reference
--   social_media.* and meta_pixel.* (Marketing section), but
--   the RBAC permission matrix (20260805000002) never seeded
--   these modules. Non-super-admin roles (marketing_manager,
--   content_manager) therefore see hidden menu items and are
--   redirected to /admin/forbidden by the middleware.
--
-- FIX:
--   1. Seed the social_media + meta_pixel permission rows
--   2. Grant them to the marketing_manager and content_manager
--      roles (matching the seo.* grant pattern)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Seed social_media + meta_pixel permissions
-- ------------------------------------------------------------
INSERT INTO permissions (code, name, module, actions, description) VALUES
-- social media
('social_media.view',           'Social Media View',           'social_media', ARRAY['view'], 'View social media settings'),
('social_media.edit',           'Social Media Edit',           'social_media', ARRAY['edit'], 'Edit social media settings'),
('social_media.manage_settings','Social Media Manage',         'social_media', ARRAY['edit'], 'Manage social media settings'),
-- meta pixel
('meta_pixel.view',             'Meta Pixel View',             'meta_pixel', ARRAY['view'], 'View Meta Pixel settings'),
('meta_pixel.edit',             'Meta Pixel Edit',             'meta_pixel', ARRAY['edit'], 'Edit Meta Pixel settings'),
('meta_pixel.manage_settings',  'Meta Pixel Manage',           'meta_pixel', ARRAY['edit'], 'Manage Meta Pixel settings')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Grant to marketing_manager
-- ------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'marketing_manager'
  AND p.code IN (
    'social_media.view', 'social_media.edit', 'social_media.manage_settings',
    'meta_pixel.view', 'meta_pixel.edit', 'meta_pixel.manage_settings'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Grant to content_manager
-- ------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'content_manager'
  AND p.code IN (
    'social_media.view', 'social_media.edit',
    'meta_pixel.view', 'meta_pixel.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Grant to manager (manager receives all non-high-privilege
--    permissions by the same pattern as the permission matrix)
-- ------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.code IN (
    'social_media.view', 'social_media.edit',
    'meta_pixel.view', 'meta_pixel.edit'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;