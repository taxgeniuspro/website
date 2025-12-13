<?php

namespace FluentAffiliatePro\App\Services;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\Framework\Support\Arr;

class MultiDomainHelper
{
    public static function getConfig($cached = true)
    {
        static $config = null;

        if ($cached && $config !== null) {
            return $config;
        }

        $defaults = [
            'status' => 'yes',
            'sites'  => []
        ];

        $config = Utility::getOption('_connected_sites_config', $defaults);
        $config = wp_parse_args($config, $defaults);

        return $config;
    }

    public static function addNewSite($siteId, $newSite)
    {
        $config = self::getConfig(false);
        $sites = Arr::get($config, 'sites', []);

        $sites[$siteId] = $newSite;

        $config['sites'] = $sites;
        Utility::updateOption('_connected_sites_config', $config);
        self::getConfig(false);

        return $newSite;
    }

    public static function getConnectedSites()
    {
        $config = self::getConfig();
        return Arr::get($config, 'sites', []);
    }

    public static function getSite($siteId, $token)
    {
        $sites = self::getConnectedSites();

        if (isset($sites[$siteId]) && $sites[$siteId]['server_token'] === $token) {
            return $sites[$siteId];
        }

        return null;
    }

    public static function isEnabled()
    {
        $config = self::getConfig();
        return Arr::get($config, 'status', 'yes') === 'yes';
    }

}
