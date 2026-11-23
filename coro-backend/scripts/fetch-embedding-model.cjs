/*
 * Télécharge, au build de l'image, le modèle de vecteurs local de
 * CORO Knowledge : Xenova/multilingual-e5-small (licence MIT), version
 * quantifiée ONNX. Aucun code distant n'est exécuté : ce sont des fichiers
 * de données (poids, tokenizer, configuration). Le serveur n'accède jamais
 * à Hugging Face en production (allowRemoteModels = false).
 *
 * Usage : node scripts/fetch-embedding-model.cjs <dossier-modèles>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const MODEL = 'Xenova/multilingual-e5-small';
const REVISION = process.env.CORO_EMBEDDING_MODEL_REVISION || 'main';
const FILES = [
  { name: 'config.json', required: true, min: 200 },
  { name: 'tokenizer.json', required: true, min: 100_000 },
  { name: 'tokenizer_config.json', required: true, min: 50 },
  { name: 'special_tokens_map.json', required: false, min: 20 },
  { name: 'onnx/model_quantized.onnx', required: true, min: 50_000_000 },
];

function download(url, target, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'coro-build' } }, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && redirects < 5) {
          response.resume();
          return resolve(download(new URL(response.headers.location, url).toString(), target, redirects + 1));
        }
        if (response.statusCode !== 200) {
          response.resume();
          return reject(Object.assign(new Error(`HTTP ${response.statusCode}`), { status: response.statusCode }));
        }
        const stream = fs.createWriteStream(target);
        response.pipe(stream);
        stream.on('finish', () => stream.close(resolve));
        stream.on('error', reject);
      })
      .on('error', reject);
  });
}

async function main() {
  const root = path.resolve(process.argv[2] || 'models');
  const report = [];
  for (const file of FILES) {
    const target = path.join(root, MODEL, file.name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const url = `https://huggingface.co/${MODEL}/resolve/${REVISION}/${file.name}`;
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await download(url, `${target}.part`);
        fs.renameSync(`${target}.part`, target);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (error.status === 404) break;
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
    if (lastError) {
      if (file.required) throw new Error(`MODEL_DOWNLOAD_FAILED ${file.name}: ${lastError.message}`);
      continue;
    }
    const size = fs.statSync(target).size;
    if (size < file.min) throw new Error(`MODEL_FILE_TOO_SMALL ${file.name}: ${size}`);
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    report.push({ file: file.name, size, sha256 });
  }
  console.log(JSON.stringify({ model: MODEL, revision: REVISION, files: report }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
