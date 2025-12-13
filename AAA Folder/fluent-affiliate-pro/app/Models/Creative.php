<?php

namespace FluentAffiliatePro\App\Models;

use FluentAffiliate\App\Helper\Utility;

class Creative extends Model
{
    protected $table = 'fa_creatives';

    protected $guarded = ['id'];

    protected $fillable = [
        'name',
        'description',
        'type',
        'image',
        'url',
        'text',
        'privacy',
        'status',
        'affiliate_ids',
        'group_ids',
        'meta',
        'created_at',
        'updated_at'
    ];

    protected $appends = ['human_updated_at'];

    public function scopeSearch($query, $search)
    {
        return $query->when($search, function($query) use($search){
            return $query->where('name', 'LIKE', "%{$search}%")
                ->orWhere('description', 'LIKE', "%{$search}%")
                ->orWhere('type', 'LIKE', "%{$search}%")
                ->orWhere('image', 'LIKE', "%{$search}%")
                ->orWhere('text', 'LIKE', "%{$search}%")
                ->orWhere('url', 'LIKE', "%{$search}%")
                ->orWhere('privacy', 'LIKE', "%{$search}%")
                ->orWhere('status', 'LIKE', "%{$search}%");
        });
    }

    public function getMetaAttribute($value)
    {
        $meta = Utility::safeUnserialize($value);

        return $meta ? $meta : [];
    }

    public function setMetaAttribute($value)
    {
        $this->attributes['meta'] = \maybe_serialize($value);
    }
    
    public function getGroupIdsAttribute($value)
    {
        return $value ? json_decode($value, true) : [];
    }

    public function setGroupIdsAttribute($value)
    {
        $this->attributes['group_ids'] = is_array($value) ? json_encode($value) : $value;
    }

    public function getAffiliateIdsAttribute($value)
    {
        return $value ? json_decode($value, true) : [];
    }

    public function setAffiliateIdsAttribute($value)
    {
        $this->attributes['affiliate_ids'] = is_array($value) ? json_encode($value) : $value;
    }

    public function getHumanUpdatedAtAttribute()
    {
        if ($this->updated_at) {
            return $this->updated_at->format('d M Y, H:i');
        }
        return null;
    }
}