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

exports.frame = null
exports.frames = null
exports.keyframes = null
exports.bufferFrames = bufferFrames

exports.init = function() {
	// Set up psuedo cutscene, used for running actions without delays or parse other actions
	psuedoCutscene = new babble.Cutscene(stage, null, project.actors)
	psuedoCutscene.parseNextAction = () => {}
	psuedoCutscene.actions.delay = () => {}
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

	if (nearestKeyframe == exports.frame) stage.update(0)
	else for (let i = 0; i < exports.frame - nearestKeyframe; i++)
		stage.update(1000 / project.project.fps)

	if (update) updateTimeline(!!frameIndex.target)
}

exports.simulateFromFrame = function() {
	let origFrame = exports.frame
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
		for (let j = 0; j < actors.actors.length; j++)
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
					document.getElementById("actor " + actors.actors.indexOf(actor) + " frame " + currentFrame).classList.add("warning")
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

	exports.gotoFrame(origFrame, false)
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
	inspector.update(reset || inspector.target === null ? null : {target: {id: inspector.target}})

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
