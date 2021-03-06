// Imports
const project = require('./project')
const controller = require('./controller')
const actors = require('./actors')
const inspector = require('./inspector')

const babble = require('babble.js')
const electron = require('electron')
const path = require('path')

// Constants
const bufferFrames = 100	// How many frames to extend the timeline after the last action is completed
const scrollPadding = 50	// When current frame loses visibility, how far it places the currentframe from the opposite edge

// Vars
let psuedoCutscene
let keyframes
let currentFrame = null // used when resimulating
let history = []
let reverseHistory = []
let oldKeyframes

// DOM Elements
let timescroll = document.getElementById("time-scroll")
let domFrames = document.getElementById("frames")

exports.frame = null
exports.frames = null
exports.keyframes = null
exports.bufferFrames = bufferFrames
exports.delayEnds = []

exports.init = function() {
	// Set up psuedo cutscene, used for running actions without delays or parse other actions
	psuedoCutscene = new babble.Cutscene(stage, null, project.puppets)
	psuedoCutscene.parseNextAction = () => {}
	psuedoCutscene.actions.delay = (callback, action) => {
		if (action.parent) action.parent.delay = action.delay
		if (currentFrame !== null) {
			let endFrame = parseInt(currentFrame) + Math.ceil(action.delay * project.project.fps / 1000)
	    	if (endFrame > exports.frames) exports.frames = endFrame
		}
	}

	// Receive messages from application menu
	electron.ipcRenderer.on('cut', cut)
	electron.ipcRenderer.on('copy', copy)
	electron.ipcRenderer.on('paste', paste)
	electron.ipcRenderer.on('delete', deleteKey)
	electron.ipcRenderer.on('undo', undo)
	electron.ipcRenderer.on('redo', redo)
}

// Fix for accelerators not working for some key combos
exports.keyDown = function(e) {
	let key = e.keyCode ? e.keyCode : e.which

	if (key == 67 && e.ctrlKey) copy();
	else if (key == 86 && e.ctrlKey) paste();
	else if (key == 88 && e.ctrlKey) cut();
}

exports.reset = function(hard = false) {
	keyframes = exports.keyframes = {}
	exports.frames = exports.frame = null

	if (hard) {
		domFrames.innerHTML = ""
		while (timescroll.children[1])
			timescroll.removeChild(timescroll.children[1])
		actors.reset()
		exports.frame = 0
	}
}

exports.prevFrame = function() {
	exports.gotoFrame(exports.frame === 0 ? exports.frames : exports.frame - 1)
}

// Returns true if cutscene finished
exports.nextFrame = function() {
	if (exports.frame >= exports.frames + bufferFrames + 1) return true
	if (exports.frame == exports.frames) {
		exports.gotoFrame(0)
		return
	}

	stage.update(1000 / project.project.fps)

	if (keyframes[++exports.frame])
		for (let i = 0; i < keyframes[exports.frame].actions.length; i++) {
			let action = keyframes[exports.frame].actions[i]
			try {
				psuedoCutscene.actions[action.command].call(psuedoCutscene, () => {}, action)
			} catch (e) {}
		}

	stage.update(0)

	updateTimeline()

	return exports.frame == exports.frames
}

exports.gotoFrame = function(frameIndex, update = true) {
	let nearestKeyframe = exports.frame = frameIndex.target ? frameIndex.target.frame : frameIndex
	while (!keyframes[nearestKeyframe] && nearestKeyframe > 0)
		nearestKeyframe--
	let puppets = keyframes[nearestKeyframe] ? JSON.parse(JSON.stringify(keyframes[nearestKeyframe].puppets)) : []
	for (let i = 0; i < stage.puppets.length; i++) {
		let puppet = stage.puppets[i]
		let remove = true
		for (let j = 0; j < puppets.length; j++) {
			if (puppet.id === puppets[j].id) {
				if (puppet.name !== puppets[j].name)
					puppet = stage.setPuppet(puppet.id, stage.createPuppet(project.puppets[puppets[j].name]))
				Object.assign(puppet, puppets[j])
				updatePuppet(puppet)
				remove = false
				puppets.splice(j--, 1)
			}
		}
		if (remove) stage.removePuppet(puppet.id)
	}

	for (let i = 0; i < puppets.length; i++) {
		let puppet = stage.addPuppet(project.puppets[puppets[i].name], puppets[i].id)
		Object.assign(puppet, puppets[i])
		updatePuppet(puppet)
	}

	if (nearestKeyframe == exports.frame) stage.update(0)
	else for (let i = 0; i < exports.frame - nearestKeyframe; i++)
		stage.update(1000 / project.project.fps)

	if (update) updateTimeline(!!frameIndex.target)
}

