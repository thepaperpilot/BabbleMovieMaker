// Imports
const remote = require('electron').remote
const application = require('./application.js')
const status = require('./status.js')
const babble = require('babble.js')
const Gif = require('./../lib/gif.js')
const toDataURL = require('canvas-background').default
const fs = require('fs-extra')
const path = require('path')
const url = require('url')

// Vars
let project
let stage
let renderer
let rendering = 0
let opague
let transparent

exports.init = function() {
	status.init()
	status.log('Loading project...', 1, 1)
	project = remote.getGlobal('project').project
	application.init()
	stage = new babble.Stage('screen', project.project, project.assets, project.assetsPath, start, status, false)

	// Set up a second renderer for use with the greenscreen
	opague = PIXI.autoDetectRenderer(1, 1, {transparent: false})
    opague.view.style.position = "absolute"
    opague.view.style.display = "none"
    stage.screen.appendChild(opague.view)
	transparent = stage.renderer
}

exports.export = function() {
	if (rendering !== 0) return
	status.log('Rendering movie...', 2, 3)
	// TODO start cutscene

	// TODO view changer
	document.getElementById('screen').style.width = project.project.resolution.split("x")[0] + "px"
	document.getElementById('screen').style.height = project.project.resolution.split("x")[1] + "px"
	document.getElementById('status').style.width = (project.project.resolution.split("x")[0] - 20) + "px"
	document.getElementById('bottom').style.display = 'none'
	document.getElementById('side').style.display = 'none'
	renderer = new Gif({
		// TODO let them choose if they want transparency, and what quality to render at
		workers: navigator.hardwareConcurrency,
		workerScript: "lib/gif.worker.js",
		width: parseInt(project.project.resolution.split("x")[0]),
		height: parseInt(project.project.resolution.split("x")[1]),
		backgroundColor: project.project.greenScreen,
		transparent: stage.renderer == transparent ? project.project.greenScreen : 0
	})
	renderer.on('finished', (blob) => {
		status.log("Finished rendering!", 3, 1)
		let reader = new FileReader()
	    reader.onload = function() {
	        if (reader.readyState == 2) {
	        	remote.dialog.showSaveDialog(remote.BrowserWindow.getFocusedWindow(), {
	        		title: 'Save video',
	        		defaultPath: remote.app.getPath('home'),
			        filters: [
			          {name: 'Gif', extensions: ['gif']}
			        ]
	        	}, (file) => {
	            	if (file) fs.outputFile(file, new Buffer(reader.result))
	        	})
	        }
	    }
	    reader.readAsArrayBuffer(blob)
	})
	renderer.on('progress', (p) => {
		status.log('Generating gif... ' + Math.round(p * 100) + '%', 3, 3)
	})
	rendering = 0
	stage.enabled = false
	renderFrame()
}

exports.getThumbnail = function() {
	return stage.getThumbnail()
}

exports.resize = function() {
	stage.resize(null, project.project.resolution.split("x")[1], project.project.resolution.split("x")[1])
}

exports.toggleGreenscreen = function() {
	if (stage.renderer == opague) {
		stage.renderer = transparent
		transparent.view.style.display = 'block'
		opague.view.style.display = 'none'
	} else {
		stage.renderer = opague
		opague.backgroundColor = "0x" + project.project.greenScreen.slice(1)
		transparent.view.style.display = 'none'
		opague.view.style.display = 'block'
	}
	
	exports.resize()
	stage.renderer.render(stage.stage)
}

function start() {
	if (stage) {
		exports.resize()
		loop()
		// Protection against start being called before stage constructor returns, like it'll do in the event of there being no assets to load
	} else requestAnimationFrame(start)
}

// Temporary script for testing purposes
function loop() {
	let emotes = ["happy", "confused", "gasp", "ooo", "sad"]
	for (let i = 0; i < 5; i++) {
		let script = "add Gravy " + i + " 0;" + "\n" +
			"move " + i + " " + (i + 1) + ";" + "\n" +
			"babble " + i + ";" + "\n" +
			"delay 1000;" + "\n" +
			"jiggle " + i + "," + "\n" +
			"babble " + i + ";" + "\n" +
			"emote " + i + " " + emotes[i] + ";" + "\n" +
			"delay 500;" + "\n" +
			"move " + i + " 6;" + "\n" + 
			"remove " + i + ";" + "\n"
		if (i == 4) { // If this is the last puppet, start the loop over after completion
			new babble.Cutscene(stage, script, project.characters, loop).start()
		} else new babble.Cutscene(stage, script, project.characters).start()
	}
}

function renderFrame() {
	stage.update(1000 / project.project.fps)
	try {
		renderer.addFrame(stage.renderer.view, {copy: true, delay: 1000 / project.project.fps})
	} catch(e) {
		// Probably just an empty frame
		console.log(e)
	}

	rendering++
	if (rendering < project.project.fps * project.project.duration) requestAnimationFrame(renderFrame)
	else {
		renderer.render()
	    stage.enabled = true
	    rendering = 0
		document.getElementById('screen').style.width = ''
		document.getElementById('screen').style.height = ''
		document.getElementById('status').style.width = ''
		document.getElementById('bottom').style.display = ''
		document.getElementById('side').style.display = ''
		exports.resize()
	}
}
