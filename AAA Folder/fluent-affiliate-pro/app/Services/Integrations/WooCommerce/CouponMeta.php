<?php

namespace FluentAffiliatePro\App\Services\Integrations\WooCommerce;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliate\Framework\Support\Arr;

/**
 * Class to manage affiliate associations with WooCommerce coupons.
 */
class CouponMeta
{

    public function register()
    {
        // Add custom select field to coupon admin screen
        add_action('woocommerce_coupon_options', [$this, 'addAffiliateSelectField']);

        // Save selected affiliate ID
        add_action('woocommerce_coupon_options_save', [$this, 'saveAffiliateIdField']);

        add_filter('fluent_affiliate/affiliate_attached_coupons', [$this, 'getAttachedCoupons'], 10, 3);
    }

    /**
     * Add searchable affiliate select field to WooCommerce coupon admin screen.
     */
    public function addAffiliateSelectField()
    {
        if (!$this->isEnabled()) {
            return; // Skip if the feature is not enabled
        }

        global $post;
        $affiliateId = get_post_meta($post->ID, '_fa_affiliate_id', true);

        // Get users for the dropdown (all users assumed as potential affiliates)
        $affiliates = Affiliate::query()->where('status', 'active')->get();

        // Prepare an options array for wc-enhanced-select
        $options = ['' => __('None', 'fluent-affiliate-pro')];

        $canViewEmail = current_user_can('edit_users');

        foreach ($affiliates as $affiliate) {
            $label = Arr::get($affiliate->user_details, 'full_name');
            if ($canViewEmail) {
                $label .= ' (' . Arr::get($affiliate->user_details, 'email') . ')';
            } else {
                $label .= ' (' . $affiliate->id . ')';
            }

            $options[(int)$affiliate->id] = $label;
        }

        // Render WooCommerce select field with wc-enhanced-select
        woocommerce_wp_select([
            'id'          => '_fa_affiliate_id',
            'label'       => __('FluentAffiliate Coupon?', 'fluent-affiliate-pro'),
            'description' => __('If you want to attach this coupon for an affiliate, you may select it here. Whenever someone use this coupon, The selected affiliate will get the commission.', 'fluent-affiliate-pro'),
            'desc_tip'    => true,
            'value'       => $affiliateId,
            'options'     => $options,
            'class'       => 'wc-enhanced-select',
            'style'       => 'width: 50%;',
        ]);
    }

    /**
     * Save affiliate ID when coupon is saved.
     *
     * @param int $postId The coupon post ID.
     */
    public function saveAffiliateIdField($postId)
    {

        if (!$this->isEnabled()) {
            return; // Skip if the feature is not enabled
        }

        $existingId = get_post_meta($postId, '_fa_affiliate_id', true);

        // Sanitize affiliate ID
        $affiliateId = isset($_POST['_fa_affiliate_id']) ? absint($_POST['_fa_affiliate_id']) : '';
        if (!$existingId && !$affiliateId) {
            return; // No change, nothing to do
        }

        // Store if valid ID, remove if empty
        if ($affiliateId) {
            $affiliate = Affiliate::query()->where('id', $affiliateId)->first();
            if ($affiliate) {
                $affiliateId = $affiliate->id; // Ensure we store a valid ID
            } else {
                $affiliateId = ''; // Reset if not found
            }
            update_post_meta($postId, '_fa_affiliate_id', $affiliateId);
        } else {
            delete_post_meta($postId, '_fa_affiliate_id');
        }
    }

    public function getAttachedCoupons($coupons, $affiliate, $context = 'view')
    {
        if (!$this->isEnabled()) {
            return $coupons; // Skip if the feature is not enabled
        }

        $affiliateId = $affiliate->id;
        $postType = 'shop_coupon';
        $metaKey = '_fa_affiliate_id';

        // find all the posts where postmeta key = _fa_affiliate_id and that meta value is the affiliate ID

        $db = Utility::getApp('db');
        $affiliateCoupons = $db->table('postmeta')
            ->select(['posts.ID', 'posts.post_title', 'posts.post_excerpt'])
            ->where('postmeta.meta_key', $metaKey)
            ->where('postmeta.meta_value', $affiliateId)
            ->join('posts', 'posts.ID', '=', 'postmeta.post_id')
            ->where('posts.post_type', $postType)
            ->where('posts.post_status', 'publish')
            ->get();


        foreach ($affiliateCoupons as $coupon) {
            $coupons[] = [
                'id'          => $coupon->ID,
                'provider'    => 'woo',
                'code'        => $coupon->post_title,
                'description' => $coupon->post_excerpt,
                'edit_url'    => admin_url('post.php?post=' . $coupon->ID . '&action=edit'),
            ];
        }

        return $coupons;
    }

    private function isEnabled()
    {
        $config = Utility::getOption('_woo_connector_config', []);
        return Arr::get($config, 'affiliate_on_discount_product', '') === 'yes';
    }
}
