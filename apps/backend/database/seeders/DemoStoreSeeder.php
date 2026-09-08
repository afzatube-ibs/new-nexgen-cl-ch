<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Models\Category;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use App\Domains\Commerce\Pricing\Models\PriceList;
use App\Domains\Commerce\Pricing\Models\PriceListEntry;
use App\Domains\Platform\Appearance\Models\StoreAppearance;
use App\Domains\Platform\Cms\Models\CmsMenu;
use App\Domains\Platform\Cms\Models\CmsPage;
use App\Domains\Platform\Media\Models\MediaAsset;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Explicit, demo-only business data for disposable development / CI browser
 * verification. This seeder is deliberately NOT called by DatabaseSeeder:
 * a production bootstrap must remain credential-free and business-data-free.
 *
 * Run intentionally with:
 *   php artisan db:seed --class=DemoStoreSeeder --force
 */
final class DemoStoreSeeder extends Seeder
{
    private const string STORE_EMAIL = 'demo@nexgen.local';

    public function run(): void
    {
        DB::transaction(function (): void {
            $store = $this->seedStore();
            $categories = $this->seedCategories();
            $brands = $this->seedBrands();
            $products = $this->seedProducts($categories, $brands);

            $this->seedPricing($products);
            $this->seedInventory($products);
            $this->seedAppearance($store);
            $this->seedCms($store, $categories);
        });
    }

    private function seedStore(): Store
    {
        return Store::query()->updateOrCreate(
            ['contact_email' => self::STORE_EMAIL],
            [
                'name' => 'neXgen Baby Store',
                'legal_name' => 'neXgen Demo Commerce',
                'currency_code' => 'BDT',
                'locale' => 'en-BD',
                'timezone' => 'Asia/Dhaka',
                'contact_phone' => '+8801700000000',
                'address_line1' => 'Demo Commerce Hub',
                'city' => 'Dhaka',
                'region' => 'Dhaka',
                'postal_code' => '1207',
                'country_code' => 'BD',
                'status' => Store::STATUS_ACTIVE,
            ],
        );
    }

    /** @return array<string, Category> */
    private function seedCategories(): array
    {
        $definitions = [
            'strollers' => ['name' => 'Strollers', 'description' => 'Comfortable everyday rides for little explorers.'],
            'feeding' => ['name' => 'Feeding', 'description' => 'Practical essentials for easier mealtimes.'],
            'nursery' => ['name' => 'Nursery', 'description' => 'Cozy sleep and nursery essentials for babies.'],
            'essentials' => ['name' => 'Baby Essentials', 'description' => 'Soft everyday essentials for growing little ones.'],
        ];

        $categories = [];
        foreach ($definitions as $key => $definition) {
            $categories[$key] = Category::query()->updateOrCreate(
                ['slug' => Str::slug($definition['name'])],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'status' => Category::STATUS_ACTIVE,
                ],
            );
        }

