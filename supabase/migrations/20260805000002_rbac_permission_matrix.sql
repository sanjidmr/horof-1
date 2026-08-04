-- ============================================================
-- RBAC PERMISSION MATRIX REWORK
-- ============================================================
-- Replaces the ad-hoc permission codes with a strict
-- module x action matrix (code = '<module>.<action>').
-- Keep in sync with src/lib/auth/permissions.ts
--
-- 1. Clears old permission linkage + permission rows
-- 2. Seeds the new permission matrix
-- 3. Adds a 'warehouse_staff' system role
-- 4. Re-seeds role_permissions for every seeded role
-- 5. Assigns roles to existing internal users by profile.role
--    (removes the implicit 'admin profile = super admin' bypass)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Reset RBAC permission linkage
-- ------------------------------------------------------------
DELETE FROM user_permissions;
DELETE FROM role_permissions;
DELETE FROM permissions;

-- ------------------------------------------------------------
-- 2. Seed the permission matrix
-- ------------------------------------------------------------
INSERT INTO permissions (code, name, module, actions, description) VALUES
-- dashboard
('dashboard.view',        'Dashboard View',        'dashboard', ARRAY['view'], 'View the admin dashboard'),
('dashboard.export',      'Dashboard Export',      'dashboard', ARRAY['export'], 'Export dashboard data'),
-- analytics
('analytics.view',        'Analytics View',        'analytics', ARRAY['view'], 'View analytics'),
('analytics.export',      'Analytics Export',      'analytics', ARRAY['export'], 'Export analytics data'),
('analytics.manage_settings', 'Analytics Settings','analytics', ARRAY['edit'], 'Configure analytics'),
-- products
('products.view',         'Products View',         'products', ARRAY['view'], 'View products'),
('products.create',       'Products Create',       'products', ARRAY['create'], 'Create products'),
('products.edit',         'Products Edit',         'products', ARRAY['edit'], 'Edit products'),
('products.delete',       'Products Delete',       'products', ARRAY['delete'], 'Delete products'),
('products.approve',      'Products Approve',      'products', ARRAY['edit'], 'Approve products'),
('products.export',       'Products Export',       'products', ARRAY['export'], 'Export products'),
('products.import',       'Products Import',       'products', ARRAY['create'], 'Import products'),
('products.print',        'Products Print',        'products', ARRAY['view'], 'Print product details'),
('products.manage_settings', 'Products Settings',  'products', ARRAY['edit'], 'Manage product settings'),
('products.manage_status','Products Status',       'products', ARRAY['edit'], 'Manage product status'),
-- brands
('brands.view',           'Brands View',           'brands', ARRAY['view'], 'View brands'),
('brands.create',         'Brands Create',         'brands', ARRAY['create'], 'Create brands'),
('brands.edit',           'Brands Edit',           'brands', ARRAY['edit'], 'Edit brands'),
('brands.delete',         'Brands Delete',         'brands', ARRAY['delete'], 'Delete brands'),
-- categories
('categories.view',       'Categories View',       'categories', ARRAY['view'], 'View categories'),
('categories.create',     'Categories Create',     'categories', ARRAY['create'], 'Create categories'),
('categories.edit',       'Categories Edit',       'categories', ARRAY['edit'], 'Edit categories'),
('categories.delete',     'Categories Delete',     'categories', ARRAY['delete'], 'Delete categories'),
-- subcategories
('subcategories.view',    'Subcategories View',    'subcategories', ARRAY['view'], 'View subcategories'),
('subcategories.create',  'Subcategories Create',  'subcategories', ARRAY['create'], 'Create subcategories'),
('subcategories.edit',    'Subcategories Edit',    'subcategories', ARRAY['edit'], 'Edit subcategories'),
('subcategories.delete',  'Subcategories Delete',  'subcategories', ARRAY['delete'], 'Delete subcategories'),
-- inventory
('inventory.view',        'Inventory View',        'inventory', ARRAY['view'], 'View inventory'),
('inventory.create',      'Inventory Create',      'inventory', ARRAY['create'], 'Create inventory records'),
('inventory.edit',        'Inventory Edit',        'inventory', ARRAY['edit'], 'Adjust stock / edit inventory'),
('inventory.delete',      'Inventory Delete',      'inventory', ARRAY['delete'], 'Delete inventory records'),
('inventory.export',      'Inventory Export',      'inventory', ARRAY['export'], 'Export inventory data'),
('inventory.manage_status','Inventory Status',     'inventory', ARRAY['edit'], 'Manage inventory status'),
-- warehouses
('warehouses.view',       'Warehouses View',       'warehouses', ARRAY['view'], 'View warehouses'),
('warehouses.create',     'Warehouses Create',     'warehouses', ARRAY['create'], 'Create warehouses'),
('warehouses.edit',       'Warehouses Edit',       'warehouses', ARRAY['edit'], 'Edit warehouses'),
('warehouses.delete',     'Warehouses Delete',     'warehouses', ARRAY['delete'], 'Delete warehouses'),
('warehouses.assign',     'Warehouses Assign',     'warehouses', ARRAY['edit'], 'Assign staff/items to warehouses'),
('warehouses.manage_status','Warehouses Status',   'warehouses', ARRAY['edit'], 'Manage warehouse status'),
-- suppliers
('suppliers.view',        'Suppliers View',        'suppliers', ARRAY['view'], 'View suppliers'),
('suppliers.create',      'Suppliers Create',      'suppliers', ARRAY['create'], 'Create suppliers'),
('suppliers.edit',        'Suppliers Edit',        'suppliers', ARRAY['edit'], 'Edit suppliers'),
('suppliers.delete',      'Suppliers Delete',      'suppliers', ARRAY['delete'], 'Delete suppliers'),
-- purchase orders
('purchase_orders.view',  'Purchase Orders View',  'purchase_orders', ARRAY['view'], 'View purchase orders'),
('purchase_orders.create','Purchase Orders Create','purchase_orders', ARRAY['create'], 'Create purchase orders'),
('purchase_orders.edit',  'Purchase Orders Edit',  'purchase_orders', ARRAY['edit'], 'Edit purchase orders'),
('purchase_orders.delete','Purchase Orders Delete','purchase_orders', ARRAY['delete'], 'Delete purchase orders'),
('purchase_orders.approve','Purchase Orders Approve','purchase_orders', ARRAY['edit'], 'Approve purchase orders'),
('purchase_orders.manage_status','Purchase Orders Status','purchase_orders', ARRAY['edit'], 'Manage purchase order status'),
-- stock movements
('stock_movement.view',   'Stock Movements View',  'stock_movement', ARRAY['view'], 'View stock movements'),
('stock_movement.export', 'Stock Movements Export','stock_movement', ARRAY['export'], 'Export stock movements'),
-- orders
('orders.view',           'Orders View',           'orders', ARRAY['view'], 'View orders'),
('orders.create',         'Orders Create',         'orders', ARRAY['create'], 'Create orders'),
('orders.edit',           'Orders Edit',           'orders', ARRAY['edit'], 'Edit orders'),
('orders.delete',         'Orders Delete',         'orders', ARRAY['delete'], 'Delete orders'),
('orders.approve',        'Orders Approve',        'orders', ARRAY['edit'], 'Approve orders'),
('orders.reject',         'Orders Reject',         'orders', ARRAY['edit'], 'Reject orders'),
('orders.assign',         'Orders Assign',         'orders', ARRAY['edit'], 'Assign orders to warehouses/couriers'),
('orders.export',         'Orders Export',         'orders', ARRAY['export'], 'Export orders'),
('orders.print',          'Orders Print',          'orders', ARRAY['view'], 'Print orders / packing slips'),
('orders.manage_status',  'Orders Status',         'orders', ARRAY['edit'], 'Update order status'),
('orders.manage_notifications','Orders Notifications','orders', ARRAY['edit'], 'Send order notifications/emails'),
-- order requests
('order_requests.view',   'Order Requests View',   'order_requests', ARRAY['view'], 'View order requests'),
('order_requests.create', 'Order Requests Create', 'order_requests', ARRAY['create'], 'Create order requests'),
('order_requests.edit',   'Order Requests Edit',   'order_requests', ARRAY['edit'], 'Edit order requests'),
('order_requests.approve','Order Requests Approve','order_requests', ARRAY['edit'], 'Approve order requests'),
('order_requests.reject', 'Order Requests Reject', 'order_requests', ARRAY['edit'], 'Reject order requests'),
('order_requests.assign', 'Order Requests Assign', 'order_requests', ARRAY['edit'], 'Assign order requests'),
('order_requests.manage_status','Order Requests Status','order_requests', ARRAY['edit'], 'Manage order request status'),
-- returns
('returns.view',          'Returns View',          'returns', ARRAY['view'], 'View returns'),
('returns.create',        'Returns Create',        'returns', ARRAY['create'], 'Create returns'),
('returns.edit',          'Returns Edit',          'returns', ARRAY['edit'], 'Edit returns'),
('returns.approve',       'Returns Approve',       'returns', ARRAY['edit'], 'Approve returns'),
('returns.reject',        'Returns Reject',        'returns', ARRAY['edit'], 'Reject returns'),
('returns.manage_status', 'Returns Status',        'returns', ARRAY['edit'], 'Manage return status'),
('returns.print',         'Returns Print',         'returns', ARRAY['view'], 'Print return documents'),
-- refunds
('refunds.view',          'Refunds View',          'refunds', ARRAY['view'], 'View refunds'),
('refunds.approve',       'Refunds Approve',       'refunds', ARRAY['edit'], 'Approve refunds'),
('refunds.reject',        'Refunds Reject',        'refunds', ARRAY['edit'], 'Reject refunds'),
('refunds.manage_status', 'Refunds Process',       'refunds', ARRAY['edit'], 'Process/update refunds'),
('refunds.export',        'Refunds Export',        'refunds', ARRAY['export'], 'Export refunds'),
-- customers
('customers.view',        'Customers View',        'customers', ARRAY['view'], 'View customers'),
('customers.create',      'Customers Create',      'customers', ARRAY['create'], 'Create customer records'),
('customers.edit',        'Customers Edit',        'customers', ARRAY['edit'], 'Edit customers (incl. ban)'),
('customers.delete',      'Customers Delete',      'customers', ARRAY['delete'], 'Delete customers'),
('customers.export',      'Customers Export',      'customers', ARRAY['export'], 'Export customers'),
('customers.manage_status','Customers Status',     'customers', ARRAY['edit'], 'Manage customer status'),
-- users
('users.view',            'Users View',            'users', ARRAY['view'], 'View internal users'),
('users.create',          'Users Create',          'users', ARRAY['create'], 'Create internal users'),
('users.edit',            'Users Edit',            'users', ARRAY['edit'], 'Edit users'),
('users.delete',          'Users Delete',          'users', ARRAY['delete'], 'Delete users'),
('users.assign',          'Users Assign Roles',    'users', ARRAY['edit'], 'Assign/remove roles on users'),
('users.export',          'Users Export',          'users', ARRAY['export'], 'Export users'),
('users.manage_settings', 'Users Settings',        'users', ARRAY['edit'], 'Manage user permissions/settings'),
('users.manage_status',   'Users Suspend/Status',  'users', ARRAY['edit'], 'Suspend/unsuspend users, terminate sessions'),
-- roles
('roles.view',            'Roles View',            'roles', ARRAY['view'], 'View roles'),
('roles.create',          'Roles Create',          'roles', ARRAY['create'], 'Create roles'),
('roles.edit',            'Roles Edit',            'roles', ARRAY['edit'], 'Edit roles'),
('roles.delete',          'Roles Delete',          'roles', ARRAY['delete'], 'Delete roles'),
('roles.assign',          'Roles Assign',          'roles', ARRAY['edit'], 'Assign roles to users'),
('roles.manage_settings', 'Roles Settings',        'roles', ARRAY['edit'], 'Manage role settings'),
-- permissions
('permissions.view',      'Permissions View',      'permissions', ARRAY['view'], 'View permissions'),
('permissions.manage_settings','Permissions Manage','permissions', ARRAY['edit'], 'Grant/revoke permissions'),
-- security
('security.view',         'Security View',         'security', ARRAY['view'], 'View security center'),
('security.edit',         'Security Edit',         'security', ARRAY['edit'], 'Modify security settings'),
('security.export',       'Security Export',       'security', ARRAY['export'], 'Export security data'),
('security.manage_settings','Security Settings',   'security', ARRAY['edit'], 'Configure security settings'),
-- audit logs
('audit_logs.view',       'Audit Logs View',       'audit_logs', ARRAY['view'], 'View audit logs'),
('audit_logs.export',     'Audit Logs Export',     'audit_logs', ARRAY['export'], 'Export audit logs'),
-- login history
('login_history.view',    'Login History View',    'login_history', ARRAY['view'], 'View login history'),
('login_history.export',  'Login History Export',  'login_history', ARRAY['export'], 'Export login history'),
-- sessions
('sessions.view',         'Sessions View',         'sessions', ARRAY['view'], 'View user sessions'),
('sessions.manage_status','Sessions Terminate',    'sessions', ARRAY['edit'], 'Terminate user sessions'),
-- backup
('backup.view',           'Backup View',           'backup', ARRAY['view'], 'View backups'),
('backup.create',         'Backup Create',         'backup', ARRAY['create'], 'Create backups'),
('backup.delete',         'Backup Delete',         'backup', ARRAY['delete'], 'Delete backups'),
('backup.manage_settings','Backup Schedule/Restore','backup', ARRAY['edit'], 'Schedule/restore backups'),
-- notifications
('notifications.view',    'Notifications View',    'notifications', ARRAY['view'], 'View notifications'),
('notifications.create',  'Notifications Create',  'notifications', ARRAY['create'], 'Send notifications'),
('notifications.edit',    'Notifications Edit',    'notifications', ARRAY['edit'], 'Edit notifications'),
('notifications.delete',  'Notifications Delete',  'notifications', ARRAY['delete'], 'Delete notifications'),
('notifications.manage_settings','Notifications Settings','notifications', ARRAY['edit'], 'Configure notifications'),
('notifications.export',  'Notifications Export',  'notifications', ARRAY['export'], 'Export notifications'),
-- contact messages
('contact_messages.view', 'Contact Messages View', 'contact_messages', ARRAY['view'], 'View contact messages'),
('contact_messages.edit', 'Contact Messages Edit', 'contact_messages', ARRAY['edit'], 'Edit contact messages'),
('contact_messages.delete','Contact Messages Delete','contact_messages', ARRAY['delete'], 'Delete contact messages'),
('contact_messages.export','Contact Messages Export','contact_messages', ARRAY['export'], 'Export contact messages'),
('contact_messages.manage_status','Contact Messages Status','contact_messages', ARRAY['edit'], 'Manage contact message status'),
-- support chat
('chat.view',             'Chat View',             'chat', ARRAY['view'], 'View support chat'),
('chat.create',           'Chat Create',           'chat', ARRAY['create'], 'Start chat conversations'),
('chat.edit',             'Chat Edit',             'chat', ARRAY['edit'], 'Edit chat conversations'),
('chat.assign',           'Chat Assign',           'chat', ARRAY['edit'], 'Assign chat conversations'),
('chat.manage_status',    'Chat Status',           'chat', ARRAY['edit'], 'Manage chat status'),
-- support tickets
('support_tickets.view',  'Support Tickets View',  'support_tickets', ARRAY['view'], 'View support tickets'),
('support_tickets.create','Support Tickets Create','support_tickets', ARRAY['create'], 'Create support tickets'),
('support_tickets.edit',  'Support Tickets Edit',  'support_tickets', ARRAY['edit'], 'Edit support tickets'),
('support_tickets.approve','Support Tickets Approve','support_tickets', ARRAY['edit'], 'Approve support tickets'),
('support_tickets.reject','Support Tickets Reject','support_tickets', ARRAY['edit'], 'Reject support tickets'),
('support_tickets.assign','Support Tickets Assign','support_tickets', ARRAY['edit'], 'Assign support tickets'),
('support_tickets.manage_status','Support Tickets Status','support_tickets', ARRAY['edit'], 'Manage ticket status/priority'),
-- design requests
('design_requests.view',  'Design Requests View',  'design_requests', ARRAY['view'], 'View design requests'),
('design_requests.create','Design Requests Create','design_requests', ARRAY['create'], 'Create design requests'),
('design_requests.edit',  'Design Requests Edit',  'design_requests', ARRAY['edit'], 'Edit design requests'),
('design_requests.approve','Design Requests Approve','design_requests', ARRAY['edit'], 'Approve design requests'),
('design_requests.reject','Design Requests Reject','design_requests', ARRAY['edit'], 'Reject design requests'),
('design_requests.assign','Design Requests Assign','design_requests', ARRAY['edit'], 'Assign design requests'),
('design_requests.manage_status','Design Requests Status','design_requests', ARRAY['edit'], 'Manage design request status'),
-- reviews
('reviews.view',          'Reviews View',          'reviews', ARRAY['view'], 'View reviews'),
('reviews.create',        'Reviews Create',        'reviews', ARRAY['create'], 'Submit reviews'),
('reviews.edit',          'Reviews Edit',          'reviews', ARRAY['edit'], 'Edit reviews'),
('reviews.delete',        'Reviews Delete',        'reviews', ARRAY['delete'], 'Delete reviews'),
('reviews.approve',       'Reviews Approve',       'reviews', ARRAY['edit'], 'Approve reviews'),
('reviews.reject',        'Reviews Reject',        'reviews', ARRAY['edit'], 'Reject reviews'),
('reviews.manage_status', 'Reviews Status',        'reviews', ARRAY['edit'], 'Manage review status'),
-- coupons
('coupons.view',          'Coupons View',          'coupons', ARRAY['view'], 'View coupons'),
('coupons.create',        'Coupons Create',        'coupons', ARRAY['create'], 'Create coupons'),
('coupons.edit',          'Coupons Edit',          'coupons', ARRAY['edit'], 'Edit coupons'),
('coupons.delete',        'Coupons Delete',        'coupons', ARRAY['delete'], 'Delete coupons'),
('coupons.export',        'Coupons Export',        'coupons', ARRAY['export'], 'Export coupons'),
('coupons.manage_status', 'Coupons Status',        'coupons', ARRAY['edit'], 'Activate/deactivate coupons'),
-- flash sale
('flash_sale.view',       'Flash Sale View',       'flash_sale', ARRAY['view'], 'View flash sales'),
('flash_sale.create',     'Flash Sale Create',     'flash_sale', ARRAY['create'], 'Create flash sales'),
('flash_sale.edit',       'Flash Sale Edit',       'flash_sale', ARRAY['edit'], 'Edit flash sales'),
('flash_sale.delete',     'Flash Sale Delete',     'flash_sale', ARRAY['delete'], 'Delete flash sales'),
('flash_sale.manage_status','Flash Sale Status',   'flash_sale', ARRAY['edit'], 'Manage flash sale status'),
-- special offer
('special_offer.view',    'Special Offer View',    'special_offer', ARRAY['view'], 'View special offers'),
('special_offer.create',  'Special Offer Create',  'special_offer', ARRAY['create'], 'Create special offers'),
('special_offer.edit',    'Special Offer Edit',    'special_offer', ARRAY['edit'], 'Edit special offers'),
('special_offer.delete',  'Special Offer Delete',  'special_offer', ARRAY['delete'], 'Delete special offers'),
('special_offer.manage_status','Special Offer Status','special_offer', ARRAY['edit'], 'Manage special offer status'),
-- popup campaigns
('popup_campaigns.view',  'Popup Campaigns View',  'popup_campaigns', ARRAY['view'], 'View popup campaigns'),
('popup_campaigns.create','Popup Campaigns Create','popup_campaigns', ARRAY['create'], 'Create popup campaigns'),
('popup_campaigns.edit',  'Popup Campaigns Edit',  'popup_campaigns', ARRAY['edit'], 'Edit popup campaigns'),
('popup_campaigns.delete','Popup Campaigns Delete','popup_campaigns', ARRAY['delete'], 'Delete popup campaigns'),
('popup_campaigns.manage_status','Popup Campaigns Status','popup_campaigns', ARRAY['edit'], 'Manage popup campaign status'),
-- email campaigns
('email_campaigns.view',  'Email Campaigns View',  'email_campaigns', ARRAY['view'], 'View email campaigns'),
('email_campaigns.create','Email Campaigns Create','email_campaigns', ARRAY['create'], 'Create email campaigns'),
('email_campaigns.edit',  'Email Campaigns Edit',  'email_campaigns', ARRAY['edit'], 'Edit email campaigns'),
('email_campaigns.delete','Email Campaigns Delete','email_campaigns', ARRAY['delete'], 'Delete email campaigns'),
('email_campaigns.export','Email Campaigns Export','email_campaigns', ARRAY['export'], 'Export email campaigns'),
('email_campaigns.manage_status','Email Campaigns Status','email_campaigns', ARRAY['edit'], 'Manage email campaign status'),
-- bundle offers
('bundle_offers.view',    'Bundle Offers View',    'bundle_offers', ARRAY['view'], 'View bundle offers'),
('bundle_offers.create',  'Bundle Offers Create',  'bundle_offers', ARRAY['create'], 'Create bundle offers'),
('bundle_offers.edit',    'Bundle Offers Edit',    'bundle_offers', ARRAY['edit'], 'Edit bundle offers'),
('bundle_offers.delete',  'Bundle Offers Delete',  'bundle_offers', ARRAY['delete'], 'Delete bundle offers'),
('bundle_offers.manage_status','Bundle Offers Status','bundle_offers', ARRAY['edit'], 'Manage bundle offer status'),
-- free shipping
('free_shipping.view',    'Free Shipping View',    'free_shipping', ARRAY['view'], 'View free shipping offers'),
('free_shipping.create',  'Free Shipping Create',  'free_shipping', ARRAY['create'], 'Create free shipping offers'),
('free_shipping.edit',    'Free Shipping Edit',    'free_shipping', ARRAY['edit'], 'Edit free shipping offers'),
('free_shipping.delete',  'Free Shipping Delete',  'free_shipping', ARRAY['delete'], 'Delete free shipping offers'),
('free_shipping.manage_status','Free Shipping Status','free_shipping', ARRAY['edit'], 'Manage free shipping status'),
-- site visuals
('site_visuals.view',     'Site Visuals View',     'site_visuals', ARRAY['view'], 'View site visuals'),
('site_visuals.create',   'Site Visuals Create',   'site_visuals', ARRAY['create'], 'Create site visuals'),
('site_visuals.edit',     'Site Visuals Edit',     'site_visuals', ARRAY['edit'], 'Edit site visuals'),
('site_visuals.delete',   'Site Visuals Delete',   'site_visuals', ARRAY['delete'], 'Delete site visuals'),
('site_visuals.upload',   'Site Visuals Upload',   'site_visuals', ARRAY['create'], 'Upload site visuals'),
('site_visuals.manage_status','Site Visuals Status','site_visuals', ARRAY['edit'], 'Manage site visual status'),
-- services
('services.view',         'Services View',         'services', ARRAY['view'], 'View our-services content'),
('services.create',       'Services Create',       'services', ARRAY['create'], 'Create our-services content'),
('services.edit',         'Services Edit',         'services', ARRAY['edit'], 'Edit our-services content'),
('services.delete',       'Services Delete',       'services', ARRAY['delete'], 'Delete our-services content'),
-- faq
('faq.view',              'FAQ View',              'faq', ARRAY['view'], 'View FAQ'),
('faq.create',            'FAQ Create',            'faq', ARRAY['create'], 'Create FAQ entries'),
('faq.edit',              'FAQ Edit',              'faq', ARRAY['edit'], 'Edit FAQ entries'),
('faq.delete',            'FAQ Delete',            'faq', ARRAY['delete'], 'Delete FAQ entries'),
('faq.manage_status',     'FAQ Status',            'faq', ARRAY['edit'], 'Manage FAQ status'),
-- seo
('seo.view',              'SEO View',              'seo', ARRAY['view'], 'View SEO settings'),
('seo.edit',              'SEO Edit',              'seo', ARRAY['edit'], 'Edit SEO settings'),
('seo.manage_settings',   'SEO Manage',            'seo', ARRAY['edit'], 'Manage SEO redirects/pages'),
-- marketing settings
('marketing_settings.view','Marketing Settings View','marketing_settings', ARRAY['view'], 'View marketing settings'),
('marketing_settings.edit','Marketing Settings Edit','marketing_settings', ARRAY['edit'], 'Edit marketing settings'),
('marketing_settings.manage_settings','Marketing Settings Manage','marketing_settings', ARRAY['edit'], 'Manage marketing settings'),
-- settings
('settings.view',         'Settings View',         'settings', ARRAY['view'], 'View settings center'),
('settings.edit',         'Settings Edit',         'settings', ARRAY['edit'], 'Edit settings'),
('settings.manage_settings','Settings Manage',     'settings', ARRAY['edit'], 'Manage settings'),
-- legal pages
('legal_pages.view',      'Legal Pages View',      'legal_pages', ARRAY['view'], 'View legal pages'),
('legal_pages.create',    'Legal Pages Create',    'legal_pages', ARRAY['create'], 'Create legal pages'),
('legal_pages.edit',      'Legal Pages Edit',      'legal_pages', ARRAY['edit'], 'Edit legal pages'),
('legal_pages.delete',    'Legal Pages Delete',    'legal_pages', ARRAY['delete'], 'Delete legal pages'),
('legal_pages.manage_settings','Legal Pages Manage','legal_pages', ARRAY['edit'], 'Manage legal pages'),
-- about page
('about_page.view',       'About Page View',       'about_page', ARRAY['view'], 'View about page'),
('about_page.create',     'About Page Create',     'about_page', ARRAY['create'], 'Create about page content'),
('about_page.edit',       'About Page Edit',       'about_page', ARRAY['edit'], 'Edit about page content'),
('about_page.delete',     'About Page Delete',     'about_page', ARRAY['delete'], 'Delete about page content'),
('about_page.manage_settings','About Page Manage', 'about_page', ARRAY['edit'], 'Manage about page settings'),
-- media
('media.view',            'Media View',            'media', ARRAY['view'], 'View media library'),
('media.upload',          'Media Upload',          'media', ARRAY['create'], 'Upload media'),
('media.delete',          'Media Delete',          'media', ARRAY['delete'], 'Delete media'),
('media.manage_settings', 'Media Manage',          'media', ARRAY['edit'], 'Manage media library'),
-- blog
('blog.view',             'Blog View',             'blog', ARRAY['view'], 'View blog'),
('blog.create',           'Blog Create',           'blog', ARRAY['create'], 'Create blog posts'),
('blog.edit',             'Blog Edit',             'blog', ARRAY['edit'], 'Edit blog posts'),
('blog.delete',           'Blog Delete',           'blog', ARRAY['delete'], 'Delete blog posts'),
('blog.manage_status',    'Blog Status',           'blog', ARRAY['edit'], 'Manage blog post status'),
-- testimonials
('testimonials.view',     'Testimonials View',     'testimonials', ARRAY['view'], 'View testimonials'),
('testimonials.create',   'Testimonials Create',   'testimonials', ARRAY['create'], 'Create testimonials'),
('testimonials.edit',     'Testimonials Edit',     'testimonials', ARRAY['edit'], 'Edit testimonials'),
('testimonials.delete',   'Testimonials Delete',   'testimonials', ARRAY['delete'], 'Delete testimonials'),
('testimonials.manage_status','Testimonials Status','testimonials', ARRAY['edit'], 'Manage testimonial status'),
-- invoices
('invoices.view',         'Invoices View',         'invoices', ARRAY['view'], 'View invoices'),
('invoices.create',       'Invoices Create',       'invoices', ARRAY['create'], 'Create invoices'),
('invoices.print',        'Invoices Print',        'invoices', ARRAY['view'], 'Print invoices'),
('invoices.export',       'Invoices Export',       'invoices', ARRAY['export'], 'Export invoices'),
-- shipping
('shipping.view',         'Shipping View',         'shipping', ARRAY['view'], 'View shipping zones/couriers'),
('shipping.create',       'Shipping Create',       'shipping', ARRAY['create'], 'Create shipping zones/couriers'),
('shipping.edit',         'Shipping Edit',         'shipping', ARRAY['edit'], 'Edit shipping zones/couriers'),
('shipping.delete',       'Shipping Delete',       'shipping', ARRAY['delete'], 'Delete shipping zones/couriers'),
('shipping.manage_settings','Shipping Manage',     'shipping', ARRAY['edit'], 'Manage shipping settings'),
-- deliveries
('deliveries.view',       'Deliveries View',       'deliveries', ARRAY['view'], 'View deliveries'),
('deliveries.create',     'Deliveries Create',     'deliveries', ARRAY['create'], 'Create deliveries'),
('deliveries.edit',       'Deliveries Edit',       'deliveries', ARRAY['edit'], 'Edit deliveries'),
('deliveries.manage_status','Deliveries Status',   'deliveries', ARRAY['edit'], 'Manage delivery status'),
-- payments
('payments.view',         'Payments View',         'payments', ARRAY['view'], 'View payments'),
('payments.create',       'Payments Create',       'payments', ARRAY['create'], 'Create payments'),
('payments.edit',         'Payments Edit',         'payments', ARRAY['edit'], 'Edit payments'),
('payments.manage_status','Payments Status',       'payments', ARRAY['edit'], 'Manage payment status'),
('payments.export',       'Payments Export',       'payments', ARRAY['export'], 'Export payments'),
-- transactions
('transactions.view',     'Transactions View',     'transactions', ARRAY['view'], 'View transactions'),
('transactions.create',   'Transactions Create',   'transactions', ARRAY['create'], 'Create transactions'),
('transactions.edit',     'Transactions Edit',     'transactions', ARRAY['edit'], 'Edit transactions'),
('transactions.export',   'Transactions Export',   'transactions', ARRAY['export'], 'Export transactions'),
-- finance
('finance.view',          'Finance View',          'finance', ARRAY['view'], 'View finance/expenses'),
('finance.create',        'Finance Create',        'finance', ARRAY['create'], 'Create expenses/records'),
('finance.edit',          'Finance Edit',          'finance', ARRAY['edit'], 'Edit expenses/records'),
('finance.delete',        'Finance Delete',        'finance', ARRAY['delete'], 'Delete expenses/records'),
('finance.export',        'Finance Export',        'finance', ARRAY['export'], 'Export finance data'),
('finance.manage_settings','Finance Manage',       'finance', ARRAY['edit'], 'Manage finance settings'),
-- reports
('reports.view',          'Reports View',          'reports', ARRAY['view'], 'View reports'),
('reports.export',        'Reports Export',        'reports', ARRAY['export'], 'Export reports'),
('reports.print',         'Reports Print',         'reports', ARRAY['view'], 'Print reports'),
('reports.manage_reports','Reports Configure',     'reports', ARRAY['edit'], 'Configure reports');

