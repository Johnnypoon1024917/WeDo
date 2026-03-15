const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo Config Plugin: Social Catcher
 *
 * Registers the app as a share target so URLs shared from other apps
 * (Instagram, Threads, Safari, etc.) open the WeDo AddToListModal.
 *
 * - iOS: Adds a custom URL scheme (CFBundleURLTypes) to Info.plist
 * - Android: Intent filters are configured directly in app.json
 */
function withSocialCatcher(config) {
  // iOS: add URL scheme to Info.plist
  config = withInfoPlist(config, (config) => {
    const bundleId =
      config.ios?.bundleIdentifier ?? 'com.anonymous.wedo';

    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }

    // Avoid duplicates
    const alreadyAdded = config.modResults.CFBundleURLTypes.some(
      (entry) =>
        entry.CFBundleURLSchemes &&
        entry.CFBundleURLSchemes.includes('wedo')
    );

    if (!alreadyAdded) {
      config.modResults.CFBundleURLTypes.push({
        CFBundleURLName: bundleId,
        CFBundleURLSchemes: ['wedo'],
      });
    }

    return config;
  });

  return config;
}

module.exports = withSocialCatcher;
