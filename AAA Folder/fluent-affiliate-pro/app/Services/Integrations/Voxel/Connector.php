<?php

namespace FluentAffiliatePro\App\Services\Integrations\Voxel;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Modules\Integrations\BaseConnectorSettings;
use FluentAffiliate\Framework\Support\Arr;

class Connector extends BaseConnectorSettings
{
    protected $integration = 'voxel';

    public function init()
    {
        $this->register();
    }

    public function isAvailable()
    {
        return function_exists('\Voxel\is_debug_mode');
    }

    public function getInfo()
    {
        return [
            'integration'    => $this->integration,
            'title'          => 'Voxel',
            'description'    => 'Connect FluentAffiliate with Voxel Ecommerce to track sales and commissions',
            'type'           => 'commerce',
            'logo'           => Utility::asset('images/integrations/voxel.svg'),
            'is_unavailable' => !$this->isAvailable(),
            'config'         => $this->config(),
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

        $settings = Utility::getOption('_' . $this->integration . '_connector_config', []);

        return wp_parse_args($settings, $defaults);
    }

    public function getProductCatOptions($options = [], $params = [])
    {
        $search = Arr::get($params, 'search', '');
        $includeIds = Arr::get($params, 'include_ids', []);

        return $this->getCustomPostTypeOptions([
            'post_type'   => 'products',
            'search'      => $search,
            'include_ids' => $includeIds
        ]);
    }

    public function getConfigFields()
    {
        return [
            'custom_rate_component' => [
                'type'           => 'custom_rate_component',
                'has_categories' => false,
                'has_products'   => true,
                'product_label'  => __('Voxel products', 'fluent-affiliate-pro'),
                'main_label'     => __('Enable custom rate for specific products', 'fluent-affiliate-pro'),
            ]
        ];
    }

}
