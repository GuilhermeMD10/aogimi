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

module.exports = config;
