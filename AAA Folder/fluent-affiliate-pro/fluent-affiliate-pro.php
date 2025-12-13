<?php defined('ABSPATH') or die;
/*
Plugin Name: FluentAffiliate Pro
Description: FluentAffiliate Pro Package
Version: 1.1.0
Author: WPManageNinja LLC
Author URI: https://fluentaffiliates.com
Plugin URI: https://fluentaffiliates.com
License: GPLv2 or later
Text Domain: fluent-affiliate-pro
Domain Path: /language
*/

if (defined('FLUENT_AFFILIATE_PRO')) {
    return;
}

define('FLUENT_AFFILIATE_PRO', true);
define('FLUENT_AFFILIATE_PRO_DIR', plugin_dir_path(__FILE__));
define('FLUENT_AFFILIATE_PRO_URL', plugin_dir_url(__FILE__));
define('FLUENT_AFFILIATE_PRO_BASE_NAME', plugin_basename(__FILE__));
define('FLUENT_AFFILIATE_PRO_DIR_FILE', __FILE__);
define('FLUENT_AFFILIATE_PRO_VERSION', '1.1.0');
define('FLUENT_AFFILIATE_PRO_DB_VERSION', '1.0.0');

require __DIR__ . '/vendor/autoload.php';

call_user_func(function ($bootstrap) {
    $bootstrap(__FILE__);
}, require(__DIR__ . '/boot/app.php'));
