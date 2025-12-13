<?php

namespace FluentAffiliatePro\App\Http\Controllers;

use FluentAffiliate\App\Http\Controllers\Controller;
use FluentAffiliate\App\Models\AffiliateGroup;
use FluentAffiliate\App\Models\Referral;
use FluentAffiliate\App\Models\Visit;
use FluentAffiliate\App\Services\Reports\ReportService;
use FluentAffiliate\Framework\Http\Request\Request;
use FluentAffiliate\Framework\Support\Arr;

class AffiliateGroupController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->getSafe('search');

        $groups = AffiliateGroup::query()
            ->withCount('affiliates')
            ->withSum('affiliates as visits_count', 'visits')
            ->withSum('affiliates as total_earnings', 'total_earnings')
            ->search($search)
            ->orderBy('id', 'desc')
            ->paginate();

        return [
            'groups' => $groups
        ];
    }

    public function show($groupId)
    {
        $group = AffiliateGroup::findOrFail($groupId);

        return [
            'group' => $group,
        ];

    }

    public function affiliates($groupId)
    {
        $group = AffiliateGroup::findOrFail($groupId);

        $affilaites = $group->affiliates()->paginate();

        return [
            'affiliates' => $affilaites,
        ];
    }

    public function overview($groupId)
    {
        $group = AffiliateGroup::findOrFail($groupId);

        $affilaites = $group->affiliates()->pluck('id')->toArray();

        $unpaidReferralAmount = Referral::query()
            ->whereIn('affiliate_id', $affilaites)
            ->where('status', 'unpaid')
            ->sum('amount');

        $paidReferralAmount = Referral::query()
            ->whereIn('affiliate_id', $affilaites)
            ->where('status', 'paid')
            ->sum('amount');


        $totalAffiliates = $group->affiliates()->count();

        $widgets = [
            'unpaid_amount'   => $unpaidReferralAmount ?: 0,
            'paid_amount'     => $paidReferralAmount ?: 0,
            'total_affiliate' => $totalAffiliates ?: 0,
            'total_earnings'  => $paidReferralAmount + $unpaidReferralAmount ?: 0,
        ];

        return [
            'widgets' => $widgets
        ];
    }

    public function store(Request $request)
    {
        $data = $request->all();

        $this->validate($data, [
            'meta_key'  => 'required|string|max:255',
            'notes'     => 'nullable|string|max:255',
            'rate_type' => 'required|string|in:flat,percentage,default',
            'rate'      => 'nullable|numeric',
            'status'    => 'required|string|in:active,inactive',
        ]);

        $groupData = [
            'meta_key'       => sanitize_text_field(Arr::get($data, 'meta_key')),
            'value'     => [
                'rate_type' => sanitize_text_field(Arr::get($data, 'rate_type')),
                'rate'      => (int) Arr::get($data, 'rate', 0),
                'status'    => sanitize_text_field(Arr::get($data, 'status')),
                'notes'     => sanitize_text_field(Arr::get($data, 'notes'))
            ]
        ];

        do_action('fluent_affiliate/before_create_affiliate_group', $groupData);

        $affiliateGroup = AffiliateGroup::create($groupData);

        return [
            'message' => __('affiliate group successfully created', 'fluent-affiliate-pro'),
            'data'    => $affiliateGroup
        ];

    }

    public function update(Request $request, $groupId)
    {
        $group = AffiliateGroup::findOrFail($groupId);

        $groupData = $request->all();

        $this->validate($groupData, [
            'meta_key'       => 'required|string|max:255',
            'notes'     => 'nullable|string|max:255',
            'rate_type' => 'required|string|in:flat,percentage,default',
            'rate'      => 'nullable|numeric',
            'status'    => 'required|string|in:active,inactive',
        ]);

        $group->meta_key = sanitize_text_field(Arr::get($groupData, 'meta_key'));

        $group->value = [
            'rate_type' => sanitize_text_field(Arr::get($groupData, 'rate_type')),
            'rate'      => (int) Arr::get($groupData, 'rate', 0),
            'status'    => sanitize_text_field(Arr::get($groupData, 'status')),
            'notes'     => sanitize_text_field(Arr::get($groupData, 'notes'))
        ];

        $group->save();

        return [
            'data'    => $group,
            'message' => __('Affiliate group successfully updated', 'fluent-affiliate-pro')
        ];

    }

    public function destroy($groupId)
    {
        $affiliateGroup = AffiliateGroup::findOrFail($groupId);

        do_action('fluent_affiliate/before_delete_affiliate_group', $affiliateGroup);

        $affiliateGroup->delete();

        do_action('fluent_affiliate/after_delete_affiliate_group', $affiliateGroup);

        return [
            'message' => __('affiliate group successfully deleted', 'fluent-affiliate-pro'),
            'data'    => $affiliateGroup
        ];
    }

    public function statistics(Request $request, $group)
    {
        $defaultStartDate = gmdate('Y-m-d', strtotime('-30 days'));
        $defaultEndDate = gmdate('Y-m-d');

        $startDate = $request->getSafe('start_date', 'sanitize_text_field', $defaultStartDate);
        $endDate = $request->getSafe('end_date', 'sanitize_text_field', $defaultEndDate);

        $visitQuery = Visit::query()->whereHas('affiliate', function($query) use ($group){
            return $query->where('group_id' , $group);
        });

        $referralQuery = Referral::query()->whereHas('affiliate', function($query) use ($group){
            return $query->where('group_id' , $group);
        });

        $seriesConfigs = [
            [
                'model' => $referralQuery,
                'label' => __('Referrals', 'fluent-affiliate-pro')
            ],
            [
                'model' => $visitQuery,
                'label' => __('Visits', 'fluent-affiliate-pro')
            ],
        ];

        return ReportService::create()->getMultiChartStatistics($seriesConfigs, $startDate, $endDate);
    }
}
