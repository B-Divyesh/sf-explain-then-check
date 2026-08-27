import sharp from 'sharp';

await sharp('assets/src/study-garden.png')
  .resize(1200, 800, { fit: 'cover' })
  .webp({ quality: 78, effort: 6 })
  .toFile('public/art/study-garden.webp');

await sharp('public/icons/icon.svg').resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp('public/icons/icon.svg').resize(512, 512).png().toFile('public/icons/icon-512.png');
