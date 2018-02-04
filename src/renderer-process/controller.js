// Imports
const project = require('./project')
const status = require('./status')
const application = require('./application')
const inspector = require('./inspector')
const timeline = require('./timeline')
const actors = require('./actors')

const remote = require('electron').remote
const babble = require('babble.js')
const Gif = require('./../lib/gif.js')
const fs = require('fs-extra')

// Constants
const puppetKeys = ["id", "name", "babbling", "position", "target", "emote", "facingLeft", "movingAnim", "eyesAnim", "mouthAnim", "deadbonesAnim", "eyesDuration", "mouthDuration", "deadbonesDuration", "deadbonesTargetY", "deadbonesStartY", "deadbonesTargetRotation", "deadbonesStartRotation"]

// Vars
let renderer
let rendering = 0
let opague
let transparent

exports.puppetKeys = puppetKeys

exports.init = function() {
	// Creating stage as a global, because f*** it
	window.stage = new babble.Stage('screen', project.project, project.assets, project.assetsPath, start, status, false)
	stage.registerPuppetListener("click", (e) => { inspector.update(actors.actors.indexOf(e.target.id)) })
	stage.renderer.view.classList.add("container")
	stage.renderer.view.style.padding = 0

	// Init other files
	application.init()
	inspector.init()
	timeline.init()
	actors.init()

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
	timeline.gotoFrame(0)

	// TODO view changer
	document.getElementById('screen').style.width = project.project.resolution.split("x")[0] + "px"
	document.getElementById('screen').style.height = project.project.resolution.split("x")[1] + "px"
	document.getElementById('status').style.width = (project.project.resolution.split("x")[0] - 20) + "px"
	document.getElementById('bottom').style.width = (project.project.resolution.split("x")[0] - 20) + "px"
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
	renderFrame()
}

exports.getThumbnail = function() {
	return stage.getThumbnail()
}

exports.resize = function() {
	stage.screen.style.height = Math.min(window.innerHeight - 320, (stage.screen.clientWidth * project.project.resolution.split("x")[1] / project.project.resolution.split("x")[0])) + "px"
	
	stage.resize(null, project.project.resolution.split("x")[0], project.project.resolution.split("x")[1])
	stage.renderer.render(stage.stage)
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
		status.log('Project Loaded!', 1, 1)
		exports.resize()
		readScript()
		// Protection against start being called before stage constructor returns, like it'll do in the event of there being no assets to load
	} else requestAnimationFrame(start)
}

function readScript() {
	stage.clearPuppets()
	timeline.reset()
	let frame = 0
	let cutscene = new babble.Cutscene(stage, project.scripts, project.actors, () => { timeline.frames = frame + 1 })
	cutscene.actions.delay = function(callback, action) {
		// Normal delay behavior
        if (action.delay <= 0) requestAnimationFrame(callback)
        else {
            let timer = PIXI.timerManager.createTimer(action.delay)
            timer.on('end', callback)
            timer.start()
        }

        // Find out when actions end
        if (action.parent) action.parent.delay = action.delay
    }
	actors.actors = []
	cutscene.parseNextAction = function(script, callback) {
        // Check if script is complete
        if (script.length === 0) {
            // Cutscene finished successully
            if (callback) callback()
            return
        }

        // Parse current line of script
        let action = script[0]

        // Confirm command exists
        if (!this.actions.hasOwnProperty(action.command)) {
            // Invalid command, end cutscene
            if (callback) callback()
            return
        }

        // Check for actors
        let actor = "id" in action ? action.id : 'target' in action ? action.target : null
        if (actor !== null && !actors.actors.includes(actor))
        	actors.actors.push(actor)

        // Add to keyframe
        if (project.project.commands[action.command]) {
	        if (!timeline.keyframes[frame]) timeline.keyframes[frame] = { actions: [] }
	        timeline.keyframes[frame].actions.push(action)
        }

        // Run action
        if (action.wait) {
            // Complete this action before proceeding
            let newCallback = function() {
                this.parseNextAction(script.slice(1), callback)
            }.bind(this)
            try {
				this.actions[action.command].call(this, newCallback, action)
			} catch (e) {
				action.error = e.message
				document.getElementById("frame " + frame).classList.add("warning")				
				if (actor !== null)
					document.getElementById("actor " + actors.actors.indexOf(actor) + " frame " + frame).classList.add("warning")
				newCallback()
			}
        } else {
            // Perform this action and immediately continue
            try {
				this.actions[action.command].call(this, this.empty, action)
			} catch (e) {
				action.error = e.message
				document.getElementById("frame " + frame).classList.add("warning")				
				if (actor !== null)
					document.getElementById("actor " + actors.actors.indexOf(actor) + " frame " + frame).classList.add("warning")
			}
            this.parseNextAction(script.slice(1), callback)
        }
    }
	cutscene.start()
	while (!timeline.frames || frame < timeline.frames + timeline.bufferFrames) {
		if (timeline.keyframes[frame]) {
			let puppets = []
			for (let i = 0; i < stage.puppets.length; i++) {
				let puppet = {}
				for (let j = 0; j < puppetKeys.length; j++) {
					puppet[puppetKeys[j]] = stage.puppets[i][puppetKeys[j]]
				}
				puppets.push(puppet)
			}
			
			timeline.keyframes[frame].puppets = puppets
		}

		frame++
		stage.update(1000 / project.project.fps)
	}

	let domFrames = document.getElementById("frames")
	for (let i = 0; i < timeline.frames + timeline.bufferFrames; i++) {
		let domFrame = document.createElement("div")
		domFrame.id = "frame " + i
		domFrame.classList.add("frame")
		domFrame.frame = i
		domFrame.addEventListener("click", timeline.gotoFrame)
		domFrames.appendChild(domFrame)
		if (timeline.keyframes[i])
			domFrame.classList.add("keyframe")
		if (i == timeline.frames)
			domFrame.classList.add("lastFrame")
	}

	for (let i = 0; i < actors.actors.length; i++) {
		actors.addActor(i)
	}

	let keyframes = Object.keys(timeline.keyframes)
	for (let i = 0; i < keyframes.length; i++) {
		let keyframe = timeline.keyframes[keyframes[i]]
		for (let j = 0; j < keyframe.actions.length; j++) {
			let action = keyframe.actions[j]
			if (action.delay) {
				let frameIndex = parseInt(keyframes[i]) + Math.ceil(action.delay * project.project.fps / 1000)
				let id = "frame " + frameIndex
				if ('id' in action)
					id = "actor " + actors.actors.indexOf(action.id) + " " + id
				else if ('target' in action)
					id = "actor " + actors.actors.indexOf(action.target) + " " + id
				let frameElement = document.getElementById(id)

				if (!frameElement.finishedActions) frameElement.finishedActions = []
				frameElement.finishedActions.push(action)

				frameElement.classList.add("endDelay")
			}
		}
	}

	timeline.gotoFrame(0)
}

function renderFrame() {
	timeline.nextFrame()
	try {
		renderer.addFrame(stage.renderer.view, {copy: true, delay: 1000 / project.project.fps})
	} catch(e) {
		// Probably just an empty frame
		console.log(e)
	}

	rendering++
	if (rendering < frames) requestAnimationFrame(renderFrame)
	else {
		renderer.render()
	    rendering = 0
		document.getElementById('screen').style.width = ''
		document.getElementById('screen').style.height = ''
		document.getElementById('status').style.width = ''
		document.getElementById('bottom').style.width = ''
		document.getElementById('side').style.display = ''
		exports.resize()
	}
}
