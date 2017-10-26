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
    // actors: {},
    // assets: {},
    // assetsPath: "",
    // numCharacters: 0,
    // scripts: []
	readProject: function() {
		if (!this.checkChanges()) return

        let filepath = remote.getGlobal('project').filepath
		fs.readJson(filepath, (err, proj) => {
			if (err) {
				main.redirect('welcome.html')
				return
			}

			this.project = proj
			this.assets = fs.readJsonSync(path.join(filepath, '..', 'assets.json'))
			this.actors = fs.readJsonSync(path.join(filepath, '..', 'actors.json'))
			this.scripts = fs.readJsonSync(path.join(filepath, '..', 'scripts.json'))

			this.oldProject = JSON.stringify(proj)
			this.oldAssets = JSON.stringify(this.assets)
			this.oldActors = JSON.stringify(this.actors)
			this.oldScripts = JSON.stringify(this.scripts)

			this.assetsPath = path.join(filepath, '..', 'Assets')

			settings.settings.openProject = filepath
			settings.save()
            controller.init()
			menu.updateMenu()
		})
	},
	saveProject: function() {
		fs.writeJson(settings.settings.openProject, JSON.stringify(this.project, null, 4))
		fs.writeFile(path.join(settings.settings.openProject, '..', 'assets.json'), JSON.stringify(this.assets, null, 4))
		fs.writeFile(path.join(settings.settings.openProject, '..', 'actors.json'), JSON.stringify(this.actors, null, 4))
		fs.writeFile(path.join(settings.settings.openProject, '..', 'scripts.json'), JSON.stringify(this.scripts, null, 4))
		settings.addRecentProject(controller.getThumbnail())
		this.oldProject = JSON.stringify(this.project)
		this.oldAssets = JSON.stringify(this.assets)
		this.oldActors = JSON.stringify(this.actors)
		this.oldScripts = JSON.stringify(this.scripts)
	},
	closeProject: function() {
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
	},
	// Returns true if its okay to close the project
	checkChanges: function() {
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
}
