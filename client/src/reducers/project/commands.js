const util = require('./../util')

function newCommand(state) {
    const commands = Object.assign({}, state.settings.commands)
    let name = 'newCommand', i = 1
    while (name in commands)
        name = `newCommand${i++}`
    commands[name] = {
        title: 'New Command',
        forceWait: false,
        fields: {}
    }
    const settings = util.updateObject(state.settings, { commands })
    return util.updateObject(state, { settings })
}

function updateCommand(state, index, command) {
    const commands = state.settings.commands.slice()
    commands[index] = command
    const settings = util.updateObject(state.settings, { commands })
    return util.updateObject(state, { settings })
}

function updateCommandTitle(state, action) {
    const command = util.updateObject(state.settings.commands[action.index], { title: action.title })
    return updateCommand(state, action.index, command)
}

function updateCommandWait(state, action) {
    const command = util.updateObject(state.settings.commands[action.index], { forceWait: action.wait })
    return updateCommand(state, action.index, command)
}

function updateCommandField(state, action) {
    const field =
        util.updateObject(state.settings.commands[action.index].fields[action.field], 
            { [action.name]: action.value })
    const fields =
        util.updateObject(state.settings.commands[action.index].fields, { [action.field]: field })
    const command = util.updateObject(state.settings.commands[action.index], { fields: fields })
    return updateCommand(state, action.index, command)
}

function addCommandField(state, action) {
    const fieldName = action.fieldType === 'id' ? 'target' : (() => {
        let name = 'newField', i = 0
        while (name in state.settings.commands[action.index].fields)
            name = `newField${++i}`
        return name
    })()
    const field = { type: action.fieldType }
    if (action.fieldType !== 'id') field.title = 'New Field'

    const fields = 
        util.updateObject(state.settings.commands[action.index].fields, { [fieldName]: field })
    const command = util.updateObject(state.settings.commands[action.index], { fields: fields })
    return updateCommand(state, action.index, command)
}

function removeCommandField(state, action) {
    const fields = Object.assign({}, state.settings.commands[action.index].fields)
    delete fields[action.field]
    const command = util.updateObject(state.settings.commands[action.index], { fields: fields })
    return updateCommand(state, action.index, command)
}

function updateCommandFieldName(state, action) {
    const fields = Object.assign({}, state.settings.commands[action.index].fields)
    if (action.name === '' || action.name === 'target' || action.name in fields) return state
    fields[action.name] = fields[action.field]
    delete fields[action.field]
    const command = util.updateObject(state.settings.commands[action.index], { fields: fields })
    return updateCommand(state, action.index, command)
}

function removeCommand(state, action) {
    const commands = state.settings.commands.slice()
    commands.splice(action.index, 1)
    const settings = util.updateObject(state.settings, { commands })
    return util.updateObject(state, { settings })
}

function renameCommand(state, action) {
    const command = util.updateObject(state.settings.commands[action.index], { command: action.command })
    const commands = state.settings.commands.slice()
    commands[action.index] = command
    const settings = util.updateObject(state.settings, { commands })

    const scripts = JSON.parse(JSON.stringify(state.scripts))
    Object.values(scripts).forEach(script => {
        script.forEach(act => {
            if (act.command === state.settings.commands[action.index].command)
                act.command = action.command
        })
    })
    
    return util.updateObject(state, { settings, scripts })
}

function moveCommand(state, action) {
    const commands = state.settings.commands.slice()
    const command = commands.find(c => c.command === action.command)

    const commandIndex = commands.findIndex(c => c.command === action.command)
    const afterIndex = commands.findIndex(c => c.command === action.after)
    
    commands.splice(commandIndex, 1)
    commands.splice(afterIndex, 0, command)
    
    const settings = util.updateObject(state.settings, { commands })
    return util.updateObject(state, { settings })
}

export default {
    'NEW_COMMAND': newCommand,
    'UPDATE_COMMAND_TITLE': updateCommandTitle,
    'UPDATE_COMMAND_WAIT': updateCommandWait,
    'UPDATE_COMMAND_FIELD': updateCommandField,
    'ADD_COMMAND_FIELD': addCommandField,
    'REMOVE_COMMAND_FIELD': removeCommandField,
    'UPDATE_COMMAND_FIELD_NAME': updateCommandFieldName,
    'REMOVE_COMMAND': removeCommand,
    'RENAME_COMMAND': renameCommand,
    'MOVE_COMMAND': moveCommand
}
