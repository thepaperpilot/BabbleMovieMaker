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

function removeTarget(targetType) {
    return (state, action) => {
        if (state.targetType === targetType && state.target === action[targetType])
            return { target: null, targetType: null }
        else return state
    }
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
    'DELETE_ACTOR': removeTarget('actor'),
    'REMOVE_COMMAND': removeTarget('command'),
    'REMOVE_CUTSCENE': removeTarget('cutscene'),
    'RENAME_ACTOR': renameTarget('actor'),
    'RENAME_COMMAND': renameTarget('command'),
    'RENAME_CUTSCENE': renameTarget('cutscene')
})
