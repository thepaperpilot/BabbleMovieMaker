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
let psuedoCutscene
let inspectorTarget

var commandFields = {
	title: function(parent, field) {
		let titleElement = document.createElement("h4")
		titleElement.innerText = field.title
		titleElement.addEventListener("click", foldAction)
		
		parent.appendChild(titleElement)
	},
	text: function(parent, field, action, key) {
		let titleElement = document.createElement("p")
		titleElement.innerText = field.title
		
		let textbox = document.createElement("input")
		textbox.style.display = 'block'
		textbox.type = "text"
		textbox.action = action
		textbox.key = key
		textbox.value = action[key]
		textbox.addEventListener("change", editAction)
		
		parent.appendChild(titleElement)
		parent.appendChild(textbox)
	},
	number: function(parent, field, action, key) {
		let titleElement = document.createElement("p")
		titleElement.innerText = field.title
		
		let numberbox = document.createElement("input")
		numberbox.style.display = 'block'
		numberbox.type = "number"
		numberbox.action = action
		numberbox.key = key
		numberbox.value = action[key]
		numberbox.addEventListener("change", editAction)
		
		parent.appendChild(titleElement)
		parent.appendChild(numberbox)
	},
	slider: function(parent, field, action, key) {
		let titleElement = document.createElement("p")
		titleElement.innerText = field.title
		
		let box = document.createElement("div")
		box.style.display = "flex"

		let minElement = document.createElement("span")
		minElement.style.flex = "0 1 auto"
		minElement.style.margin = "5px"
		minElement.innerText = field.min

		let slider = document.createElement("input")
		slider.style.display = 'block'
		slider.style.flex = "1 1 auto"
		slider.type = "range"
		slider.action = action
		slider.key = key
		slider.min = field.min
		slider.max = field.max === "numCharacters" ? project.project.numCharacters + 1 : field.max
		slider.value = action[key]
		slider.addEventListener("change", editAction)

		let maxElement = document.createElement("span")
		maxElement.style.flex = "0 1 auto"
		maxElement.style.margin = "5px"
		maxElement.innerText = field.max === "numCharacters" ? project.project.numCharacters + 1 : field.max

		box.appendChild(minElement)
		box.appendChild(slider)
		box.appendChild(maxElement)
		
		parent.appendChild(titleElement)
		parent.appendChild(box)
	},
	checkbox: function(parent, field, action, key, index) {
		let checkbox = document.createElement("input")
		checkbox.id = action.command + " " + key + " " + index
		checkbox.type = "checkbox"
		checkbox.classList.add("checkbox")
		checkbox.action = action
		checkbox.key = key
		checkbox.checked = action[key]
		checkbox.addEventListener("change", checkAction)
		
		let label = document.createElement("label")
		label.classList.add("checkbox-label")
		label.setAttribute("for", action.command + " " + key + " " + index)
		label.innerText = field.title
		
		parent.appendChild(checkbox)
		parent.appendChild(label)
	},
	select: function(parent, field, action, key) {
		let titleElement = document.createElement("p")
		titleElement.innerText = field.title

		let select = document.createElement("select")
		select.action = action
		select.key = key
		select.addEventListener("change", editAction)

		for (let i = 0; i < field.options.length; i++) {
			let option = document.createElement("option")
			option.text = field.options[i]
			select.appendChild(option)
		}

		select.value = action[key]

		parent.appendChild(titleElement)
		parent.appendChild(select)
	},
	emote: function(parent, field, action, key) {
		let titleElement = document.createElement("p")
		titleElement.innerText = field.title

		let select = document.createElement("select")
		select.action = action
		select.key = key
		select.addEventListener("change", emoteAction)

		// populate 
		let puppet = action.name ? project.actors[action.name] : stage.getPuppet(action.target).container.puppet
		let emotes = Object.keys(puppet.emotes)
		for (let i = 0; i < emotes.length; i++) {
			let emote = puppet.emotes[emotes[i]]
			if (!emote.enabled) continue
			let option = document.createElement("option")
			option.text = emote.name
			select.appendChild(option)
		}

		select.emotes = puppet.emotes
		select.value = puppet.emotes[action[key]].name

		parent.appendChild(titleElement)
		parent.appendChild(select)
	}
}

exports.init = function() {
	project = remote.getGlobal('project').project
	application.init()
	stage = new babble.Stage('screen', project.project, project.assets, project.assetsPath, start, status, false)
	stage.registerPuppetListener("click", updateInspector)
	stage.renderer.view.classList.add("container")
	stage.renderer.view.style.padding = 0

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
	gotoFrame(0)

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
	gotoFrame(frame == 0 ? frames : frame - 1)
}

