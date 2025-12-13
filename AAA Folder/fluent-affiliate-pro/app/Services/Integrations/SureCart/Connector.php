<?php

namespace FluentAffiliatePro\App\Services\Integrations\SureCart;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Modules\Integrations\BaseConnectorSettings;
use FluentAffiliate\Framework\Support\Arr;

class Connector extends BaseConnectorSettings
{
    protected $integration = 'surecart';


    public function init()
    {
        $this->register();
    }

    public function isAvailable()
    {
        return defined('\SURECART_PLUGIN_FILE');
    }

    public function getInfo()
    {
        return [
            'integration'             => $this->integration,
            'title'                   => 'SureCart',
            'description'             => 'Connect Fluent Affiliate with SureCart to track sales and commissions',
            'type'                    => 'commerce',
            'logo'                    => Utility::asset('images/integrations/surecart.svg'),
            'is_unavailable'          => !$this->isAvailable(),
            'config'                  => $this->config(),
            'disable_advanced_config' => true,
        ];
    }

    public function config()
    {
        $defaults = [
            'is_enabled'             => 'no',
            'custom_affiliate_rate'  => 'no',
            'custom_affiliate_rates' => [],
        ];

        if (!$this->willConnectorRun()) {
            return $defaults;
        }

        $config = Utility::getOption('_' . $this->integration . '_connector_config', []);
        $config = wp_parse_args($config, $defaults);

        return $config;
    }

    public function getProductCatOptions($options = [], $params = [])
    {
        $search = Arr::get($params, 'search', '');

        $includeIds = Arr::get($params, 'include_ids', []);

        $products = \SureCart\Models\Product::where(
            [
                'archived' => false,
                'query'    => $search
            ]
        )->paginate([
            'page'     => 1,
            'per_page' => 20
        ]);

        $formattedProducts = [];

        foreach ($products->data as $product) {
            $formattedProducts[$product->id] = [
                'id'    => $product->id,
                'label' => $product->name,
            ];
        }

        if ($includeIds) {
            $missingIds = array_diff($includeIds, array_keys($formattedProducts));
            if ($missingIds) {
                $missingProducts = \SureCart\Models\Product::where(
                    [
                        'ids' => $missingIds
                    ]
                )->get();

                foreach ($missingProducts as $product) {
                    $formattedProducts[$product->id] = [
                        'id'    => $product->id,
                        'label' => $product->name,
                    ];
                }
            }
        }

        return array_values($formattedProducts);
    }

    public function getConfigFields()
    {
        return [
            'custom_rate_component' => [
                'type'           => 'custom_rate_component',
                'has_categories' => false,
                'has_products'   => true,
                'main_label'     => __('Enable custom rate for specific products', 'fluent-affiliate-pro'),
            ]
        ];
    }
}
