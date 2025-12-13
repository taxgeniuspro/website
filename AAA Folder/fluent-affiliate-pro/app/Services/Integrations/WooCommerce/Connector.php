<?php

namespace FluentAffiliatePro\App\Services\Integrations\WooCommerce;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Modules\Integrations\BaseConnectorSettings;
use FluentAffiliate\Framework\Support\Arr;

class Connector extends BaseConnectorSettings
{
    protected $integration = 'woo';

    public function init()
    {
        $this->register();
    }

    public function isAvailable()
    {
        return defined('\WC_PLUGIN_FILE');
    }

    public function getInfo()
    {
        return [
            'integration'    => $this->integration,
            'title'          => 'WooCommerce',
            'description'    => 'Connect FluentAffiliate with WooCommerce to track sales and commissions',
            'type'           => 'commerce',
            'logo'           => Utility::asset('images/integrations/woocommerce.svg'),
            'is_unavailable' => !$this->isAvailable(),
            'config'         => $this->config(),
        ];
    }

    public function config()
    {
        $defaults = [
            'is_enabled'                    => 'no',
            'is_enable_woo_menu'            => 'no',
            'affiliate_on_discount_product' => 'no',
            'custom_affiliate_rate'         => 'no',
            'custom_affiliate_rates'        => [],
        ];

        if (!$this->willConnectorRun()) {
            return $defaults;
        }

        $settings = Utility::getOption('_' . $this->integration . '_connector_config', []);

        return wp_parse_args($settings, $defaults);
    }

    public function getProductCatOptions($options = [], $params = [])
    {
        $search = Arr::get($params, 'search', '');

        $includeIds = Arr::get($params, 'include_ids', []);

        if (Arr::get($params, 'object_type') === 'product') {
            return $this->getCustomPostTypeOptions([
                'search'      => $search,
                'include_ids' => $includeIds,
                'post_type'   => 'product',
            ]);
        }

        return $this->getPostTypeTerms([
            'search'      => $search,
            'include_ids' => $includeIds,
            'taxonomy'    => 'product_cat'
        ]);
    }

    public function getConfigFields()
    {
        return [
            'is_enable_woo_menu'            => [
                'type'           => 'inline_checkbox',
                'checkbox_label' => __('Add Affiliate Dashboard in WooCommerce Account Menu', 'fluent-affiliate-pro'),
                'true_label'     => 'yes',
                'false_label'    => 'no',
            ],
            'affiliate_on_discount_product' => [
                'type'           => 'inline_checkbox',
                'checkbox_label' => __('Enable Branded Coupon Codes for affiliates', 'fluent-affiliate-pro'),
                'help_text'      => __('When enabled, you can offer branded coupon codes for affiliates. This allows them to promote products with unique discount codes. You can find the option in Discount Codes editor in WooCommerce', 'fluent-affiliate-pro'),
                'true_label'     => 'yes',
                'false_label'    => 'no',
            ],
            'custom_rate_component'         => [
                'type'           => 'custom_rate_component',
                'has_categories' => true,
                'has_products'   => true,
                'main_label'     => __('Enable custom rate for specific product or categories', 'fluent-affiliate-pro'),
            ]
        ];
    }
}
