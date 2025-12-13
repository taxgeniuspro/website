<?php

return function ($file) {
    add_action('fluent_affiliate/loaded', function ($app) use ($file) {
        new \FluentAffiliatePro\App\Core\Application($app, $file);

        $licenseManager = new \FluentAffiliatePro\App\Services\Updater\FluentLicensing();

        $licenseManager->register([
            'version'      => FLUENT_AFFILIATE_PRO_VERSION,
            'item_id'      => '7562841',
            'basename'     => FLUENT_AFFILIATE_PRO_BASE_NAME,
            'api_url'      => 'https://wpmanageninja.com/',
            'activate_url' => \FluentAffiliate\App\Helper\Utility::getAdminPageUrl('settings/license-settings'),
        ]);

        $licenseMessage = $licenseManager->getLicenseMessage();
        if ($licenseMessage) {
            add_action('admin_notices', function () use ($licenseMessage) {
                $class = 'notice notice-error fa_message';
                $message = $licenseMessage['message'];
                printf('<div class="%1$s"><p>%2$s</p></div>', esc_attr($class), wp_kses_post($message));
            });
            add_filter('fluent_affiliate/dashboard_notices', function ($notices) use ($licenseMessage) {
                if (current_user_can('manage_options')) {
                    $notices[] = '<div class="error">' . $licenseMessage['message'] . '</div>';
                }
                return $notices;
            });
        }

        add_action('fluent_affiliate/admin_app_rendering', function () {
            $currentDBVersion = get_option('fluent_affiliate_pro_db_version');
            if (!$currentDBVersion || version_compare($currentDBVersion, FLUENT_AFFILIATE_PRO_DB_VERSION, '<')) {
                update_option('fluent_affiliate_pro_db_version', FLUENT_AFFILIATE_PRO_DB_VERSION, 'no');
                \FluentAffiliatePro\Database\DBMigrator::run();
            }
        });

        do_action('fluent_affiliate/pro_loaded', $app);
    });

    add_action('plugins_loaded', function () {
        if (!defined('FLUENT_AFFILIATE_VERSION')) {
            (new \FluentAffiliatePro\App\Hooks\Handlers\CoreDepenedencyHandler())->register();
        }
    });

    register_activation_hook($file, function () {
        update_option('fluent_affiliate_pro_db_version', FLUENT_AFFILIATE_PRO_DB_VERSION, 'no');
        \FluentAffiliatePro\Database\DBMigrator::run();
    });
};
