<?php

namespace FluentAffiliatePro\App\Services\Integrations\LearnDash;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Modules\Integrations\BaseConnectorSettings;
use FluentAffiliate\Framework\Support\Arr;

class Connector extends BaseConnectorSettings
{
    protected $integration = 'learndash';

    public function init()
    {
        $this->register();
    }

    public function isAvailable()
    {
        return defined('\LEARNDASH_VERSION');
    }

    public function getInfo()
    {
        return [
            'integration'    => $this->integration,
            'title'          => 'LearnDash',
            'description'    => 'Connect FluentAffiliate with Learndash Courses to track sales and commissions',
            'type'           => 'lms',
            'logo'           => Utility::asset('images/integrations/learndash.svg'),
            'is_unavailable' => !$this->isAvailable(),
            'config'         => $this->config(),
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
                'post_type'   => 'sfwd-courses',
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
        return [];
    }

}
