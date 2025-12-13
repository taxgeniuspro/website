<?php

namespace FluentAffiliatePro\App\Services\Integrations\LifterLMS;

use FluentAffiliate\App\Models\Referral;
use FluentAffiliate\App\Modules\Integrations\BaseConnector;

class Bootstrap extends BaseConnector
{

    protected $provider = 'lifterlms';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_action('lifterlms_new_pending_order', [$this, 'createPendingReferral']);
        // complete referral when order is completed
        add_action('lifterlms_order_status_completed', [$this, 'markReferralComplete']);
        add_action('lifterlms_order_status_active', [$this, 'markReferralComplete']);

        // revoke referral when order is refunded
        add_action('lifterlms_order_status_refunded', [$this, 'markReferralRevoked']);
        add_action('lifterlms_order_status_cancelled', [$this, 'markReferralRevoked']);

        add_filter('fluent_affiliate/provider_reference_lifterlms_url', [$this, 'getOrderLink'], 10, 2);
    }

    public function createPendingReferral($order)
    {
        if (!$order instanceof \LLMS_Order) {
            return;
        }

        if (Referral::where('provider', $this->provider)->where('provider_id', $order->get('id'))->exists()) {
            return;
        }

        $affiliate = $this->getCurrentAffiliate();
        if (!$affiliate) {
            return;
        }

        $visit = $this->getCurrentVisit($affiliate);

        $orderData = $this->getFormattedOrderData($order);

        $customerData = $orderData['customer'];

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return; // Do not create referral for self-referrals
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $affiliatedCustomer = $this->addOrUpdateCustomer($customerData);

        $commissionAmount = $this->calculateFinalCommissionAmount($affiliate, $orderData, 'course_cat');


        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $affiliatedCustomer->id,
            'visit_id'     => $visit->id ? $visit->id : null,
            'description'  => $orderData['description'],
            'status'       => $orderData['status'],
            'type'         => 'sale',
            'amount'       => $commissionAmount,
            'order_total'  => $orderData['referral_order_total'],
            'currency'     => $orderData['currency'],
            'utm_campaign' => $visit ? $visit->utm_campaign : null,
            'provider'     => $this->provider,
            'provider_id'  => $orderData['id'],
            'products'     => $orderData['items'],
        ];

        $this->recordReferral($referralData);
    }

    public function markReferralComplete($order)
    {
        $referral = $this->getExistingReferral($order->get('id'));

        if (!$referral) {
            return; // No referral found for this order
        }

        $this->markReferralAsUnpaid($referral);
    }

    public function markReferralRevoked($order)
    {
        $referral = $this->getExistingReferral($order->get('id'));
        if ($referral) {
            $this->rejectReferral($referral);
        }
    }

    public function getOrderLink($link, $referral)
    {
        return admin_url("post.php?post={$referral->provider_id}&action=edit");
    }

    private function getFormattedOrderData(\LLMS_Order $order)
    {
        $product = $order->get_product();
        $description = $product && $product->title ? $product->title : 'LifterLMS Course - (' . $order->plan_title . ')';

        if($order->plan_title) {
            $description .= ' - ' . $order->plan_title;
        }

        return [
            'id'                   => $order->id,
            'total'                => $order->total,
            'subtotal'            => $order->total,
            'referral_order_total' => $order->total,
            'tax'                  => 0,
            'discount'             => 0,
            'status'               => ($order->status === 'llms-completed') ? 'paid' : 'pending',
            'currency'             => $order->currency,
            'description'          => $description,
            'customer'             => array_filter([
                'email'      => $order->billing_email,
                'first_name' => $order->billing_first_name,
                'last_name'  => $order->billing_last_name,
                'ip'         => $order->user_ip_address,
                'user_id'    => $order->user_id
            ]),
            'items'                => [
                [
                    'item_id'  => $product && $product->id ? $product->id : '',
                    'title'    => $description,
                    'subtotal' => $order->total,
                    'tax'      => 0,
                    'shipping' => 0,
                    'total'    => $order->total,
                ]
            ]
        ];
    }
}
