<?php

namespace FluentAffiliatePro\App\Hooks\Handlers;

use FluentAffiliate\App\Helper\Utility;
use FluentAffiliate\App\Models\Affiliate;
use FluentAffiliate\App\Models\Referral;
use FluentAffiliate\Framework\Support\Arr;

class ConversionScriptHandler
{
    public function register()
    {

        // usage Basic: [fluent_aff_conversion_script]

        // Then redirect from your custom endpoint to the thank you page
        // ?amount=10&description=Product+Purchase&provider=custom_provider&provider_id=123&provider_sub_id=456&status=unpaid&type=sale

        // usage: [fluent_aff_conversion_script amount="10.00" description="Product Purchase" provider="custom_provider" provider_id="123" provider_sub_id="456" status="unpaid/pending" type="sale"]

        add_shortcode('fluent_aff_conversion_script', [$this, 'renderConversionScript']);

        // This shortcode is for custom landing page tracking
        // So you can use [fluent_aff_custom_landing ref="ref_param"] to associate the custom landing page with a affiliate
        add_shortcode('fluent_aff_custom_landing', [$this, 'pushCustomLandingRef']);

        add_action('wp_ajax_fluent_aff_conv_record', [$this, 'trackConvoAjax']);
        add_action('wp_ajax_nopriv_fluent_aff_conv_record', [$this, 'trackConvoAjax']);
    }

    public function pushCustomLandingRef($atts)
    {
        $defaults = [
            'ref' => 'ref',
        ];
        $atts = shortcode_atts($defaults, $atts, 'fluent_aff_custom_landing');

        $ref = Arr::get($atts, 'ref', 'ref');

        if (!$ref) {
            return '';
        }

        $affiliate = Utility::getAffiliateByParamId($ref);
        if (!$affiliate || $affiliate->status !== 'active') {
            return '';
        }

        ob_start();
        ?>
        <script type="text/javascript">
            window.fluent_aff_pre_ref = "<?php echo esc_js($ref); ?>";
        </script>
        <?php

        return ob_get_clean();
    }

    public function trackConvoAjax()
    {
        $visit = Utility::getCurrentCookieVisit();
        if (!$visit || ($visit->referrals && !$visit->referrals->isEmpty())) {
            wp_send_json('Already Done');
            return;
        }

        $affiliate = $visit->affiliate;
        if (!$affiliate || $affiliate->status !== 'active') {
            wp_send_json('Affiliate not found or inactive');
            return;
        }

        $hash = Arr::get($_POST, 'hash', '');
        $currentUrl = Arr::get($_POST, 'current_url', '');

        $currentUrl = sanitize_url($currentUrl);

        if (!$currentUrl) {
            $currentUrl = home_url();
        }

        $decryptedData = $this->encryptDecrypt($hash, 'd');

        if (empty($decryptedData)) {
            wp_send_json('Hash is required');
            return;
        }
        $decryptedData = json_decode($decryptedData, true);
        if (!$decryptedData || !is_array($decryptedData) || empty($decryptedData['amount'])) {
            wp_send_json('Invalid hash data');
            return;
        }

        $amount = (float)$decryptedData['amount'];
        $amount = number_format($amount, 2, '.', '');

        if (!$amount || $amount <= 0) {
            wp_send_json('Invalid amount');
            return;
        }

        $referralData = array_filter([
            'affiliate_id'    => $affiliate->id,
            'customer_id'     => null,
            'visit_id'        => $visit->id,
            'description'     => sanitize_text_field(Arr::get($decryptedData, 'description', 'Custom Conversion Tracking')),
            'status'          => Arr::get($decryptedData, 'status', 'unpaid'),
            'amount'          => $amount,
            'order_total'     => $amount,
            'currency'        => Utility::getCurrency(),
            'utm_campaign'    => Arr::get($decryptedData, 'utm_campaign', $visit->utm_campaign),
            'provider'        => Arr::get($decryptedData, 'provider', 'custom'),
            'provider_id'     => (int)Arr::get($decryptedData, 'provider_id', ''),
            'provider_sub_id' => Arr::get($decryptedData, 'provider_sub_id', ''),
            'type'            => Arr::get($decryptedData, 'type', 'opt_in'),
            'products'        => [
                [
                    'item_id'  => 'custom_conversion',
                    'title'    => $currentUrl,
                    'subtotal' => $amount,
                    'tax'      => 0,
                    'discount' => 0,
                    'total'    => $amount
                ]
            ],
            'settings'        => [
                'custom_tracking' => 'yes'
            ]
        ]);

        $referral = new Referral;
        $referral->fill($referralData);
        $referral->save();

        $affiliate = Affiliate::find($referral->affiliate_id);

        if ($referral->status == 'unpaid') {
            $affiliate && $affiliate->recountEarnings();
            do_action('fluent_affiliate/referral_marked_unpaid', $referral);
        } else {
            $affiliate && $affiliate->increase('referrals');
            do_action('fluent_affiliate/referral_created', $referral);
        }

        wp_send_json([
            'message' => 'success',
            'time'    => $referral->created_at,
        ]);
    }

