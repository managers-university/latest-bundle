#!/usr/bin/env node

/**
 * Generate Prisma schema based on deployment mode
 * Detects if we're in cloud (PostgreSQL) or local (SQLite) mode
 */

const fs = require('fs');
const path = require('path');

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

// Auto-detect database provider from DATABASE_URL
function getDatabaseProvider() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    return 'postgresql';
  }

  return 'sqlite';
}

// Read base schema template
const schemaTemplatePath = path.join(__dirname, 'prisma', 'schema.prisma');
const schemaTemplate = fs.readFileSync(schemaTemplatePath, 'utf8');

const provider = getDatabaseProvider();
const isCloud = provider === 'postgresql';

console.log(`📝 Generating Prisma schema for ${provider.toUpperCase()}...`);

// Replace provider - handle both placeholder and hardcoded values
let generatedSchema = schemaTemplate
  .replace(
    /provider\s*=\s*env\("DATABASE_PROVIDER"\)/,
    `provider = "${provider}"`
  )
  .replace(
    /provider\s*=\s*"(postgresql|sqlite)"/,
    `provider = "${provider}"`
  );

// Handle directUrl - only include for PostgreSQL, remove for SQLite
if (isCloud) {
  // Keep directUrl for PostgreSQL
  generatedSchema = generatedSchema.replace(
    /directUrl\s*=\s*env\("DIRECT_URL"\)/,
    'directUrl = env("DIRECT_URL")'
  );
} else {
  // Remove directUrl line entirely for SQLite (including the newline)
  generatedSchema = generatedSchema.replace(
    /\n\s*directUrl\s*=\s*env\("DIRECT_URL"\)/g,
    ''
  );
}

// Write generated schema back
fs.writeFileSync(schemaTemplatePath, generatedSchema);

console.log(`✅ Schema generated successfully`);
