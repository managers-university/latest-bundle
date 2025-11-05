#!/usr/bin/env node

/**
 * Configure database environment variables before running Prisma CLI commands
 * Auto-detects mode based on DATABASE_URL format and sets all required env vars
 */

const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');

// Load .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      // Skip empty lines and comments
      if (!line || line.trim().startsWith('#')) return;

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Only set if not already set (env vars take precedence)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Load environment variables from .env file
loadEnvFile();

// Get platform-specific database directory
function getDatabaseDirectory() {
  const platform = process.platform;
  let userDataPath;

  if (platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'OnlyLabs');
  } else if (platform === 'win32') {
    userDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    userDataPath = path.join(userDataPath, 'OnlyLabs');
  } else {
    userDataPath = path.join(os.homedir(), '.config', 'OnlyLabs');
  }

  return path.join(userDataPath, 'database');
}

// Auto-detect database provider from DATABASE_URL
function getDatabaseProvider() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    return 'postgresql';
  }

  return 'sqlite';
}

// Configure all database environment variables
function configureDatabaseEnv() {
  // If DATABASE_URL is not set, generate local SQLite path
  if (!process.env.DATABASE_URL) {
    const dbDir = getDatabaseDirectory();

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'dev.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
  }

  // Set DATABASE_PROVIDER for Prisma schema
  process.env.DATABASE_PROVIDER = getDatabaseProvider();

  // For migrations, use DIRECT_URL if available (Supabase), otherwise DATABASE_URL
  if (!process.env.DIRECT_URL && getDatabaseProvider() === 'postgresql') {
    // If user only set DATABASE_URL but not DIRECT_URL, use DATABASE_URL for both
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}

// Get command from arguments
const command = process.argv.slice(2).join(' ');

if (!command) {
  console.error('Usage: node prisma-env.js <prisma command>');
  console.error('Example: node prisma-env.js "prisma generate && prisma db push"');
  process.exit(1);
}

// Configure environment
configureDatabaseEnv();

const provider = getDatabaseProvider();
const mode = provider === 'postgresql' ? 'CLOUD' : 'LOCAL';

console.log(`📊 Database Configuration: ${mode} (${provider.toUpperCase()})`);

// Generate schema before running Prisma commands
try {
  execSync('node generate-schema.cjs', {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('Failed to generate schema');
  process.exit(1);
}

// Run the Prisma command
try {
  execSync(command, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  process.exit(error.status || 1);
}
