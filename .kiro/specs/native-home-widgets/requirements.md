# Requirements Document

## Introduction

The WeDo app currently has a JavaScript bridge (`widgetBridge.ts`) and a config plugin (`withWidgetBridge.js`) that attempt to set up native home screen widgets on iOS and Android. However, the iOS side uses a fragile, custom 500-line Xcode target injection approach that fails during `expo prebuild`, and the Android side generates XML resources but does not copy the actual Kotlin widget class file during prebuild. This feature replaces the broken iOS approach with the `react-native-widget-extension` library and ensures the Android config plugin copies the Kotlin source file, so that both platforms produce working "Days Together" home screen widgets.

## Glossary

- **Widget**: A native home screen component (iOS WidgetKit / Android AppWidgetProvider) that displays relationship day count outside the app
- **Config_Plugin**: An Expo config plugin that modifies native project files during `expo prebuild`
- **Widget_Extension**: The iOS WidgetKit app extension target that renders the SwiftUI widget
- **react-native-widget-extension**: A third-party npm library that manages iOS WidgetKit extension target injection into Xcode projects during Expo prebuild
- **App_Group**: An iOS capability (group.com.wedo.app) that allows the main app and the Widget_Extension to share data via UserDefaults
- **SharedPreferences**: Android key-value storage used by the main app and WeDoDaysWidget to share widget data
- **UserDefaults**: iOS key-value storage accessed via a shared App_Group suite name for cross-process data sharing
- **Widget_Bridge**: The existing React Native NativeModule (`WidgetBridge`) that writes relationship data to native shared storage and triggers widget refresh
- **Days_Together_Count**: The integer number of calendar days between the relationship start date and the current date, minimum 0
- **Prebuild**: The `expo prebuild` step that generates native iOS and Android project files from app.json and config plugins
- **targets/widget**: A project-root directory containing the SwiftUI source files for the iOS Widget_Extension

## Requirements

### Requirement 1: Install react-native-widget-extension for iOS Widget Target Management

**User Story:** As a developer, I want to use the `react-native-widget-extension` library to manage the iOS WidgetKit extension target, so that I do not need a fragile custom config plugin to inject Xcode targets during prebuild.

#### Acceptance Criteria

1. THE Project SHALL include `react-native-widget-extension` as a dependency in package.json
2. WHEN `expo prebuild` runs, THE react-native-widget-extension plugin SHALL create the WeDoDaysWidget extension target in the Xcode project with bundle identifier `com.anonymous.wedo.WeDoDaysWidget`
3. THE app.json plugins array SHALL include the react-native-widget-extension plugin configured to reference the `targets/widget` directory as the source for SwiftUI widget files
4. WHEN `expo prebuild` runs, THE react-native-widget-extension plugin SHALL add the App_Group entitlement (`group.com.wedo.app`) to the Widget_Extension target

### Requirement 2: Remove Custom iOS Xcode Target Injection from withWidgetBridge.js

**User Story:** As a developer, I want to remove the custom iOS Xcode project manipulation code from `withWidgetBridge.js`, so that iOS widget target setup is handled entirely by react-native-widget-extension.

#### Acceptance Criteria

1. THE Config_Plugin (`withWidgetBridge.js`) SHALL NOT contain any `withXcodeProject` modifier that creates or configures the WeDoDaysWidget native target
2. THE Config_Plugin SHALL NOT contain any `withDangerousMod` modifier for the iOS platform that copies widget source files
3. THE Config_Plugin SHALL retain the `withEntitlementsPlist` modifier that adds the App_Group entitlement (`group.com.wedo.app`) to the main app target
4. THE Config_Plugin SHALL retain all Android-related modifiers (manifest receiver registration, XML resource generation)

### Requirement 3: Create iOS SwiftUI Widget in targets/widget Directory

**User Story:** As a user, I want a SwiftUI-based iOS home screen widget that displays how many days my partner and I have been together, so that I can see the count at a glance without opening the app.

#### Acceptance Criteria

1. THE targets/widget directory SHALL contain a SwiftUI Widget.swift file that defines a WidgetKit timeline provider and widget view
2. WHEN the Widget_Extension reads from UserDefaults with suite name `group.com.wedo.app`, THE Widget_Extension SHALL retrieve the `startDate` value stored by the main app
3. WHEN a valid startDate is available, THE Widget_Extension SHALL calculate the Days_Together_Count as the number of whole days between the startDate and the current date
4. WHEN a valid startDate is available, THE Widget_Extension SHALL display the Days_Together_Count as a prominent numeric value and a "Days Together" label
5. WHEN no startDate is available in UserDefaults, THE Widget_Extension SHALL display a placeholder message prompting the user to open the WeDo app
6. THE Widget_Extension SHALL request a timeline refresh at least once every 24 hours to keep the Days_Together_Count current
7. THE Widget_Extension SHALL support the systemSmall widget family at minimum

