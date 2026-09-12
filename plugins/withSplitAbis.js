// Genera un APK por arquitectura (arm64-v8a, armeabi-v7a, x86_64) en lugar de
// un APK universal gigante. EAS Build publica cada APK como artefacto separado.
const { withAppBuildGradle } = require('@expo/config-plugins');

const SPLITS_BLOCK = `splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a', 'armeabi-v7a', 'x86_64'
            universalApk false
        }
    }`;

module.exports = function withSplitAbis(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('splits {')) {
      config.modResults.contents = config.modResults.contents.replace(
        'android {',
        `android {\n    ${SPLITS_BLOCK}`
      );
    }
    return config;
  });
};
