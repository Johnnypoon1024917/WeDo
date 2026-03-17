const {
  withEntitlementsPlist,
  withXcodeProject,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUP = 'group.com.wedo.app';
const WIDGET_TARGET_NAME = 'WeDoDaysWidget';
const WIDGET_BUNDLE_ID = 'com.anonymous.wedo.WeDoDaysWidget';

/**
 * Expo Config Plugin: Widget Bridge
 *
 * iOS: Adds App Group entitlement, configures the WeDoDaysWidget extension
 *      target in the Xcode project, and copies widget source files.
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

  // iOS: Configure WeDoDaysWidget extension target in Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    // Check if the widget target already exists
    const existingTarget = xcodeProject.pbxTargetByName(WIDGET_TARGET_NAME);
    if (existingTarget) {
      return config;
    }

    // Get the main app target's deployment target
    const mainTarget = xcodeProject.getFirstTarget();
    const mainTargetUuid = mainTarget.uuid;
    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();
    let deploymentTarget = '16.0'; // sensible default
    const mainConfigListUuid =
      xcodeProject.pbxNativeTargetSection()[mainTargetUuid]
        .buildConfigurationList;
    const configLists = xcodeProject.pbxXCConfigurationList();
    const mainConfigList = configLists[mainConfigListUuid];
    if (mainConfigList) {
      for (const configRef of mainConfigList.buildConfigurations) {
        const cfg = buildConfigs[configRef.value];
        if (cfg && cfg.buildSettings && cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET) {
          deploymentTarget = cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
          break;
        }
      }
    }

    // Create build configurations for the widget extension
    const widgetBuildConfigsList = [
      {
        name: 'Debug',
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
          ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: 'WidgetBackground',
          CLANG_ANALYZER_NONNULL: 'YES',
          CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
          CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
          CLANG_ENABLE_OBJC_WEAK: 'YES',
          CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
          CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'YES',
          CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
          CODE_SIGN_ENTITLEMENTS: `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`,
          CODE_SIGN_STYLE: 'Automatic',
          CURRENT_PROJECT_VERSION: '1',
          DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
          GCC_C_LANGUAGE_STANDARD: 'gnu17',
          GENERATE_INFOPLIST_FILE: 'YES',
          INFOPLIST_FILE: `${WIDGET_TARGET_NAME}/Info.plist`,
          INFOPLIST_KEY_CFBundleDisplayName: '"Days Together"',
          INFOPLIST_KEY_NSHumanReadableCopyright: '""',
          IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
          LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
          MARKETING_VERSION: '1.0',
          PRODUCT_BUNDLE_IDENTIFIER: `"${WIDGET_BUNDLE_ID}"`,
          PRODUCT_NAME: `"$(TARGET_NAME)"`,
          SKIP_INSTALL: 'YES',
          SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"DEBUG $(inherited)"',
          SWIFT_EMIT_LOC_STRINGS: 'YES',
          SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
          SWIFT_VERSION: '5.0',
          TARGETED_DEVICE_FAMILY: '"1,2"',
        },
      },
      {
        name: 'Release',
        isa: 'XCBuildConfiguration',
        buildSettings: {
          ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
          ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: 'WidgetBackground',
          CLANG_ANALYZER_NONNULL: 'YES',
          CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
          CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
          CLANG_ENABLE_OBJC_WEAK: 'YES',
          CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
          CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'YES',
          CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
          CODE_SIGN_ENTITLEMENTS: `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`,
          CODE_SIGN_STYLE: 'Automatic',
          CURRENT_PROJECT_VERSION: '1',
          DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
          GCC_C_LANGUAGE_STANDARD: 'gnu17',
          GENERATE_INFOPLIST_FILE: 'YES',
          INFOPLIST_FILE: `${WIDGET_TARGET_NAME}/Info.plist`,
          INFOPLIST_KEY_CFBundleDisplayName: '"Days Together"',
          INFOPLIST_KEY_NSHumanReadableCopyright: '""',
          IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
          LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
          MARKETING_VERSION: '1.0',
          PRODUCT_BUNDLE_IDENTIFIER: `"${WIDGET_BUNDLE_ID}"`,
          PRODUCT_NAME: `"$(TARGET_NAME)"`,
          SKIP_INSTALL: 'YES',
          SWIFT_EMIT_LOC_STRINGS: 'YES',
          SWIFT_VERSION: '5.0',
          TARGETED_DEVICE_FAMILY: '"1,2"',
        },
      },
    ];

    // Add build configuration list
    const widgetBuildConfigs = xcodeProject.addXCConfigurationList(
      widgetBuildConfigsList,
      'Release',
      `Build configuration list for PBXNativeTarget "${WIDGET_TARGET_NAME}"`
    );

    // Create the product file reference for the .appex
    const productFile = xcodeProject.addProductFile(WIDGET_TARGET_NAME, {
      group: 'Copy Files',
      explicitFileType: 'wrapper.app-extension',
    });

    // Generate target UUID
    const widgetTargetUuid = xcodeProject.generateUuid();
    productFile.target = widgetTargetUuid;

    // Add product to PBXBuildFile section
    xcodeProject.addToPbxBuildFileSection(productFile);

    // Create the native target
    const widgetTarget = {
      uuid: widgetTargetUuid,
      pbxNativeTarget: {
        isa: 'PBXNativeTarget',
        name: `"${WIDGET_TARGET_NAME}"`,
        productName: `"${WIDGET_TARGET_NAME}"`,
        productReference: productFile.fileRef,
        productType: '"com.apple.product-type.app-extension"',
        buildConfigurationList: widgetBuildConfigs.uuid,
        buildPhases: [],
        buildRules: [],
        dependencies: [],
      },
    };

    // Add target to PBXNativeTarget section
    xcodeProject.addToPbxNativeTargetSection(widgetTarget);

    // Add target to project section
    xcodeProject.addToPbxProjectSection(widgetTarget);

    // Create a PBXGroup for the widget extension files
    const widgetGroup = xcodeProject.addPbxGroup(
      [
        `${WIDGET_TARGET_NAME}.swift`,
        `${WIDGET_TARGET_NAME}Views.swift`,
        'Info.plist',
        `${WIDGET_TARGET_NAME}.entitlements`,
      ],
      WIDGET_TARGET_NAME,
      WIDGET_TARGET_NAME,
      '"<group>"'
    );

    // Add the widget group to the main project group
    const projectSection = xcodeProject.pbxProjectSection();
    const projectUuid = xcodeProject.getFirstProject().uuid;
    const mainGroupUuid = projectSection[projectUuid].mainGroup;
    const groups = xcodeProject.hash.project.objects['PBXGroup'];
    if (groups[mainGroupUuid]) {
      groups[mainGroupUuid].children.push({
        value: widgetGroup.uuid,
        comment: WIDGET_TARGET_NAME,
      });
    }

    // Add Sources build phase with Swift files (sub-task 1.2.2)
    xcodeProject.addBuildPhase(
      [
        `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.swift`,
        `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}Views.swift`,
      ],
      'PBXSourcesBuildPhase',
      'Sources',
      widgetTargetUuid
    );

    // Add Resources build phase with Info.plist and entitlements (sub-task 1.2.3)
    xcodeProject.addBuildPhase(
      [
        `${WIDGET_TARGET_NAME}/Info.plist`,
        `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`,
      ],
      'PBXResourcesBuildPhase',
      'Resources',
      widgetTargetUuid
    );

    // Add Frameworks build phase (empty, but required for the target)
    xcodeProject.addBuildPhase(
      [],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      widgetTargetUuid
    );

    // Embed the widget extension in the main app target (sub-task 1.2.5)
    xcodeProject.addBuildPhase(
      [],
      'PBXCopyFilesBuildPhase',
      'Embed App Extensions',
      mainTargetUuid,
      'app_extension'
    );
    xcodeProject.addToPbxCopyfilesBuildPhase(productFile);

    // Add target dependency from main app to widget extension
    xcodeProject.addTargetDependency(mainTargetUuid, [widgetTargetUuid]);

    return config;
  });

  // iOS: Copy widget source files into prebuild output directory (sub-task 1.2.6)
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceDir = path.join(projectRoot, 'ios', WIDGET_TARGET_NAME);
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const destDir = path.join(platformProjectRoot, WIDGET_TARGET_NAME);

      // Only copy if source directory exists
      if (!fs.existsSync(sourceDir)) {
        return config;
      }

      // Create destination directory
      fs.mkdirSync(destDir, { recursive: true });

      // Files to copy
      const filesToCopy = [
        `${WIDGET_TARGET_NAME}.swift`,
        `${WIDGET_TARGET_NAME}Views.swift`,
        'Info.plist',
        `${WIDGET_TARGET_NAME}.entitlements`,
      ];

      for (const fileName of filesToCopy) {
        const srcFile = path.join(sourceDir, fileName);
        const destFile = path.join(destDir, fileName);
        // Only copy if the file doesn't already exist in the destination
        if (fs.existsSync(srcFile) && !fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile);
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withWidgetBridge;
