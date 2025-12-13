<?php

namespace FluentAffiliatePro\App\Services\Integrations\Give;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Modules\Integrations\BaseConnectorSettings;
use FluentAffiliate\Framework\Support\Arr;

class Connector extends BaseConnectorSettings
{
    protected $integration = 'give';

    public function init()
    {
        $this->register();
    }

    public function isAvailable()
    {
        return defined('\GIVE_VERSION');
    }

    public function getInfo()
    {
        return [
            'integration'    => $this->integration,
            'title'          => 'GiveWP',
            'description'    => 'Connect FluentAffiliate with GiveWP to track donations and commissions',
            'type'           => 'commerce',
            'logo'           => Utility::asset('images/integrations/give.svg'),
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
            'post_type'      => 'give_forms',
            'search'         => $search,
            'include_ids'    => $includeIds
        ]);
    }

    public function getConfigFields()
    {
        return [
            'custom_rate_component' => [
                'type'           => 'custom_rate_component',
                'has_categories' => false,
                'has_products'   => true,
                'product_label'  => __('GiveWP Forms', 'fluent-affiliate-pro'),
                'main_label'     => __('Enable custom rate for specific donation forms', 'fluent-affiliate-pro'),
            ]
        ];
    }

}
