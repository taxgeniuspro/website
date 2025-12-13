<?php

namespace FluentAffiliatePro\App\Services\Integrations\MemberPress;

use FluentAffiliate\App\Modules\Integrations\BaseConnector;

class Bootstrap extends BaseConnector
{
    protected $provider = 'memberpress';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_action('mepr-txn-store', [$this, 'storeReferralOnPurchase'], 10, 2);
        add_action('mepr-txn-transition-status', [$this, 'handleStatusTransition'], 10, 3);
        add_action('mepr-txn-status-refunded', [$this, 'revokeReferral']);
        add_action('mepr-txn-status-cancelled', [$this, 'revokeReferral']);
        add_action('fluent_affiliate/provider_reference_memberpress_url', [$this, 'getSubscriptionLink'], 10, 2);
    }

    public function storeReferralOnPurchase($transaction, $old_transaction = null)
    {
        $affiliate = $this->getCurrentAffiliate();
        if (!$affiliate || $this->getExistingReferral($transaction->id)) {
            return;
        }

        $visit = $this->getCurrentVisit($affiliate);

        $orderData = $this->getFormattedOrderData($transaction);

        if (!$orderData) {
            return; // If order data is not available, do not proceed
        }

        $customerData = $orderData['customer'];

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return; // Do not create referral for self-referrals
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $affiliatedCustomer = $this->addOrUpdateCustomer($customerData);

        $commissionAmount = $this->calculateFinalCommissionAmount($affiliate, $orderData, 'mepr-product-category');

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

    public function handleStatusTransition($old_status, $new_status, $transaction)
    {
        if (in_array($new_status, ['refunded', 'cancelled'])) {
            return;
        }

        $referral = $this->getExistingReferral($transaction->id);

        if (!$referral) {
            return;
        }

        $this->markReferralAsUnpaid($referral);
    }


    public function revokeReferral($transaction)
    {
        $referral = $this->getExistingReferral($transaction->id);
        if ($referral) {
            $this->rejectReferral($referral);
        }
    }

    /**
     * Generates a subscription link for the admin.
     *
     * @param  $link  The default link.
     * @param  $referral  The referral object.
     */
    public function getSubscriptionLink($link, $referral)
    {
        return admin_url('admin.php?page=memberpress-trans&action=edit&id=' . $referral->provider_id);
    }

    public function getFormattedOrderData($txn)
    {
        $product = $txn->product();

        $userId = $txn->user_id;

        $user = get_user_by('ID', $userId);
        if (!$user) {
            return null;
        }
        $description = $product ? $product->post_title : 'MemberPress Purchase';

        $mepr_options = \MeprOptions::fetch();
        return [
            'id'                   => $txn->id,
            'total'                => $txn->total,
            'subtotal'             => $txn->amount,
            'referral_order_total' => $txn->amount,
            'tax'                  => $txn->tax_amount,
            'discount'             => 0,
            'status'               => ($txn->status === 'complete') ? 'unpaid' : 'pending',
            'currency'             => $mepr_options->currency_code,
            'description'          => $description,
            'customer'             => array_filter([
                'email'      => $user->user_email,
                'first_name' => $user->first_name,
                'last_name'  => $user->last_name,
                'user_id'    => $user->ID
            ]),
            'items'                => [
                [
                    'item_id'  => $product && $product->ID ? $product->ID : '',
                    'title'    => $description,
                    'subtotal' => $txn->amount,
                    'tax'      => 0,
                    'shipping' => 0,
                    'total'    => $txn->total,
                ]
            ]
        ];
    }
}
