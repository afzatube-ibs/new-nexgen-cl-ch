// Module Registration Framework — the ONE place every module's own
// `module.ts` is imported for its side effect (it calls `registerModule()`
// at import time). A future business module (Catalog, Orders, Customers, …)
// adds exactly one new line here — never touches the Admin Shell, the
// router, the Sidebar, the Dashboard, or the Settings page.
import './dashboard/module.js';
import './settings/module.js';
import './catalog/module.js';
import './inventory/module.js';
