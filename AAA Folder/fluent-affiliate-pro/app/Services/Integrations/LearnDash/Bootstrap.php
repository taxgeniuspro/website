<?php

namespace FluentAffiliatePro\App\Services\Integrations\LearnDash;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliate\App\Models\Visit;
use FluentAffiliate\App\Modules\Integrations\BaseConnector;

class Bootstrap extends BaseConnector
{

    protected $provider = 'learndash';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        add_filter('learndash_stripe_session_args', [$this, 'maybeTrackReferral']);
        add_action('learndash_transaction_created', [$this, 'processReferral'], 10);

        add_filter('fluent_affiliate/provider_reference_learndash_url', [$this, 'getOrderLink'], 10, 2);
    }

    public function maybeTrackReferral($session_args)
    {
        $affiliate = $this->getCurrentAffiliate();
        if (!$affiliate || $affiliate->status !== 'active') {
            return $session_args;
        }

        $visit = $this->getCurrentVisit($affiliate);

        if ($visit) {
            $session_args['metadata']['_fa_visit_id'] = $visit->id;
        }

        $session_args['metadata']['_fa_affiliate_id'] = $affiliate->id;
        return $session_args;
    }

    public function processReferral($transaction_id)
    {
        if ($this->getExistingReferral($transaction_id)) {
            return;
        }

        $order = $this->getOrder($transaction_id);

        if (!$order) {
            return;
        }

        if (empty($order->payment_processor) || !in_array($order->payment_processor, ['stripe', 'stripe_connect'], true)) {
            return;
        }


        $affiliate_id = $order->stripe_metadata->_fa_affiliate_id ?? 0;

        if (empty($affiliate_id) || empty($order->customer_email)) {
            return; // No affiliate ID found in metadata
        }
        $affiliate = Affiliate::query()->find($affiliate_id);

        if (!$affiliate || $affiliate->status !== 'active') {
            return; // Affiliate not found
        }

        $visitId = $order->stripe_metadata->_fa_visit_id ?? 0;

        $customerData = [
            'email' => $order->customer_email
        ];

        $visit = $visitId ? Visit::query()
            ->where('id', $visitId)
            ->where('affiliate_id', $affiliate->id)
            ->first() : null;

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return; // Do not create referral for self-referrals
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $createdCustomer = $this->addOrUpdateCustomer($customerData);

        $referralData = [
            'affiliate_id' => $affiliate->id,
            'customer_id'  => $createdCustomer->id,
            'visit_id'     => $visit ? $visit->id : null,
            'description'  => $order->description,
            'status'       => 'unpaid',
            'type'         => 'sale',
            'amount'       => $affiliate->getCommission($order->stripe_price, 'sale'),
            'order_total'  => $order->stripe_price,
            'currency'     => $order->stripe_currency ?: Utility::getCurrency(),
            'utm_campaign' => $visit ? $visit->utm_campaign : null,
            'provider'     => $this->provider,
            'provider_id'  => $order->id
        ];

        $this->recordReferral($referralData);
    }

    private function getOrder($transactionId)
    {
        $post = get_post($transactionId);
        if (!$post) {
            return false;
        }

        // Create a plain new standard object to map order props from Stripe metadata to it.
        $order = new \stdClass();

        // Set some reference data.
        $order->id = absint($transactionId);
        $order->post = $post; // WP Post Object.

        $payment_data = get_post_meta($transactionId);

        $gateway_transaction = maybe_unserialize($payment_data['gateway_transaction'][0])['event'] ?? null;

        $order->stripe_metadata = maybe_unserialize($gateway_transaction->metadata ?? $payment_data['stripe_metadata'][0] ?? '');
        $order->stripe_price_type = $payment_data['price_type'][0] ?? $payment_data['stripe_price_type'][0] ?? null;

        $order->stripe_payment_intent = $gateway_transaction->payment_intent ?? $payment_data['stripe_payment_intent'][0] ?? null;
        $order->subscription = $gateway_transaction->subscription ?? $payment_data['subscription'][0] ?? null;

        $price_info = json_decode($gateway_transaction->metadata->pricing_info ?? '', true);

        $order->stripe_price = $price_info['price'] ?? $payment_data['stripe_price'][0] ?? null;
        $order->stripe_currency = $price_info['currency'] ?? $payment_data['stripe_currency'][0] ?? null;


        $payment_processor = $gateway_transaction->metadata->ld_payment_processor ?? $payment_data['ld_payment_processor'][0] ?? null;
        $order->payment_processor = empty($payment_processor) && !empty($order->stripe_price_type)
            ? 'stripe'
            : $payment_processor;


        $order->stripe_email = $gateway_transaction->customer_details->email ?? $payment_data['stripe_email'][0] ?? null;
        $order->customer_email = $gateway_transaction->customer_details->email ?? $payment_data['customer_email'][0] ?? null;

        $order->stripe_name = $payment_data['stripe_name'][0] ?? null;
        $order->description = $order->stripe_name;

        return $order;
    }

    public function getOrderLink($link, $referral)
    {
        return sprintf('edit.php?post_type=sfwd-transactions&s=%s', get_the_title($referral->provider_id));
    }

}