### Requirement 4: Android Config Plugin Copies Kotlin Widget Class During Prebuild

**User Story:** As a developer, I want the Android config plugin to copy the `WeDoDaysWidget.kt` source file into the correct package directory during `expo prebuild`, so that the widget class is always present in a clean prebuild output.

#### Acceptance Criteria

1. THE Config_Plugin SHALL include a `withDangerousMod` modifier for the Android platform that copies `WeDoDaysWidget.kt` from a local source directory into `android/app/src/main/java/com/anonymous/wedo/` during prebuild
2. WHEN the destination `WeDoDaysWidget.kt` file already exists, THE Config_Plugin SHALL overwrite the file with the source version to ensure consistency
3. THE Config_Plugin SHALL also copy `WidgetBridgeModule.kt` and `WidgetBridgePackage.kt` from the local source directory during prebuild
4. THE local source directory for Android widget Kotlin files SHALL be `plugins/android-widget/` in the project root

### Requirement 5: Android Widget Displays Days Together Count

**User Story:** As a user, I want an Android home screen widget that displays how many days my partner and I have been together, so that I can see the count at a glance without opening the app.

#### Acceptance Criteria

1. WHEN the WeDoDaysWidget receives an `APPWIDGET_UPDATE` broadcast, THE WeDoDaysWidget SHALL read the startDate from SharedPreferences (`com.anonymous.wedo.widget`)
2. WHEN a valid startDate is available, THE WeDoDaysWidget SHALL calculate the Days_Together_Count as the number of whole days between the startDate and the current date
3. WHEN a valid startDate is available, THE WeDoDaysWidget SHALL display the Days_Together_Count as a prominent numeric value and a "Days Together" label
4. WHEN no startDate is available in SharedPreferences, THE WeDoDaysWidget SHALL display a placeholder message prompting the user to open the WeDo app
5. THE WeDoDaysWidget SHALL update at least once every 24 hours via the `updatePeriodMillis` configuration set to 86400000 milliseconds

### Requirement 6: Widget Bridge Syncs Data to Both Platforms

**User Story:** As a developer, I want the existing Widget_Bridge to write relationship data to both iOS UserDefaults (via App_Group) and Android SharedPreferences, so that both platform widgets can read the latest start date.

#### Acceptance Criteria

1. WHEN `syncWidgetData` is called, THE Widget_Bridge SHALL write the relationship startDate and isPremium flag to the native shared storage for the current platform
2. WHEN running on iOS, THE Widget_Bridge SHALL write data to UserDefaults with suite name `group.com.wedo.app`
3. WHEN running on Android, THE Widget_Bridge SHALL write data to SharedPreferences with name `com.anonymous.wedo.widget`
4. WHEN the Widget_Bridge successfully writes data, THE Widget_Bridge SHALL trigger a widget refresh on the current platform
5. IF the Widget_Bridge encounters an error during data sync, THEN THE Widget_Bridge SHALL fail silently without crashing the app

### Requirement 7: Prebuild Produces Complete Native Projects

**User Story:** As a developer, I want `expo prebuild --clean` to produce fully functional native projects for both platforms with all widget files in place, so that I can build and test widgets without manual file copying.

#### Acceptance Criteria

1. WHEN `expo prebuild --clean` completes for iOS, THE generated Xcode project SHALL contain the WeDoDaysWidget extension target with all SwiftUI source files from `targets/widget`
2. WHEN `expo prebuild --clean` completes for Android, THE generated Android project SHALL contain `WeDoDaysWidget.kt`, `WidgetBridgeModule.kt`, and `WidgetBridgePackage.kt` in the `com.anonymous.wedo` package directory
3. WHEN `expo prebuild --clean` completes for Android, THE generated Android project SHALL contain `wedo_days_widget_info.xml` in `res/xml/`, `widget_days_together.xml` in `res/layout/`, and the widget_description string in `res/values/strings.xml`
4. WHEN `expo prebuild --clean` completes for Android, THE AndroidManifest.xml SHALL contain the WeDoDaysWidget receiver registration with the `APPWIDGET_UPDATE` intent filter
