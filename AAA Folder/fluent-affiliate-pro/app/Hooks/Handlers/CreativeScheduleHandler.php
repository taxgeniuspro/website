<?php

namespace FluentAffiliatePro\App\Hooks\Handlers;

use FluentAffiliate\Framework\Support\Arr;
use FluentAffiliatePro\App\Models\Creative;

class CreativeScheduleHandler
{
    public function register()
    {
        add_filter('fluent_affiliate/portal_menu_items', [$this, 'maybeEnableCreativeMenu'], 10, 2);
        add_action('fluent_affiliate/after_create_creative', [$this, 'maybeScheduledCreative'], 10, 1);
        add_action('fluent_affiliate/creative_updated', [$this, 'handleUpdatedCreative'], 10, 2);
        add_filter('fluent_affiliate/create_creative_data', [$this, 'maybeAddMediaData'], 10, 1);
        add_filter('fluent_affiliate/update_creative_data', [$this, 'maybeAddMediaData'], 10, 1);
        add_action('fluent_affiliate/activate_creative', [$this, 'activateScheduledCreative'], 10, 1);
        add_action('fluent_affiliate/expire_creative', [$this, 'expireScheduledCreative'], 10, 1);
    }

    public function maybeEnableCreativeMenu($menuItems, $affiliate)
    {
        if (!$affiliate) {
            return $menuItems;
        }

        // check if database exists
        // @todo: Remove this database check after November 2025
        global $wpdb;
        $table = $wpdb->prefix . 'fa_creatives';
        if ($wpdb->get_var("SHOW TABLES LIKE '$table'") != $table) {
            return $menuItems;
        }

        $publicActiveCount = Creative::where('status', 'active')
            ->exists();

        if ($publicActiveCount) {
            $menuItems['creatives']['enabled'] = true;
            return $menuItems;
        }

        return $menuItems;
    }

    public function maybeScheduledCreative($creative)
    {
        if (!$creative || $creative->status !== 'scheduled') {
            return;
        }

        $startTime = Arr::get($creative->meta, 'start_time');
        $endTime = Arr::get($creative->meta, 'end_time');

        $currentWpTime = current_datetime()->getTimestamp();

        $isActive = true;
        if ($startTime) {
            $scheduleTime = new \DateTime($startTime, wp_timezone());
            if (($scheduleTime->getTimestamp() > $currentWpTime)) {
                $isActive = false;
                $scheduleUtcTime = $scheduleTime->setTimezone(new \DateTimeZone('UTC'));
                \as_schedule_single_action($scheduleUtcTime->getTimestamp(), 'fluent_affiliate/activate_creative', [$creative->id], 'fluent-affiliate-pro');
            }
        }

        if ($endTime && $endTime > $startTime) {
            $scheduleTime = new \DateTime($endTime, wp_timezone());
            if ($scheduleTime->getTimestamp() > $currentWpTime) {
                $scheduleUtcTime = $scheduleTime->setTimezone(new \DateTimeZone('UTC'));
                \as_schedule_single_action($scheduleUtcTime->getTimestamp(), 'fluent_affiliate/expire_creative', [$creative->id], 'fluent-affiliate-pro');
            }
        }

        if (!$isActive) {
            return;
        }

        $creative->status = 'active';
        $creative->save();

        do_action('fluent_affiliate/creative_status_changed', $creative);
    }

    public function handleUpdatedCreative($creative, $oldCreative)
    {
        if (!$creative || $creative->status == $oldCreative->status) {
            return;
        }

        if ($creative->status == 'scheduled') {
            $this->maybeScheduledCreative($creative);
            return;
        }

        \as_unschedule_all_actions('fluent_affiliate/activate_creative', [$creative->id], 'fluent-affiliate-pro');
        \as_unschedule_all_actions('fluent_affiliate/expire_creative', [$creative->id], 'fluent-affiliate-pro');
    }

    public function maybeAddMediaData($creativeData)
    {
        $attachmentId = Arr::get($creativeData, 'meta.attachment_id');
        if (empty($attachmentId)) {
            return $creativeData;
        }

        $file = get_attached_file($attachmentId);
        if (!$file || !file_exists($file)) {
            return $creativeData;
        }

        $imageSize = @getimagesize($file);
        if (!$imageSize) {
            return $creativeData;
        }

        $creativeData['meta']['media_width'] = $imageSize[0] ?? null;
        $creativeData['meta']['media_height'] = $imageSize[1] ?? null;
        $creativeData['meta']['media_type'] = $imageSize['mime'] ?? null;

        return $creativeData;
    }

    public function activateScheduledCreative($creativeId)
    {
        $creative = Creative::find($creativeId);
        if (!$creative || $creative->status !== 'scheduled') {
            return;
        }

        $creative->status = 'active';
        $creative->save();

        do_action('fluent_affiliate/creative_status_changed', $creative);
    }

    public function expireScheduledCreative($creativeId)
    {
        $creative = Creative::find($creativeId);
        if (!$creative || $creative->status !== 'active') {
            return;
        }

        $creative->status = 'expired';
        $creative->save();

        do_action('fluent_affiliate/creative_status_changed', $creative);
    }
}
