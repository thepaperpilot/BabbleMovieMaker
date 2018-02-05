// Imports
const controller = require('./controller')
const status = require('./status')
const timeline = require('./timeline')
const inspector = require('./inspector')

const remote = require('electron').remote
const dialog = remote.dialog
const fs = require('fs-extra')
const path = require('path')

const main = remote.require('./main')
const settings = remote.require('./main-process/settings')
const menu = remote.require('./main-process/menus/application-menu')

// DOM Elements
let puppets = document.getElementById("puppetsList")

exports.defaults = {
	"clientVersion": "1.0.0",
	"numCharacters": 5,
	"puppetScale": 1,
	"greenScreen": "#00FF00",
	"duration": 5,
	"fps": 60,
	"resolution": "1280x720",
	"actors": {},
	"commands": {
		"add": {
			"title": "Add to Stage",
			"fields": {
				"name": {
					"title": "Puppet",
					"type": "puppet",
					"default": ""
				},
				"id": {
					"type": "id"
				},
				"position": {
					"title": "Position",
					"type": "slider",
					"min": 0,
					"max": "numCharacters",
					"default": 0
				},
				"facingLeft": {
					"title": "Facing Left",
					"type": "checkbox",
					"default": false
				},
				"emote": {
					"title": "Emote",
					"type": "emote",
					"default": "0"
				}
			}
		},
		"set": {
			"title": "Change Puppet",
			"fields": {
				"target": {
					"type": "id"
				},
				"name": {
					"title": "Puppet",
					"type": "puppet",
					"default": ""
				}
			}
		},
		"remove": {
			"title": "Remove from Stage",
			"fields": {
				"target": {
					"type": "id"
				}
			}
		},
		"move": {
			"title": "Move to Position",
			"fields": {
				"target": {
					"type": "id"
				},
				"position": {
					"title": "Position",
					"type": "slider",
					"min": 0,
					"max": "numCharacters",
					"default": 0
				}
			}
		},
		"facingLeft": {
			"title": "Change Direction",
			"fields": {
				"target": {
					"type": "id"
				},
				"facingLeft": {
					"title": "Facing Left",
					"type": "checkbox",
					"default": false
				}
			}
		},
		"babble": {
			"title": "Toggle Babbling",
			"fields": {
				"target": {
					"type": "id"
				},
				"action": {
					"title": "Babbling",
					"type": "select",
					"options": [
						"toggle",
						"start",
						"stop"
					],
					"default": "toggle"
				}
			}
		},
		"emote": {
			"title": "Change Emote",
			"fields": {
				"target": {
					"type": "id"
				},
				"emote": {
					"title": "Emote",
					"type": "emote",
					"default": "0"
				}
			}
		},
		"jiggle": {
			"title": "Jiggle Up and Down",
			"fields": {
				"target": {
					"type": "id"
				}
			}
		}
	}
}

exports.readProject = function() {
	if (!this.checkChanges()) return

    let filepath = remote.getGlobal('project').filepath
	fs.readJson(filepath, (err, proj) => {
		if (err) {
			main.redirect('welcome.html')
			return
		}

		status.init()
		status.log('Loading project...', 1, 1)

		this.assetsPath = path.join(filepath, '..', 'assets')
		this.project = Object.assign({}, this.defaults)
		Object.assign(this.project, proj)
		this.scripts = fs.existsSync(path.join(filepath, '..', 'scripts.json')) ? fs.readJsonSync(path.join(filepath, '..', 'scripts.json')) : []
		reloadBabble()

		this.oldProject = JSON.stringify(proj)
		this.oldScripts = JSON.stringify(this.scripts)

		settings.settings.openProject = filepath
		settings.save()

		requestAnimationFrame(() => {
			controller.init()
			menu.updateMenu()
		})
	})
}

exports.saveProject = function() {
	fs.writeFile(settings.settings.openProject, JSON.stringify(this.project, null, 4))
	fs.writeFile(path.join(settings.settings.openProject, '..', 'puppets.json'), JSON.stringify(this.puppets, null, 4))
	fs.writeFile(path.join(settings.settings.openProject, '..', 'scripts.json'), JSON.stringify(this.scripts, null, 4))
	settings.addRecentProject(controller.getThumbnail())
	this.oldProject = JSON.stringify(this.project)
	this.oldScripts = JSON.stringify(this.scripts)
}