exports.simulateFromFrame = function(frame) {
	let origFrame = frame == null ? exports.frame : frame // jshint ignore:line
	currentFrame = origFrame - 1
	if (currentFrame === -1) stage.clearPuppets()
	else exports.gotoFrame(currentFrame, false)

	let keys = Object.keys(keyframes)
	let oldFrames = exports.frames
	exports.delayEnds.sort()
	if (keys.length > 0) {
		if (exports.delayEnds.length > 0) {
			exports.frames = Math.max(keys[keys.length - 1], exports.delayEnds[exports.delayEnds.length - 1])
		} else {
			exports.frames = parseInt(keys[keys.length - 1])
		}
	} else exports.frames = 0
	for (let i = 0; i < keys.length; i++) {
		if (parseInt(keys[i]) < origFrame) continue

		if (keys[i] == currentFrame) stage.update(0)
		else for (let j = 0; j < keys[i] - currentFrame; j++)
			stage.update(1000 / project.project.fps)
		currentFrame = parseInt(keys[i])
		let keyframe = keyframes[keys[i]]

		document.getElementById("frame " + currentFrame).classList.remove("warning")
		for (let j = 0; j < actors.actors.length; j++) {
			if (actors.actors[j] !== null)
				document.getElementById("actor " + j + " frame " + currentFrame).classList.remove("warning")
		}

		for (let j = 0; j < keyframe.actions.length; j++) {
			let action = keyframe.actions[j]
			if (!(action.command in psuedoCutscene.actions)) continue
			action.error = null
			if (action.delay) {
				let frameIndex = currentFrame + Math.ceil(action.delay * project.project.fps / 1000)
				let id = "frame " + frameIndex
				if ('id' in action)
					id = "actor " + actors.actors.indexOf(action.id) + " " + id
				else if ('target' in action)
					id = "actor " + actors.actors.indexOf(action.target) + " " + id
				let frameElement = document.getElementById(id)

				frameElement.finishedActions.splice(frameElement.finishedActions.indexOf(action), 1)

				if (frameElement.finishedActions.length === 0) {
					frameElement.classList.remove("endDelay")
					exports.delayEnds.splice(exports.delayEnds.indexOf(currentFrame), 1)
				}
				action.delay = null
			}
			try {
				psuedoCutscene.actions[action.command].call(psuedoCutscene, () => {}, action)
			} catch (e) {
				action.error = e.message
				document.getElementById("frame " + currentFrame).classList.add("warning")
				let actor = "id" in action ? action.id : 'target' in action ? action.target : null
				if (actor !== null) 
					document.getElementById("actor " + actors.actors.indexOf(actor) + " frame " + currentFrame).classList.add("warning")
			}
			if (action.delay) {
				let frameIndex = currentFrame + Math.ceil(action.delay * project.project.fps / 1000)
				let id = "frame " + frameIndex
				if ('id' in action)
					id = "actor " + actors.actors.indexOf(action.id) + " " + id
				else if ('target' in action)
					id = "actor " + actors.actors.indexOf(action.target) + " " + id
				if (frameIndex > oldFrames + exports.bufferFrames) {
					addFrames(oldFrames,  frameIndex)
					oldFrames = frameIndex
				}
				let frameElement = document.getElementById(id)

				if (!frameElement.finishedActions) {
					frameElement.finishedActions = []
					exports.delayEnds.push(frameIndex)
				}
				frameElement.finishedActions.push(action)

				frameElement.classList.add("endDelay")
			}
		}

		let puppets = []
		for (let j = 0; j < stage.puppets.length; j++) {
			let puppet = {}
			for (let k = 0; k < controller.puppetKeys.length; k++) {
				puppet[controller.puppetKeys[k]] = stage.puppets[j][controller.puppetKeys[k]]
			}
			puppets.push(puppet)
		}
		keyframe.puppets = puppets
	}

	if (oldFrames < exports.frames) {
		addFrames(oldFrames, exports.frames)
	} else if (oldFrames > exports.frames) {
		let node = document.body.getElementsByClassName("lastFrame")[0]
		while (node) {
			node.classList.remove("lastFrame")
			node = document.body.getElementsByClassName("lastFrame")[0]
		}
		while (domFrames.children.length > exports.frames + exports.bufferFrames) {
			let index = domFrames.children.length - 1
			domFrames.removeChild(document.getElementById("frame " + index))
			for (let i = 0; i < actors.actors.length; i++) 
				document.getElementById("timeline actor " + i).removeChild(document.getElementById("actor " + i + " frame " + index))
		}
		document.getElementById("frame " + exports.frames).classList.add("lastFrame")
		for (let i = 0; i < actors.actors.length; i++)
			document.getElementById("actor " + i + " frame " + exports.frames).classList.add("lastFrame")
		if (exports.frame > exports.frames) {
			exports.gotoFrame(exports.frames)
			origFrame = exports.frames
		}
	}

	currentFrame = null
	project.scripts[controller.script] = exports.generateScript()
	exports.gotoFrame(origFrame, false)
}

