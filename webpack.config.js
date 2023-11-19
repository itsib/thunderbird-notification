const path = require('path');
module.exports = {
  target: 'node',
  mode: 'development',
  // mode: 'production',
  entry: './src/bin/imap-totals.js',
  output: {
    path: path.resolve(__dirname, 'dist/bin'),
    filename: 'imap-totals.js',
  }
}