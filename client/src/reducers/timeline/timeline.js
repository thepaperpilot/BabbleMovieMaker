const util = require('./../util')

export const DEFAULTS = {
    frame: 0,
    keyframes: {
        actions: {},
        puppets: {},
        errors: {}
    },
    numFrames: 0
}

function prevFrame(state) {
    if (state.frame === 0)
        return gotoFrame(state, { frame: state.numFrames })
    else
        return util.updateObject(state, { frame: state.frame - 1 })
}

function nextFrame(state) {
    if (state.frame === state.numFrames)
        return gotoFrame(state, { frame: 0 })
    else {
        return util.updateObject(state, { frame: state.frame + 1 })
    }
}

function gotoFrame(state, action) {
    return util.updateObject(state, { frame: action.frame })
}

function loadScript(state) {
    return util.updateObject(state, { frame: -1, numFrames: 0 })
}

function finishedReadingScript(state, action) {
    return util.updateObject(state, {
        numFrames: action.numFrames,
        keyframes: action.keyframes,
        frame: 0
    })
}

function setFrames(state, action) {
    return util.updateObject(state, { numFrames: action.frames })
}

function updateField(state, action) {
    const actions = state.keyframes.actions[action.frame].slice()
    actions[action.action] =
        util.updateObject(actions[action.action], { [action.name]: action.value })
    const keyframeActions = util.updateObject(state.keyframes.actions, { [action.frame]: actions })
    const keyframes = util.updateObject(state.keyframes, { actions: keyframeActions })
    return util.updateObject(state, { keyframes })
}

function updateKeyframes(state, keyframeActions) {
    Object.keys(keyframeActions).forEach(frame => {
        if (keyframeActions[frame].length === 0)
            delete keyframeActions[frame]
    })
    const keyframes = util.updateObject(state.keyframes, { actions: keyframeActions })
    let numFrames = Math.max(...Object.keys(keyframeActions).map(frame => parseInt(frame, 10)))
    if (!isFinite(numFrames)) numFrames = 0
    return util.updateObject(state, { keyframes, numFrames })
}

function addAction(state, action) {
    const newAction = { command: action.command }
    Object.keys(action.fields).forEach(field => {
        newAction[field] = field === 'id' || field === 'target' ?
            action.actor :
            action.fields[field].default
    })
    const actions = state.keyframes.actions[action.frame] ?
        state.keyframes.actions[action.frame].concat(newAction) :
        [ newAction ]
    return updateKeyframes(state, util.updateObject(state.keyframes.actions, { [action.frame]: actions }))
}

function resimulate(state, action) {
    const keyframes = util.updateObject(state.keyframes, {
        puppets: action.puppets,
        errors: action.errors
    })
    return util.updateObject(state, { keyframes })
}

function removeAction(state, action) {
    const actions = state.keyframes.actions[action.frame].slice()
    actions.splice(action.index, 1)    
    return updateKeyframes(state, util.updateObject(state.keyframes.actions, { [action.frame]: actions }))
}

function removeActions(state, action) {
    const actions = state.keyframes.actions[action.frame].filter(act =>
        action.actor == null ?
            ('id' in act && act.id === action.actor) ||
                ('target' in act && act.target === action.actor) :
            !('id' in act || 'target' in act))
    return updateKeyframes(state, util.updateObject(state.keyframes.actions, { [action.frame]: actions }))
}

function addActions(state, action) {
    const actions = (state.keyframes.actions[action.frame] || []).concat(action.actions)
    return updateKeyframes(state, util.updateObject(state.keyframes.actions, { [action.frame]: actions }))
}

function moveKeyframe(state, action) {
    const sourceActions = state.keyframes.actions[action.source].filter(act =>
        action.sourceActor == null ?
            ('id' in act && act.id === action.sourceActor) ||
                ('target' in act && act.target === action.sourceActor) :
            !('id' in act || 'target' in act))
    const targetActions = (state.keyframes.actions[action.target] || []).concat(
        state.keyframes.actions[action.source].filter(act =>
            action.sourceActor == null ?
                !('id' in act || 'target' in act) :
                ('id' in act && act.id === action.sourceActor) ||
                    ('target' in act && act.target === action.sourceActor)).map(act => {
            if ('id' in act) return util.updateObject(act, {id: action.targetActor})
            if ('target' in act) return util.updateObject(act, {target: action.targetActor})
            return act
        }))
    return updateKeyframes(state, util.updateObject(state.keyframes.actions, {
        [action.source]: sourceActions,
        [action.target]: targetActions
    }))
}

function renameActor(state, action) {
    const actions = JSON.parse(JSON.stringify(state.keyframes.actions))
    Object.values(actions).forEach(frame => {
        frame.forEach(act => {
            if ('id' in act && act.id === action.oldName)
                act.id = action.newName
            if ('target' in act && act.target === action.oldName)
                act.target = action.newName
        })})
    return updateKeyframes(state, actions)
}

function renameCommand(state, action) {
    const actions = JSON.parse(JSON.stringify(state.keyframes.actions))
    Object.values(actions).forEach(frame => {
        frame.forEach(act => {
            if (act.command === action.oldName)
                act.command = action.newName
        })
    })
    return updateKeyframes(state, actions)
}

function deleteActor(state, action) {
    const actions = JSON.parse(JSON.stringify(state.keyframes.actions))
    Object.keys(actions).forEach(frame => {
        actions[frame] = actions[frame].filter(act =>
            act.id !== action.actor && act.target !== action.actor
        )
    })
    return updateKeyframes(state, actions)
}

export default util.createReducer(DEFAULTS, {
    'PREV_FRAME': prevFrame,
    'NEXT_FRAME': nextFrame,
    'GOTO_FRAME': gotoFrame,
    'LOAD_SCRIPT': loadScript,
    'FINISHED_READING_SCRIPT': finishedReadingScript,
    'SET_FRAMES': setFrames,
    'GOTO_INSPECT': gotoFrame,
    'UPDATE_FIELD': updateField,
    'ADD_ACTION': addAction,
    'RESIMULATE': resimulate,
    'REMOVE_ACTION': removeAction,
    'REMOVE_ACTIONS': removeActions,
    'ADD_ACTIONS': addActions,
    'MOVE_KEYFRAME': moveKeyframe,
    'RENAME_ACTOR': renameActor,
    'RENAME_COMMAND': renameCommand,
    'DELETE_ACTOR': deleteActor
})