// Returns true if cutscene finished
exports.nextFrame = function() {
	if (frame >= frames + bufferFrames + 1) return true
	if (frame == frames) {
		gotoFrame(0)
		return
	}

	if (keyframes[++frame])
		for (let i = 0; i < keyframes[frame].actions.length; i++) {
			let action = keyframes[frame].actions[i]
			psuedoCutscene.actions[action.command].call(psuedoCutscene, () => {}, action)
		}

	stage.update(1000 / project.project.fps)

	updateTimeline()

	return frame == frames
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
	keyframes = {}
	let frame = frames = 0
	let cutscene = new babble.Cutscene(stage, project.scripts, project.actors, () => { frames = frame })
	let actors = []
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
        if (action.target && !actors.includes(action.target))
        	actors.push(action.target)

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
            this.actions[action.command].call(this, newCallback, action)
        } else {
            // Perform this action and immediately continue
            this.actions[action.command].call(this, this.empty, action)
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
		domFrame.addEventListener("click", gotoFrame)
		domFrames.appendChild(domFrame)
		if (keyframes[i])
			domFrame.classList.add("keyframe")
		if (i == frames)
			domFrame.classList.add("lastFrame")
	}

	let domActors = document.getElementById("actors")
	let domTimeline = document.getElementById("time-scroll")
	for (let i = 0; i < actors.length; i++) {
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
			domFrame.addEventListener("click", updateInspector)
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

	gotoFrame(0)
}

function gotoFrame(frameIndex) {
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
		let puppet = stage.addPuppet(stage.createPuppet(project.actors[puppets[i].name]), puppets[i].id)
		Object.assign(puppet, puppets[i])
		updatePuppet(puppet)
	}

	console.log("Simulating " + (frameIndex - nearestKeyframe) + " frames (" + (frameIndex - nearestKeyframe) * 1000 / project.project.fps + " ms)")
	for (let i = 0; i < frameIndex - nearestKeyframe; i++)
		stage.update(1000 / project.project.fps)

	updateTimeline()
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
	updateInspector()

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

function updateInspector(actor) {
	let newFrame = actor && 'frame' in actor.target ? actor.target.frame : null
	let id = actor ? 'actor' in actor.target ? actor.target.actor : actor.target.id : null

	if (newFrame !== null) gotoFrame(newFrame)
	inspectorTarget = id
	document.getElementById("inspectorTarget").innerText = id ? id : "Frame " + (frame + 1)
	document.getElementById("framecount").innerText = (frame + 1) + " / " + (frames + 1)

	let actions = document.getElementById("actions")
	actions.innerHTML = ''

	if (keyframes[frame])
		for (let i = 0; i < keyframes[frame].actions.length; i++) {
			let action = keyframes[frame].actions[i]
			if (id === null && (action.id || action.target) || id !== null && !(action.id === id || action.target === id)) continue
			if (project.project.commands[action.command]) {
				let command  = project.project.commands[action.command]
				let actionElement = document.createElement("div")
				actionElement.classList.add("action")
				commandFields.title(actionElement, {title: command.title})
				let fields = Object.keys(command.fields)
				for (let j = 0; j < fields.length; j++) {
					let fieldGenerator = commandFields[command.fields[fields[j]].type]
					if (fieldGenerator) 
						fieldGenerator(actionElement, command.fields[fields[j]], action, fields[j], i)
				}
				actions.appendChild(actionElement)
			}
		}
}

function foldAction(e) {
	let classList = e.target.parentNode.classList

	if (classList.contains("folded"))
		classList.remove("folded")
	else classList.add("folded")
}

function editAction(e) {
	e.target.action[e.target.key] = e.target.value
	simulateFromFrame()
}

function checkAction(e) {
	e.target.action[e.target.key] = e.target.checked
	simulateFromFrame()
}

function emoteAction(e) {
	e.target.action[e.target.key] = e.target.emotes.findIndex((emote) => emote.name === e.target.value)
	simulateFromFrame()
}

function simulateFromFrame() {
	let origFrame = frame
	let currentFrame = origFrame - 1
	let actor = inspectorTarget
	if (currentFrame === -1) stage.clearPuppets()
	else gotoFrame(currentFrame)

	let keys = Object.keys(keyframes)
	for (let i = 0; i < keys.length; i++) {
		if (keys[i] < origFrame) continue

		stage.update((keys[i] - currentFrame) * 1000 / project.project.fps)
		currentFrame = keys[i]
		let keyframe = keyframes[keys[i]]

		for (let i = 0; i < keyframe.actions.length; i++) {
			let action = keyframe.actions[i]
			psuedoCutscene.actions[action.command].call(psuedoCutscene, () => {}, action)
		}

		let puppets = []
		for (let i = 0; i < stage.puppets.length; i++) {
			let puppet = {}
			for (let j = 0; j < puppetKeys.length; j++) {
				puppet[puppetKeys[j]] = stage.puppets[i][puppetKeys[j]]
			}
			puppets.push(puppet)
		}
		keyframe.puppets = puppets
	}

	updateInspector({target: {id: actor, frame: origFrame}})
}
