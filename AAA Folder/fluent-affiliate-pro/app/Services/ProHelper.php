<?php

namespace FluentAffiliatePro\App\Services;

use FluentAffiliate\Framework\Support\Arr;

class ProHelper
{
    public static function sanitizeRegistrationFields($fieldsData)
    {
        $fieldTypes = [
            'text'   => [
                'fields'    => ['label', 'placeholder', 'help_text', 'name', 'type', 'sanitize_callback'],
                'sanitizer' => 'sanitize_text_field'
            ],
            'html'   => [
                'fields'    => ['html', 'inline_label'],
                'sanitizer' => 'wp_kses_post'
            ],
            'yes_no' => [
                'fields'    => ['system_defined', 'required', 'public_only', 'disable_alter', 'enabled'],
                'sanitizer' => function ($value) {
                    return $value === 'yes' ? 'yes' : 'no';
                }
            ]
        ];

        $formattedFields = [];
        foreach ($fieldsData as $field) {
            $sanitizedField = [];
            foreach ($fieldTypes as $type) {
                $values = Arr::only($field, $type['fields']);
                $sanitized = array_map($type['sanitizer'], $values);
                $sanitizedField = wp_parse_args($sanitizedField, $sanitized);
            }

            $formattedFields[] = $sanitizedField;
        }

        return $formattedFields;
    }
}