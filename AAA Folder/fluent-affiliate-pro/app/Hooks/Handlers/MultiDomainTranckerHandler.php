<?php

namespace FluentAffiliatePro\App\Hooks\Handlers;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Visit;
use FluentAffiliate\Framework\Support\Arr;
use FluentAffiliatePro\App\Services\MultiDomainHelper;

class MultiDomainTranckerHandler
{
    public function register()
    {
        add_filter('fluent_affiliate/portal/additional_sites', [$this, 'addAdditionalSites'], 10, 1);
        add_action('wp_ajax_nopriv_fluent_affiliate_pro_connect_callback', [$this, 'handleConnectCallback']);
    }

    public function addAdditionalSites($sites)
    {
        $settings = MultiDomainHelper::getConfig();

        if ($settings['status'] != 'yes' || empty($settings['sites'])) {
            return $sites;
        }

        $allSites = $settings['sites'];

        foreach ($allSites as $index => $site) {
            $sites[] = [
                'id'          => 'site_' . ($index + 1),
                'title'       => Arr::get($site, 'site_title'),
                'subtitle'    => Arr::get($site, 'subtitle'),
                'description' => Arr::get($site, 'description'),
                'url'         => Arr::get($site, 'site_url'),
                'logo'        => Arr::get($site, 'logo'),
            ];
        }

        return $sites;
    }

    public function handleConnectCallback()
    {
        $body = file_get_contents('php://input');
        $payloadData = json_decode($body, true);

        $siteId = isset($payloadData['site_id']) ? sanitize_text_field($payloadData['site_id']) : 0;
        $serverToken = isset($payloadData['server_token']) ? sanitize_text_field($payloadData['server_token']) : '';
        $site = MultiDomainHelper::getSite($siteId, $serverToken);

        if (!$site) {
            wp_send_json([
                'message' => __('Invalid site ID or server token.', 'fluent-affiliate-pro'),
                'time'    => time()
            ], 422);
        }

        $visit = Arr::get($payloadData, 'visit', []);

        if (empty($visit['aff_id'])) {
            wp_send_json([
                'message' => __('aff_id is required.', 'fluent-affiliate-pro'),
                'time'    => time()
            ], 422);
        }

        $affiliate = Utility::getAffiliateByParamId($visit['aff_id']);

        if (!$affiliate || $affiliate->status !== 'active') {
            wp_send_json([
                'message' => __('Affiliate not found or inactive.', 'fluent-affiliate-pro'),
                'time'    => time()
            ], 422);
        }


        $visitData = array_filter([
            'affiliate_id' => $affiliate->id,
            'url'          => isset($visit['url']) ? sanitize_url($visit['url']) : '',
            'referrer'     => isset($visit['referrer']) ? sanitize_url($visit['referrer']) : '',
            'utm_campaign' => isset($visit['utm_campaign']) ? sanitize_text_field($visit['utm_campaign']) : '',
            'utm_source'   => isset($visit['utm_source']) ? sanitize_text_field($visit['utm_source']) : '',
            'utm_medium'   => isset($visit['utm_medium']) ? sanitize_text_field($visit['utm_medium']) : '',
            'ip'           => isset($visit['ip_address']) ? sanitize_text_field($visit['ip_address']) : '',
        ]);

        $visit = Visit::create($visitData);

        wp_send_json([
            'visit_id' => $visit->id,
            'time'     => time(),
        ]);
    }

}
