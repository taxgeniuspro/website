<?php

namespace FluentAffiliatePro\App\Services\Integrations\PMP;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Modules\Integrations\BaseConnectorSettings;

class Connector extends BaseConnectorSettings
{
    protected $integration = 'pmp';

    public function init()
    {
        $this->register();
    }

    public function isAvailable()
    {
        return defined('\PMPRO_VERSION');
    }

    public function getInfo()
    {
        return [
            'integration'    => $this->integration,
            'title'          => 'Paid Memberships Pro',
            'description'    => 'Connect FluentAffiliate with Paid Memberships Pro Membership levels to track sales and commissions',
            'type'           => 'membership',
            'logo'           => Utility::asset('images/integrations/pmp.png'),
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

        $levels = pmpro_getAllLevels(true, true);

        $formattedLevels = [];

        foreach ($levels as $levelId => $level) {
            $formattedLevels[] = [
                'id'    => $levelId,
                'label' => $level->name,
            ];
        }

        return $formattedLevels;
    }

    public function getConfigFields()
    {
        return [
            'custom_rate_component' => [
                'type'           => 'custom_rate_component',
                'has_categories' => false,
                'has_products'   => true,
                'main_label'     => __('Enable custom rate for specific membership or categories', 'fluent-affiliate-pro'),
            ]
        ];
    }

}
