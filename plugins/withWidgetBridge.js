const {
  withEntitlementsPlist,
  withXcodeProject,
  withAndroidManifest,
} = require('@expo/config-plugins');

const APP_GROUP = 'group.com.wedo.app';

/**
 * Expo Config Plugin: Widget Bridge
 *
 * iOS: Adds App Group entitlement so the main app and widget extension
 *      can share data via UserDefaults(suiteName:).
 * Android: Registers the WeDoDaysWidget AppWidgetProvider in the manifest.
 */
function withWidgetBridge(config) {
  // iOS: Add App Group entitlement
  config = withEntitlementsPlist(config, (config) => {
    if (!config.modResults['com.apple.security.application-groups']) {
      config.modResults['com.apple.security.application-groups'] = [];
    }
    const groups = config.modResults['com.apple.security.application-groups'];
    if (!groups.includes(APP_GROUP)) {
      groups.push(APP_GROUP);
    }
    return config;
  });

  // Android: Add widget receiver to manifest
  config = withAndroidManifest(config, (config) => {
    const mainApp =
      config.modResults.manifest.application?.[0];
    if (!mainApp) return config;

    // Check if widget receiver already exists
    if (!mainApp.receiver) {
      mainApp.receiver = [];
    }

    const alreadyAdded = mainApp.receiver.some(
      (r) => r.$?.['android:name'] === '.WeDoDaysWidget'
    );

    if (!alreadyAdded) {
      mainApp.receiver.push({
        $: {
          'android:name': '.WeDoDaysWidget',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/wedo_days_widget_info',
            },
          },
        ],
      });
    }

    return config;
  });

  return config;
}

module.exports = withWidgetBridge;
