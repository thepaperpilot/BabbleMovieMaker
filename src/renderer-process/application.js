// This file is required by the application.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// Imports
const project = require('./project')
const controller = require('./controller')
const timeline = require('./timeline')
const inspector = require('./inspector')

const electron = require('electron')
const modal = new (require('vanilla-modal').default)()

//  Vars
let playing

// DOM Elements
let greenscreenCheckbox = document.getElementById("greenscreen")
let settingsButton = document.getElementById("settings")
let puppetsButton = document.getElementById("puppets")
let cutscenesButton = document.getElementById("cutscenes")
let commandsButton = document.getElementById("commands")
let exportButton = document.getElementById("export")
let colorpicker = document.getElementById("colorpicker")
let fps = document.getElementById("fps")
let puppetscale = document.getElementById("puppetscale")
let numslots = document.getElementById("numslots")
let resolution = document.getElementById("resolutions")
let timelinePanel = document.getElementById("timeline")
let settingsPanel = document.getElementById("settings-panel")
let puppetsPanel = document.getElementById("puppets-panel")
let cutscenesPanel = document.getElementById("cutscenes-panel")
let commandsPanel = document.getElementById("commands-panel")

exports.init = function() {
	// Window events
	window.onkeydown = keyDown
	//window.onkeyup = keyUp
	window.onbeforeunload = beforeUnload
	window.addEventListener("resize", controller.resize)

	// Electron window events
	let onFocus = () => { project.updateBabble() }
	electron.remote.getCurrentWindow().on('focus', onFocus)
	window.addEventListener('beforeunload', () => {
	  electron.remote.getCurrentWindow().removeListener('focus', onFocus)
	})

	// DOM listeners
	greenscreenCheckbox.addEventListener('click', controller.toggleGreenscreen)
	settingsButton.addEventListener('click', toggleSettings)
	puppetsButton.addEventListener('click', togglePuppets)
	cutscenesButton.addEventListener('click', toggleCutscenes)
	commandsButton.addEventListener('click', toggleCommands)
	exportButton.addEventListener('click', controller.export)
	colorpicker.addEventListener('change', colorpickerChange)
	fps.addEventListener('change', fpsChange)
	puppetscale.addEventListener('change', puppetscaleChange)
	numslots.addEventListener('change', numslotsChange)
	resolution.addEventListener('change', resolutionChange)

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
	colorpicker.value = project.project.greenScreen
	fps.value = project.project.fps
	puppetscale.value = project.project.puppetScale
	numslots.value = project.project.numCharacters
	resolution.value = project.project.resolution
}

exports.closePanels = function() {
	settingsPanel.style.display = 'none'
	puppetsPanel.style.display = 'none'
	cutscenesPanel.style.display = 'none'
	commandsPanel.style.display = 'none'
	timelinePanel.style.display = 'block'

	settingsButton.classList.remove('open-tab')
	puppetsButton.classList.remove('open-tab')
	cutscenesButton.classList.remove('open-tab')
	commandsButton.classList.remove('open-tab')
}

function keyDown(e) {
	let key = e.keyCode ? e.keyCode : e.which

	if (e.target && (e.target.type === 'number' || e.target.type === 'text' || e.target.type === 'search' || e.target.type === 'select-one' || e.target.type === 'password' || e.target.tagName.toUpperCase() === "TEXTAREA"))
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
	if (settingsPanel.style.display == 'none') {
		settingsPanel.style.display = 'block'
		puppetsPanel.style.display = 'none'
		cutscenesPanel.style.display = 'none'
		commandsPanel.style.display = 'none'
		timelinePanel.style.display = 'none'

		settingsButton.classList.add('open-tab')
		puppetsButton.classList.remove('open-tab')
		cutscenesButton.classList.remove('open-tab')
		commandsButton.classList.remove('open-tab')
	} else exports.closePanels()
}

function togglePuppets() {
	if (puppetsPanel.style.display == 'none') {
		settingsPanel.style.display = 'none'
		puppetsPanel.style.display = 'block'
		cutscenesPanel.style.display = 'none'
		commandsPanel.style.display = 'none'
		timelinePanel.style.display = 'none'

		settingsButton.classList.remove('open-tab')
		puppetsButton.classList.add('open-tab')
		cutscenesButton.classList.remove('open-tab')
		commandsButton.classList.remove('open-tab')
	} else exports.closePanels()
}

function toggleCommands() {
	if (commandsPanel.style.display == 'none') {
		settingsPanel.style.display = 'none'
		puppetsPanel.style.display = 'none'
		cutscenesPanel.style.display = 'none'
		commandsPanel.style.display = 'block'
		timelinePanel.style.display = 'none'

		settingsButton.classList.remove('open-tab')
		puppetsButton.classList.remove('open-tab')
		cutscenesButton.classList.remove('open-tab')
		commandsButton.classList.add('open-tab')
	} else exports.closePanels()
}

function toggleCutscenes() {
	if (cutscenesPanel.style.display == 'none') {
		settingsPanel.style.display = 'none'
		puppetsPanel.style.display = 'none'
		cutscenesPanel.style.display = 'block'
		commandsPanel.style.display = 'none'
		timelinePanel.style.display = 'none'

		settingsButton.classList.remove('open-tab')
		puppetsButton.classList.remove('open-tab')
		cutscenesButton.classList.add('open-tab')
		commandsButton.classList.remove('open-tab')
	} else exports.closePanels()
}

function colorpickerChange(e) {
	project.project.greenScreen = e.target.value
	controller.toggleGreenscreen()
	controller.toggleGreenscreen()
}

function fpsChange(e) {
	project.project.fps = parseFloat(e.target.value)
	controller.readScript()
	controller.resize()
}

function puppetscaleChange(e) {
	project.project.puppetScale = parseFloat(e.target.value)
	controller.resize()
}

function numslotsChange(e) {
	project.project.numCharacters = parseInt(e.target.value)
	controller.resize()
	inspector.update()
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
