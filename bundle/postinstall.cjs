#!/usr/bin/env node

/**
 * Postinstall script for bundle deployment
 *
 * This script:
 * 1. Generates Prisma client for the current platform
 * 2. For LOCAL (SQLite) mode: Automatically creates database tables
 * 3. For CLOUD (PostgreSQL) mode: Skips db push (user must manually migrate)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (!line || line.trim().startsWith('#')) return;
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

// Detect if we're in cloud or local mode
function isCloudMode() {
  const databaseUrl = process.env.DATABASE_URL;
  return databaseUrl && databaseUrl.startsWith('postgresql://');
}

const cloudMode = isCloudMode();
const mode = cloudMode ? 'CLOUD (PostgreSQL)' : 'LOCAL (SQLite)';

console.log('\n🔧 Running postinstall setup...\n');
console.log(`📊 Mode: ${mode}\n`);

try {
  // Step 1: Always generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('node prisma-env.cjs "npx prisma generate"', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('✅ Prisma client generated\n');

  // Step 2: Set up database tables
  console.log('🗄️  Setting up database tables...');

  if (cloudMode) {
    // PRODUCTION (Cloud): Use db push WITHOUT --accept-data-loss for safety
    // This will:
    // - Create tables on first deploy ✅
    // - Add new columns safely ✅
    // - FAIL on breaking changes (protects data) ✅
    try {
      execSync('node prisma-env.cjs "npx prisma db push --skip-generate"', {
        stdio: 'inherit',
        env: process.env
      });
      console.log('✅ Database schema updated successfully (cloud)\n');
    } catch (pushError) {
      console.error('\n⚠️  Database schema update failed');
      console.log('📝 This is normal if:');
      console.log('   - Database is not accessible yet');
      console.log('   - Schema changes would cause data loss (safety protection)');
      console.log('\n💡 The app will attempt to initialize on first run\n');
      // Don't exit - allow installation to continue
    }
  } else {
    // LOCAL: Use db push with --accept-data-loss for quick development
    try {
      execSync('node prisma-env.cjs "npx prisma db push --accept-data-loss --skip-generate"', {
        stdio: 'inherit',
        env: process.env
      });
      console.log('✅ Database tables created successfully (local)\n');
    } catch (pushError) {
      console.error('\n⚠️  Failed to create database tables');
      console.log('💡 You can manually create tables by running: npm run migrate\n');
      // Don't exit - allow installation to continue
    }
  }

  console.log('✅ Postinstall completed\n');

} catch (error) {
  console.error('❌ Postinstall failed:', error.message);
  process.exit(1);
}
