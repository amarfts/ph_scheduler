const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function convertPdfToPng(pdfPath) {
  const tmpDir = path.join(__dirname, '..', 'tmp', 'pngs');

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const outputFileName = uuidv4(); 
  const outputPattern = path.join(tmpDir, `${outputFileName}-%d.png`);

  return new Promise((resolve, reject) => {
    const command = `convert -density 200 "${pdfPath}" -resize 800x1000 "${outputPattern}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error converting PDF to PNG:', stderr);
        return reject(new Error(stderr));
      }

      console.log('✅ PDF converted to PNGs');

      const images = fs.readdirSync(tmpDir)
        .filter(file => file.startsWith(outputFileName))
        .map(file => path.join(tmpDir, file));

      resolve(images);
    });
  });
}

module.exports = convertPdfToPng;
