// This file is required by the application.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// Imports
const electron = require('electron')
const remote = electron.remote
const modal = new (require('vanilla-modal').default)()
const status = require('./status.js')
const controller = require('./controller.js')
const path = require('path')
const fs = require('fs-extra')

let project
let stage

exports.init = function() {
	project = electron.remote.getGlobal('project').project

	// Window events
	window.onbeforeunload = beforeUnload
	window.addEventListener("resize", controller.resize)

	// DOM listeners
	document.getElementById('greenscreen').addEventListener('click', controller.toggleGreenscreen)
	document.getElementById('settings').addEventListener('click', toggleSettings)
	document.getElementById('script').addEventListener('click', openEditor)
	document.getElementById('export').addEventListener('click', controller.export)
	document.getElementById('colorpicker').addEventListener('change', colorpickerChange)
	document.getElementById('duration').addEventListener('change', durationChange)
	document.getElementById('fps').addEventListener('change', fpsChange)
	document.getElementById('puppetscale').addEventListener('change', puppetscaleChange)
	document.getElementById('numslots').addEventListener('change', numslotsChange)
	document.getElementById('resolutions').addEventListener('change', resolutionChange)
	document.getElementById('exportscript').addEventListener('click', exportScript)
	document.getElementById('cancelscript').addEventListener('click', toggleModal)
	document.getElementById('savescript').addEventListener('click', saveScript)

	// Handle input events from popout
	electron.ipcRenderer.on('save', () => {
		project.saveProject()
	})
	electron.ipcRenderer.on('close', () => {
		project.closeProject()
	})
	electron.ipcRenderer.on('toggleInstructions', () => {
		toggleModal("#instructions")
	})
	electron.ipcRenderer.on('toggleAbout', () => {
		toggleModal("#about")
	})

	// Load settings values
	document.getElementById('colorpicker').value = project.project.greenScreen
	document.getElementById('duration').value = project.project.duration
	document.getElementById('fps').value = project.project.fps
	document.getElementById('puppetscale').value = project.project.puppetScale
	document.getElementById('numslots').value = project.project.numCharacters
	document.getElementById('resolutions').value = project.project.resolution
}

function beforeUnload() {
	if (!project.checkChanges())
		return false
}

function toggleSettings() {
	if (document.getElementById('settings-panel').style.display == 'none') {
		document.getElementById('settings-panel').style.display = 'block'
		document.getElementById('chars').style.display = 'none'
	} else {
		document.getElementById('settings-panel').style.display = 'none'
		document.getElementById('chars').style.display = 'block'
	}
}

function openEditor(e) {
	document.getElementById('editorscript').value = project.project.script
	toggleModal("#editor")
}

function colorpickerChange(e) {
	project.project.greenScreen = e.target.value
	controller.toggleGreenscreen()
	controller.toggleGreenscreen()
}

function durationChange(e) {
	project.project.duration = parseFloat(e.target.value)
	controller.resize()
}

function fpsChange(e) {
	project.project.fps = parseFloat(e.target.value)
	controller.resize()
}

function puppetscaleChange(e) {
	project.project.puppetScale = parseFloat(e.target.value)
	controller.resize()
}

function numslotsChange(e) {
	project.project.numCharacters = parseInt(e.target.value)
	controller.resize()
}

function resolutionChange(e) {
	project.project.resolution = e.target.value
	controller.resize()
}

function exportScript() {
	console.log("!")
	remote.dialog.showSaveDialog(remote.BrowserWindow.getFocusedWindow(), {
		title: 'Save script',
		defaultPath: remote.app.getPath('home'),
        filters: [
          {name: 'Text', extensions: ['txt']}
        ]
	}, (file) => {
    	if (file) fs.outputFile(file, document.getElementById('editorscript').value)
	})
}

function saveScript() {
	project.project.script = document.getElementById('editorscript').value
	toggleModal()
}

function toggleModal(string) {
	if (modal.isOpen)
		modal.close()
	else
		modal.open(string)
}
