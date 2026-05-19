# bohao_web_erp_lithe migration status

## Current state

- Scaffolded from `lithe-admin`
- Renamed package and aligned environment variables with the current `bohao_web_erp`
- Added legacy-compatible proxy, token bootstrap utility, and request interceptor shell
- Added base dependencies needed for shared business components and table/chart tooling
- Replaced template sign-in with the legacy ERP login flow
- Connected legacy ERP user info endpoint: `/user/userInfo/web/erp`
- Added ERP menu tree adapter, migration placeholder page, and dynamic route bootstrap
- `npm run type-check` passes
- `npm run build` passes

## Next slices

1. Rebuild the ERP home/dashboard shell
2. Migrate first business pages:
   - user and role management
   - menu and dictionary
   - core order and workflow pages
3. Add ERP-specific shared stores and utilities as migrated pages begin to need them
4. Backfill profile, message, and task center flows in Lite style where ERP menus expose them

## Local dev

- Default dev port: `3335`
