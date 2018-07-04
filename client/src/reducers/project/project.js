import loader from './loader'
import commands from './commands'

const fs = window.require('fs-extra')
const path = require('path')
const remote = window.require('electron').remote
const settingsManager = remote.require('./main-process/settings')

const util = require('./../util')

export const DEFAULT_COMMANDS = [
    {
        'command': 'add',
        'title': 'Add to Stage',
        'forceWait': false,
        'fields': {
            'name': {
                'title': 'Puppet',
                'type': 'puppet',
                'default': ''
            },
            'id': {
                'type': 'id'
            },
            'position': {
                'title': 'Position',
                'type': 'slider',
                'min': 0,
                'max': 'numCharacters',
                'default': 0
            },
            'facingLeft': {
                'title': 'Facing Left',
                'type': 'checkbox',
                'default': false
            },
            'emote': {
                'title': 'Emote',
                'type': 'emote',
                'default': '0'
            }
        }
    },
    {
        'command': 'set',
        'title': 'Change Puppet',
        'forceWait': false,
        'fields': {
            'target': {
                'type': 'id'
            },
            'name': {
                'title': 'Puppet',
                'type': 'puppet',
                'default': ''
            }
        }
    },
    {
        'command': 'remove',
        'title': 'Remove from Stage',
        'forceWait': false,
        'fields': {
            'target': {
                'type': 'id'
            }
        }
    },
    {
        'command': 'move',
        'title': 'Move to Position',
        'forceWait': false,
        'fields': {
            'target': {
                'type': 'id'
            },
            'position': {
                'title': 'Position',
                'type': 'slider',
                'min': 0,
                'max': 'numCharacters',
                'default': 0
            }
        }
    },
    {
        'command': 'facingLeft',
        'title': 'Change Direction',
        'forceWait': false,
        'fields': {
            'target': {
                'type': 'id'
            },
            'facingLeft': {
                'title': 'Facing Left',
                'type': 'checkbox',
                'default': false
            }
        }
    },
    {
        'command': 'babble',
        'title': 'Toggle Babbling',
        'forceWait': false,
        'fields': {
            'target': {
                'type': 'id'
            },
            'action': {
                'title': 'Babbling',
                'type': 'select',
                'options': [
                    'toggle',
                    'start',
                    'stop'
                ],
                'default': 'toggle'
            }
        }
    },
    {
        'command': 'emote',
        'title': 'Change Emote',
        'forceWait': false,
        'fields': {
            'target': {
                'type': 'id'
            },
            'emote': {
                'title': 'Emote',
                'type': 'emote',
                'default': '0'
            }
        }
    },
    {
        'command': 'jiggle',
        'title': 'Jiggle Up and Down',
        'forceWait': false,
        'fields': {
            'target': {
                'type': 'id'
            }
        }
    }
]

export const DEFAULTS = {
    settings: {
        'clientVersion': process.version,
        'numCharacters': 5,
        'puppetScale': 1,
        'greenScreen': '#00FF00',
        'greenScreenEnabled': false,
        'fps': 60,
        'resolution': '1280x720',
        'actors': {},
        'scripts': '../scripts.json',
        'puppets': '../puppets.json',
        'assets': '../assets',
        'commands': JSON.parse(JSON.stringify(DEFAULT_COMMANDS))
    },
    project: null,
    assets: {},
    puppets: {},
    puppetThumbnails: {},
    scripts: [],
    script: null,
    assetsPath: '',
    oldSettings: '',
    oldAssets: '',
    oldPuppets: '',
    oldScripts: '',
    defaultCommands: DEFAULT_COMMANDS
}

function updateSetting(state, action) {
    const settings = util.updateObject(state.settings, { [action.name]: action.value })
    return util.updateObject(state, { settings })
}

function loadScript(state, action) {
    return util.updateObject(state, { script: action.script })
}

function newCutscene(state) {
    const scripts = state.scripts.slice()
    let name = 'New Cutscene', i = 1
    while (scripts.some(s => s.name === name))
        name = `New Cutscene (${i++})`
    scripts.push({
        name,
        script: []
    })
    return util.updateObject(state, { scripts })
}

function removeCutscene(state, action) {
    const scripts = state.scripts.slice().filter(s => s.name !== action.cutscene)
    return util.updateObject(state, { scripts })
}

function renameCutscene(state, action) {
    const scripts = state.scripts.slice()
    const index = scripts.findIndex(s => s.name === action.oldName)
    scripts[index] = util.updateObject(scripts[index], { name: action.newName })
    return util.updateObject(state, { scripts })
}

function moveCutscene(state, action) {
    const scripts = state.scripts.slice()
    const script = scripts.find(c => c.name === action.script)

    const scriptIndex = scripts.findIndex(c => c.name === action.script)
    const afterIndex = scripts.findIndex(c => c.name === action.after)
    
    scripts.splice(scriptIndex, 1)
    scripts.splice(afterIndex, 0, script)
    
    return util.updateObject(state, { scripts })
}

function save(state, action) {
    const project = settingsManager.settings.openProject
    fs.writeFile(project, JSON.stringify(this.project, null, 4))
    fs.writeFile(path.join(project, state.settings.puppets), JSON.stringify(state.puppets, null, 4))
    fs.writeFile(path.join(project, state.settings.scripts), JSON.stringify(state.scripts, null, 4))
    settingsManager.addRecentProject(action.thumbnail)
    settingsManager.save()

    const oldSettings = JSON.stringify(state.settings)
    const oldScripts = JSON.stringify(state.scripts)
    return util.updateObject(state, { oldSettings, oldScripts })
}

export default util.createReducer(DEFAULTS, Object.assign(loader, commands, {
    'UPDATE_SETTING': updateSetting,
    'LOAD_SCRIPT': loadScript,
    'NEW_CUTSCENE': newCutscene,
    'REMOVE_CUTSCENE': removeCutscene,
    'RENAME_CUTSCENE': renameCutscene,
    'MOVE_CUTSCENE': moveCutscene,
    'SAVE': save
}))
