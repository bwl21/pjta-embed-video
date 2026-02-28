#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read package.json for project info
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const projectName = packageJson.name;
const version = packageJson.version;

// Get git commit hash (short)
let gitHash = '';
try {
    gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
    console.warn('Warnung: Git-Hash konnte nicht ermittelt werden, verwende Zeitstempel');
    gitHash = Date.now().toString(36);
}

// Create releases directory
const releasesDir = path.join(rootDir, 'releases');
if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
}

// Define archive name
const archiveName = `${projectName}-v${version}-${gitHash}.zip`;
const archivePath = path.join(releasesDir, archiveName);

console.log('📦 Erstelle ChurchTools-Extension-Paket...');
console.log(`   Projekt: ${projectName}`);
console.log(`   Version: ${version}`);
console.log(`   Git Hash: ${gitHash}`);
console.log(`   Archiv: ${archiveName}`);

// Check if dist directory exists
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
    console.error('❌ Fehler: dist-Verzeichnis nicht gefunden. Bitte zuerst "npm run build" ausführen.');
    process.exit(1);
}

try {
    // Create ZIP archive using system zip command
    const zipCommand = `cd "${rootDir}" && zip -r "${archivePath}" dist/ -x "*.map" "*.DS_Store"`;
    execSync(zipCommand, { stdio: 'inherit' });
    
    console.log('✅ Paket erfolgreich erstellt!');
    console.log(`📁 Speicherort: ${archivePath}`);
    console.log('');
    console.log('🚀 Nächste Schritte:');
    console.log('   1. Lade die ZIP-Datei in deine ChurchTools-Instanz hoch');
    console.log('   2. Gehe zu Admin → Erweiterungen → Erweiterung hochladen');
    console.log('   3. Wähle die ZIP-Datei aus und installiere sie');
    console.log('');
    
    // Show file size
    const stats = fs.statSync(archivePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    console.log(`📊 Package size: ${fileSizeInMB} MB`);
    
} catch (error) {
    console.error('❌ Fehler beim Erstellen des Pakets:', error.message);
    process.exit(1);
}