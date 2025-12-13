<?php

namespace FluentAffiliatePro\App\Services\Integrations\PMP;

use FluentAffiliate\App\Modules\Integrations\BaseConnector;

class Bootstrap extends BaseConnector
{

    protected $provider = 'pmp';

    public function isEnabled()
    {
        return true; // You can add a condition here to check if SureCart is enabled
    }

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_action('pmpro_added_order', array($this, 'addPendingReferral'), 10);
        add_action('pmpro_updated_order', array($this, 'updateReferralStatus'), 10);
        add_action('pmpro_delete_order', array($this, 'revokeReferralOnDelete'), 10, 1);

//        // For linking to the order in PMPro
        add_filter('fluent_affiliate/provider_reference_pmp_url', [$this, 'getOrderLink'], 10, 2);
    }

    /**
     * Records a pending referral when a pending payment is created
     *
     * @param \MemberOrder $order PMP order.
     */
    public function addPendingReferral($order)
    {
        $affiliate = $this->getCurrentAffiliate();
        if (!$affiliate || $this->getExistingReferral($order->id)) {
            return;
        }

        $visit = $this->getCurrentVisit($affiliate);

        $orderData = $this->getFormattedOrderData($order);

        if(!$orderData) {
            return; // If order data is not available, do not proceed
        }

        $customerData = $orderData['customer'];

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return; // Do not create referral for self-referrals
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $affiliatedCustomer = $this->addOrUpdateCustomer($customerData);
        $commissionAmount = $this->calculateFinalCommissionAmount($affiliate, $orderData);

        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $affiliatedCustomer->id,
            'visit_id'     => $visit->id ? $visit->id : null,
            'description'  => $orderData['description'],
            'status'       => $orderData['status'] == 'success' ? 'unpaid' : 'pending',
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

    public function updateReferralStatus($order)
    {
        $order_id = absint($order->id);
        $order_status = strtolower($order->status);

        $referral = $this->getExistingReferral($order_id);

        if (!$referral) {
            return;
        }

        if ($order_status == 'success') {
            return $this->markReferralAsUnpaid($referral);
        }

        if ($order_status === 'refunded') {
            return $this->rejectReferral($referral);
        }
    }

    public function revokeReferralOnDelete($orderId)
    {
        $referral = $this->getExistingReferral($orderId);

        if ($referral) {
            $this->rejectReferral($referral);
        }
    }

    public function getOrderLink($link, $referral)
    {
        return admin_url('admin.php?page=pmpro-orders&order=' . $referral->provider_id);
    }

    private function getFormattedOrderData($order)
    {
        $userId = $order->user_id;
        $user = get_user_by('id', $userId);

        if (!$user) {
            return null;
        }

        global $pmpro_currency;

        $level = $order->getMembershipLevel();

        $description = $level->name;


        return [
            'id'                   => $order->id,
            'total'                => $order->total,
            'subtotal'             => $order->subtotal,
            'referral_order_total' => $order->subtotal,
            'tax'                  => $order->tax,
            'discount'             => 0,
            'status'               => ($order->status === 'paid') ? 'paid' : 'pending',
            'currency'             => $pmpro_currency,
            'description'          => $description,
            'customer'             => array_filter([
                'email'      => $user->user_email,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'user_id'    => $user->ID
            ]),
            'items'                => [
                [
                    'item_id'  => $level->id,
                    'title'    => $level->name,
                    'subtotal' => $order->subtotal,
                    'tax'      => $order->tax,
                    'shipping' => 0,
                    'total'    => $order->total,
                ]
            ]
        ];
    }

}
