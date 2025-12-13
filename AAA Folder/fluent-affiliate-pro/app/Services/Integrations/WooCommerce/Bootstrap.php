<?php

namespace FluentAffiliatePro\App\Services\Integrations\WooCommerce;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliate\App\Modules\Integrations\BaseConnector;
use FluentAffiliate\Framework\Support\Arr;

/**
 * @todo: Coupons Module
 */
class Bootstrap extends BaseConnector
{
    protected $provider = 'woo';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_action('woocommerce_store_api_checkout_order_processed', [$this, 'addPendingReferral']);
        add_action('woocommerce_checkout_order_processed', [$this, 'addPendingReferral']);
        add_action('woocommerce_order_status_changed', [$this, 'updateReferralStatus'], 10, 4);

        /*
         * Internal
         */
        add_filter('fluent_affiliate/provider_reference_woo_url', [$this, 'getOrderLink'], 10, 2);

        // init coupon Metabox
        (new CouponMeta())->register();

        $this->maybeAddDashboardInWooAccountMenu();
    }

    /**
     * @param $order \WC_Order
     * @return void
     */
    public function addPendingReferral($order)
    {
        if (!$order instanceof \WC_Order) {
            $order = new \WC_Order($order);
        }

        if (!$order || $this->getExistingReferral($order->get_id())) {
            return;
        }

        $affiliate = $this->getCurrentAffiliateFromOrder($order);

        if (!$affiliate || $affiliate->status != 'active') {
            return;
        }

        $orderData = $this->getFormattedOrderData($order);

        $customerData = array_filter([
            'user_id'    => $order->get_user_id(),
            'first_name' => $order->get_billing_first_name(),
            'last_name'  => $order->get_billing_last_name(),
            'email'      => $order->get_billing_email(),
            'ip'         => $order->get_customer_ip_address()
        ]);

        if (empty($customerData['email'])) {
            return;
        }

        if ($this->isSelfReferred($affiliate, $customerData)) {
            $order->add_order_note(__('[FluentAffiliate] Self-referral detected. Referral is not recorded.', 'fluent-affiliate'));
            return;
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $affiliatedCustomer = $this->addOrUpdateCustomer($customerData);

        $visit = $this->getCurrentVisit($affiliate);

        $orderTotal = $orderData['referral_order_total'];
        $orderData['order_total'] = $orderTotal;
        $commissionAmount = $this->calculateFinalCommissionAmount($affiliate, $orderData, 'product_cat');

        $formattedItems = Arr::get($orderData, 'items');
        // create a description for the order
        $description = $formattedItems[0]['title'] ?? 'Order';
        if (count($formattedItems) > 1) {
            $description .= ' and ' . (count($formattedItems) - 1) . ' more items';
        }

        $status = 'pending';
        if (in_array($orderData['status'], wc_get_is_paid_statuses())) {
            $status = 'unpaid';
        }

        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $affiliatedCustomer->id,
            'visit_id'     => ($visit) ? $visit->id : null,
            'description'  => $description,
            'status'       => $status,
            'type'         => 'sale',
            'amount'       => $commissionAmount,
            'order_total'  => $orderTotal,
            'currency'     => $order->get_currency(),
            'utm_campaign' => ($visit) ? $visit->utm_campaign : '',
            'provider'     => $this->provider,
            'provider_id'  => $orderData['id'],
            'products'     => $formattedItems
        ];

        $referral = $this->recordReferral($referralData);

        $referralLink = Utility::getAdminPageUrl('referrals/' . $referral->id . '/view');
        $order->add_order_note(\sprintf(
            // translators: %1$s: referral link, %2$s: referral amount, %3$s: affiliate name, %4$d: affiliate id
                __('Referral %1$s for %2$s recorded for %3$s (ID: %4$d).', 'fluent-affiliate'),
                '<a href="' . $referralLink . '" target="_blank">' . $referral->id . '</a>',
                get_woocommerce_currency_symbol() . ' ' . $referral->amount,
                $affiliate->full_name,
                $affiliate->id
            )
        );
    }

    public function updateReferralStatus($orderId, $oldStatus, $newStatus, $order)
    {
        $paidStatuses = wc_get_is_paid_statuses();
        $revokedStatuses = ['cancelled', 'refunded', 'failed'];

        $isPaid = in_array($newStatus, $paidStatuses);
        $isRevoked = in_array($newStatus, $revokedStatuses);


        if (!$isPaid && !$isRevoked) {
            return;
        }

        $referral = $this->getExistingReferral($orderId);

        if (!$referral || $referral->status == 'paid') {
            return $referral;
        }

        if ($isPaid) {
            $this->markReferralAsUnpaid($referral);
        } else if ($isRevoked) {
            $this->rejectReferral($referral);
        }

        return $referral;
    }

    public function getOrderLink($link, $referral)
    {
        return admin_url('admin.php?page=wc-orders&action=edit&id=' . $referral->provider_id);
    }

    public function getFormattedOrderData(\WC_Order $order)
    {
        $orderItems = $order->get_items();

        $formattedItems = [];
        foreach ($orderItems as $orderItem) {
            $formattedItems[] = [
                'item_id'  => $orderItem->get_product_id(),
                'title'    => $orderItem->get_name(),
                'subtotal' => $orderItem->get_total(), // discount included
                'tax'      => $orderItem->get_total_tax(),
                'total'    => $orderItem->get_total()
            ];
        }

        $data = [
            'id'       => $order->get_id(),
            'status'   => $order->get_status('edit'),
            'subtotal' => $order->get_subtotal(),
            'tax'      => $order->get_total_tax('edit'),
            'discount' => $order->get_discount_total('edit'),
            'total'    => $order->get_total('edit'),
            'items'    => $formattedItems
        ];

        $data['referral_order_total'] = $this->calculateOrderTotal($data);

        return $data;
    }

    public function getCurrentAffiliateFromOrder($order)
    {
        if (!$this->isCouponMapEnabled()) {
            return $this->getCurrentAffiliate();
        }

        $coupons = $order->get_coupon_codes();

        if (empty($coupons)) {
            return $this->getCurrentAffiliate();
        }

        $affiliateId = null;

        foreach ($coupons as $couponCode) {
            $coupon = new \WC_Coupon($couponCode);
            $affiliateId = $coupon->get_meta('_fa_affiliate_id');
            if ($affiliateId) {
                break;
            }
        }

        if (!$affiliateId) {
            return $this->getCurrentAffiliate();
        }

        $affiliate = Affiliate::query()->where('id', $affiliateId)->first();

        if (!$affiliate) {
            $affiliate = $this->getCurrentAffiliate();
        }

        return $affiliate;

    }

    public function maybeAddDashboardInWooAccountMenu()
    {
        $config = $this->getConfig();
        if (Arr::get($config, 'is_enable_woo_menu', 'no') != 'yes') {
            return;
        }

        add_filter('woocommerce_account_menu_items', function ($menuItems) {
            $affiliatePortalPosition = apply_filters('fluent_affiliate/woo_menu_link_position', 5);

            if (count($menuItems) <= $affiliatePortalPosition) {
                $affiliatePortalPosition = count($menuItems) - 1;
            }

            $affiliatePortalLabel = apply_filters('fluent_affiliate/woo_menu_label', __('Affiliate Dashboard', 'fluent-affiliate-pro'));

            return array_slice($menuItems, 0, $affiliatePortalPosition, true)
                + array('affiliate-dashboard' => $affiliatePortalLabel)
                + array_slice($menuItems, $affiliatePortalPosition, NULL, true);
        });

        add_action('init', function () {
            add_rewrite_endpoint('affiliate-dashboard', EP_PAGES);
        });

        add_action('woocommerce_account_affiliate-dashboard_endpoint', function () {
            echo do_shortcode('[fluent_affiliate_portal]');
        });


        add_filter('fluent_affiliate/portal_page_url', function ($url) {
            return wc_get_account_endpoint_url('affiliate-dashboard');
        });

    }
}
