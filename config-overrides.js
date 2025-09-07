const { override, addWebpackPlugin } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ),
  (config) => {
    // Add .mjs to the list of file extensions
    config.resolve.extensions = [...config.resolve.extensions, '.mjs'];
    
    // Add fallbacks for Node.js core modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      process: require.resolve('process/browser')
    };
    
    // Add rule to handle .mjs files
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      }
    });
    
    return config;
  }
);
