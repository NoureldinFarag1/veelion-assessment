const path = require('node:path');

const { createId } = require('../../../utils/id');
const { readJsonArray, updateJsonArray } = require('../../../utils/jsonStore');
const HttpError = require('../../../utils/httpError');
const { DATA_DIR } = require('../../../config');

const TASKS_FILE_PATH = path.join(DATA_DIR, 'tasks.json');

function buildTaskRecord(payload) {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: payload.title,
    completed: payload.completed,
    createdAt: now,
    updatedAt: now,
  };
}

async function getAllTasks() {
  return readJsonArray(TASKS_FILE_PATH);
}

async function getTaskById(taskId) {
  const tasks = await readJsonArray(TASKS_FILE_PATH);
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  return task;
}

async function createTask(payload) {
  if (!payload.title || typeof payload.title !== 'string') {
    throw new HttpError(400, 'Invalid title.');
  }

  if (payload.completed !== undefined && typeof payload.completed !== 'boolean') {
    throw new HttpError(400, 'Invalid completed value.');
  }

  if (payload.completed === undefined) {
    payload.completed = false;
  }

  const newTask = buildTaskRecord(payload);
  await updateJsonArray(TASKS_FILE_PATH, (tasks) => [...tasks, newTask]);

  return newTask;
}

async function updateTask(taskId, updates) {
  if (typeof updates.title === 'string' && updates.title.length < 2) {
    throw new HttpError(400, 'Title is too short.');
  }

  if (updates.completed !== undefined && typeof updates.completed !== 'boolean') {
    throw new HttpError(400, 'completed must be boolean');
  }

  let updatedTask;

  await updateJsonArray(TASKS_FILE_PATH, (tasks) => {
    const taskIndex = tasks.findIndex((item) => item.id === taskId);

    if (taskIndex === -1) {
      throw new HttpError(404, 'Task not found.');
    }

    updatedTask = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return tasks.map((task, index) => (index === taskIndex ? updatedTask : task));
  });

  return updatedTask;
}

async function deleteTask(taskId) {
  let removedTask;

  await updateJsonArray(TASKS_FILE_PATH, (tasks) => {
    const taskIndex = tasks.findIndex((item) => item.id === taskId);

    if (taskIndex === -1) {
      throw new HttpError(404, 'Task not found.');
    }

    removedTask = tasks[taskIndex];
    return tasks.filter((_, index) => index !== taskIndex);
  });

  return removedTask;
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};