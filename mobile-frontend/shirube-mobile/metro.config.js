const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude the Langeco/ design-canvas folder from the bundler. It contains
// reference HTML + loose .jsx files that aren't part of the app.
const designFolder = path.resolve(__dirname, 'Langeco');
const designFolderRegex = new RegExp(
  `^${designFolder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\].*`,
);
config.resolver.blockList = [designFolderRegex];

// Allow metro to bundle our SQLite dictionary file as an asset. By
// default `.sqlite` is not in `assetExts`, so `require('./dictionary.sqlite')`
// would fail. We add it here so `expo-asset`'s `Asset.fromModule(...)` flow
// can resolve to a downloadable URI at runtime.
config.resolver.assetExts = [...config.resolver.assetExts, 'sqlite'];

module.exports = config;
