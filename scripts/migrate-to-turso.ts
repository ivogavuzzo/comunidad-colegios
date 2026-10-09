import { createClient } from '@libsql/client';
import { runEtl } from './etl-schools';

const tursoUrl = 'libsql://comunidad-colegios-igavuzzo.aws-sa-east-1.turso.io';
const tursoAuthToken =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE1MDc0NDcsImlkIjoiMDFhMTFlMmEtMTAwMS03MjlmLWExMTktNGVkMDg1MWNiNzYzIiwia2lkIjoicXpWRVl6M1d5S2dIb29SOExjYk5XOG9sUWgxaUpxZy1qbV9TeE1objc4SSIsInJpZCI6IjhkNTYwNGY5LTM4ZTUtNGY2Ny1iZWQyLTExODk5YTEzODUwZiJ9.kUXA5IZ_6FLSCOVYKOW4X7XqhRAty7NInoL9jkiBJssDeeAQBcdja_TJ7iEVFPYnGHciMWQPqyK1x5fUmmdvBA';

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

const DDL = [
  `CREATE TABLE IF NOT EXISTS "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cueanexo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "jurisdiccion" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "codigoPostal" TEXT,
    "telefono" TEXT,
    "mail" TEXT,
    "sector" TEXT,
    "ambito" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "School_cueanexo_key" ON "School"("cueanexo");`,
  `CREATE INDEX IF NOT EXISTS "School_jurisdiccion_departamento_idx" ON "School"("jurisdiccion", "departamento");`,
  `CREATE INDEX IF NOT EXISTS "School_nombre_idx" ON "School"("nombre");`,

  `CREATE TABLE IF NOT EXISTS "SchoolRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "jurisdiccion" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userEmail" TEXT,
    "userName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");`,

  `CREATE TABLE IF NOT EXISTS "Subcategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Subcategory_categoryId_slug_key" ON "Subcategory"("categoryId", "slug");`,

  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "dni" TEXT,
    "schoolOfOriginId" TEXT,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_schoolOfOriginId_fkey" FOREIGN KEY ("schoolOfOriginId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,

  `CREATE TABLE IF NOT EXISTS "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "aiCorrectedTitle" TEXT,
    "aiCorrectedDesc" TEXT,
    "aiModerationStatus" TEXT DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isPermanentFeatured" BOOLEAN NOT NULL DEFAULT false,
    "pinnedPosition" INTEGER,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "schoolRequestId" TEXT,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "webUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Listing_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_schoolRequestId_fkey" FOREIGN KEY ("schoolRequestId") REFERENCES "SchoolRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Listing_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "Listing_schoolId_categoryId_status_idx" ON "Listing"("schoolId", "categoryId", "status");`,
  `CREATE INDEX IF NOT EXISTS "Listing_isPermanentFeatured_pinnedPosition_idx" ON "Listing"("isPermanentFeatured", "pinnedPosition");`,

  `CREATE TABLE IF NOT EXISTS "ListingImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "ModerationOtpToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "usedByIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationOtpToken_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ModerationOtpToken_token_key" ON "ModerationOtpToken"("token");`,
  `CREATE INDEX IF NOT EXISTS "ModerationOtpToken_token_idx" ON "ModerationOtpToken"("token");`,

  `CREATE TABLE IF NOT EXISTS "ContactClick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactClick_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "ContactClick_listingId_channel_idx" ON "ContactClick"("listingId", "channel");`,
  `CREATE INDEX IF NOT EXISTS "ContactClick_createdAt_idx" ON "ContactClick"("createdAt");`,
];

async function main() {
  console.log('[TURSO] Creating tables on Turso...');
  for (const sql of DDL) {
    await client.execute(sql);
  }
  console.log('[TURSO] Tables created successfully!');

  // Check tables
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );
  console.log(
    '[TURSO] Existing tables:',
    tables.rows.map((r) => r.name)
  );
}

main().catch(console.error);
