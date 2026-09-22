const activityService = require('../services/activity.service');

async function listActivity(req, res) {
  const entries = await activityService.getAllActivity();
  res.status(200).json(entries);
}

async function createActivity(req, res) {
  const payload = req.body || {};
  const entry = await activityService.createActivity(payload);
  res.status(201).json(entry);
}

module.exports = {
  listActivity,
  createActivity,
};