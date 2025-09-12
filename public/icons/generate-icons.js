// PWA Icon Generation Script
// This script creates SVG placeholders for PWA icons
// For production, replace these with actual PNG icons

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

// SVG template for the main app icon
const createMainIconSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#gradient)" rx="${size * 0.1}"/>
  <circle cx="${size * 0.5}" cy="${size * 0.35}" r="${size * 0.15}" fill="white" opacity="0.9"/>
  <path d="M ${size * 0.3} ${size * 0.6} Q ${size * 0.5} ${size * 0.7} ${size * 0.7} ${size * 0.6}" 
        stroke="white" stroke-width="${size * 0.02}" fill="none" opacity="0.9"/>
  <text x="${size * 0.5}" y="${size * 0.85}" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="${size * 0.08}" font-weight="bold">
    ASHRAM
  </text>
</svg>`;

// Create shortcut icons
const createShortcutIcon = (size, icon, color) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${color}" rx="${size * 0.1}"/>
  <text x="${size * 0.5}" y="${size * 0.6}" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="${size * 0.4}">
    ${icon}
  </text>
</svg>`;

// Generate main app icons
sizes.forEach(size => {
  const svg = createMainIconSVG(size);
  fs.writeFileSync(path.join(__dirname, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

// Generate shortcut icons
const shortcuts = [
  { name: 'calendar', icon: '📅', color: '#3b82f6' },
  { name: 'queue', icon: '⏳', color: '#f59e0b' },
  { name: 'checkin', icon: '✅', color: '#10b981' }
];

shortcuts.forEach(shortcut => {
  const svg = createShortcutIcon(96, shortcut.icon, shortcut.color);
  fs.writeFileSync(path.join(__dirname, `${shortcut.name}-96x96.svg`), svg);
  console.log(`Created ${shortcut.name}-96x96.svg`);
});

// Create badge icon
const badgeSVG = `<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="36" fill="#dc2626"/>
  <text x="36" y="45" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="24" font-weight="bold">
    A
  </text>
</svg>`;

fs.writeFileSync(path.join(__dirname, 'badge-72x72.svg'), badgeSVG);
console.log('Created badge-72x72.svg');

// Create notification action icons
const actionIcons = [
  { name: 'checkmark', icon: '✓', color: '#10b981' },
  { name: 'xmark', icon: '✗', color: '#dc2626' }
];

actionIcons.forEach(action => {
  const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="${action.color}"/>
    <text x="12" y="16" text-anchor="middle" fill="white" 
          font-family="Arial, sans-serif" font-size="14" font-weight="bold">
      ${action.icon}
    </text>
  </svg>`;
  fs.writeFileSync(path.join(__dirname, `${action.name}.svg`), svg);
  console.log(`Created ${action.name}.svg`);
});

// Create maskable icons (with safe zone)
const createMaskableIconSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background circle for safe zone (80% of icon) -->
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.4}" fill="url(#gradient)"/>
  <!-- Icon content in safe zone (40% of icon) -->
  <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.12}" fill="white" opacity="0.9"/>
  <path d="M ${size * 0.35} ${size * 0.55} Q ${size * 0.5} ${size * 0.65} ${size * 0.65} ${size * 0.55}" 
        stroke="white" stroke-width="${size * 0.015}" fill="none" opacity="0.9"/>
  <text x="${size * 0.5}" y="${size * 0.75}" text-anchor="middle" fill="white" 
        font-family="Arial, sans-serif" font-size="${size * 0.06}" font-weight="bold">
    ASHRAM
  </text>
</svg>`;

// Generate maskable icons for Android
[192, 512].forEach(size => {
  const svg = createMaskableIconSVG(size);
  fs.writeFileSync(path.join(__dirname, `maskable-${size}x${size}.svg`), svg);
  console.log(`Created maskable-${size}x${size}.svg`);
});

console.log('\n✅ PWA icons generated successfully!');
console.log('📝 Note: For production, convert these SVG files to PNG format using a tool like:');
console.log('   - ImageMagick: convert icon.svg icon.png');
console.log('   - Online converters');
console.log('   - Figma/Sketch/Adobe tools');
console.log('\n📱 Icons include:');
console.log('   - Standard icons for all devices');
console.log('   - iOS 180x180 for home screen');
console.log('   - Android maskable icons');
console.log('   - Shortcut and notification icons');