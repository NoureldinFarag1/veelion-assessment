const path = require('node:path');

const { DATA_DIR } = require('../../../config');
const { createId } = require('../../../utils/id');
const { readJsonArray, updateJsonArray } = require('../../../utils/jsonStore');

const ACTIVITY_FILE_PATH = path.join(DATA_DIR, 'activity.json');

async function getAllActivity() {
  return readJsonArray(ACTIVITY_FILE_PATH);
}

async function createActivity(payload) {
  const entry = {
    id: createId(),
    action: payload.action,
    info: payload.info,
    when: new Date().toISOString(),
  };

  await updateJsonArray(ACTIVITY_FILE_PATH, (entries) => [...entries, entry]);
  return entry;
}

module.exports = {
  getAllActivity,
  createActivity,
};