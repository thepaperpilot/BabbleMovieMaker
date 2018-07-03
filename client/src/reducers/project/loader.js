import {DEFAULTS} from './project'

const path = require('path')
const fs = window.require('fs-extra')
const semver = window.require('semver')
const remote = window.require('electron').remote
const settingsManager = remote.require('./main-process/settings')
const menu = remote.require('./main-process/menus/application-menu')

const util = require('./../util')

function updateCommandsToList(commands) {
    return Object.keys(commands).map(key => {
        commands[key].command = key
        return commands[key]
    })
}

function updateCutscenesToList(cutscenes) {
    return Object.keys(cutscenes).map(key => ({
        name: key,
        script: cutscenes[key]
    }))
}

function loadBabble(settings, filepath) {
    const babble = fs.readJsonSync(path.join(filepath, settings.babble))
    const puppets = {}
    const puppetThumbnails = {}
    babble.characters.forEach(character => {
        // TODO add characters path to babble buds projects
        puppets[character.name] =
            fs.readJsonSync(path.join(filepath, '..', 'characters', character.location))
        puppetThumbnails[character.name] =
            `file:///${path.join(filepath, settings.babble, '..', 'thumbnails',
                `${character.location.substr(0, character.location.lastIndexOf('.'))}.png`)}`
                .replace(/\\/g, '/')
    })

    return {
        assets: fs.readJsonSync(path.join(filepath, settings.assets, 'assets.json')),
        puppets,
        puppetThumbnails
    }
}

function loadScripts(scriptsPath) {
    return fs.existsSync(scriptsPath) ?
        fs.readJsonSync(scriptsPath) :
        []
}

function close(state) {
    menu.updateMenu(false)
    return util.updateObject(state, { project: null })
}

function loadProject(state, action) {
    if (!fs.existsSync(action.project)) return close(state)

    // Copies project defaults
    const settings = Object.assign({}, DEFAULTS.settings, fs.readJsonSync(action.project))
    if (Object.prototype.toString.call(settings.commands) === '[object Object]') {
        // Convert from object to array
        settings.commands = updateCommandsToList(settings.commands)
    }
    DEFAULTS.defaultCommands.forEach(c => {
        const command = settings.commands.find(comm => comm.command === c.command)
        if (command) {
            Object.keys(c.fields).forEach(field => {
                command.fields[field] = JSON.parse(JSON.stringify(c.fields[field]))
            })
        } else {
            settings.commands.push(JSON.parse(JSON.stringify(c)))
        }
    })

    // Confirm loading project if mismatched versions
    let compare = settings.clientVersion ?
        semver.compare(settings.clientVersion, remote.app.getVersion()) :
        -1
    if (compare !== 0) {
        let options = {
            'type': 'question',
            'buttons': ['Cancel', 'Open Anyways'],
            'defaultId': 0,
            'title': 'Open Project?',
            'cancelId': 0
        }
        if (compare > 0) {
            options.message = 'You are attempting to open a project made with a more recent version of Babble Movie Maker.'
            options.detail = 'Caution is advised. Saving this project will downgrade it to this version of Babble Movie Maker, and may cause problems or lose features.'
        } else {
            options.message = 'You are attempting to open a project made with a less recent version of Babble Movie Maker.'
            options.detail = 'Opening this project will upgrade it to this version of Babble Movie Maker.'
        }

        // TODO check compatibility with babble buds project version?

        // If the player cancels, then don't change state
        if (remote.dialog.showMessageBox(options) === 0) return close(state)
    }

    settingsManager.settings.openProject = action.project
    settingsManager.save()

    const {assets, puppets, puppetThumbnails} = loadBabble(settings, action.project)
    let scripts = loadScripts(path.join(action.project, settings.scripts))
    if (!Array.isArray(scripts))
        scripts = updateCutscenesToList(scripts)
    if (scripts.length === 0)
        scripts = [ { name: 'My Cutscene', script: [] } ]

    menu.updateMenu(true)

    return {
        project: action.project,
        settings,
        assets,
        puppets,
        puppetThumbnails,
        scripts: scripts,
        script: scripts[0].name,
        assetsPath: `file:///${path.join(action.project, settings.assets)}`,
        // TODO way to store a redux state and compare against it later?
        oldSettings: JSON.stringify(settings),
        oldScripts: JSON.stringify(scripts),
        defaultCommands: DEFAULTS.defaultCommands
    }
}

function reloadBabble(state) {
    const {assets, puppets, puppetThumbnails} = loadBabble(state.settings, state.project)

    return util.updateObject(state, {
        assets,
        puppets,
        puppetThumbnails
    })
}

export default {
    'LOAD_PROJECT': loadProject,
    'RELOAD_BABBLE': reloadBabble,
    'CLOSE_PROJECT': close
}
