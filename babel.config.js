const babelPresetExpo = require.resolve('babel-preset-expo', {
  paths: [require('path').dirname(require.resolve('expo/package.json'))],
});

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [[babelPresetExpo, { unstable_transformImportMeta: true }]],
  };
};
