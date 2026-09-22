const HttpError = require('../../../utils/httpError');

const DEFAULT_RECENT_DAYS = 7;

const MAX_RECENT_DAYS = 365;

function parseRecentDays(query){
    if(query.days === undefined)
    {
        return DEFAULT_RECENT_DAYS;
    }

    const days = Number(query.days);

    if(!Number.isInteger(days) || days < 1 || days > MAX_RECENT_DAYS){
        throw new HttpError(400, `Days must be a whole number between 1 and ${MAX_RECENT_DAYS}`)
    }

    return days;
}

module.exports = {
    parseRecentDays,
};