const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    "index": "./lib/index.js"
  },

  module: {
    rules: [{
      test: /\.js$/,
      loader: "babel-loader",
      query: {
        presets: ['babel-preset-env'],
        plugins: ['transform-object-rest-spread', 'transform-runtime'],
      },
      include: [
        path.resolve(__dirname, "..", 'lib')
      ],
    }],
  },

  target: 'node',

  output: {
    library: "reselect-tree",
    libraryTarget: "umd",
    umdNamedDefine: true,

    filename: "[name].js",
    path: path.join(__dirname, "..", "dist"),
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
  },

  resolve: {
    modules: [path.resolve(__dirname, ".."), "node_modules"]
  },

  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  devtool: "inline-cheap-module-source-map",
}
