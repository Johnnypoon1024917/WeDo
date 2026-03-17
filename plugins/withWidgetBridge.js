const {
  withEntitlementsPlist,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUP = 'group.com.wedo.app';

/**
 * Expo Config Plugin: Widget Bridge
 *
 * iOS: Adds App Group entitlement to the main app target.
 *      (Widget extension target is managed by react-native-widget-extension)
 * Android: Registers the WeDoDaysWidget AppWidgetProvider in the manifest
 *          and generates widget XML resource files.
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

  // Android: Generate widget XML resource files during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res'
      );

      // Create res/xml/ directory and write wedo_days_widget_info.xml
      const xmlDir = path.join(resDir, 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'wedo_days_widget_info.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:initialLayout="@layout/widget_days_together"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="86400000"
    android:widgetCategory="home_screen"
    android:description="@string/widget_description"
    android:previewLayout="@layout/widget_days_together" />
`
      );

      // Create res/layout/ directory and write widget_days_together.xml
      const layoutDir = path.join(resDir, 'layout');
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.writeFileSync(
        path.join(layoutDir, 'widget_days_together.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_background"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#121212"
    android:gravity="center"
    android:orientation="vertical"
    android:padding="12dp">

    <TextView
        android:id="@+id/widget_heart"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="❤️"
        android:textSize="24sp" />

    <TextView
        android:id="@+id/widget_days_count"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="0"
        android:textColor="#FF7F50"
        android:textSize="36sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/widget_days_label"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="Days Together"
        android:textColor="#99FFFFFF"
        android:textSize="12sp" />

</LinearLayout>
`
      );

      // Ensure res/values/strings.xml contains widget_description
      const valuesDir = path.join(resDir, 'values');
      fs.mkdirSync(valuesDir, { recursive: true });
      const stringsPath = path.join(valuesDir, 'strings.xml');
      if (fs.existsSync(stringsPath)) {
        const content = fs.readFileSync(stringsPath, 'utf8');
        if (!content.includes('widget_description')) {
          const updated = content.replace(
            '</resources>',
            '  <string name="widget_description">See how many days you and your partner have been together.</string>\n</resources>'
          );
          fs.writeFileSync(stringsPath, updated);
        }
      } else {
        fs.writeFileSync(
          stringsPath,
          `<resources>
  <string name="widget_description">See how many days you and your partner have been together.</string>
</resources>
`
        );
      }

      return config;
    },
  ]);

  // Android: Copy Kotlin widget files from plugins/android-widget/ into the Android project
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const srcDir = path.join(projectRoot, 'plugins', 'android-widget');
      const destDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'anonymous',
        'wedo'
      );

      fs.mkdirSync(destDir, { recursive: true });

      const kotlinFiles = [
        'WeDoDaysWidget.kt',
        'WidgetBridgeModule.kt',
        'WidgetBridgePackage.kt',
      ];

      for (const file of kotlinFiles) {
        const srcFile = path.join(srcDir, file);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, path.join(destDir, file));
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withWidgetBridge;
