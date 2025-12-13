<?php

/**
 * All registered filter's handlers should be in app\Hooks\Handlers,
 * addFilter is similar to add_filter and addCustomFlter is just a
 * wrapper over add_filter which will add a prefix to the hook name
 * using the plugin slug to make it unique in all wordpress plugins,
 * ex: $app->addCustomFilter('foo', ['FooHandler', 'handleFoo']) is
 * equivalent to add_filter('slug-foo', ['FooHandler', 'handleFoo']).
 */

/**
 * @var $app FluentAffiliate\Framework\Foundation\Application
 */

$app->addFilter('fluent_affiliate/settings_menu_items', function ($items) {
    $items['license_settings']['disable'] = false;
    return $items;
}, 10, 1);