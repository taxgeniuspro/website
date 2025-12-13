<?php

namespace FluentAffiliatePro\App\Http\Controllers;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Http\Controllers\Controller;
use FluentAffiliate\Framework\Http\Request\Request;
use FluentAffiliatePro\App\Services\MultiDomainHelper;

class DomainController extends Controller
{
    public function getConnectedConfig(Request $request)
    {
        $config = MultiDomainHelper::getConfig(false);

        return [
            'config' => $config,
        ];
    }

    public function updateGlobalStatus(Request $request)
    {
        $newStatus = $request->getSafe('status', 'sanitize_text_field');

        $config = MultiDomainHelper::getConfig(false);

        $config['status'] = $newStatus === 'yes' ? 'yes' : 'no';

        Utility::updateOption('_connected_sites_config', $config);

        return [
            'message' => __('Global status updated successfully.', 'fluent-affiliate-pro'),
            'status'  => $config['status'],
        ];
    }

    public function validateAndIssueNewSiteToken(Request $request)
    {
        $childToken = $request->getSafe('child_token', 'sanitize_textarea_field');
        $childToken = wp_unslash($childToken);
        $childToken = json_decode($childToken, true);

        if (!$childToken || empty($childToken['callback_url']) || empty($childToken['site_url'])) {
            return $this->sendError(['message' => __('Invalid token.', 'fluent-affiliate-pro')]);
        }

        $siteUrl = sanitize_url($childToken['site_url']);

        if (!filter_var($siteUrl, FILTER_VALIDATE_URL)) {
            return $this->sendError(['message' => __('Invalid site URL.', 'fluent-affiliate-pro')]);
        }

        $existingSites = MultiDomainHelper::getConnectedSites();

        $serverToken = wp_generate_password(12);

        // Check if the site URL already exists in the connected sites
        foreach ($existingSites as $site) {
            if (isset($site['site_url']) && $site['site_url'] === $siteUrl) {
                return $this->sendError(['message' => __('This site is already connected.', 'fluent-affiliate-pro')]);
            }
        }

        // check if the $serverToken is already used
        $existingServerTokens = array_column($existingSites, 'server_token');

        while (in_array($serverToken, $existingServerTokens)) {
            $serverToken = wp_generate_password(12);
        }

        $siteId = mt_rand(100000, 999999);

        while (isset($existingSites[$siteId])) {
            $siteId = mt_rand(100000, 999999);
        }


        $newSite = [
            'status'       => 'active',
            'site_url'     => $siteUrl,
            'site_title'   => sanitize_text_field($childToken['site_title']),
            'server_token' => $serverToken,
            'logo'         => '',
            'description'  => '',
            'subtitle'     => '',
            'site_id'      => $siteId,
        ];

        $newSite = MultiDomainHelper::addNewSite($siteId, $newSite);

        $config = [
            'server_token'         => $newSite['server_token'],
            'store_url'            => home_url('/'),
            'callback_url'         => admin_url('admin-ajax.php?action=fluent_affiliate_pro_connect_callback'),
            'site_id'              => $newSite['site_id'],
            'param_key'            => Utility::getQueryVarName(),
            'cookie_duration'      => Utility::getReferralSetting('cookie_duration', 30),
            'credit_last_referrer' => Utility::getReferralSetting('credit_last_referrer', 'yes'),
        ];

        $connectConfig = json_encode($config, JSON_UNESCAPED_SLASHES);

        return [
            'message'        => __('Connect config has been generated.', 'fluent-affiliate-pro'),
            'new_site'       => $newSite,
            'connect_config' => $connectConfig,
        ];

    }

    public function disconnectSite(Request $request)
    {
        $siteId = $request->getSafe('site_id', 'sanitize_text_field');

        if (!$siteId) {
            return $this->sendError(['message' => __('Site ID is required.', 'fluent-affiliate-pro')]);
        }

        $config = MultiDomainHelper::getConfig(false);

        if (!isset($config['sites'][$siteId])) {
            return $this->sendError(['message' => __('Site not found.', 'fluent-affiliate-pro')]);
        }

        unset($config['sites'][$siteId]);

        Utility::updateOption('_connected_sites_config', $config);

        return [
            'message' => __('Site disconnected successfully.', 'fluent-affiliate-pro'),
        ];

    }

    public function patchSingleSiteConfig(Request $request)
    {
        $siteId = $request->getSafe('site_id', 'sanitize_text_field');
        $settings = $request->get('data', []);

        if (!$siteId || !$settings) {
            return $this->sendError(['message' => __('Site ID and config are required.', 'fluent-affiliate-pro')]);
        }

        $allConfig = MultiDomainHelper::getConfig(false);

        $sites = $allConfig['sites'] ?? [];

        if (!isset($sites[$siteId])) {
            return $this->sendError(['message' => __('Site not found.', 'fluent-affiliate-pro')]);
        }

        $prevSettings = $sites[$siteId];

        $prevSettings['site_title'] = sanitize_text_field($settings['site_title']);
        $prevSettings['subtitle'] = sanitize_text_field($settings['subtitle']);
        $prevSettings['description'] = wp_kses_post($settings['description']);
        $prevSettings['logo'] = isset($settings['logo']) ? sanitize_url($settings['logo']) : '';

        $sites[$siteId] = $prevSettings;

        $allConfig['sites'] = $sites;

        Utility::updateOption('_connected_sites_config', $allConfig);

        return [
            'message' => __('Site config updated successfully.', 'fluent-affiliate-pro'),
        ];
    }
}
