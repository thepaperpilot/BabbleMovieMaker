import undoable from 'redux-undo'
import util from './util'
import project, { DEFAULTS as PROJECT_DEFAULTS } from './project/project'
import timeline, { DEFAULTS as TIMELINE_DEFAULTS } from './timeline/timeline'
import inspector, { DEFAULTS as INSPECTOR_DEFAULTS } from './inspector/inspector'
import actors, { DEFAULTS as ACTORS_DEFAULTS } from './actors/actors'
import settings, { DEFAULTS as SETTINGS_DEFAULTS } from './settings/settings'
import status, { DEFAULTS as STATUS_DEFAULTS } from './status/status'
import saver from './project/saver'

const {combineReducers} = require('redux')

// Too small to justify its own file, so we just have it here
const puppets = util.createReducer([], {
    'SET_PUPPET_STATES': (state, action) => action.puppets,
    'FINISHED_READING_SCRIPT': (state, action) => action.puppets
})

const reducer = combineReducers({
    project,
    timeline: undoable(timeline, {
        filter: action => !(['FINISHED_READING_SCRIPT', 'RESIMULATE', 'SET_PUPPET_STATES'].includes(action.type))
    }),
    inspector,
    actors,
    puppets,
    settings,
    status
})

// When resimulating, the project's scripts needs to be changed using
// the timeline's keyframe actions, so we need this instead of just returning
// the combineReducers call so that we can handle this case with the "whole" state
export default (state = {
    project: PROJECT_DEFAULTS,
    timeline: TIMELINE_DEFAULTS,
    inspector: INSPECTOR_DEFAULTS,
    actors: ACTORS_DEFAULTS,
    puppets: [],
    settings: SETTINGS_DEFAULTS,
    status: STATUS_DEFAULTS
}, action) => {
    if (action.type === 'RESIMULATE') {
        state = saver(state, action)
    }
    return reducer(state, action)
}
