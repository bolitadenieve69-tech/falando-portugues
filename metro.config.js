const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  /backend\/luso_tutor\/.*/,
  /backend\/luso_tutor_arm\/.*/,
  /backend\/venv\/.*/,
  /ios\/Pods\/.*/,
  /mobile\/node_modules\/.*/,
]);

module.exports = config;
