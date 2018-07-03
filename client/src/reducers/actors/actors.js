const util = require('./../util')

export const DEFAULTS = []

function finishedReadingScript(state, action) {
    return action.actors
}

function addActor(state) {
    let name = 'New Actor', i = 1
    while (state.includes(name))
        name = `New Actor (${i++})`
    return state.concat(name)
}

function renameActor(state, action) {
    const index = state.indexOf(action.oldName)
    const actors = state.slice()
    actors.splice(index, 1, action.newName)
    return actors
}

function deleteActor(state, action) {
    const actors = state.slice()
    actors.splice(actors.indexOf(action.actor), 1)
    return actors
}

function moveActor(state, action) {
    const actors = state.slice()

    const actorIndex = actors.indexOf(action.actor)
    const afterIndex = actors.indexOf(action.after)
    
    actors.splice(actorIndex, 1)
    actors.splice(afterIndex, 0, action.actor)

    return actors
}

export default util.createReducer(DEFAULTS, {
    'FINISHED_READING_SCRIPT': finishedReadingScript,
    'ADD_ACTOR': addActor,
    'RENAME_ACTOR': renameActor,
    'DELETE_ACTOR': deleteActor,
    'MOVE_ACTOR': moveActor
})
