// `babel-preset-expo` ships nested under `expo/node_modules`, so resolve it by
// path rather than by bare name (which Babel would look up from the project
// root and fail to find).
const babelPresetExpo = require.resolve('babel-preset-expo', {
  paths: [require('path').dirname(require.resolve('expo/package.json'))],
});

module.exports = function (api) {
  api.cache(true);
  return {
    // `unstable_transformImportMeta` rewrites `import.meta` so packages that
    // ship it (e.g. zustand's ESM build) don't crash the classic-script web
    // bundle with "Cannot use 'import.meta' outside a module". This becomes the
    // default in Expo SDK 56; until then it must be enabled explicitly.
    presets: [[babelPresetExpo, { unstable_transformImportMeta: true }]],
  };
};
