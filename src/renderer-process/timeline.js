// Imports
const project = require('./project')
const controller = require('./controller')
const actors = require('./actors')
const inspector = require('./inspector')

const babble = require('babble.js')

// Constants
const bufferFrames = 100	// How many frames to extend the timeline after the last action is completed
const scrollPadding = 50	// When current frame loses visibility, how far it places the currentframe from the opposite edge

// Vars
let psuedoCutscene
let keyframes
let currentFrame = null // used when resimulating

exports.frame = null
exports.frames = null
exports.keyframes = null
exports.bufferFrames = bufferFrames
exports.delayEnds = []

exports.init = function() {
	// Set up psuedo cutscene, used for running actions without delays or parse other actions
	psuedoCutscene = new babble.Cutscene(stage, null, project.actors)
	psuedoCutscene.parseNextAction = () => {}
	psuedoCutscene.actions.delay = (callback, action) => {
		if (action.parent) action.parent.delay = action.delay
		if (currentFrame !== null) {
			let endFrame = parseInt(currentFrame) + Math.ceil(action.delay * project.project.fps / 1000)
	    	if (endFrame > exports.frames) exports.frames = endFrame
		}
	}
}

exports.reset = function() {
	keyframes = exports.keyframes = {}
	exports.frames = exports.frame = 0
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
	exports.frames = Math.max(keys[keys.length - 1], exports.delayEnds[exports.delayEnds.length - 1])
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
				document.getElementById("actor " + actors.actors.indexOf(actor) + " frame " + currentFrame).classList.add("warning")
			}
			if (action.delay) {
				let frameIndex = currentFrame + Math.ceil(action.delay * project.project.fps / 1000)
				let id = "frame " + frameIndex
				if ('id' in action)
					id = "actor " + actors.actors.indexOf(action.id) + " " + id
				else if ('target' in action)
					id = "actor " + actors.actors.indexOf(action.target) + " " + id
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
		let node = document.body.getElementsByClassName("lastFrame")[0]
		while (node) {
			node.classList.remove("lastFrame")
			node = document.body.getElementsByClassName("lastFrame")[0]
		}
		let domFrames = document.getElementById("frames")
		for (let i = oldFrames + exports.bufferFrames; i < exports.frames + exports.bufferFrames; i++) {
			let domFrame = document.createElement("div")
			domFrame.id = "frame " + i
			domFrame.classList.add("frame")
			domFrame.frame = i
			domFrame.addEventListener("click", exports.gotoFrame)
			domFrames.appendChild(domFrame)
			if (exports.keyframes[i])
				domFrame.classList.add("keyframe")
			if (i == exports.frames)
				domFrame.classList.add("lastFrame")
		}
		for (let i = 0; i < actors.actors.length; i++) {
			for (let j = oldFrames + exports.bufferFrames; j < exports.frames + exports.bufferFrames; j++) {
				actors.addFrame(i, j)
			}
		}
		if (oldFrames + exports.bufferFrames > exports.frames) {
			document.getElementById("frame " + exports.frames).classList.add("lastFrame")
			for (let i = 0; i < actors.actors.length; i++) {
				document.getElementById("actor " + i + " frame " + exports.frames).classList.add("lastFrame")
			}
		}
	} else if (oldFrames > exports.frames) {
		let node = document.body.getElementsByClassName("lastFrame")[0]
		while (node) {
			node.classList.remove("lastFrame")
			node = document.body.getElementsByClassName("lastFrame")[0]
		}
		let domFrames = document.getElementById("frames")
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
	project.scripts = exports.generateScript()
	exports.gotoFrame(origFrame, false)
}

exports.resimulate = function() {
	exports.simulateFromFrame(0)
}

exports.generateScript = function() {
	if (!exports.keyframes) return null

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
		let customActions = []
		for (let j = 0; j < keyframe.actions.length; j++) {
			let action = JSON.parse(JSON.stringify(keyframe.actions[j]))
			delete action.error
			// TODO add custom actions to array
			// and continue
			delete action.wait
			script.push(action)
		}
		if (customActions.length > 0) {
			let action = {
				command: "run",
				script: [],
				wait: true
			}
			for (let j = 0; j < customActions.length; j++) {
				customActions[j].wait = true
				action.script.push(customActions[j])
			}
			script.push(action)
			script = action.script
		}
	}
	script[script.length - 1].wait = true
	return cutscene
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
