<?php

namespace FluentAffiliatePro\App\Http\Controllers;

use FluentAffiliate\App\Http\Controllers\Controller;
use FluentAffiliate\App\Modules\Auth\AuthHelper;
use FluentAffiliatePro\App\Services\ProHelper;
use FluentAffiliate\Framework\Support\Arr;
use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Meta;
use FluentAffiliate\App\Services\PermissionManager;
use FluentAffiliate\Framework\Http\Request\Request;

class ProSettingController extends Controller
{
    public function saveRegistrationFields(Request $request)
    {
        $settings = $request->get('settings', []);

        $settings = array_map(function ($setting) {
            return $setting === 'yes' ? 'yes' : 'no';
        }, $settings);

        $prevSettings = AuthHelper::getRegrationSettings();

        $settings = Arr::only($settings, array_keys($prevSettings));
        $settings = wp_parse_args($settings, $prevSettings);
        Utility::updateOption('_registration_settings', $settings);

        $fields = $request->get('fields', []);

        $fields = ProHelper::sanitizeRegistrationFields($fields);

        Utility::updateOption('_registration_fields', $fields);

        $fields = AuthHelper::getRegistrationFormFields();

        return [
            'message'  => __('Registration fields updated successfully', 'fluent-affiliate-pro'),
            'fields'   => $fields,
            'settings' => $settings
        ];
    }

    public function getAffiliateGroupsOptions()
    {
        $groups = \FluentAffiliate\App\Models\AffiliateGroup::query()
            ->get();

        $formattedGroups = [];

        foreach ($groups as $group) {
            $formattedGroups[] = [
                'id'   => $group->id,
                'name' => $group->meta_key
            ];
        }

        return [
            'affiliate_groups' => $formattedGroups
        ];
    }

    public function getManagers(Request $request)
    {
        $teamMembers = Meta::where('object_type', 'user_meta')
            ->where('meta_key', '_fa_access_permissions')
            ->paginate();

        $members = [];
        foreach ($teamMembers as $member) {
            $user = get_user_by('ID', $member->object_id);
            if (!$user || !$member->value) {
                $member->delete();
                continue;
            }
            $members[] = [
                'id'          => $user->ID,
                'name'        => trim($user->first_name . ' ' . $user->last_name) ?: $user->display_name,
                'email'       => $user->user_email,
                'avatar'      => get_avatar_url($user->ID),
                'permissions' => $member->value,
                'is_admin'    => user_can($user, 'manage_options')
            ];
        }

        return [
            'managers' => $members,
            'permissions' => PermissionManager::allPermissionSets()
        ];
    }

    public function updateManager(Request $request)
    {
        $data = $request->all();

        $this->validate($data, [
            'user_id' => 'required|numeric',
            'permissions' => 'required|array'
        ]);

        $userId = $data['user_id'];

        $user = get_user_by('ID', $userId);
        if (!$user) {
            return $this->sendError([
                'message' => __('User not found', 'fluent-affiliate-pro')
            ]);
        }

        if (user_can($user, 'manage_options')) {
            return $this->sendError([
                'message' => __('This is an admin user. You can not change permissions', 'fluent-affiliate-pro')
            ]);
        }

        $permissions = PermissionManager::setPermissions($data['permissions']);
        if (empty($permissions)) {
            return $this->sendError([
                'message' => __('Invalid permissions', 'fluent-affiliate-pro')
            ]);
        }

        $meta = Meta::where('object_type', 'user_meta')
            ->where('object_id', $user->ID)
            ->where('meta_key', '_fa_access_permissions')
            ->first();

        $message = __('Manager Added Successfully', 'fluent-affiliate-pro');

        if ($meta) {
            $meta->value = $permissions;
            $meta->save();
            $message = __('Manager Updated Successfully', 'fluent-affiliate-pro');
        } else {
            Meta::create([
                'object_type' => 'user_meta',
                'object_id'   => $user->ID,
                'meta_key'    => '_fa_access_permissions',
                'value'       => $permissions
            ]);
        }

        return [
            'message' => $message
        ];
    }

    public function deleteManager(Request $request, $id)
    {
        $remove = Meta::where('object_type', 'user_meta')
            ->where('object_id', $id)
            ->where('meta_key', '_fa_access_permissions')
            ->delete();

        if (!$remove) {
            return $this->sendError([
                'message' => __('Failed to remove manager', 'fluent-affiliate-pro')
            ]);
        }

        return [
            'message' => __('Manager removed successfully', 'fluent-affiliate-pro')
        ];
    }
}