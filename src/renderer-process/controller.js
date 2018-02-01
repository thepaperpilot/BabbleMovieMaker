// Imports
const remote = require('electron').remote
const application = require('./application.js')
const status = require('./status.js')
const inspector = require('./inspector.js')
const babble = require('babble.js')
const Gif = require('./../lib/gif.js')
const toDataURL = require('canvas-background').default
const fs = require('fs-extra')
const path = require('path')
const url = require('url')

// Constants
const bufferFrames = 100	// How many frames to extend the timeline after the last action is completed
const scrollPadding = 50	// When current frame loses visibility, how far it places the currentframe from the opposite edge
const puppetKeys = ["babbling", "id", "position", "target", "facingLeft", "eyes", "mouths", "deadbonesStyle", "movingAnim", "eyesAnim", "mouthAnim", "deadbonesAnim", "eyesDuration", "mouthDuration", "deadbonesDuration", "deadbonesTargetY", "deadbonesStartY", "deadbonesTargetRotation", "deadbonesStartRotation", "eyeBabbleDuration", "mouthBabbleDuration", "name"]

// Vars
let project
let stage
let renderer
let rendering = 0
let opague
let transparent
let frame
let frames
let keyframes
let actors
let psuedoCutscene

exports.init = function() {
	project = remote.getGlobal('project').project
	application.init()
	stage = new babble.Stage('screen', project.project, project.assets, project.assetsPath, start, status, false)
	stage.registerPuppetListener("click", inspector.update)
	stage.renderer.view.classList.add("container")
	stage.renderer.view.style.padding = 0
	inspector.init(stage)
	document.getElementById('addActor').addEventListener('click', newActor)

	// Set up a second renderer for use with the greenscreen
	opague = PIXI.autoDetectRenderer(1, 1, {transparent: false})
    opague.view.style.position = "absolute"
    opague.view.style.display = "none"
    stage.screen.appendChild(opague.view)
	transparent = stage.renderer

	// Set up psuedo cutscene, used for running actions without delays or parse other actions
	psuedoCutscene = new babble.Cutscene(stage, null, project.actors)
	psuedoCutscene.parseNextAction = () => {}
	psuedoCutscene.actions.delay = () => {}
}

