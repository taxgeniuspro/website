<?php

namespace FluentAffiliatePro\App\Services\Integrations\Edd;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliate\Framework\Support\Arr;

class EddCouponAffiliate
{
    public function register()
    {
        add_action('edd_add_discount_form_bottom', [$this, 'showDiscountForm']);
        add_action('edd_edit_discount_form_bottom', [$this, 'showDiscountForm']);

        add_action('edd_post_update_discount', [$this, 'storeDiscountAffiliate'], 10, 2);
        add_action('edd_post_insert_discount', [$this, 'storeDiscountAffiliate'], 10, 2);

        add_filter('fluent_affiliate/affiliate_attached_coupons', [$this, 'getAttachedCoupons'], 10, 3);
    }

    public function showDiscountForm($discountId = 0)
    {

        if (!$this->isEnabled()) {
            return; // Skip if the feature is not enabled
        }

        $userId = null;
        $affiliateId = edd_get_adjustment_meta($discountId, '_fa_affiliate_id', true);

        if ($affiliateId) {
            $affiliate = Affiliate::find($affiliateId);
            $userId = $affiliate ? $affiliate->id : null;
        }

        // Get users for the dropdown (all users assumed as potential affiliates)
        $affiliates = Affiliate::query()->where('status', 'active')->get();

        $canViewEmail = current_user_can('edit_users');

        // Prepare an options array for edd-select
        foreach ($affiliates as $affiliate) {
            $label = Arr::get($affiliate->user_details, 'full_name');
            if ($canViewEmail) {
                $label .= ' (' . Arr::get($affiliate->user_details, 'email') . ')';
            } else {
                $label .= ' (' . $affiliate->id . ')';
            }

            $options[(int)$affiliate->id] = $label;
        }

        ?>
        <table class="form-table">
            <tbody>
            <tr class="form-field">
                <th scope="row" valign="top">
                    <label for="faff_user_id"><?php echo __('FluentAffiliate Coupon?', 'fluent-affiliate'); ?></label>
                </th>
                <td>
                    <?php
                    echo EDD()->html->select([
                        'name'            => '_fa_affiliate_id',
                        'class'           => 'fluent_affiliate_user_filter',
                        'options'         => $options,
                        'selected'        => $userId,
                        'chosen'          => true,
                        'placeholder'     => __('Select Affiliate', 'fluent-affiliate'),
                        'show_option_all' => __('--', 'fluent-affiliate'),
                        'required'        => false,
                    ]); ?>
                    <p class="description">
                        <?php esc_html_e('If you want to attach this coupon for an affiliate, you may select it here. Whenever someone use this coupon, The selected affiliate will get the commission.', 'fluent-affiliate-pro'); ?>
                    </p>
                </td>
            </tr>
            </tbody>
        </table>
        <?php
    }

    public function storeDiscountAffiliate($details, $discount_id = 0)
    {
        if (!$this->isEnabled()) {
            return; // Skip if the feature is not enabled
        }

        $affiliateId = (int)Arr::get($_POST, '_fa_affiliate_id');

        if (!$affiliateId) {
            if (function_exists('edd_delete_adjustment_meta')) {
                edd_delete_adjustment_meta($discount_id, '_fa_affiliate_id');
            } else {
                delete_post_meta($discount_id, '_fa_affiliate_id');
            }
            return;
        }

        $affiliate = Affiliate::find($affiliateId);

        if (!$affiliate) {
            return;
        }

        if (function_exists('edd_update_adjustment_meta')) {
            edd_update_adjustment_meta($discount_id, '_fa_affiliate_id', $affiliate->id);
        } else {
            update_post_meta($discount_id, '_fa_affiliate_id', $affiliate->id);
        }
    }

    public function getAttachedCoupons($coupons, $affiliate, $context = 'view')
    {
        if (!$this->isEnabled()) {
            return $coupons; // Skip if the feature is not enabled
        }

        $affiliateId = $affiliate->id;
        $metaKey = '_fa_affiliate_id';
        // find all the posts where postmeta key = _fa_affiliate_id and that meta value is the affiliate ID

        $db = Utility::getApp('db');
        $affiliateCoupons = $db->table('edd_adjustmentmeta')
            ->select(['edd_adjustments.id', 'edd_adjustments.code', 'edd_adjustments.status', 'edd_adjustments.amount_type', 'edd_adjustments.amount'])
            ->where('edd_adjustmentmeta.meta_key', $metaKey)
            ->where('edd_adjustmentmeta.meta_value', $affiliateId)
            ->join('edd_adjustments', 'edd_adjustments.id', '=', 'edd_adjustmentmeta.edd_adjustment_id')
            ->where('edd_adjustments.status', 'active')
            ->get();

        foreach ($affiliateCoupons as $coupon) {
            if ($coupon->amount_type === 'percent') {
                $coupon->amount = number_format($coupon->amount, 0) . '%';
            } else {
                $coupon->amount = edd_format_amount($coupon->amount);
            }

            $description = sprintf(__('%s discount code for your audiences.', 'fluent-affiliate-pro'), $coupon->amount);

            $coupons[] = [
                'id'          => $coupon->id,
                'provider'    => 'edd',
                'code'        => $coupon->code,
                'description' => $description,
                'edit_url'    => admin_url('edit.php?post_type=download&page=edd-discounts&view=edit_discount&discount=' . $coupon->id),
            ];
        }

        return $coupons;
    }

    private function isEnabled()
    {
        $config = Utility::getOption('_edd_connector_config', []);
        return Arr::get($config, 'affiliate_on_discount_product', '') === 'yes';
    }
}
