var path = require('path');

var config = {
  entry: ['webpack/hot/dev-server', path.resolve(__dirname, '../demo.js')],
  output: {
    path: path.resolve(__dirname, '../demo'),
    filename: 'AbsoluteGrid.js'
  },
  module: {
    loaders: [{
      test: /\.js$/, // A regexp to test the require path. accepts either js or jsx
      loader: 'babel' // The module to load. "babel" is short for "babel-loader"
    }]
  }
};

module.exports = config;
