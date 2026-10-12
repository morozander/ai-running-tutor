// metro.config.js
//
// Expo Metro config with a tslib interop fix.
//
// Why: Apollo Client 4 imports `tslib`, whose package.json "exports" map exposes
// an ESM build under the `node`/`import` conditions that Metro's web (static
// render) target resolves to a module whose `default` export is undefined,
// producing at bundle time:
//   "Cannot destructure property '__extends' of 'tslib.default' as it is undefined."
// Forcing `tslib` to its CommonJS build (tslib/tslib.js) restores the expected
// runtime shape across all platforms. Remove once Apollo/tslib fix the upstream
// package-exports interop.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('tslib/tslib.js'),
    };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
