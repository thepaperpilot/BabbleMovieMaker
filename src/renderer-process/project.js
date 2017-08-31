const fs = require('fs-extra')
const remote = require('electron').remote
const dialog = remote.dialog
const main = remote.require('./main')
const settings = remote.require('./main-process/settings')
const menu = remote.require('./main-process/menus/application-menu')
const controller = require('./controller')

const path = require('path')

module.exports = exports = remote.getGlobal('project').project = {
    // project: {},
    // characters: {},
    // assets: {},
    // charactersPath: "",
    // assetsPath: "",
    // numCharacters: 0,
    // script: ""
	readProject: function() {
		if (!this.checkChanges()) return

        let filepath = remote.getGlobal('project').filepath
		fs.readJson(filepath, (err, proj) => {
			if (err) {
				main.redirect('welcome.html')
				return
			}

			this.project = proj
			this.oldProject = JSON.stringify(proj)
			this.characters = {}
			this.assets = {}
			this.charactersPath = path.join(filepath, '..', 'characters')
			this.assetsPath = path.join(filepath, '..', 'assets')
			for (let i = 0; i < proj.characters.length; i++) {
				this.characters[proj.characters[i].name] = fs.readJsonSync(path.join(this.charactersPath, proj.characters[i].location))
				this.characters[proj.characters[i].name].name = proj.characters[i].name
			}
			this.oldCharacters = JSON.stringify(this.characters)
			for (let i = 0; i < proj.assets.length; i++) {
				this.assets[proj.assets[i].name] = fs.readJsonSync(path.join(this.assetsPath, proj.assets[i].location))
			}
			this.oldAssets = JSON.stringify(this.assets)

			settings.settings.openProject = filepath
			settings.save()
            controller.init()
			menu.updateMenu()
		})
	},
	saveProject: function() {
		fs.writeJson(settings.settings.openProject, this.project)
		for (let i = 0; i < this.project.assets.length; i++)
			fs.writeJson(path.join(settings.settings.openProject, '..', 'assets', this.project.assets[i].location), this.assets[this.project.assets[i].name])
		for (let i = 0; i < this.project.characters.length; i++) {
			fs.writeJson(path.join(settings.settings.openProject, '..', 'characters', this.project.characters[i].location), this.characters[this.project.characters[i].name])
		}
		settings.addRecentProject(controller.getThumbnail())
		this.oldProject = JSON.stringify(this.project)
		this.oldAssets = JSON.stringify(this.assets)
		this.oldCharacters = JSON.stringify(this.characters)
	},
	closeProject: function() {
		if (!this.checkChanges()) return

		this.project = null
		this.assets = null
		this.characters = null
		this.oldProject = 'null'
		this.oldAssets = 'null'
		this.oldCharacters = 'null'
		settings.settings.openProject = ""
		settings.save()
		menu.updateMenu()

		main.redirect('welcome.html')
	},
	// Returns true if its okay to close the project
	checkChanges: function() {
		let changes = this.oldProject !== JSON.stringify(this.project)
		changes = changes || this.oldAssets !== JSON.stringify(this.assets)
		changes = changes || this.oldCharacters !== JSON.stringify(this.characters)
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
}
