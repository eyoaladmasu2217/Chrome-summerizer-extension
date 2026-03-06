#!/usr/bin/env node

/**
 * Simple validation script to check extension files.
 * Run with: node validate.js
 */

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'script.js',
  'content.css',
  'styles.css'
];

console.log('🔍 Validating extension files...\n');

let allValid = true;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allValid = false;
  }
});

if (allValid) {
  console.log('\n🎉 All required files present!');
} else {
  console.log('\n⚠️  Some files are missing.');
  process.exit(1);
}