-- ------------------------------------------------------------
-- 3. Ensure warehouse_staff system role exists
-- ------------------------------------------------------------
INSERT INTO roles (name, description, is_system, priority, color, icon)
VALUES ('warehouse_staff', 'Warehouse staff with inventory and fulfilment access', true, 5, '#a16207', 'Warehouse')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Re-seed role_permissions
-- ------------------------------------------------------------

-- super_admin & owner -> ALL permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'owner')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- manager -> all except high-privilege actions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.code NOT IN (
    'users.delete', 'users.manage_settings',
    'roles.create', 'roles.edit', 'roles.delete', 'roles.assign', 'roles.manage_settings',
    'permissions.manage_settings',
    'security.edit', 'security.export', 'security.manage_settings',
    'audit_logs.export', 'login_history.export',
    'backup.create', 'backup.delete', 'backup.manage_settings',
    'settings.manage_settings',
    'legal_pages.manage_settings', 'about_page.manage_settings',
    'finance.manage_settings', 'marketing_settings.manage_settings',
    'analytics.manage_settings', 'media.manage_settings', 'payments.manage_settings',
    'shipping.manage_settings', 'seo.manage_settings', 'notifications.manage_settings'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- inventory_manager
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'inventory_manager'
  AND p.code IN (
    'dashboard.view', 'dashboard.export',
    'products.view', 'products.create', 'products.edit', 'products.approve', 'products.export', 'products.import',
    'brands.view', 'brands.create', 'brands.edit',
    'categories.view', 'categories.create', 'categories.edit',
    'subcategories.view', 'subcategories.create', 'subcategories.edit',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.export', 'inventory.manage_status',
    'warehouses.view', 'warehouses.create', 'warehouses.edit', 'warehouses.assign', 'warehouses.manage_status',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit', 'purchase_orders.approve', 'purchase_orders.manage_status',
    'stock_movement.view', 'stock_movement.export',
    'reports.view', 'reports.export',
    'analytics.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- sales_manager
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'sales_manager'
  AND p.code IN (
    'dashboard.view', 'dashboard.export', 'analytics.view',
    'products.view', 'inventory.view',
    'orders.view', 'orders.create', 'orders.edit', 'orders.approve', 'orders.reject', 'orders.assign', 'orders.export', 'orders.print', 'orders.manage_status', 'orders.manage_notifications',
    'order_requests.view', 'order_requests.create', 'order_requests.edit', 'order_requests.approve', 'order_requests.reject', 'order_requests.assign', 'order_requests.manage_status',
    'customers.view', 'customers.create', 'customers.edit', 'customers.export', 'customers.manage_status',
    'returns.view', 'returns.create', 'returns.edit', 'returns.approve', 'returns.reject', 'returns.manage_status',
    'refunds.view', 'refunds.approve', 'refunds.reject', 'refunds.manage_status',
    'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.manage_status',
    'flash_sale.view', 'flash_sale.create', 'flash_sale.edit', 'flash_sale.manage_status',
    'special_offer.view', 'special_offer.create', 'special_offer.edit', 'special_offer.manage_status',
    'free_shipping.view', 'free_shipping.create', 'free_shipping.edit', 'free_shipping.manage_status',
    'bundle_offers.view', 'bundle_offers.create', 'bundle_offers.edit', 'bundle_offers.manage_status',
    'invoices.view', 'invoices.create', 'invoices.print', 'invoices.export',
    'payments.view', 'payments.manage_status',
    'transactions.view', 'transactions.create', 'transactions.edit',
    'reports.view', 'reports.export', 'reports.print'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- marketing_manager
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'marketing_manager'
  AND p.code IN (
    'dashboard.view', 'analytics.view', 'analytics.export',
    'products.view',
    'customers.view',
    'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete', 'coupons.export', 'coupons.manage_status',
    'flash_sale.view', 'flash_sale.create', 'flash_sale.edit', 'flash_sale.delete', 'flash_sale.manage_status',
    'special_offer.view', 'special_offer.create', 'special_offer.edit', 'special_offer.delete', 'special_offer.manage_status',
    'popup_campaigns.view', 'popup_campaigns.create', 'popup_campaigns.edit', 'popup_campaigns.delete', 'popup_campaigns.manage_status',
    'email_campaigns.view', 'email_campaigns.create', 'email_campaigns.edit', 'email_campaigns.delete', 'email_campaigns.export', 'email_campaigns.manage_status',
    'bundle_offers.view', 'bundle_offers.create', 'bundle_offers.edit', 'bundle_offers.delete', 'bundle_offers.manage_status',
    'free_shipping.view', 'free_shipping.create', 'free_shipping.edit', 'free_shipping.delete', 'free_shipping.manage_status',
    'site_visuals.view', 'site_visuals.create', 'site_visuals.edit', 'site_visuals.delete', 'site_visuals.upload', 'site_visuals.manage_status',
    'services.view', 'services.create', 'services.edit', 'services.delete',
    'faq.view', 'faq.create', 'faq.edit', 'faq.delete', 'faq.manage_status',
    'seo.view', 'seo.edit', 'seo.manage_settings',
    'marketing_settings.view', 'marketing_settings.edit', 'marketing_settings.manage_settings',
    'media.view', 'media.upload', 'media.delete',
    'blog.view', 'blog.create', 'blog.edit', 'blog.delete', 'blog.manage_status',
    'testimonials.view', 'testimonials.create', 'testimonials.edit', 'testimonials.delete', 'testimonials.manage_status',
    'reports.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- customer_support
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'customer_support'
  AND p.code IN (
    'dashboard.view',
    'chat.view', 'chat.create', 'chat.edit', 'chat.assign', 'chat.manage_status',
    'support_tickets.view', 'support_tickets.create', 'support_tickets.edit', 'support_tickets.assign', 'support_tickets.manage_status',
    'contact_messages.view', 'contact_messages.edit', 'contact_messages.delete', 'contact_messages.manage_status',
    'customers.view', 'customers.edit',
    'orders.view',
    'design_requests.view', 'design_requests.create', 'design_requests.edit', 'design_requests.assign', 'design_requests.manage_status',
    'reviews.view', 'reviews.edit',
    'notifications.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- content_manager
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'content_manager'
  AND p.code IN (
    'dashboard.view', 'analytics.view',
    'products.view', 'products.create', 'products.edit',
    'brands.view', 'brands.create', 'brands.edit',
    'categories.view', 'categories.create', 'categories.edit',
    'subcategories.view', 'subcategories.create', 'subcategories.edit',
    'site_visuals.view', 'site_visuals.create', 'site_visuals.edit', 'site_visuals.upload', 'site_visuals.manage_status',
    'services.view', 'services.create', 'services.edit',
    'faq.view', 'faq.create', 'faq.edit', 'faq.manage_status',
    'seo.view', 'seo.edit',
    'media.view', 'media.upload', 'media.delete',
    'blog.view', 'blog.create', 'blog.edit', 'blog.delete', 'blog.manage_status',
    'testimonials.view', 'testimonials.create', 'testimonials.edit', 'testimonials.manage_status',
    'legal_pages.view', 'legal_pages.edit',
    'about_page.view', 'about_page.create', 'about_page.edit',
    'settings.view',
    'reports.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- finance_manager
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'finance_manager'
  AND p.code IN (
    'dashboard.view',
    'finance.view', 'finance.create', 'finance.edit', 'finance.delete', 'finance.export',
    'transactions.view', 'transactions.create', 'transactions.edit', 'transactions.export',
    'payments.view', 'payments.create', 'payments.edit', 'payments.manage_status', 'payments.export',
    'refunds.view', 'refunds.approve', 'refunds.reject', 'refunds.manage_status', 'refunds.export',
    'invoices.view', 'invoices.create', 'invoices.print', 'invoices.export',
    'customers.view', 'orders.view',
    'reports.view', 'reports.export', 'reports.print'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- staff
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'staff'
  AND p.code IN (
    'dashboard.view', 'products.view', 'orders.view', 'customers.view', 'inventory.view', 'reports.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- warehouse_staff
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'warehouse_staff'
  AND p.code IN (
    'dashboard.view',
    'inventory.view', 'inventory.edit', 'inventory.manage_status',
    'warehouses.view', 'warehouses.assign', 'warehouses.manage_status',
    'stock_movement.view', 'stock_movement.export',
    'orders.view', 'orders.edit', 'orders.manage_status',
    'products.view', 'products.edit',
    'reports.view', 'reports.export'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Assign roles to existing internal users (removes bypass)
-- ------------------------------------------------------------

-- profiles.role = admin / super_admin  ->  super_admin role
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p
JOIN roles r ON r.name = 'super_admin'
WHERE p.user_type = 'internal'
  AND p.role IN ('admin', 'super_admin')
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

-- profiles.role = manager  ->  manager role
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p
JOIN roles r ON r.name = 'manager'
WHERE p.user_type = 'internal'
  AND p.role = 'manager'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

-- profiles.role = staff  ->  staff role
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p
JOIN roles r ON r.name = 'staff'
WHERE p.user_type = 'internal'
  AND p.role = 'staff'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

-- is_warehouse_staff  ->  warehouse_staff role
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p
JOIN roles r ON r.name = 'warehouse_staff'
WHERE p.user_type = 'internal'
  AND (p.is_warehouse_staff = true OR p.role = 'warehouse_staff')
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

COMMIT;