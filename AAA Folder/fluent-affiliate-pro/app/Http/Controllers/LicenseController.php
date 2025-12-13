<?php

namespace FluentAffiliatePro\App\Http\Controllers;

use FluentAffiliate\App\Http\Controllers\Controller;
use FluentAffiliate\Framework\Http\Request\Request;
use FluentAffiliatePro\App\Services\Updater\FluentLicensing;

class LicenseController extends Controller
{
    public function getStatus(Request $request, FluentLicensing $licenseManager)
    {
        $licenseInstance = $licenseManager::getInstance();
        $data = $licenseInstance->getStatus(true);

        if ($request->get('verify')) {
            unset($data['license_key']);
        }

        return $data;
    }

    public function saveLicense(Request $request, FluentLicensing $licenseManager)
    {
        $licenseKey = $request->getSafe('license_key');

        $licenseInstance = $licenseManager::getInstance();
        $response = $licenseInstance->activate($licenseKey);

        if (is_wp_error($response)) {
            return $this->sendError([
                'message' => $response->get_error_message(),
            ]);
        }

        return [
            'license_data' => $response,
            'message'      => __('Your license key has been successfully updated', 'fluent-booking-pro'),
        ];
    }

    public function deactivateLicense(Request $request, FluentLicensing $licenseManager)
    {
        $licenseInstance = $licenseManager::getInstance();

        $response = $licenseInstance->deactivate();

        if (is_wp_error($response)) {
            return $this->sendError([
                'message' => $response->get_error_message(),
            ]);
        }

        unset($response['license_key']);

        return [
            'license_data' => $response,
            'message'      => __('Your license key has been successfully deactivated', 'fluent-booking-pro'),
        ];
    }

}
