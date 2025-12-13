<?php

namespace FluentAffiliatePro\App\Services\Integrations;

class IntegrationsInit
{
    public function register()
    {
        if (defined('WC_PLUGIN_FILE')) {
            (new \FluentAffiliatePro\App\Services\Integrations\WooCommerce\Bootstrap)->register();
        }

        if (defined('EDD_PLUGIN_BASE')) {
            (new \FluentAffiliatePro\App\Services\Integrations\Edd\Bootstrap)->register();
        }

        if (defined('SURECART_PLUGIN_FILE')) {
            (new \FluentAffiliatePro\App\Services\Integrations\SureCart\Bootstrap())->register();
        }

        if (defined('LLMS_PLUGIN_FILE')) {
            (new \FluentAffiliatePro\App\Services\Integrations\LifterLMS\Bootstrap())->register();
        }

        if (defined('GIVE_VERSION')) {
            (new \FluentAffiliatePro\App\Services\Integrations\Give\Bootstrap())->register();
        }

        if (defined('MEPR_PLUGIN_NAME')) {
            (new \FluentAffiliatePro\App\Services\Integrations\MemberPress\Bootstrap())->register();
        }

        if (defined('PMPRO_VERSION')) {
            (new \FluentAffiliatePro\App\Services\Integrations\PMP\Bootstrap())->register();
        }

//        if(defined('LEARNDASH_VERSION')) {
//            (new \FluentAffiliatePro\App\Services\Integrations\LearnDash\Bootstrap())->register();
//        }

        (new \FluentAffiliatePro\App\Services\Integrations\Voxel\Bootstrap())->register();

        $this->registerConnectors();
    }

    public function registerConnectors()
    {
        (new \FluentAffiliatePro\App\Services\Integrations\WooCommerce\Connector)->init();
        (new \FluentAffiliatePro\App\Services\Integrations\Edd\Connector)->init();
        (new \FluentAffiliatePro\App\Services\Integrations\SureCart\Connector)->init();
        (new \FluentAffiliatePro\App\Services\Integrations\Give\Connector)->init();
        (new \FluentAffiliatePro\App\Services\Integrations\LifterLMS\Connector)->init();
        (new \FluentAffiliatePro\App\Services\Integrations\MemberPress\Connector)->init();
        (new \FluentAffiliatePro\App\Services\Integrations\PMP\Connector)->init();
//        (new \FluentAffiliatePro\App\Services\Integrations\LearnDash\Connector)->init();
        (new \FluentAffiliatePro\App\Services\Integrations\Voxel\Connector)->init();
    }
}
