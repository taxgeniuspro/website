<?php

namespace FluentAffiliatePro\App\Hooks\Handlers;

class CoreDepenedencyHandler
{
    public function register()
    {
        add_action('admin_menu', function () {
            add_menu_page(
                __('FluentAffiliate', 'fluent-affiliate-pro'),
                __('FluentAffiliate', 'fluent-affiliate-pro'),
                'edit_posts',
                'fluent-affiliate',
                [$this, 'showAdminPage'],
                $this->getMenuIcon(),
                130
            );
        });

        add_action('wp_ajax_fa_install_core_plugin', [$this, 'installCorePlugin']);
    }

    private function getMenuIcon()
    {
        return 'data:image/svg+xml;base64,' . base64_encode('<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
			  <g clip-path="url(#clip0_312_61)">
			    <path fill-rule="evenodd" clip-rule="evenodd" d="M8 0C3.58172 0 0 3.58172 0 8V28C0 32.4183 3.58172 36 8 36H28C32.4183 36 36 32.4183 36 28V8C36 3.58172 32.4183 0 28 0H8ZM24.5412 12.1844L16.2335 26.5737C15.4688 27.8982 13.7751 28.352 12.4506 27.5873C11.1261 26.8226 10.6723 25.129 11.437 23.8045L19.7447 9.41512C20.5094 8.09062 22.203 7.63681 23.5275 8.40151L23.5276 8.40152C24.8521 9.16622 25.3059 10.8599 24.5412 12.1844ZM25.3323 25.5491L26.7169 23.1509C27.4816 21.8264 27.0278 20.1328 25.7033 19.3681C24.3788 18.6034 22.6852 19.0572 21.9205 20.3817L20.5359 22.7799C19.7712 24.1044 20.225 25.798 21.5495 26.5627C22.874 27.3274 24.5676 26.8736 25.3323 25.5491ZM15.442 13.2085L14.0574 15.6067C13.2927 16.9312 11.5991 17.3851 10.2746 16.6204L10.2746 16.6203C8.95008 15.8556 8.49627 14.162 9.26097 12.8375L10.6456 10.4393C11.4103 9.11479 13.1039 8.66098 14.4284 9.42568L14.4284 9.42569C15.7529 10.1904 16.2067 11.884 15.442 13.2085Z" fill="#A7AAAD" />
			  </g>
			  <defs>
			    <clipPath id="clip0_312_61">
			      <rect width="36" height="36" fill="white" />
			    </clipPath>
			  </defs>
			</svg>');
    }

    public function installCorePlugin()
    {
        // verify nonce
        if (!wp_verify_nonce($_POST['_nonce'], 'fa_onboarding_nonce')) {
            wp_send_json(['message' => 'Invalid nonce'], 403);
        }

        if (!current_user_can('install_plugins')) {
            wp_send_json(['message' => 'You do not have permission to install plugin'], 403);
        }

        if (defined('FLUENT_AFFILIATE_PLUGIN_VERSION')) {
            wp_send_json(['message' => 'Already installed'], 200);
        }

        $result = $this->installPlugin('fluent-affiliate');

        if (is_wp_error($result)) {
            wp_send_json(['message' => $result->get_error_message()], 403);
        }

        wp_send_json(['message' => 'Installed'], 200);
    }

    public function showAdminPage()
    {
        wp_enqueue_script('fluent-affiliate-pro-onboard', FLUENT_AFFILIATE_PRO_URL . 'assets/app.js', ['jquery'], FLUENT_AFFILIATE_PRO_VERSION, true);

        wp_localize_script('fluent-affiliate-pro-onboard', 'fluentAffiliateAdmin', [
            'ajax_url' => admin_url('admin-ajax.php'),
            '_nonce'   => wp_create_nonce('fa_onboarding_nonce'),
            'logo'     => FLUENT_AFFILIATE_PRO_URL . 'assets/logo.svg',
        ]);

        wp_enqueue_style('fluent-affiliate-pro-onboard', FLUENT_AFFILIATE_PRO_URL . 'assets/app.css', [], FLUENT_AFFILIATE_PRO_VERSION);
        echo '<div id="fa_onboarding_app"></div>';
    }

    private function installPlugin($pluginSlug)
    {
        $plugin = [
            'name'      => $pluginSlug,
            'repo-slug' => $pluginSlug,
            'file'      => $pluginSlug . '.php'
        ];

        $UrlMaps = [
            'fluent-affiliate' => [
                'admin_url' => admin_url('admin.php?page=fluent-affiliate'),
                'title'     => 'Go to FluentAffiliate Dashboard',
            ],
        ];

        if (!isset($UrlMaps[$pluginSlug]) || (defined('DISALLOW_FILE_MODS') && DISALLOW_FILE_MODS)) {
            return new \WP_Error('invalid_plugin', __('Invalid plugin or file mods are disabled.', 'fluent-affiliate-pro'));
        }

        try {
            return $this->backgroundInstaller($plugin);
        } catch (\Exception $exception) {
            return new \WP_Error('plugin_install_error', $exception->getMessage());
        }
    }

    private function backgroundInstaller($plugin_to_install)
    {
        if (!empty($plugin_to_install['repo-slug'])) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
            require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
            require_once ABSPATH . 'wp-admin/includes/plugin.php';

            WP_Filesystem();

            $skin = new \Automatic_Upgrader_Skin();
            $upgrader = new \WP_Upgrader($skin);
            $installed_plugins = array_keys(\get_plugins());
            $plugin_slug = $plugin_to_install['repo-slug'];
            $plugin_file = isset($plugin_to_install['file']) ? $plugin_to_install['file'] : $plugin_slug . '.php';
            $installed = false;
            $activate = false;

            // See if the plugin is installed already.
            if (isset($installed_plugins[$plugin_file])) {
                $installed = true;
                $activate = !is_plugin_active($installed_plugins[$plugin_file]);
            }

            // Install this thing!
            if (!$installed) {
                // Suppress feedback.
                ob_start();

                try {
                    $plugin_information = plugins_api(
                        'plugin_information',
                        array(
                            'slug'   => $plugin_slug,
                            'fields' => array(
                                'short_description' => false,
                                'sections'          => false,
                                'requires'          => false,
                                'rating'            => false,
                                'ratings'           => false,
                                'downloaded'        => false,
                                'last_updated'      => false,
                                'added'             => false,
                                'tags'              => false,
                                'homepage'          => false,
                                'donate_link'       => false,
                                'author_profile'    => false,
                                'author'            => false,
                            ),
                        )
                    );

                    if (is_wp_error($plugin_information)) {
                        throw new \Exception(wp_kses_post($plugin_information->get_error_message()));
                    }

                    $package = $plugin_information->download_link;
                    $download = $upgrader->download_package($package);

                    if (is_wp_error($download)) {
                        throw new \Exception(wp_kses_post($download->get_error_message()));
                    }

                    $working_dir = $upgrader->unpack_package($download, true);

                    if (is_wp_error($working_dir)) {
                        throw new \Exception(wp_kses_post($working_dir->get_error_message()));
                    }

                    $result = $upgrader->install_package(
                        array(
                            'source'                      => $working_dir,
                            'destination'                 => WP_PLUGIN_DIR,
                            'clear_destination'           => false,
                            'abort_if_destination_exists' => false,
                            'clear_working'               => true,
                            'hook_extra'                  => array(
                                'type'   => 'plugin',
                                'action' => 'install',
                            ),
                        )
                    );

                    if (is_wp_error($result)) {
                        throw new \Exception(wp_kses_post($result->get_error_message()));
                    }

                    $activate = true;

                } catch (\Exception $e) {
                    throw new \Exception(esc_html($e->getMessage()));
                }

                // Discard feedback.
                ob_end_clean();
            }

            wp_clean_plugins_cache();

            // Activate this thing.
            if ($activate) {
                try {
                    $result = activate_plugin($installed ? $installed_plugins[$plugin_file] : $plugin_slug . '/' . $plugin_file);

                    if (is_wp_error($result)) {
                        throw new \Exception(esc_html($result->get_error_message()));
                    }
                } catch (\Exception $e) {
                    throw new \Exception(esc_html($e->getMessage()));
                }
            }
        }
    }
}
