// This file is required by the application.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// Imports
const project = require('./project')
const controller = require('./controller')
const timeline = require('./timeline')

const electron = require('electron')
const modal = new (require('vanilla-modal').default)()

//  Vars
let playing

exports.init = function() {
	// Window events
	window.onkeydown = keyDown
	//window.onkeyup = keyUp
	window.onbeforeunload = beforeUnload
	window.addEventListener("resize", controller.resize)

	// DOM listeners
	document.getElementById('greenscreen').addEventListener('click', controller.toggleGreenscreen)
	document.getElementById('settings').addEventListener('click', toggleSettings)
	document.getElementById('export').addEventListener('click', controller.export)
	document.getElementById('colorpicker').addEventListener('change', colorpickerChange)
	document.getElementById('fps').addEventListener('change', fpsChange)
	document.getElementById('puppetscale').addEventListener('change', puppetscaleChange)
	document.getElementById('numslots').addEventListener('change', numslotsChange)
	document.getElementById('resolutions').addEventListener('change', resolutionChange)

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
	document.getElementById('fps').value = project.project.fps
	document.getElementById('puppetscale').value = project.project.puppetScale
	document.getElementById('numslots').value = project.project.numCharacters
	document.getElementById('resolutions').value = project.project.resolution
}

function keyDown(e) {
	let key = e.keyCode ? e.keyCode : e.which

	if (e.target && (e.target.type === 'number' || e.target.type === 'text' || e.target.type === 'search' || e.target.type === 'select-one' || e.target.type === 'password'))
		return

	let handled = true
	if (key == 32) {
		if (playing) {
			clearInterval(playing)
			playing = 0
		} else playing = setInterval(playCutscene, 1000 / project.project.fps);
	} else if (key == 37) timeline.prevFrame()
	else if (key == 39) timeline.nextFrame()
	else handled = false

	if (handled) e.preventDefault()
}

function beforeUnload() {
	if (!project.checkChanges())
		return false
}

function toggleSettings() {
	if (document.getElementById('settings-panel').style.display == 'none') {
		document.getElementById('settings-panel').style.display = 'block'
		document.getElementById('timeline').style.display = 'none'

		document.getElementById('settings').classList.add('open-tab')
	} else {
		document.getElementById('settings-panel').style.display = 'none'
		document.getElementById('timeline').style.display = 'block'

		document.getElementById('settings').classList.remove('open-tab')
	}
}

function colorpickerChange(e) {
	project.project.greenScreen = e.target.value
	controller.toggleGreenscreen()
	controller.toggleGreenscreen()
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

function toggleModal(string) {
	if (modal.isOpen)
		modal.close()
	else
		modal.open(string)
}

function playCutscene() {
	if (timeline.nextFrame()) {
		clearInterval(playing)
		playing = 0
	}
}
