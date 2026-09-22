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

// Input is already validated and normalized by taskValidator in the controller.
async function createTask(payload) {
  const newTask = buildTaskRecord(payload);
  await updateJsonArray(TASKS_FILE_PATH, (tasks) => [...tasks, newTask]);

  return newTask;
}

// `updates` only ever contains whitelisted fields (title, completed).
async function updateTask(taskId, updates) {
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