exports.closeProject = function() {
	if (!this.checkChanges()) return

	this.project = null
	this.assets = null
	this.puppets = null
	this.scripts = null
	this.oldProject = 'null'
	this.oldAssets = 'null'
	this.oldPuppets = 'null'
	this.oldScripts = 'null'
	settings.settings.openProject = ""
	settings.save()
	menu.updateMenu()

	main.redirect('welcome.html')
}

// Returns true if its okay to close the project
exports.checkChanges = function() {
	let changes = this.oldProject !== JSON.stringify(this.project)
	changes = changes || this.oldScripts !== JSON.stringify(this.scripts)
	if (changes) {
		let response = dialog.showMessageBox({
			"type": "question",
			"buttons": ["Don't Save", "Cancel", "Save"],
			"defaultId": 2,
			"title": "Save Project?",
			"message": "Do you want to save the changes to your project?",
			"detail": "If you don't save, your changes will be lost.",
			"cancelId": 1
		})

		switch (response) {
			default:
				break
			case 1:
				return false
			case 2:
				this.saveProject()
				break
		}
	}

	return true
}

exports.updateBabble = function(reload = true) {
	let babble = fs.readJsonSync(this.project.babble)

	// Detect puppet name changes, and automatically update the script accordingly
	let keys = Object.keys(this.project.actors)
	let renamedField = false
	for (let i = 0; i < keys.length; i++) {
		let oldName = this.project.actors[keys[i]]
		let newName = babble.characters.filter(char => char.id == keys[i])[0].name // jshint ignore: line
		if (oldName !== newName) {
			this.project.actors[keys[i]] = newName
			let keyframes = Object.keys(timeline.keyframes)
			for (let j = 0; j < keyframes.length; j++) {
				let keyframe = timeline.keyframes[keyframes[j]]
				for (let k = 0; k < keyframe.actions.length; k++) {
					let action = keyframe.actions[k]

					let fields = Object.keys(this.project.commands[action.command].fields)
					for (let m = 0; m < fields.length; m++) {
						let field = this.project.commands[action.command].fields[fields[m]]
						if (field.type == "puppet" && action[fields[m]] == oldName) {
							action[fields[m]] = newName
							renamedField = true
						}
					}
				}
			}
		}
	}
	for (let i = 0; i < babble.characters.length; i++)
		if (!this.project.actors[babble.characters[i].id])
			this.project.actors[babble.characters[i].id] = babble.characters[i].name

	if (renamedField) timeline.resimulate()

	if (reload) reloadBabble()
}

function reloadBabble() {
	let filepath = remote.getGlobal('project').filepath
	let babble = fs.readJsonSync(exports.project.babble)

	// Reload assets and puppets
	exports.assets = fs.readJsonSync(path.join(filepath, '..', 'assets', 'assets.json'))
	// Why does jshint not like me using == to compare with null, to get both null and undefined, but not 0 or []  or {}?
	if (exports.puppets == null) exports.puppets = {} // jshint ignore: line
	// Clear our puppets without dereferencing the object
	Object.keys(exports.puppets).forEach(function(key) { delete exports.puppets[key] })
	for (let i = 0; i < babble.characters.length; i++) {
		exports.puppets[babble.characters[i].name] = fs.readJsonSync(path.join(filepath, '..', 'characters', babble.characters[i].location))
	}
	if (exports.oldPuppets != null && exports.oldPuppets !== JSON.stringify(exports.puppets)) { // jshint ignore: line
		timeline.resimulate()
	}

	// Create the puppet drawer
	if (exports.oldPuppets == null || exports.oldPuppets !== JSON.stringify(exports.puppets)) { //jshint ignore: line
		puppets.innerHTML = ''
		for (let i = 0; i < babble.characters.length; i++) {
			let name = babble.characters[i].name
			let selector = document.createElement('div')
			let thumbnail = babble.characters[i].location.substr(0, babble.characters[i].location.lastIndexOf('.')) + '.png'
			
			selector.className = "char"
			selector.innerHTML = '<div class="desc">' + name + '</div>'
			
			let puppetDraggable = document.createElement('img')
		    selector.appendChild(puppetDraggable)
		    puppetDraggable.name = name
		    puppetDraggable.style.height = puppetDraggable.style.width = '120px'
			puppetDraggable.src = path.join(exports.assetsPath, '..', 'thumbnails', thumbnail + '?random=' + new Date().getTime()).replace(/\\/g, '/')
		    puppetDraggable.addEventListener('mousedown', inspector.dragPuppet, false)

			puppets.appendChild(selector)
		}
	}

	// Save current state
	exports.oldAssets = JSON.stringify(exports.assets)
	exports.oldPuppets = JSON.stringify(exports.puppets)
}
