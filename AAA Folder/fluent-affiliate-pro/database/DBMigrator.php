<?php

namespace FluentAffiliatePro\Database;

use FluentAffiliatePro\Database\Migrations\CreativeMigrator;

class DBMigrator
{
    public static function run($network_wide = false)
    {
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        if (is_multisite() && $network_wide) {
            global $wpdb;
            $blogIds = $wpdb->get_col("SELECT blog_id FROM $wpdb->blogs"); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
            foreach ($blogIds as $blogId) {
                switch_to_blog($blogId);
                static::migrate();
                restore_current_blog();
            }
            return;
        }

        static::migrate();
    }

    private static function migrate()
    {
        CreativeMigrator::migrate();
    }
}
