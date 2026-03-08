#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * Generates placeholder PWA icons in various sizes.
 * For production, replace these with actual branded icons.
 * 
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Generate SVG icon template
function generateSVGIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">V</text>
</svg>`;
}

// Generate icons for each size
SIZES.forEach(size => {
  const svg = generateSVGIcon(size);
  const filename = `icon-${size}x${size}.png`;
  const svgPath = path.join(ICONS_DIR, `icon-${size}x${size}.svg`);
  
  // Write SVG file
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated ${filename} (SVG placeholder)`);
});

// Generate shortcut icons
const shortcutIcons = ['add', 'health', 'credit'];
shortcutIcons.forEach(name => {
  const svg = generateSVGIcon(96);
  const svgPath = path.join(ICONS_DIR, `shortcut-${name}.png`);
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated shortcut-${name}.png`);
});

// Generate favicon
const faviconSVG = generateSVGIcon(32);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), faviconSVG);
console.log(`✓ Generated favicon.ico`);

console.log('\n✅ PWA icons generated successfully!');
console.log('\n📝 Note: These are placeholder SVG icons.');
console.log('   For production, replace with actual PNG icons using a tool like:');
console.log('   - https://realfavicongenerator.net/');
console.log('   - https://www.pwabuilder.com/imageGenerator');
