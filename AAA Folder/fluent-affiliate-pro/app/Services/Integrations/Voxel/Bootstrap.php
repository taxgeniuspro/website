<?php

namespace FluentAffiliatePro\App\Services\Integrations\Voxel;

use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliate\App\Models\Visit;
use FluentAffiliate\App\Services\VisitService;
use FluentAffiliate\Framework\Support\Arr;
use FluentAffiliate\App\Modules\Integrations\BaseConnector;

class Bootstrap extends BaseConnector
{

    protected $provider = 'voxel';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_action('voxel/product-types/orders/order:updated', [$this, 'addReferral'], 99, 1);
        add_action('fluent_affiliate/provider_reference_voxel_url', [$this, 'getOrderLink'], 10, 2);

        // for memberships.
        add_action('voxel/app-events/membership/plan:activated', [$this, 'addReferralOnMembership'], 10, 1);
        add_action('voxel_ajax_plans.choose_plan', function () {
            $userId = get_current_user_id();

            if (!$userId) {
                return;
            }
            $currentAffiliate = $this->getCurrentAffiliate();
            if ($currentAffiliate) {
                $visit = $this->getCurrentVisit($currentAffiliate);
                $data = [
                    'affiliate_id' => $currentAffiliate->id,
                    'visit_id'     => $visit ? $visit->id : null,
                    'timestamp'    => time(),
                ];
                update_user_meta($userId, '__fa_aff_temp', $data);
            }
        });

