// Imports
const controller = require('./controller')
const status = require('./status')
const timeline = require('./timeline')

const remote = require('electron').remote
const dialog = remote.dialog
const fs = require('fs-extra')
const path = require('path')

const main = remote.require('./main')
const settings = remote.require('./main-process/settings')
const menu = remote.require('./main-process/menus/application-menu')

exports.defaults = {
	"clientVersion": "1.0.0",
	"numCharacters": 5,
	"puppetScale": 1,
	"greenScreen": "#00FF00",
	"duration": 5,
	"fps": 60,
	"resolution": "1280x720",
	"commands": {
		"add": {
			"title": "Add to Stage",
			"fields": {
				"name": {
					"title": "Puppet",
					"type": "text",
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
					"type": "text",
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

		this.project = Object.assign({}, this.defaults)
		Object.assign(this.project, proj)
		this.assets = fs.readJsonSync(path.join(filepath, '..', 'assets.json'))
		this.actors = fs.readJsonSync(path.join(filepath, '..', 'actors.json'))
		this.scripts = fs.readJsonSync(path.join(filepath, '..', 'scripts.json'))

		this.oldProject = JSON.stringify(proj)
		this.oldAssets = JSON.stringify(this.assets)
		this.oldActors = JSON.stringify(this.actors)
		this.oldScripts = JSON.stringify(this.scripts)

		this.assetsPath = path.join(filepath, '..', 'assets')

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
	fs.writeFile(path.join(settings.settings.openProject, '..', 'assets.json'), JSON.stringify(this.assets, null, 4))
	fs.writeFile(path.join(settings.settings.openProject, '..', 'actors.json'), JSON.stringify(this.actors, null, 4))
	fs.writeFile(path.join(settings.settings.openProject, '..', 'scripts.json'), JSON.stringify(this.scripts, null, 4))
	settings.addRecentProject(controller.getThumbnail())
	this.oldProject = JSON.stringify(this.project)
	this.oldAssets = JSON.stringify(this.assets)
	this.oldActors = JSON.stringify(this.actors)
	this.oldScripts = JSON.stringify(this.scripts)
}

exports.closeProject = function() {
	if (!this.checkChanges()) return

	this.project = null
	this.assets = null
	this.actors = null
	this.scripts = null
	this.oldProject = 'null'
	this.oldAssets = 'null'
	this.oldActors = 'null'
	this.oldScripts = 'null'
	settings.settings.openProject = ""
	settings.save()
	menu.updateMenu()

	main.redirect('welcome.html')
}

// Returns true if its okay to close the project
exports.checkChanges = function() {
	let changes = this.oldProject !== JSON.stringify(this.project)
	changes = changes || this.oldAssets !== JSON.stringify(this.assets)
	changes = changes || this.oldActors !== JSON.stringify(this.actors)
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
