const fs = require('fs').promises;
const path = require('path');

async function generateFavicon() {
  try {
    const sharp = require('sharp');
    
    const sizes = [16, 32, 48];
    const svgBuffer = await fs.readFile(path.join(__dirname, '../public/favicon.svg'));
    
    const pngImages = await Promise.all(
      sizes.map(size => 
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );
    
    const icoBuffer = Buffer.concat([
      // ICO header
      Buffer.from([
        0, 0, // Reserved
        1, 0, // ICO format
        sizes.length, 0 // Number of images
      ]),
      // Image directory
      ...pngImages.flatMap((png, i) => [
        sizes[i], // Width
        sizes[i], // Height
        0, // Color palette (0 = no palette)
        0, // Reserved
        1, 0, // Color planes
        32, 0, // Bits per pixel
        png.length, 0, 0, 0, // Image size (little-endian)
        22 + pngImages.slice(0, i).reduce((sum, p) => sum + p.length, 0), 0, 0, 0 // Image offset
      ]),
      // Image data
      ...pngImages
    ]);
    
    await fs.writeFile(path.join(__dirname, '../public/favicon.ico'), icoBuffer);
    console.log('✅ Favicon generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ sharp module not found. Please install it first:');
      console.error('   cd frontend && npm install sharp');
      process.exit(1);
    }
    console.error('Error generating favicon:', error);
    process.exit(1);
  }
}

generateFavicon();
