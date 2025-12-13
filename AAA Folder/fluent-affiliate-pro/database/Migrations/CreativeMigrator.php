<?php

namespace FluentAffiliatePro\Database\Migrations;

class CreativeMigrator
{
    public static $tableName = 'fa_creatives';

	public static function migrate() {
		global $wpdb;

		$charsetCollate = $wpdb->get_charset_collate();
		$table          = $wpdb->prefix . static::$tableName;

		if ( $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table)) != $table ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$sql = "CREATE TABLE $table (
                `id` BIGINT(20) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
                `name` VARCHAR(255) NOT NULL,
                `description` TEXT NULL,
                `type` VARCHAR(100) NOT NULL,
                `image` TEXT NULL,
                `text` TEXT NULL,
                `url` TEXT NULL,
                `privacy` VARCHAR(100) NULL DEFAULT 'public',
                `status` VARCHAR(100) NULL DEFAULT 'active',
                `affiliate_ids` JSON NULL,
                `group_ids` JSON NULL,
                `meta` LONGTEXT NULL,
                `created_at` TIMESTAMP NULL,
                `updated_at` TIMESTAMP NULL
            ) $charsetCollate;";

            require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

			dbDelta( $sql );
		}
	}
}
