const tasksService = require('../../tasks/services/tasks.service');
const activityService = require('../../activity/services/activity.service');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function countByStatus(tasks) {
    const byStatus = {todo:0,'in-progress':0,done:0};

    for(const task of tasks){
        if(task.completed === true)
        {
            byStatus.done++;
        }
        else{
            byStatus.todo++;
        }
    }

    return byStatus;
}

function countRecentActivity(entries, days, now){
    const since = now.getTime() - days * DAY_IN_MS;

    return entries.filter((entry)=>{
        const time = Date.parse(entry.when);
        return !Number.isNaN(time) && time >= since && time <= now.getTime();
    }).length;
}

async function getTasksSummary({ days, now = new Date() }) {
    const [tasks, activity] = await Promise.all([
        tasksService.getAllTasks(),
        activityService.getAllActivity(),
    ]);

    return {
        total: tasks.length,
        byStatus: countByStatus(tasks),
        recentActivityCount: countRecentActivity(activity,days,now),
    };
}

module.exports = {
    getTasksSummary,
};