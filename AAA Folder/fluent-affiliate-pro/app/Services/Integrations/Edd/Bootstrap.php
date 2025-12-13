<?php

namespace FluentAffiliatePro\App\Services\Integrations\Edd;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Referral;
use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliate\Framework\Support\Arr;
use FluentAffiliate\App\Modules\Integrations\BaseConnector;

class Bootstrap extends BaseConnector
{
    protected $provider = 'edd';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_action('edd_insert_payment', array($this, 'addPendingReferral'), 99999, 2);
        add_action('edd_update_payment_status', array($this, 'updateReferralStatus'), 10, 3);
        add_action('edd_refund_order', array($this, 'handleOrderRefund'), 10, 3);

        /*
         * Internal
         */
        add_filter('fluent_affiliate/provider_reference_edd_url', [$this, 'getOrderLink'], 10, 2);

        // init coupon Metabox
        (new EddCouponAffiliate())->register();
    }

    public function addPendingReferral($orderId = 0, $orderData = [])
    {
        if (empty($orderId) || empty($orderData)) {
            return;
        }

        if ($this->getExistingReferral($orderId)) {
            return;
        }

        $order = edd_get_order($orderId);
        $affiliate = $this->getAffiliateByNewOrder($order);

        if (!$affiliate || $affiliate->status != 'active') {
            return;
        }

        if (Referral::where('provider', $this->provider)->where('provider_id', $order->id)->exists()) {
            return;
        }

        $orderData = $this->getFormattedOrderData($order);

        $customerData = [
            'user_id' => $order->user_id,
            'email'   => $order->email,
            'ip'      => $order->ip
        ];

        if ($this->isSelfReferred($affiliate, $customerData)) {
            edd_insert_payment_note($order->id, __('[FluentAffiliate] Self-referral detected. Referral is not recorded.', 'fluent-affiliate'));
            return;
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $affiliatedCustomer = $this->addOrUpdateCustomer($customerData);

        $visit = $this->getCurrentVisit($affiliate);

        $orderTotal = $orderData['referral_order_total'];

        $orderData['order_total'] = $orderTotal;
        $amount = $this->calculateFinalCommissionAmount($affiliate, $orderData, 'download_category');

        $formattedItems = Arr::get($orderData, 'items');
        // create a description for the order
        $description = $formattedItems[0]['title'] ?? 'Order';
        if (count($formattedItems) > 1) {
            $description .= ' and ' . (count($formattedItems) - 1) . ' more items';
        }

        $status = 'pending';
        if ($orderData['status'] == 'complete') {
            $status = 'unpaid';
        }

        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $affiliatedCustomer->id,
            'visit_id'     => ($visit) ? $visit->id : null,
            'description'  => $description,
            'status'       => $status,
            'type'         => 'sale',
            'amount'       => $amount,
            'order_total'  => $orderTotal,
            'currency'     => $order->currency,
            'utm_campaign' => ($visit) ? $visit->utm_campaign : '',
            'provider'     => $this->provider,
            'provider_id'  => $order->id,
            'products'     => $formattedItems
        ];

        $referral = $this->recordReferral($referralData);

        $referralLink = Utility::getAdminPageUrl('referrals/' . $referral->id . '/view');
        edd_insert_payment_note($order->id, \sprintf(
        // translators: %1$s: referral link, %2$s: referral amount, %3$s: affiliate name, %4$d: affiliate id
            __('Referral %1$s for %2$s recorded for %3$s (ID: %4$d).', 'fluent-affiliate'),
            '<a href="' . $referralLink . '" target="_blank">' . $referral->id . '</a>',
            $referral->amount,
            $affiliate->full_name,
            $affiliate->id
        ));
    }

    public function updateReferralStatus($orderId, $newStatus, $oldStatus)
    {
        $referral = Referral::where('provider', $this->provider)->where('provider_id', $orderId)->first();

        if (!$referral) {
            return;
        }

        $paidStatuses = ['complete', 'processing'];
        $refundStatuses = ['refunded', 'revoked', 'failed'];

        if (in_array($newStatus, $refundStatuses)) {
            $referral = $this->rejectReferral($referral);
        } else if (in_array($newStatus, $paidStatuses)) {
            $referral = $this->markReferralAsUnpaid($referral);
        }
    }

    public function handleOrderRefund($orderId, $refund_id, $allRefunded)
    {
        if (!$allRefunded) {
            return;
        }

        $referral = Referral::where('provider', $this->provider)->where('provider_id', $orderId)->first();
        if (!$referral) {
            return;
        }

        $this->rejectReferral($referral);
    }

    public function getOrderLink($link, $referral)
    {
        return admin_url('edit.php?post_type=download&page=edd-payment-history&view=view-order-details&id=' . $referral->provider_id);
    }

    private function getAffiliateByNewOrder(\EDD\Orders\Order $order)
    {
        if ($this->isCouponMapEnabled()) {
            foreach ($order->get_adjustments() as $adjustment) {
                if ($adjustment->type === 'discount') {

                    $affiliateId = edd_get_adjustment_meta($adjustment->type_id, '_faff_edd_discount_affiliate', true);

                    if ($affiliateId) {

                        $affiliate = Affiliate::query()->find($affiliateId);

                        if ($affiliate) {
                            return $affiliate;
                        }
                    }

                }
            }
        }

        return $this->getCurrentAffiliate();
    }

    private function getFormattedOrderData($order)
    {
        $formattedItems = [];
        foreach ($order->items as $item) {
            if ($item->type != 'download') {
                continue;
            }
            $formattedItems[] = [
                'item_id'  => $item->product_id,
                'title'    => $item->product_name,
                'subtotal' => $item->subtotal,
                'tax'      => $item->tax,
                'discount' => $item->discount,
                'total'    => $item->total
            ];
        }

        $data = [
            'id'       => $order->id,
            'status'   => $order->status,
            'subtotal' => $order->subtotal,
            'tax'      => $order->tax,
            'discount' => $order->discount,
            'total'    => $order->total,
            'items'    => $formattedItems
        ];

        $data['referral_order_total'] = $this->calculateOrderTotal($data);

        return $data;
    }

}