exports.export = function() {
	if (rendering !== 0) return
	status.log('Rendering movie...', 2, 3)
	exports.gotoFrame(0)

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

exports.prevFrame = function() {
	exports.gotoFrame(frame === 0 ? frames : frame - 1)
}

// Returns true if cutscene finished
exports.nextFrame = function() {
	if (frame >= frames + bufferFrames + 1) return true
	if (frame == frames) {
		exports.gotoFrame(0)
		return
	}

	stage.update(1000 / project.project.fps)

	if (keyframes[++frame])
		for (let i = 0; i < keyframes[frame].actions.length; i++) {
			let action = keyframes[frame].actions[i]
			try {
				psuedoCutscene.actions[action.command].call(psuedoCutscene, () => {}, action)
			} catch (e) {}
		}

	stage.update(0)

	updateTimeline()

	return frame == frames
}

exports.gotoFrame = function(frameIndex, update = true) {
	frameIndex = frameIndex.target ? frameIndex.target.frame : frameIndex
	let nearestKeyframe = frame = frameIndex
	while (!keyframes[nearestKeyframe])
		nearestKeyframe--
	let puppets = JSON.parse(JSON.stringify(keyframes[nearestKeyframe].puppets))
	for (let i = 0; i < stage.puppets.length; i++) {
		let puppet = stage.puppets[i]
		let remove = true
		for (let j = 0; j < puppets.length; j++) {
			if (puppet.id === puppets[j].id) {
				if (puppet.name !== puppets[j].name)
					puppet = stage.setPuppet(puppet.id, stage.createPuppet(project.actors[puppets[j].name]))
				Object.assign(puppet, puppets[j])
				updatePuppet(puppet)
				remove = false
				puppets.splice(j--, 1)
			}
		}
		if (remove) stage.removePuppet(puppet.id)
	}

	for (let i = 0; i < puppets.length; i++) {
		let puppet = stage.addPuppet(project.actors[puppets[i].name], puppets[i].id)
		Object.assign(puppet, puppets[i])
		updatePuppet(puppet)
	}

	if (nearestKeyframe == frameIndex) stage.update(0)
	else for (let i = 0; i < frameIndex - nearestKeyframe; i++)
		stage.update(1000 / project.project.fps)

	if (update) updateTimeline()
}

exports.simulateFromFrame = function() {
	let origFrame = frame
	let currentFrame = origFrame - 1
	if (currentFrame === -1) stage.clearPuppets()
	else exports.gotoFrame(currentFrame, false)

	let keys = Object.keys(keyframes)
	for (let i = 0; i < keys.length; i++) {
		if (keys[i] < origFrame) continue

		if (keys[i] == currentFrame) stage.update(0)
		else for (let j = 0; j < keys[i] - currentFrame; j++)
			stage.update(1000 / project.project.fps)
		currentFrame = keys[i]
		let keyframe = keyframes[keys[i]]

		document.getElementById("frame " + currentFrame).classList.remove("warning")
		for (let j = 0; j < actors.length; j++)
			document.getElementById("actor " + j + " frame " + currentFrame).classList.remove("warning")

		for (let j = 0; j < keyframe.actions.length; j++) {
			let action = keyframe.actions[j]
			action.error = null
			try {
				psuedoCutscene.actions[action.command].call(psuedoCutscene, () => {}, action)
			} catch (e) {
				action.error = e.message
				document.getElementById("frame " + currentFrame).classList.add("warning")
				let actor = "id" in action ? action.id : 'target' in action ? action.target : null
				if (actor !== null)
					document.getElementById("actor " + actors.indexOf(actor) + " frame " + currentFrame).classList.add("warning")
			}
		}

		let puppets = []
		for (let j = 0; j < stage.puppets.length; j++) {
			let puppet = {}
			for (let k = 0; k < puppetKeys.length; k++) {
				puppet[puppetKeys[k]] = stage.puppets[j][puppetKeys[k]]
			}
			puppets.push(puppet)
		}
		keyframe.puppets = puppets
	}

	exports.gotoFrame(origFrame, false)
}

exports.addCommand = function(command) {
	let action = {
		command: command
	}
	let fields = Object.keys(project.project.commands[command].fields)
	for (let i = 0; i < fields.length; i++) {
		let field = project.project.commands[command].fields[fields[i]]
		action[fields[i]] = fields[i] === "id" || fields[i] === "target" ? inspector.getTarget() : field.default
	}
	if (!keyframes[frame]) {
		keyframes[frame] = { actions: [] }
		document.getElementById("frame " + frame).classList.add("keyframe")
		let actor = "id" in action ? action.id : 'target' in action ? action.target : null
		if (actor !== null)
			document.getElementById("actor " + actors.indexOf(actor) + " frame " + frame).classList.add("keyframe")
	}
    keyframes[frame].actions.push(action)

    exports.simulateFromFrame()
    inspector.update({target: {frame: frame, id: inspector.getTarget()}})
}

exports.removeCommand = function(action) {
	keyframes[frame].actions.splice(keyframes[frame].actions.indexOf(action), 1)
	let actor = "id" in action ? action.id : 'target' in action ? action.target : null
	if (actor !== null) {
		let hasKeyframe = false
		for (let i = 0; i < keyframes[frame].actions.length; i++) {
			let action = keyframes[frame].actions[i]
			let compareActor = "id" in action ? action.id : 'target' in action ? action.target : null
			if (actor == compareActor) {
				hasKeyframe = true
			}
		}
		if (!hasKeyframe) document.getElementById("actor " + actors.indexOf(actor) + " frame " + frame).classList.remove("keyframe")
	}
	if (keyframes[frame].actions.length === 0) {
		delete keyframes[frame]
		document.getElementById("frame " + frame).classList.remove("keyframe")
	}
	
	exports.simulateFromFrame()
    inspector.update({target: {frame: frame, id: inspector.getTarget()}})
}

exports.getFrame = function() { return frame }
exports.getFrames = function() { return frames }
exports.getKeyframe = function(frame) { return keyframes[frame] }
exports.getActors = function() { return actors }

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
	keyframes = {}
	let frame = frames = 0
	let cutscene = new babble.Cutscene(stage, project.scripts, project.actors, () => { frames = frame })
	actors = []
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
        if (actor !== null && !actors.includes(actor))
        	actors.push(actor)

        // Add to keyframe
        if (project.project.commands[action.command]) {
	        if (!keyframes[frame]) keyframes[frame] = { actions: [] }
	        keyframes[frame].actions.push(action)
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
					document.getElementById("actor " + actors.indexOf(actor) + " frame " + frame).classList.add("warning")
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
					document.getElementById("actor " + actors.indexOf(actor) + " frame " + frame).classList.add("warning")
			}
            this.parseNextAction(script.slice(1), callback)
        }
    }
	cutscene.start()
	while (!frames || frame < frames + bufferFrames) {
		let puppets = []
		for (let i = 0; i < stage.puppets.length; i++) {
			let puppet = {}
			for (let j = 0; j < puppetKeys.length; j++) {
				puppet[puppetKeys[j]] = stage.puppets[i][puppetKeys[j]]
			}
			puppets.push(puppet)
		}

		if (keyframes[frame])
			keyframes[frame].puppets = puppets

		frame++
		stage.update(1000 / project.project.fps)
	}

	let domFrames = document.getElementById("frames")
	for (let i = 0; i < frames + bufferFrames; i++) {
		let domFrame = document.createElement("div")
		domFrame.id = "frame " + i
		domFrame.classList.add("frame")
		domFrame.frame = i
		domFrame.addEventListener("click", exports.gotoFrame)
		domFrames.appendChild(domFrame)
		if (keyframes[i])
			domFrame.classList.add("keyframe")
		if (i == frames)
			domFrame.classList.add("lastFrame")
	}

	for (let i = 0; i < actors.length; i++) {
		addActor(i)
	}

	exports.gotoFrame(0)
}

