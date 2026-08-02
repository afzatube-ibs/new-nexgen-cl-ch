<?php

// This backend is API-only, per API:PHILOSOPHY ("every externally
// accessible capability of the platform must be exposed through the
// API") and ARCH:DEPLOYMENT_TOPOLOGY (storefront/admin are independently
// built and deployed frontends that reach the backend only through the
// REST API). There is deliberately no view-rendering web surface here —
// no routes belong in this file. It exists only because Laravel's routing
// configuration (bootstrap/app.php) expects a web routes file to load.
