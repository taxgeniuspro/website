<?php

/**
 * @var $router FluentAffiliate\Framework\Http\Router
 */

$router->namespace('FluentCommunityPro\App\Http\Controllers')->group(function($router) {
    require_once __DIR__ . '/api.php';
});
