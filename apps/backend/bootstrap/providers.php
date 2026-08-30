<?php

use App\Domains\Commerce\Catalog\Providers\CatalogServiceProvider;
use App\Domains\Commerce\Checkout\Providers\CheckoutServiceProvider;
use App\Domains\Commerce\Customers\Providers\CustomersServiceProvider;
use App\Domains\Commerce\Inventory\Providers\InventoryServiceProvider;
use App\Domains\Commerce\Orders\Providers\OrdersServiceProvider;
use App\Domains\Commerce\Payments\Providers\PaymentsServiceProvider;
use App\Domains\Commerce\Pricing\Providers\PricingServiceProvider;
use App\Domains\Commerce\Promotions\Providers\PromotionsServiceProvider;
use App\Domains\Commerce\Reviews\Providers\ReviewsServiceProvider;
use App\Domains\Commerce\Search\Providers\SearchServiceProvider;
use App\Domains\Operations\Fulfillment\Providers\FulfillmentServiceProvider;
use App\Domains\Operations\Notifications\Providers\NotificationsServiceProvider;
use App\Domains\Operations\Returns\Providers\ReturnsServiceProvider;
use App\Domains\Operations\Shipping\Providers\ShippingServiceProvider;
use App\Domains\Platform\Appearance\Providers\AppearanceServiceProvider;
use App\Domains\Platform\Foundation\Providers\FoundationServiceProvider;
use App\Domains\Platform\IdentityAccess\Providers\IdentityAccessServiceProvider;
use App\Domains\Platform\Installer\Providers\InstallerServiceProvider;
use App\Domains\Platform\Localization\Providers\LocalizationServiceProvider;
use App\Domains\Platform\Media\Providers\MediaServiceProvider;
use App\Domains\Platform\StoreConfiguration\Providers\StoreConfigurationServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    FoundationServiceProvider::class,
    IdentityAccessServiceProvider::class,
    StoreConfigurationServiceProvider::class,
    MediaServiceProvider::class,
    AppearanceServiceProvider::class,
    CatalogServiceProvider::class,
    InventoryServiceProvider::class,
    LocalizationServiceProvider::class,
    InstallerServiceProvider::class,
    CustomersServiceProvider::class,
    PricingServiceProvider::class,
    PromotionsServiceProvider::class,
    OrdersServiceProvider::class,
    CheckoutServiceProvider::class,
    PaymentsServiceProvider::class,
    ShippingServiceProvider::class,
    FulfillmentServiceProvider::class,
    ReturnsServiceProvider::class,
    NotificationsServiceProvider::class,
    SearchServiceProvider::class,
    ReviewsServiceProvider::class,
];
