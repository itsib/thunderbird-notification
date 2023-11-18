const fs = require('fs');
const webpack = require('webpack');
const { resolve } = require('path');
const AdmZip = require('adm-zip');
const metadata = require('./src/metadata.json');
const { execSync } = require('child_process');
const path = require('path');

function copySourcesToProject() {
  const copyDir = (source, destination) => {
    const sourceFullPath = resolve(__dirname, source);
    const destinationFullPath = resolve(__dirname, destination);
    fs.mkdirSync(destinationFullPath);
    for (const file of fs.readdirSync(sourceFullPath)) {
      fs.copyFileSync(resolve(sourceFullPath, file), resolve(destinationFullPath, file))
    }
  }

  fs.mkdirSync(resolve(__dirname, 'dist'));

  // Copy metadata.json
  fs.copyFileSync(resolve(__dirname, 'src/extension.js'), resolve(__dirname, 'dist/extension.js'))
  fs.copyFileSync(resolve(__dirname, 'src/prefs.js'), resolve(__dirname, 'dist/prefs.js'))

  // Copy metadata.json
  fs.copyFileSync(resolve(__dirname, 'src/metadata.json'), resolve(__dirname, 'dist/metadata.json'))

  // Copy styles
  fs.copyFileSync(resolve(__dirname, 'src/stylesheet.css'), resolve(__dirname, 'dist/stylesheet.css'))

  // Copy others
  copyDir('src/widgets', 'dist/widgets');
  copyDir('src/icons', 'dist/icons');
  copyDir('src/modules', 'dist/modules');
  copyDir('src/schemas', 'dist/schemas');
}

function buildSchemas() {
  execSync(`glib-compile-schemas ${resolve(__dirname, 'dist/schemas/')}`);
}

function buildImapBin() {
  const compiler = webpack({
    target: 'node',
    // mode: 'development',
    mode: 'production',
    entry: './src/bin/imap-totals.js',
    output: {
      path: path.resolve(__dirname, 'dist/bin'),
      filename: 'imap-totals.js',
    }
  });

  return new Promise((resolve, reject) => compiler.run((error, stats) => error ? reject(error) : resolve(stats)));
}

function zipPackExtension(zipFilename) {
  // Pack extension
  const zipDist = resolve(__dirname, zipFilename);
  const zip = new AdmZip();
  zip.addLocalFolder(resolve(__dirname, 'dist'));
  zip.writeZip(zipDist);
}

(async () => {
  copySourcesToProject();

  buildSchemas();

  await buildImapBin();

  const zipFilename = `${metadata.uuid}.zip`;

  zipPackExtension(zipFilename);

  console.log(`\x1b[00;32mBuild complete. Zip file: \x1b[01;32m${zipFilename}\x1b[0m\n`);
  console.log(`\x1b[00;33mInstall with:\x1b[0m  \x1b[00;37mgnome-extensions install ${zipFilename}\x1b[0m`);
  console.log(`\x1b[00;33mUpdate with:\x1b[0m   \x1b[00;37mgnome-extensions install ${zipFilename} --force\x1b[0m`);
  console.log(`\x1b[00;33mEnable with:\x1b[0m   \x1b[00;37mgnome-extensions enable ${metadata.uuid}\x1b[0m`);
})();