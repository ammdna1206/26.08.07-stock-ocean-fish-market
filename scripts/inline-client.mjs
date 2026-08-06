import fs from 'node:fs';
import path from 'node:path';

const outputDirectory = path.resolve(process.cwd(), 'dist/client');
const htmlPath = path.join(outputDirectory, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
if (scriptMatch) {
  const scriptPath = path.join(outputDirectory, scriptMatch[1].replace(/^\//, ''));
  const script = fs.readFileSync(scriptPath, 'utf8');
  const safeScript = script.replace(/<\/script/gi, '<\\/script');
  html = html.replace(scriptMatch[0], `<script type="module">${safeScript}</script>`);
}

const styleMatch = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
if (styleMatch) {
  const stylePath = path.join(outputDirectory, styleMatch[1].replace(/^\//, ''));
  const style = fs.readFileSync(stylePath, 'utf8');
  html = html.replace(styleMatch[0], `<style>${style}</style>`);
}

fs.writeFileSync(htmlPath, html);
