// This file is required by the welcome.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const path = require('path')
const modal = new (require('vanilla-modal').default)()
const remote = require('electron').remote
const app = remote.app
const dialog = remote.dialog
const util = remote.require('./main-process/util')
const settings = remote.require('./main-process/settings')
const fs = require('fs-extra')

document.getElementById('location').value = path.join(app.getPath('home'), 'projects')
document.getElementById('open').addEventListener('click', function() {
	util.selectProject()
})
document.getElementById('browse').addEventListener('click', function() {
	 util.selectBabble(function (filepaths) {
		if (filepaths)
			document.getElementById('location').value = filepaths[0];
	})
})
document.getElementById('create').addEventListener('submit', function(e) {
	// Prevent page from refreshing
	e.preventDefault()

	// Find paths
	let babble = document.getElementById('location').value

	// Check folder is empty, otherwise stop and alert user
	fs.ensureFileSync(babble, err => {
  		console.log(err)
	})
	let dest = babble.substr(0, babble.lastIndexOf('.')) + ".babblemm"
	if (fs.existsSync(dest)) {
		dialog.showErrorBox("Could not create project", "There's already a Babble Movie Maker project associated with that Babble Buds project.")
		return false
	}

	// Create project
	fs.writeJsonSync(dest, {
		babble: babble
	})

	// Open new project
	remote.require('./main').setFilepath(dest)
	remote.require('./main').redirect('application.html')
})
let recentProjectsElement = document.getElementById('recent-projects')
let recentProjects = settings.settings.recentProjects
for (let i = 0; i < recentProjects.length; i++) {
	let filename = util.slugify(recentProjects[i])
	let selector = document.createElement('div')
    selector.id = recentProjects[i]
    selector.className = "recent-project"
    selector.style.backgroundImage = 'url(' +  path.join(app.getPath('userData'), filename + '.png').replace(/\\/g, '/') + ')'
    recentProjectsElement.appendChild(selector)
    selector.innerHTML = '<div class="desc">' + recentProjects[i].replace(/^.*[\\\/]/, '') + '</div>'
    selector.addEventListener('click', openProject)
}
function openProject() {
    util.openProject(this.id)
}

require('electron').ipcRenderer.on('toggleInstructions', () => {
	if (modal.isOpen)
		modal.close()
	else
		modal.open("#instructions")
})
require('electron').ipcRenderer.on('toggleAbout', () => {
	if (modal.isOpen)
		modal.close()
	else
		modal.open("#about")
})