exports.resimulate = function() {
	exports.simulateFromFrame(0)
	inspector.update()
}

exports.generateScript = function(preserveHistory = false) {
	if (!exports.keyframes) return null

	if (!preserveHistory) recordChange()
	let keys = Object.keys(exports.keyframes)
	let cutscene = []
	let script = cutscene
	for (let i = 0; i < keys.length; i++) {
		if (i > 0) {
			script.push({
				command: "delay",
				delay: (keys[i] - keys[i - 1]) * (1000 / project.project.fps),
				wait: true
			})
		}
		let keyframe = exports.keyframes[keys[i]]
		for (let j = 0; j < keyframe.actions.length; j++) {
			let action = JSON.parse(JSON.stringify(keyframe.actions[j]))
			delete action.error
			delete action.delay
			if (Object.keys(project.defaults.commands).indexOf(action.command) == -1 && project.project.commands[action.command].forceWait)
				action.wait = true
			else delete action.wait
			script.push(action)
		}
	}
	if(script.length > 0) script[script.length - 1].wait = true
	return cutscene
}

exports.clearHistory = function() {
	oldKeyframes = JSON.stringify(exports.keyframes)
	history = reverseHistory = []
}

function updatePuppet(puppet) {
	// Position puppet
    puppet.container.scale.x = puppet.container.scale.y = (project.project.puppetScale || 1) 
    puppet.container.scale.x *= puppet.facingLeft ? -1 : 1
    puppet.container.y = stage.bounds.height / stage.puppetStage.scale.y
    puppet.container.x = puppet.position <= 0 ? - Math.abs(puppet.container.width) / 2 :										// Starting left of screen
                         puppet.position >= project.project.numCharacters + 1 ? 
                         project.project.numCharacters * stage.slotWidth + Math.abs(puppet.container.width) / 2 :	// Starting right of screen
                         (puppet.position - 0.5) * stage.slotWidth													// Starting on screen

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

function updateTimeline(reset) {
	// Move current frame indicator
	let node = document.body.getElementsByClassName("currentframe")[0]
	while (node) {
		node.classList.remove("currentframe")
		node = document.body.getElementsByClassName("currentframe")[0]
	}
	let currentFrame = document.getElementById("frame " + exports.frame)
	currentFrame.classList.add("currentframe")

	// Update inspector
	inspector.update(reset ? -1 : null)

	// Calculate where the current frame is on the timeline
	requestAnimationFrame(() => {
		let timelineRect = timescroll.getBoundingClientRect()
	    let rect = currentFrame.getBoundingClientRect()
	    let width = timelineRect.right - timelineRect.left - scrollPadding

	    // Scroll timeline to currentFrame if necessary
	    if (rect.left < timelineRect.left) {
	    	// We need to scroll left
	    	timescroll.scrollLeft -= timelineRect.left - rect.left + width
	    } else if (rect.right > timescroll.clientWidth + timelineRect.left) {
	    	// We need to scroll right
	    	timescroll.scrollLeft += rect.right - (timescroll.clientWidth + timelineRect.left) + width
	    }
	})
}

function addFrames(oldFrames, newFrames) {
	let node = document.body.getElementsByClassName("lastFrame")[0]
	while (node) {
		node.classList.remove("lastFrame")
		node = document.body.getElementsByClassName("lastFrame")[0]
	}
	for (let i = oldFrames + exports.bufferFrames; i < newFrames + exports.bufferFrames; i++) {
		let domFrame = document.createElement("div")
		domFrame.id = "frame " + i
		domFrame.classList.add("frame")
		domFrame.frame = i
		domFrame.addEventListener("click", exports.gotoFrame)
		domFrames.appendChild(domFrame)
		if (exports.keyframes[i] && exports.keyframes[i].actions.filter(action => !("id" in action || 'target' in action)).length > 0)
			domFrame.classList.add("keyframe")
		if (i == newFrames)
			domFrame.classList.add("lastFrame")
	}
	for (let i = 0; i < actors.actors.length; i++) {
		for (let j = oldFrames + exports.bufferFrames; j < newFrames + exports.bufferFrames; j++) {
			actors.addFrame(i, j)
		}
	}
	if (oldFrames + exports.bufferFrames > newFrames) {
		document.getElementById("frame " + newFrames).classList.add("lastFrame")
		for (let i = 0; i < actors.actors.length; i++) {
			document.getElementById("actor " + i + " frame " + newFrames).classList.add("lastFrame")
		}
	}
}

function cut() {
	if (exports.frame in keyframes) {
		let actions = keyframes[exports.frame].actions.filter(action => 
			actors.actors.indexOf("id" in action ? action.id : 'target' in action ? action.target : null) == inspector.target
		)
		electron.clipboard.writeText(JSON.stringify(actions))
		actions.forEach(action => inspector.removeAction(action))
	}
}

function copy() {
	if (exports.frame in keyframes) {
		electron.clipboard.writeText(JSON.stringify(keyframes[exports.frame].actions.filter(action => 
			actors.actors.indexOf("id" in action ? action.id : 'target' in action ? action.target : null) == inspector.target
		)))
	}
}

function paste() {
	let actions
	try {
		actions = JSON.parse(electron.clipboard.readText())

		for (let action in actions) {
	        let actor = "id" in actions[action] ? actions[action].id : 'target' in actions[action] ? actions[action].target : null
	        if (!keyframes[exports.frame]) {
	        	keyframes[exports.frame] = { actions: [] }
				if (actor === null) document.getElementById("frame " + exports.frame).classList.add("keyframe")
	        }
	        if ((actors.actors.indexOf(actor) === -1) != (inspector.target === -1)) continue
			if (actor !== null) {
				actions[action]["id" in actions[action] ? "id" : "target"] = actors.actors[inspector.target]
				document.getElementById("actor " + inspector.target + " frame " + exports.frame).classList.add("keyframe")
			}
	        keyframes[exports.frame].actions.push(actions[action])
		}
	} catch (e) { console.error(e); return }

	exports.simulateFromFrame()
	inspector.update()
}

function deleteKey() {
	if (exports.frame in keyframes) {
		keyframes[exports.frame].actions.filter(action => 
			actors.actors.indexOf("id" in action ? action.id : 'target' in action ? action.target : null) == inspector.target
		).forEach(action => inspector.removeAction(action))
	}
}

function recordChange() {
	reverseHistory = []
	let step = JSON.stringify(keyframes)
	history.push(step)
	updateTitle(step)
}

function undo() {
	if (history.length === 0) return
	reverseHistory.push(history.pop())
	let step = history.length === 0 ? oldKeyframes : history[history.length - 1]
	exports.keyframes = keyframes = JSON.parse(step)
	readScript()
	updateTitle(step)
}

function redo() {
	if (reverseHistory.length === 0) return
	let step = reverseHistory.pop()
	history.push(step)
	exports.keyframes = keyframes = JSON.parse(step)
	readScript()
	updateTitle(step)
}

function readScript() {
	project.scripts[controller.script] = exports.generateScript(true)
	let frame = exports.frame
	let target = inspector.target
	controller.readScript()
	exports.gotoFrame(Math.min(frame, exports.frames))
	inspector.update(target)
}

function updateTitle(step) {
	if (step === oldKeyframes) {
		document.title = "Babble Movie Maker | " + project.getProjectName()
	} else {
		document.title = "Babble Movie Maker | " + project.getProjectName() + "(*)"
	}
}
