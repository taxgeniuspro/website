<?php

namespace FluentAffiliatePro\App\Services\Integrations\LifterLMS;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Modules\Integrations\BaseConnectorSettings;
use FluentAffiliate\Framework\Support\Arr;

class Connector extends BaseConnectorSettings
{
    protected $integration = 'lifterlms';

    public function init()
    {
        $this->register();
    }

    public function isAvailable()
    {
        return defined('\LLMS_PLUGIN_FILE');
    }

    public function getInfo()
    {
        return [
            'integration'    => $this->integration,
            'title'          => 'LifterLMS',
            'description'    => 'Connect FluentAffiliate with LifterLMS Courses to track sales and commissions',
            'type'           => 'lms',
            'logo'           => Utility::asset('images/integrations/lifterlms.png'),
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

        if (Arr::get($params, 'object_type') === 'product') {
            return $this->getCustomPostTypeOptions([
                'search'      => $search,
                'include_ids' => $includeIds,
                'post_type'   => 'course',
            ]);
        }

        return $this->getPostTypeTerms([
            'search'      => $search,
            'include_ids' => $includeIds,
            'taxonomy'    => 'course_cat'
        ]);

    }

    public function getConfigFields()
    {
        return [
            'custom_rate_component' => [
                'type'           => 'custom_rate_component',
                'has_categories' => true,
                'product_label'  => __('Select Courses', 'fluent-affiliate-pro'),
                'has_products'   => true,
                'main_label'     => __('Enable custom rate for specific courses or Course Categories', 'fluent-affiliate-pro'),
            ]
        ];
    }

}
