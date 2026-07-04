import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Em produção o Express serve o build do Vite (SPA) — mesmo origin do /api
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
}

export { app };