function updatePuppet(puppet) {
	// Position puppet
    puppet.container.scale.x = puppet.container.scale.y = (project.project.puppetScale || 1) 
    puppet.container.scale.x *= puppet.facingLeft ? -1 : 1
    puppet.container.y = stage.bounds.height / stage.puppetStage.scale.y
    puppet.container.x = puppet.position <= 0 ? - Math.abs(puppet.container.width) / 2 :                       // Starting left of screen
                         puppet.position >= project.project.numCharacters + 1 ? 
                         project.project.numCharacters * stage.slotWidth + Math.abs(puppet.container.width) / 2 :  // Starting right of screen
                         (puppet.position - 0.5) * stage.slotWidth                                              // Starting on screen

    // Update emote
    let emotes = Object.keys(puppet.emotes)
    for (let i = 0; i < emotes.length; i++) {
        puppet.emotes[emotes[i]].mouth.visible = false
        puppet.emotes[emotes[i]].eyes.visible = false
    }
    if (puppet.emote && puppet.emotes[puppet.emote].enabled) {
        puppet.emotes[puppet.emote].mouth.visible = true
        puppet.emotes[puppet.emote].eyes.visible = true
    } else {
        puppet.emotes['0'].mouth.visible = true
        puppet.emotes['0'].eyes.visible = true
    }
}

function updateTimeline() {
	// Move current frame indicator
	let node = document.body.getElementsByClassName("currentframe")[0]
	while (node) {
		node.classList.remove("currentframe")
		node = document.body.getElementsByClassName("currentframe")[0]
	}
	let currentFrame = document.getElementById("frame " + frame)
	currentFrame.classList.add("currentframe")

	// Update inspector
	inspector.update()

	// Calculate where the current frame is on the timeline
	let timeline = document.getElementById("time-scroll")
	let timelineRect = timeline.getBoundingClientRect()
    let rect = currentFrame.getBoundingClientRect()
    let width = timelineRect.right - timelineRect.left - scrollPadding

    // Scroll timeline to currentFrame if necessary
    if (rect.left < timelineRect.left) {
    	// We need to scroll left
    	timeline.scrollLeft -= timelineRect.left - rect.left + width
    } else if (rect.right > timeline.clientWidth + timelineRect.left) {
    	// We need to scroll right
    	timeline.scrollLeft += rect.right - (timeline.clientWidth + timelineRect.left) + width
    }
}

function newActor() {
	let name = "actor"
	let i = 1
	while (actors.includes(name))
		name = "actor" + (i++)
	actors.push(name)

	addActor(actors.length - 1)
}

function addActor(i) {
	let domActors = document.getElementById("actors")
	let domTimeline = document.getElementById("time-scroll")
	let domActor = document.createElement("div")

	domActor.id = "actor " + i
	domActor.classList.add("actor")
	domActor.innerText = actors[i]
	domActors.appendChild(domActor)
	domActor = document.createElement("div")
	domActor.id = "timeline actor " + i
	domActor.classList.add("actor")
	domTimeline.appendChild(domActor)
	for (let j = 0; j < frames + bufferFrames; j++) {
		let domFrame = document.createElement("div")
		domFrame.id = "actor " + i + " frame " + j
		domFrame.actor = actors[i]
		domFrame.frame = j
		domFrame.addEventListener("click", inspector.update)
		domFrame.classList.add("frame")
		if (j == frames)
			domFrame.classList.add("lastFrame")
		domActor.appendChild(domFrame)
		if (keyframes[j])
			for (let k = 0; k < keyframes[j].actions.length; k++) {
				if (keyframes[j].actions[k].target === actors[i] || keyframes[j].actions[k].id === actors[i])
					domFrame.classList.add("keyframe")
			}
	}
}

function renderFrame() {
	exports.nextFrame()
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
