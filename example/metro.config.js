const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const rwfitBleRoot = path.resolve(__dirname, '..');

const config = {
  // The Demo consumes the component at the repository root through a local
  // file: symlink.
  // Metro only watches the app root by default, so explicitly expose the
  // symlink target and resolve the package name to that target.
  watchFolders: [rwfitBleRoot],
  resolver: {
    disableHierarchicalLookup: true,
    extraNodeModules: {
      'react-native-rwfit-ble': rwfitBleRoot,
    },
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
