<?php

namespace FluentAffiliatePro\App\Http\Controllers;

use FluentAffiliate\App\Http\Controllers\Controller;
use FluentAffiliate\Framework\Http\Request\Request;
use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliatePro\App\Models\Creative;

class CreativeController extends Controller
{
    public function index(Request $request)
    {
        $creatives = Creative::query()
            ->search($request->getSafe('search'))
            ->orderBy('id', 'desc')
            ->paginate();

        return [
            'creatives' => $creatives
        ];
    }

    public function show(Request $request, $id)
    {
        $creative = Creative::findOrFail($id);

        return [
            'creative' => $creative
        ];
    }

    public function portalCreatives(Request $request)
    {
        $affiliate = Affiliate::query()->where('user_id', get_current_user_id())->first();
        if (!$affiliate) {
            return $this->sendError([
                'message' => __('Affiliate Account could not be found', 'fluent-affiliate-pro')
            ]);
        }

        $creatives = Creative::query()
            ->where('status', 'active')
            ->where(function($query) use ($affiliate) {
                $query->where('privacy', 'public')
                    ->orWhere(function($query) use ($affiliate) {
                        $query->where('privacy', 'private')
                            ->where(function($query) use ($affiliate) {
                                $query->whereJsonContains('affiliate_ids', strval($affiliate->id))
                                    ->orWhereJsonContains('group_ids', strval($affiliate->group_id));
                            });
                    });
            })
            ->orderBy('id', 'desc')
            ->paginate();

        return [
            'creatives' => $creatives
        ];
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'type' => 'required|string|max:255',
            'image' => 'required_if:type,image|string|max:255',
            'text' => 'required_if:type,text|string|max:255',
            'url' => 'required|string|max:255',
            'privacy' => 'required|string|in:public,private',
            'status' => 'required|string|in:active,inactive,scheduled,expired',
            'affiliate_ids' => 'nullable|array',
            'group_ids' => 'nullable|array',
            'meta' => 'nullable|array'
        ]);

        $creativeData = $request->getSafe([
            'name' => 'sanitize_text_field',
            'description' => 'sanitize_text_field',
            'type' => 'sanitize_text_field',
            'image' => 'sanitize_url',
            'text' => 'sanitize_text_field',
            'url' => 'sanitize_url',
            'privacy' => 'sanitize_text_field',
            'status' => 'sanitize_text_field',
            'affiliate_ids' => 'sanitize_text_field',
            'group_ids' => 'sanitize_text_field',
            'meta' => 'sanitize_text_field'
        ]);

        $creativeData = apply_filters('fluent_affiliate/create_creative_data', $creativeData);

        $creative = Creative::create($creativeData);

        do_action('fluent_affiliate/after_create_creative', $creative);

        return [
            'creative' => $creative,
            'message' => __('Creative created successfully', 'fluent-affiliate-pro')
        ];
    }

    public function update(Request $request, $id)
    {
        $creative = Creative::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'type' => 'required|string|max:255',
            'image' => 'required_if:type,image|string|max:255',
            'text' => 'required_if:type,text|string|max:255',
            'url' => 'required|string|max:255',
            'privacy' => 'required|string|in:public,private',
            'status' => 'required|string|in:active,inactive,scheduled,expired',
            'affiliate_ids' => 'nullable|array',
            'group_ids' => 'nullable|array',
            'meta' => 'nullable|array'
        ]);

        $creativeData = $request->getSafe([
            'name' => 'sanitize_text_field',
            'description' => 'sanitize_text_field',
            'type' => 'sanitize_text_field',
            'image' => 'sanitize_url',
            'text' => 'sanitize_text_field',
            'url' => 'sanitize_url',
            'privacy' => 'sanitize_text_field',
            'status' => 'sanitize_text_field',
            'meta' => 'sanitize_text_field'
        ]);

        $creativeData['affiliate_ids'] = array_map('sanitize_text_field', $request->get('affiliate_ids') ?? []);
        $creativeData['group_ids'] = array_map('sanitize_text_field', $request->get('group_ids') ?? []);

        $creativeData = apply_filters('fluent_affiliate/update_creative_data', $creativeData);

        $oldCreative = $creative;

        $creative->fill($creativeData);

        if ($creative->isDirty()) {
            $creative->save();
            do_action('fluent_affiliate/creative_updated', $creative, $oldCreative);
        }

        return [
            'creative' => $creative,
            'message' => __('Creative updated successfully', 'fluent-affiliate-pro')
        ];
    }

    public function destroy(Request $request, $id)
    {
        $creative = Creative::findOrFail($id);

        if ($creative->status == 'scheduled') {
            \as_unschedule_all_actions('fluent_affiliate/activate_creative', [$creative->id], 'fluent-affiliate-pro');
            \as_unschedule_all_actions('fluent_affiliate/expire_creative', [$creative->id], 'fluent-affiliate-pro');
        }

        do_action('fluent_affiliate/before_delete_creative', $creative);

        $creative->delete();

        do_action('fluent_affiliate/after_delete_creative', $creative);

        return [
            'message' => __('Creative deleted successfully', 'fluent-affiliate-pro'),
        ];
    }
}