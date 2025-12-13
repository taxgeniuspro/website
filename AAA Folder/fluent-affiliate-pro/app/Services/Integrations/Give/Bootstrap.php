<?php

namespace FluentAffiliatePro\App\Services\Integrations\Give;

use FluentAffiliate\Framework\Support\Arr;
use FluentAffiliate\App\Modules\Integrations\BaseConnector;

class Bootstrap extends BaseConnector
{

    protected $provider = 'give';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_action('give_insert_payment', [$this, 'addReferral'], 10, 2);
        add_action('give_complete_form_donation', [$this, 'markReferralAsComplete'], 10, 3);
        add_action('give_update_payment_status', [$this, 'markReferralAsRevoke'], 10, 3);

        add_action('fluent_affiliate/provider_reference_give_url', [$this, 'getDonationLink'], 10, 2);
    }

    public function addReferral($paymentId, $paymentData = [])
    {
        $affiliate = $this->getCurrentAffiliate();

        if (!$affiliate) {
            return;
        }

        if ($this->getExistingReferral($paymentId)) {
            return; // Referral already exists for this payment
        }

        $payment = new \Give_Payment($paymentId);

        if (!$payment || !$payment->ID) {
            return; // Ensure payment exists
        }

        $formattedData = $this->getFormattedOrderData($payment);

        $customerData = $formattedData['customer'];

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return; // Do not create referral for self-referrals
        }

        $customerData['by_affiliate_id'] = $affiliate->id;

        $createdCustomer = $this->addOrUpdateCustomer($customerData);
        $visit = $this->getCurrentVisit($affiliate);
        $commission = $this->calculateFinalCommissionAmount($affiliate, $formattedData);

        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $createdCustomer->id,
            'visit_id'     => $visit ? $visit->id : null,
            'description'  => $payment->form_title,
            'status'       => $payment->status == 'publish' ? 'unpaid' : 'pending',
            'type'         => 'sale',
            'amount'       => $commission,
            'order_total'  => $formattedData['referral_order_total'],
            'currency'     => Arr::get($formattedData, 'currency'),
            'utm_campaign' => $visit ? $visit->utm_campaign : null,
            'provider'     => $this->provider,
            'provider_id'  => $paymentId,
            'products'     => $formattedData['items'],
        ];

        $this->recordReferral($referralData);
    }


    /*
     * @param $formId
     * @param $paymentId
     * @param $paymentMeta
     */
    public function markReferralAsComplete($formId, $paymentId, $paymentMeta)
    {
        $referral = $this->getExistingReferral($paymentId);
        if (!$referral) {
            return;
        }

        $this->markReferralAsUnpaid($referral);

    }

    /*
     * @param $paymentId
     * @param $newStatus
     * @param $oldStatus
     */
    public function markReferralAsRevoke($paymentId, $newStatus, $oldStatus)
    {
        if ('publish' != $oldStatus && 'revoked' != $oldStatus) {
            return;
        }

        if ('refunded' != $newStatus) {
            return;
        }

        $referral = $this->getExistingReferral($paymentId);

        if ($referral) {
            $this->rejectReferral($referral);
        }
    }

    public function getDonationLink($link, $referral)
    {
        $donationLink = "edit.php?post_type=give_forms&page=give-payment-history&view=view-payment-details&id={$referral->provider_id}";

        return admin_url($donationLink);
    }

    private function getFormattedOrderData($payment)
    {
        return [
            'id'                   => $payment->ID,
            'total'                => $payment->total,
            'subtotal'            => $payment->subtotal,
            'referral_order_total' => $payment->subtotal,
            'tax'                  => 0,
            'discount'             => 0,
            'status'               => $payment->status,
            'currency'             => $payment->currency,
            'customer'             => array_filter([
                'email'      => $payment->email,
                'first_name' => $payment->first_name,
                'last_name'  => $payment->last_name,
                'ip'         => $payment->ip,
                'user_id'    => $payment->user_id
            ]),
            'items'                => [
                [
                    'item_id'  => $payment->form_id,
                    'title'    => $payment->form_title,
                    'subtotal' => $payment->subtotal,
                    'tax'      => 0,
                    'shipping' => 0,
                    'total'    => $payment->total,
                ]
            ]
        ];
    }

}
