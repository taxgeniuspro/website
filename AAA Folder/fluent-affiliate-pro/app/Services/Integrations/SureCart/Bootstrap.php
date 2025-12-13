<?php

namespace FluentAffiliatePro\App\Services\Integrations\SureCart;

use FluentAffiliate\App\Models\Referral;
use FluentAffiliate\App\Modules\Integrations\BaseConnector;
use FluentAffiliate\Framework\Support\Arr;

class Bootstrap extends BaseConnector
{

    protected $provider = 'surecart';

    public function register()
    {
        if (!$this->isEnabled()) {
            return;
        }

        // On purchase created
        add_action('surecart/purchase_created', [$this, 'addPendingReferral'], 99);

        // on refunded
        add_action('surecart/purchase_revoked', [$this, 'revokeReferral'], 10, 1);

        // on completed
        add_action('surecart/purchase_invoked', [$this, 'invokeReferral'], 10, 1);

        // For linking to the order in SureCart
        add_filter('fluent_affiliate/provider_reference_surecart_url', [$this, 'getOrderLink'], 10, 2);
    }

    /**
     * Records a pending referral when a pending payment is created
     *
     * @param \SureCart\Models\Purchase $purchase Purchase model.
     */
    public function addPendingReferral($purchase)
    {
        $affiliate = $this->getCurrentAffiliate();
        if (!$affiliate) {
            return;
        }

        $orderData = $this->getOrderData($purchase);

        if (!$orderData) {
            return false;
        }

        $exists = Referral::query()->where('provider', $this->provider)
            ->where('provider_sub_id', $orderData['id_hash'])
            ->exists();

        if ($exists) {
            return false;
        }

        $customerData = Arr::get($orderData, 'customer', []);

        if ($this->isSelfReferred($affiliate, $customerData)) {
            return;
        }

        $customerData['by_affiliate_id'] = $affiliate->id;
        $affiliatedCustomer = $this->addOrUpdateCustomer($customerData);

        $visit = $this->getCurrentVisit();

        if ($visit && $visit->affiliate_id != $affiliate->id) {
            $visit = null; // If the visit's affiliate doesn't match, we don't use it
        }

        $commission = $affiliate->getCommission($orderData['referral_order_total'], 'sale');

        $status = 'pending';

        if (Arr::get($orderData, 'status') === 'paid') {
            $status = 'unpaid'; // SureCart uses 'unpaid' for pending payments
        }

        $referralData = [
            'affiliate_id'    => $affiliate->id,
            'customer_id'     => $affiliatedCustomer->id,
            'visit_id'        => ($visit) ? $visit->id : null,
            'description'     => Arr::get($orderData, 'description'),
            'status'          => $status,
            'type'            => 'sale',
            'amount'          => $commission,
            'order_total'     => $orderData['referral_order_total'],
            'currency'        => Arr::get($orderData, 'currency'),
            'utm_campaign'    => ($visit) ? $visit->utm_campaign : '',
            'provider'        => $this->provider,
            'provider_sub_id' => Arr::get($orderData, 'id_hash')
        ];

        $referral = $this->recordReferral($referralData);

        return $referral;
    }

    public function revokeReferral($purchase)
    {
        $idHash = $purchase->initial_order->id;

        if (!$idHash) {
            return;
        }

        $referral = Referral::query()
            ->where('provider', $this->provider)
            ->where('provider_sub_id', $idHash)
            ->first();

        if (!$referral || $referral->status == 'rejected' || $referral->status == 'paid') {
            return;
        }

        $this->rejectReferral($referral);
    }

    public function invokeReferral($purchase)
    {
        $hydrated_purchase = \SureCart\Models\Purchase::with(['initial_order'])->find($purchase->id);
        $idHash = $hydrated_purchase->initial_order->id;

        if (!$idHash) {
            return;
        }

        $referral = Referral::query()
            ->where('provider', $this->provider)
            ->where('provider_sub_id', $idHash)
            ->first();

        if (!$referral || $referral->status == 'unpaid' || $referral->status == 'paid') {
            return;
        }

        $this->markReferralAsUnpaid($referral);
    }

    public function getOrderLink($link, $referral)
    {
        return admin_url('admin.php?page=sc-orders&action=edit&id=' . $referral->provider_sub_id);
    }

    private function getOrderData($purchase)
    {
        $hydrated_purchase = \SureCart\Models\Purchase::with(['initial_order', 'order.checkout', 'product', 'customer'])->find($purchase->id);

        if (!$hydrated_purchase || empty($hydrated_purchase->initial_order) || empty($hydrated_purchase->initial_order->checkout)) {
            return null;
        }

        $customer = $hydrated_purchase->customer ?? null;
        $reference = $hydrated_purchase->initial_order ?? null;

        if (!$reference || !$reference->checkout) {
            return null;
        }


        $customerData = [
            'email'      => $customer->email ?? null,
            'first_name' => $customer->first_name ?? null,
            'last_name'  => $customer->last_name ?? null,
            'ip'         => $reference->checkout->ip_address
        ];

        $totals = [
            'subtotal' => $reference->checkout->subtotal_amount ?? 0,
            'tax'      => absint($reference->checkout->tax_amount ?? 0),
            'shipping' => absint($reference->checkout->shipping_amount ?? 0),
            'discount' => absint($reference->checkout->discount_amount ?? 0),
        ];

        $currency = $reference->checkout->currency;
        if (!\SureCart\Support\Currency::isZeroDecimal($currency)) {
            $totals = array_map(function ($value) {
                return round($value / 100, 2);
            }, $totals);
        }

        $orderTotal = $this->calculateOrderTotal($totals);

        $items = [];
        if ($this->hasCustomConfigRate()) {
//            $purchaseOrder = \SureCart\Models\Order::with(['checkout', 'checkout.purchases'])->find($reference->id);
//
//            $purchases = $purchaseOrder->checkout ?? [];
//
//            dd($purchases);
        }

        return [
            'id_hash'              => $reference->id,
            'customer'             => $customerData,
            'referral_order_total' => $orderTotal,
            'totals'               => $totals,
            'currency'             => $currency,
            'status'               => $reference->status,
            'description'          => $hydrated_purchase->product->name
        ];
    }

}