    public function renderConversionScript($atts)
    {
        $defaults = [
            'amount'          => '',
            'description'     => '',
            'provider'        => 'custom',
            'provider_id'     => '',
            'provider_sub_id' => '',
            'status'          => '',
            'utm_campaign'    => '',
            'type'            => 'sale'
        ];

        $atts = shortcode_atts($defaults, $atts, 'fluent_aff_conversion_script');
        $atts = wp_parse_args($atts, $defaults);

        if (empty($atts['amount']) && !empty($_REQUEST['amount'])) {
            $dynamicAmount = $_REQUEST['amount'];
            if ($dynamicAmount && is_numeric($dynamicAmount)) {
                $atts['amount'] = number_format($dynamicAmount, 2, '.', '');
            }
        }

        if ($atts['amount'] <= 0) {
            return '';
        }

        if (empty($atts['description']) && !empty($_REQUEST['description'])) {
            $atts['description'] = sanitize_text_field($_REQUEST['description']);
        }

        if (empty($atts['provider_id']) && !empty($_REQUEST['provider_id'])) {
            $atts['provider_id'] = sanitize_text_field($_REQUEST['provider_id']);
        }

        if (empty($atts['provider_sub_id']) && !empty($_REQUEST['provider_sub_id'])) {
            $atts['provider_sub_id'] = sanitize_text_field($_REQUEST['provider_sub_id']);
        }

        if (empty($atts['status']) || empty($atts['status'])) {
            $validStatuses = ['unpaid', 'pending'];
            if (isset($_REQUEST['status']) && in_array($_REQUEST['status'], $validStatuses)) {
                $atts['status'] = sanitize_text_field($_REQUEST['status']);
            } else {
                $atts['status'] = 'unpaid';
            }
        }

        if (empty($atts['utm_campaign']) && !empty($_REQUEST['utm_campaign'])) {
            $atts['utm_campaign'] = sanitize_text_field($_REQUEST['utm_campaign']);
        }

        $hashString = json_encode($atts);
        $encryptedHash = $this->encryptDecrypt($hashString, 'e');

        if (!$encryptedHash) {
            return '';
        }

        // get curent url wp
        $currentUrl = home_url(add_query_arg([], $GLOBALS['wp']->request));

        ob_start();
        ?>
        <script type="text/javascript">
            window.fluent_aff_ready_ajaxs = window.fluent_aff_ready_ajaxs || [];
            window.fluent_aff_ready_ajaxs.push({
                url: '<?php echo esc_url(admin_url('admin-ajax.php?action=fluent_aff_conv_record')); ?>',
                data: {
                    hash: "<?php echo $encryptedHash; ?>",
                    current_url: "<?php echo esc_url($currentUrl); ?>"
                }
            });
        </script>
        <?php
        $content = ob_get_clean();

        if (!did_action('wp_footer')) {
            add_action('wp_footer', function () use ($content) {
                echo $content;
            }, 1);
        } else {
            return $content;
        }
    }

    private function encryptDecrypt(string $value, string $type = 'e')
    {
        // Validate input
        if (empty($value)) {
            return '';
        }

        if (!in_array($type, ['e', 'd'], true)) {
            return '';
        }

        // Check for OpenSSL extension
        if (!extension_loaded('openssl')) {
            return '';
        }

        // Use constants for key and salt, with secure fallbacks
        $key = defined('LOGGED_IN_KEY') && !empty(LOGGED_IN_KEY) ? LOGGED_IN_KEY : '';

        $salt = defined('LOGGED_IN_SALT') && !empty(LOGGED_IN_SALT) ? LOGGED_IN_SALT : '';

        if (empty($key) || empty($salt)) {
            return '';
        }

        // Ensure key is appropriate length for AES-256 (32 bytes)
        $key = hash('sha256', $key, true); // Derive a 32-byte key
        $method = 'aes-256-ctr';
        $ivLength = openssl_cipher_iv_length($method);

        if ($type === 'e') {
            try {
                // Generate a random IV
                $iv = random_bytes($ivLength);

                // Encrypt with appended salt for integrity check
                $encrypted = openssl_encrypt(
                    $value . $salt,
                    $method,
                    $key,
                    OPENSSL_RAW_DATA,
                    $iv
                );

                if ($encrypted === false) {
                    return false;
                }

                // Combine IV and encrypted data, then encode
                return base64_encode($iv . $encrypted);
            } catch (\Exception $e) {
                return '';
            }
        }

        try {
            // Decode the input
            $decoded = base64_decode($value, true);
            if ($decoded === false) {
                return false;
            }

            // Extract IV from the decoded data (prepended during encryption)
            // @phpstan-ignore-next-line Suppress false positive: IV is prepended, not generated here
            $iv = substr($decoded, 0, $ivLength);
            $ciphertext = substr($decoded, $ivLength);

            if (strlen($iv) !== $ivLength) {
                return false;
            }

            // Decrypt
            $decrypted = openssl_decrypt(
                $ciphertext,
                $method,
                $key,
                OPENSSL_RAW_DATA,
                $iv
            );

            if ($decrypted === false) {
                return false;
            }

            // Verify salt and remove it
            $saltLength = strlen($salt);
            if (substr($decrypted, -$saltLength) !== $salt) {
                return '';
            }

            return substr($decrypted, 0, -$saltLength);
        } catch (\Exception $e) {
            return '';
        }
    }

}

