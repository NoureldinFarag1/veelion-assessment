const fs = require('node:fs/promises');

//One promise chain per file. Every read-change-write on a file waits for the previous one.
const writeQueues = new Map();
async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) {
      throw new Error(`${filePath} does not contain a JSON array`);
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]\n', 'utf-8');
      return [];
    }

    throw error;
  }
}

async function writeJsonArray(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.tmp`;

  try {
    await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

async function updateJsonArray(filePath, change){
  const previous = writeQueues.get(filePath) || Promise.resolve();

  const next = previous.then(async () => {
    const items = await readJsonArray(filePath);
    const updated = await change(items);

    if (!Array.isArray(updated)) {
      throw new Error('updateJsonArray: change must return an array');
    }

    await writeJsonArray(filePath, updated);
  });

  writeQueues.set(filePath, next.catch(()=>{}));

  return next;
}

module.exports = {
  readJsonArray,
  updateJsonArray,
};
