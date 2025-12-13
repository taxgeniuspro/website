<?php

/**
 * @var $router FluentAffiliate\Framework\Http\Router
 */

use FluentAffiliatePro\App\Http\Controllers\DomainController;
use FluentAffiliatePro\App\Http\Controllers\ProSettingController;
use FluentAffiliatePro\App\Http\Controllers\AffiliateGroupController;
use FluentAffiliatePro\App\Http\Controllers\CreativeController;
use FluentAffiliatePro\App\Http\Controllers\LicenseController;

$router->prefix('settings')->withPolicy(\FluentAffiliate\App\Http\Policies\AdminPolicy::class)->group(function ($router) {
    $router->get('connected-sites-config', [DomainController::class, 'getConnectedConfig']);
    $router->patch('connected-sites-config', [DomainController::class, 'updateGlobalStatus']);
    $router->patch('connected-sites-config/update', [DomainController::class, 'patchSingleSiteConfig']);
    $router->post('connected-sites-config/issue', [DomainController::class, 'validateAndIssueNewSiteToken']);
    $router->post('connected-sites-config/disconnect', [DomainController::class, 'disconnectSite']);

    $router->get('/groups', [AffiliateGroupController::class, 'index']);
    $router->post('/groups', [AffiliateGroupController::class, 'store']);
    $router->patch('/groups/{id}', [AffiliateGroupController::class, 'update'])->int('id');
    $router->get('/groups/{id}', [AffiliateGroupController::class, 'show'])->int('id');
    $router->get('/groups/{id}/affiliates', [AffiliateGroupController::class, 'affiliates'])->int('id');
    $router->get('/groups/{id}/overview', [AffiliateGroupController::class, 'overview'])->int('id');
    $router->get('/groups/{id}/statistics', [AffiliateGroupController::class, 'statistics'])->int('id');
    $router->delete('/groups/{id}', [AffiliateGroupController::class, 'destroy'])->int('id');

    
    $router->get('/creatives', [CreativeController::class, 'index']);
    $router->get('/creatives/{id}', [CreativeController::class, 'show'])->int('id');
    $router->post('/creatives', [CreativeController::class, 'store']);
    $router->patch('/creatives/{id}', [CreativeController::class, 'update'])->int('id');
    $router->delete('/creatives/{id}', [CreativeController::class, 'destroy'])->int('id');

    $router->get('/options/affiliate-groups', [ProSettingController::class, 'getAffiliateGroupsOptions']);

    $router->post('/registration-fields', [ProSettingController::class, 'saveRegistrationFields']);

    $router->get('/license', [LicenseController::class, 'getStatus']);
    $router->post('/license', [LicenseController::class, 'saveLicense']);
    $router->delete('/license', [LicenseController::class, 'deactivateLicense']);

    $router->get('/managers', [ProSettingController::class, 'getManagers']);
    $router->post('/managers', [ProSettingController::class, 'updateManager']);
    $router->delete('/managers/{id}', [ProSettingController::class, 'deleteManager'])->int('id');
});

$router->prefix('portal')->withPolicy(\FluentAffiliate\App\Http\Policies\UserPolicy::class)->group(function ($router) {
    $router->get('creatives', [CreativeController::class, 'portalCreatives']);
});