        return $categories;
    }

    /** @return array<string, Brand> */
    private function seedBrands(): array
    {
        $definitions = [
            'baobaohao' => ['name' => 'Baobaohao', 'description' => 'Baby mobility and everyday gear.'],
            'nexgen' => ['name' => 'neXgen Select', 'description' => 'Curated demo essentials for storefront verification.'],
        ];

        $brands = [];
        foreach ($definitions as $key => $definition) {
            $brands[$key] = Brand::query()->updateOrCreate(
                ['slug' => Str::slug($definition['name'])],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'status' => Brand::STATUS_ACTIVE,
                ],
            );
        }

        return $brands;
    }

    /**
     * @param array<string, Category> $categories
     * @param array<string, Brand> $brands
     * @return array<int, Product>
     */
    private function seedProducts(array $categories, array $brands): array
    {
        $definitions = [
            [
                'sku' => 'NX-A10-GRAY',
                'name' => 'Baobaohao A10 Baby Stroller - Gray',
                'short' => 'A practical everyday stroller with a protective canopy and roomy storage.',
                'description' => 'A comfortable stroller for everyday family outings, presented here as realistic demo catalog content for neXgen storefront verification.',
                'weight' => 7200,
                'brand' => 'baobaohao',
                'category' => 'strollers',
                'price' => '7490.0000',
                'compare' => '7990.0000',
                'stock' => 18,
                'rgb' => [107, 114, 128],
            ],
            [
                'sku' => 'NX-A10-GREEN',
                'name' => 'Baobaohao A10 Baby Stroller - Green',
                'short' => 'A sage-green everyday stroller made for comfortable family outings.',
                'description' => 'A second colour variant that makes product grids and category pages visually representative of a real merchant catalog.',
                'weight' => 7200,
                'brand' => 'baobaohao',
                'category' => 'strollers',
                'price' => '7490.0000',
                'compare' => '7990.0000',
                'stock' => 14,
                'rgb' => [104, 128, 105],
            ],
            [
                'sku' => 'NX-FEED-01',
                'name' => 'ComfortFold Baby Feeding Chair',
                'short' => 'A supportive feeding chair for easier everyday mealtimes.',
                'description' => 'Demo feeding gear with real price, inventory, category, brand and storefront media relationships.',
                'weight' => 5400,
                'brand' => 'nexgen',
                'category' => 'feeding',
                'price' => '4590.0000',
                'compare' => null,
                'stock' => 22,
                'rgb' => [201, 167, 120],
            ],
            [
                'sku' => 'NX-BASSINET-01',
                'name' => 'SoftNest Baby Bassinet',
                'short' => 'A cozy bedside bassinet for a calm nursery setup.',
                'description' => 'A nursery product used to exercise real Storefront cards, PDP routing, pricing and stock availability.',
                'weight' => 8600,
                'brand' => 'nexgen',
                'category' => 'nursery',
                'price' => '8990.0000',
                'compare' => '9490.0000',
                'stock' => 9,
                'rgb' => [176, 196, 222],
            ],
            [
                'sku' => 'NX-BIB-SET',
                'name' => 'CozyCare Cotton Bib Set',
                'short' => 'Soft cotton bibs for feeding time and everyday messes.',
                'description' => 'A lightweight baby essential with genuine BDT pricing and on-hand inventory in the demo dataset.',
                'weight' => 240,
                'brand' => 'nexgen',
                'category' => 'essentials',
                'price' => '690.0000',
                'compare' => null,
                'stock' => 48,
                'rgb' => [222, 184, 135],
            ],
            [
                'sku' => 'NX-SOCK-SET',
                'name' => 'WarmSteps Baby Socks Set',
                'short' => 'A soft multi-pair socks set for little feet.',
                'description' => 'An affordable accessory product that makes the populated storefront exercise mixed price points and inventory levels.',
                'weight' => 180,
                'brand' => 'nexgen',
                'category' => 'essentials',
                'price' => '490.0000',
                'compare' => '590.0000',
                'stock' => 60,
                'rgb' => [216, 191, 216],
            ],
        ];

        $products = [];
        foreach ($definitions as $definition) {
            $brand = $brands[$definition['brand']];
            $category = $categories[$definition['category']];

            $product = Product::query()->updateOrCreate(
                ['sku' => $definition['sku']],
                [
                    'brand_id' => $brand->id,
                    'name' => $definition['name'],
                    'slug' => Str::slug($definition['name']),
                    'description' => $definition['description'],
                    'short_description' => $definition['short'],
                    'product_type' => Product::TYPE_SIMPLE,
                    'weight_grams' => $definition['weight'],
                    'status' => Product::STATUS_ACTIVE,
                    'visibility' => Product::VISIBILITY_CATALOG_SEARCH,
                    'meta_title' => $definition['name'].' | neXgen Baby Store',
                    'meta_description' => $definition['short'],
                    'published_at' => now(),
                ],
            );

            $product->categories()->sync([$category->id => ['position' => 0]]);
            $this->seedProductMedia($product, $definition['rgb']);

            $product->setAttribute('demo_price', $definition['price']);
            $product->setAttribute('demo_compare_price', $definition['compare']);
            $product->setAttribute('demo_stock', $definition['stock']);
            $products[] = $product;
        }

        return $products;
    }

    /** @param array{0:int,1:int,2:int} $rgb */
    private function seedProductMedia(Product $product, array $rgb): void
    {
        $filename = strtolower($product->sku).'.png';
        $path = 'demo/products/'.$filename;
        $bytes = $this->solidPng(720, 720, $rgb[0], $rgb[1], $rgb[2]);
        Storage::disk('public')->put($path, $bytes);

        $asset = MediaAsset::query()->updateOrCreate(
            ['disk' => 'public', 'path' => $path],
            [
                'filename' => $filename,
                'mime_type' => 'image/png',
                'size' => strlen($bytes),
                'width' => 720,
                'height' => 720,
                'alt_text' => $product->name,
                'uploaded_by' => null,
            ],
        );

        $product->images()->where('is_primary', true)->delete();
        $product->images()->create([
            'media_id' => $asset->id,
            'position' => 0,
            'is_primary' => true,
        ]);
    }

    /** @param array<int, Product> $products */
    private function seedPricing(array $products): void
    {
        PriceList::query()->where('is_default', true)->update(['is_default' => false]);

        $priceList = PriceList::query()->updateOrCreate(
            ['name' => 'Bangladesh Demo Retail'],
            [
                'currency_code' => 'BDT',
                'is_default' => true,
                'status' => PriceList::STATUS_ACTIVE,
            ],
        );

        foreach ($products as $product) {
            PriceListEntry::query()->updateOrCreate(
                ['price_list_id' => $priceList->id, 'sku' => $product->sku],
                [
                    'base_price' => (string) $product->getAttribute('demo_price'),
                    'compare_at_price' => $product->getAttribute('demo_compare_price'),
                    'sale_price' => null,
                    'sale_starts_at' => null,
                    'sale_ends_at' => null,
                ],
            );
        }
    }

    /** @param array<int, Product> $products */
    private function seedInventory(array $products): void
    {
        Warehouse::query()->where('is_default', true)->update(['is_default' => false]);

        $warehouse = Warehouse::query()->updateOrCreate(
            ['code' => 'dhaka_demo'],
            [
                'name' => 'Dhaka Demo Warehouse',
                'address_line1' => 'Demo Commerce Hub',
                'city' => 'Dhaka',
                'country_code' => 'BD',
                'is_default' => true,
                'status' => Warehouse::STATUS_ACTIVE,
            ],
        );

        foreach ($products as $product) {
            StockItem::query()->updateOrCreate(
                ['warehouse_id' => $warehouse->id, 'sku' => $product->sku],
                [
                    'quantity_on_hand' => (int) $product->getAttribute('demo_stock'),
                    'quantity_reserved' => 0,
                ],
            );
        }
    }

    private function seedAppearance(Store $store): void
    {
        $appearance = StoreAppearance::query()->updateOrCreate(
            ['store_id' => $store->id],
            [
                'primary_color' => '#2F6F5E',
                'secondary_color' => '#E8F1EC',
                'accent_color' => '#C98E5B',
                'border_radius' => StoreAppearance::RADIUS_LG,
                'typography_preset' => 'jakarta-friendly',
                'button_style' => StoreAppearance::BUTTON_STYLE_SOLID,
                'announcement_enabled' => true,
                'announcement_text' => 'Demo storefront — real catalog, BDT pricing and stock powered by neXgen Core.',
                'whatsapp_number' => '+8801700000000',
            ],
        );

        $appearance->forceFill([
            'published_snapshot' => $appearance->only(StoreAppearance::TRACKED_FIELDS),
            'published_at' => now(),
            'published_by' => null,
        ])->save();
    }

    /** @param array<string, Category> $categories */
    private function seedCms(Store $store, array $categories): void
    {
        $home = CmsPage::query()->updateOrCreate(
            ['store_id' => $store->id, 'slug' => 'home'],
            [
                'title' => 'Homepage',
                'locale' => 'en-BD',
                'content' => [
                    [
                        'type' => 'Hero',
                        'key' => 'hero',
                        'configuration' => [
                            'heading' => 'Everything your little one needs, in one place',
                            'subheading' => 'Explore a fully populated neXgen demo store with real BDT pricing, inventory and merchant-controlled content.',
                            'cta' => ['label' => 'Shop featured', 'href' => '#featured-products'],
                        ],
                    ],
                    ['type' => 'CategoryGrid', 'key' => 'category-grid', 'configuration' => ['heading' => 'Shop by category']],
                    ['type' => 'ProductGrid', 'key' => 'featured-products', 'configuration' => ['heading' => 'Featured baby essentials']],
                    ['type' => 'ProductGrid', 'key' => 'recently-added', 'configuration' => ['heading' => 'New in the store']],
                    ['type' => 'BrandSlider', 'key' => 'brand-slider', 'configuration' => ['heading' => 'Trusted demo brands']],
                ],
                'meta_title' => 'neXgen Baby Store Demo',
                'meta_description' => 'A populated Bangladesh-first neXgen Core storefront with real catalog, pricing, stock, CMS and branding.',
            ],
        );

        $home->forceFill([
            'published_snapshot' => $home->draftSnapshot(),
            'status' => CmsPage::STATUS_PUBLISHED,
            'published_at' => now(),
            'published_by' => null,
        ])->save();

        $menuItems = [
            ['id' => 'demo-home', 'label' => 'Home', 'href' => '/'],
        ];
        foreach (['strollers', 'feeding', 'nursery', 'essentials'] as $key) {
            $category = $categories[$key];
            $menuItems[] = [
                'id' => 'demo-'.$key,
                'label' => $category->name,
                'href' => '/categories/'.$category->id.'-'.Str::slug($category->name),
            ];
        }

        $menu = CmsMenu::query()->updateOrCreate(
            ['store_id' => $store->id, 'handle' => 'main-navigation'],
            [
                'title' => 'Main navigation',
                'items' => $menuItems,
            ],
        );

        $menu->forceFill([
            'published_snapshot' => $menu->draftSnapshot(),
            'status' => CmsMenu::STATUS_PUBLISHED,
            'published_at' => now(),
            'published_by' => null,
        ])->save();
    }

    /**
     * Produce a valid RGB PNG without requiring the GD extension. Product
     * names/prices remain semantic HTML; these simple swatches only ensure
     * browser evidence exercises the real Media -> Catalog -> Gateway image
     * path instead of a placeholder-only storefront.
     */
    private function solidPng(int $width, int $height, int $red, int $green, int $blue): string
    {
        $pixel = pack('CCC', $red, $green, $blue);
        $row = "\x00".str_repeat($pixel, $width);
        $raw = str_repeat($row, $height);

        return "\x89PNG\r\n\x1a\n"
            .$this->pngChunk('IHDR', pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0))
            .$this->pngChunk('IDAT', gzcompress($raw, 9))
            .$this->pngChunk('IEND', '');
    }

    private function pngChunk(string $type, string $data): string
    {
        return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
    }
}