        add_action('fluent_affiliate/provider_reference_vx_membership_url', [$this, 'getMembershipLink'], 10, 2);

    }

    public function addReferralOnMembership($event)
    {
        $userId = $event->user->get_id();
        $membership = $event->membership;
        if (!$userId || !$membership) {
            return;
        }

        $tempData = get_user_meta($userId, '__fa_aff_temp', true);
        if (!$tempData || empty($tempData['affiliate_id'])) {
            return;
        }

        delete_user_meta($userId, '__fa_aff_temp');

        $timestamp = Arr::get($tempData, 'timestamp', 0);
        if (time() - $timestamp > 60 * 30) {
            return; // Ignore if the temp data is older than 30 minutes old
        }
        $affiliateId = Arr::get($tempData, 'affiliate_id');
        $visitId = Arr::get($tempData, 'visit_id');

        $affiliate = Affiliate::find($affiliateId);
        $visit = null;

        if ($visitId) {
            $visit = Visit::find($visitId);
            if ($visit && $visit->affiliate_id != $affiliateId) {
                $visit = null; // Ensure the visit belongs to the affiliate
            }
        }

        $user = get_user_by('ID', $userId);


        $amount = $membership->get_amount();
        $amount = $amount ? $amount : 0;
        $amount = $this->centsToDecimal($amount, $membership->get_currency());

        $formattedData = [
            'id'                   => $user->ID,
            'subtotal'             => $amount,
            'tax'                  => 0,
            'discount'             => 0,
            'total'                => $amount,
            'description'          => $membership->plan->get_label(),
            'referral_order_total' => $amount,
            'items'                => [
                [
                    'item_id'  => $membership->plan->get_key(),
                    'title'    => $membership->plan->get_label(),
                    'subtotal' => $amount,
                    'tax'      => 0,
                    'discount' => 0,
                    'total'    => $amount
                ]
            ],
            'currency'             => $membership->get_currency(),
        ];

        $customerData = [
            'email'      => $user->user_email,
            'user_id'    => $user->ID,
            'first_name' => $user->first_name,
            'last_name'  => $user->last_name
        ];

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return; // Do not create referral for self-referrals
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $createdCustomer = $this->addOrUpdateCustomer($customerData);

        $commission = $affiliate->getCommission($formattedData['referral_order_total'], 'sale');

        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $createdCustomer->id,
            'visit_id'     => $visit ? $visit->id : null,
            'description'  => $formattedData['description'] ?? 'Membership Purchase',
            'status'       => 'unpaid',
            'type'         => 'sale',
            'amount'       => $commission,
            'order_total'  => $formattedData['referral_order_total'],
            'currency'     => Arr::get($formattedData, 'currency'),
            'utm_campaign' => $visit ? $visit->utm_campaign : null,
            'provider'     => 'vx_membership',
            'provider_id'  => $user->ID,
            'products'     => $formattedData['items'],
        ];

        $this->recordReferral($referralData);
    }

    public function addReferral($order)
    {

        if (!$order instanceof \Voxel\Product_Types\Orders\Order) {
            return; // Only process orders with 'pending_payment' status
        }

        $currentStatus = $order->get_status();
        $prevStatus = $order->get_previous_status();

        if ($prevStatus == 'completed' && $currentStatus == 'refunded') {
            return $this->maybeHandleRefundedOrder($order); // Handle refunded orders separately
        }

        if ($currentStatus === 'completed' && $prevStatus === 'pending_payment') {
            return $this->maybeOrderCompleted($order); // Handle completed orders separately
        }

        if ($currentStatus !== 'pending_payment') {
            return; // Do not process orders that are not pending payment
        }

        $affiliate = $this->getCurrentAffiliate();
        if (!$affiliate) {
            return;
        }

        $orderId = $order->get_id();

        if ($this->getExistingReferral($orderId)) {
            return; // Referral already exists for this payment
        }

        $formattedData = $this->getFormattedOrderData($order);

        if (!$formattedData) {
            return;
        }

        $customerData = $formattedData['customer'];

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return; // Do not create referral for self-referrals
        }

        $customerData['by_affiliate_id'] = $affiliate->id;

        $createdCustomer = $this->addOrUpdateCustomer($customerData);
        $visit = $this->getCurrentVisit($affiliate);
        $commission = $this->calculateFinalCommissionAmount($affiliate, $formattedData);

        $formattedItems = Arr::get($formattedData, 'items', []);

        if ($formattedItems) {
            // create a description for the order
            $description = $formattedItems[0]['title'] ?? 'Order';
            if (count($formattedItems) > 1) {
                $description .= ' and ' . (count($formattedItems) - 1) . ' more items';
            }
        } else {
            $description = 'Voxel Order';
        }

        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $createdCustomer->id,
            'visit_id'     => $visit ? $visit->id : null,
            'description'  => $description,
            'status'       => $formattedData['status'] === 'pending_payment' ? 'pending' : 'unpaid',
            'type'         => 'sale',
            'amount'       => $commission,
            'order_total'  => $formattedData['referral_order_total'],
            'currency'     => Arr::get($formattedData, 'currency'),
            'utm_campaign' => $visit ? $visit->utm_campaign : null,
            'provider'     => $this->provider,
            'provider_id'  => $orderId,
            'products'     => $formattedData['items'],
        ];

        $this->recordReferral($referralData);
    }

    public function maybeOrderCompleted($order)
    {
        $orderId = $order->get_id();
        $referral = $this->getExistingReferral($orderId);

        if ($referral) {
            $this->markReferralAsUnpaid($referral);
        }

        return true;
    }

    public function maybeHandleRefundedOrder($order)
    {
        $orderId = $order->get_id();
        $referral = $this->getExistingReferral($orderId);

        if ($referral) {
            $this->rejectReferral($referral);
        }

        return true;
    }

    public function getOrderLink($link, $referral)
    {
        return admin_url("admin.php?page=voxel-orders&order_id={$referral->provider_id}");
    }

    private function getFormattedOrderData(\Voxel\Product_Types\Orders\Order $order)
    {

        $userId = $order->get_customer_id();
        $user = $userId ? get_user_by('id', $userId) : null;

        if (!$user) {
            return null;
        }

        $formattedItems = [];

        foreach ($order->get_items() as $item) {
            $formattedItems[] = [
                'item_id'  => $item->get_id(),
                'title'    => $item->get_type(),
                'subtotal' => $item->get_subtotal(),
                'tax'      => 0,
                'discount' => 0,
                'total'    => $item->get_subtotal()
            ];
        }

        return [
            'id'                   => $order->get_id(),
            'total'                => $order->get_total(),
            'subtotal'             => $order->get_subtotal(),
            'referral_order_total' => $order->get_total(),
            'tax'                  => 0,
            'discount'             => 0,
            'shipping'             => $order->get_shipping_amount(),
            'status'               => $order->get_status(),
            'currency'             => $order->get_currency(),
            'customer'             => array_filter([
                'email'      => $user->user_email,
                'user_id'    => $user->ID,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'ip'         => VisitService::getIp()
            ]),
            'items'                => $formattedItems
        ];
    }

    public function getMembershipLink($link, $referral)
    {
        return admin_url("admin.php?page=voxel-customers&customer={$referral->provider_id}");
    }

}
