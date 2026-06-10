import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'db.json');

// Initialize database file
function initDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ pages: [] }, null, 2), 'utf8');
  }
}

export function getPages() {
  initDb();
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data).pages;
  } catch (e) {
    console.error('Failed to read db.json:', e);
    return [];
  }
}

export function getPageBySlug(slug) {
  const pages = getPages();
  return pages.find(p => p.slug === slug) || null;
}

export function savePage(page) {
  initDb();
  try {
    const pages = getPages();
    // Check if slug already exists to update, otherwise insert
    const index = pages.findIndex(p => p.slug === page.slug);
    
    const pageWithTimestamp = {
      ...page,
      updatedAt: new Date().toISOString(),
      createdAt: index !== -1 ? pages[index].createdAt : new Date().toISOString()
    };

    if (index !== -1) {
      pages[index] = pageWithTimestamp;
    } else {
      pages.push(pageWithTimestamp);
    }

    fs.writeFileSync(dbPath, JSON.stringify({ pages }, null, 2), 'utf8');
    return pageWithTimestamp;
  } catch (e) {
    console.error('Failed to save page:', e);
    throw new Error('Database save failed');
  }
}
