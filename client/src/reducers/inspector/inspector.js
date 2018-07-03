const util = require('./../util')

export const DEFAULTS = {
    target: 0,
    targetType: 'frame'
}

function inspect(state, action) {
    return util.updateObject(state, {
        target: action.target,
        targetType: action.targetType
    })
}

function gotoInspect(state, action) {
    return util.updateObject(state, {
        target: action.actor == null ? action.frame : action.actor,
        targetType: action.actor == null ? 'frame' : 'actor'
    })
}

function removeCommand(state, action) {
    if (state.targetType === 'command' && state.target === action.command)
        return { target: null, targetType: null }
    else return state
}

function removeCutscene(state, action) {
    if (state.targetType === 'cutscene' && state.target === action.cutscene)
        return { target: null, targetType: null }
    else return state
}

function renameTarget(targetType) {
    return (state, action) => {
        if (state.targetType === targetType && state.target === action.oldName)
            return util.updateObject(state, { target: action.newName })
        return state
    }
}

export default util.createReducer(DEFAULTS, {
    'INSPECT': inspect,
    'GOTO_INSPECT': gotoInspect,
    'REMOVE_COMMAND': removeCommand,
    'REMOVE_CUTSCENE': removeCutscene,
    'RENAME_ACTOR': renameTarget('actor'),
    'RENAME_COMMAND': renameTarget('command')
})
