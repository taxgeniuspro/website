<?php

/**
 * All registered action's handlers should be in app\Hooks\Handlers,
 * addAction is similar to add_action and addCustomAction is just a
 * wrapper over add_action which will add a prefix to the hook name
 * using the plugin slug to make it unique in all wordpress plugins,
 * ex: $app->addCustomAction('foo', ['FooHandler', 'handleFoo']) is
 * equivalent to add_action('slug-foo', ['FooHandler', 'handleFoo']).
 */



(new \FluentAffiliatePro\App\Services\Integrations\IntegrationsInit())->register();

// Register the MultiDomainTrackerHandler to handle multi-domain tracking
(new \FluentAffiliatePro\App\Hooks\Handlers\MultiDomainTranckerHandler())->register();

// Register the ConversionScriptHandler to handle conversion scripts
(new \FluentAffiliatePro\App\Hooks\Handlers\ConversionScriptHandler())->register();

// Register the CreativeScheduleHandler to handle creative schedule
(new \FluentAffiliatePro\App\Hooks\Handlers\CreativeScheduleHandler())->register();
