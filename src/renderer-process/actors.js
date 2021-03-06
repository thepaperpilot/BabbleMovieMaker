// Imports
const project = require('./project')
const timeline = require('./timeline')
const inspector = require('./inspector')
const utility = require('./utility')

// Vars
let dropdowns = []

// DOM Elements
let domActors = document.getElementById("actors")
let domTimeline = document.getElementById("time-scroll")
let domInspector = document.getElementById("inspectorTarget")

exports.actors = []

exports.init = function() {	
	document.getElementById('addActor').addEventListener('click', newActor)
	document.getElementById("timeline").addEventListener("wheel", () => {toggleDropdowns()})
	window.addEventListener("resize", () => {toggleDropdowns()})
	document.addEventListener("click", toggleDropdowns)
}

exports.addActor = function(i) {
	let domActor = document.createElement("div")

	domActor.id = "actor " + i
	domActor.classList.add("actor")
	domActors.appendChild(domActor)
	
	let name = document.createElement("input")
	name.type = "text"
	name.value = exports.actors[i]
	name.actor = i
	name.addEventListener("mouseleave", () => {toggleDropdowns()})
	name.addEventListener("change", renameActor)
	name.addEventListener("keyup", renameActor)

	let checkbox = document.createElement("input")
	checkbox.id = "settings " + i
	checkbox.type = "checkbox"
	checkbox.classList.add("dropdown")
	let label = document.createElement("label")
	label.setAttribute('for', "settings " + i)
	let button = document.createElement("button")
	button.classList.add("dropdown-image")
	button.title = "Actor Settings"
	button.style.backgroundImage = 'url("./assets/icons/settings.png")'
	label.appendChild(button)

	let dropdown = document.createElement("ul")
	dropdown.classList.add("dropdown-content")
	dropdown.classList.add("collapsed")
	dropdown.actor = i
	let remove = document.createElement("li")
	remove.innerText = "Remove Actor"
	remove.addEventListener("click", removeActor)
	dropdown.appendChild(remove)
	dropdowns.push({checkbox, dropdown, button})

	domActor.appendChild(name)
	domActor.appendChild(checkbox)
	domActor.appendChild(label)
	domActor.appendChild(dropdown)

	domActor = document.createElement("div")
	domActor.id = "timeline actor " + i
	domActor.classList.add("actor")
	domTimeline.appendChild(domActor)
	for (let j = 0; j < timeline.frames + timeline.bufferFrames; j++) {
		exports.addFrame(i, j)
	}
}

exports.addFrame = function(actor, frame) {
	let domFrame = document.createElement("div")
	domFrame.id = "actor " + actor + " frame " + frame
	domFrame.actor = actor
	domFrame.frame = frame
	domFrame.addEventListener("click", selectActor)
	domFrame.classList.add("frame")
	if (frame == timeline.frames)
		domFrame.classList.add("lastFrame")
	document.getElementById("timeline actor " + actor).appendChild(domFrame)
	if (timeline.keyframes[frame])
		for (let i = 0; i < timeline.keyframes[frame].actions.length; i++) {
			if (timeline.keyframes[frame].actions[i].target === exports.actors[actor] || 
				timeline.keyframes[frame].actions[i].id === exports.actors[actor])
				domFrame.classList.add("keyframe")
		}
}

exports.reset = function() {
	domActors.innerHTML = ''
	exports.actors = []
	inspector.target = -1
}

function selectActor(e) {
	timeline.gotoFrame(e.target.frame)
	inspector.update(e.target.actor)
}

function newActor() {
	let name = "actor"
	let i = 1
	while (exports.actors.includes(name))
		name = "actor" + (i++)
	exports.actors.push(name)

	exports.addActor(exports.actors.length - 1)
	document.getElementById("actor " + (exports.actors.length - 1) + " frame " + timeline.frame).click()
}

function renameActor(e) {
	e.preventDefault()
	if (e.type === "change" || e.keyCode === 13) {
		e.target.blur()
		
		let keyframes = Object.keys(timeline.keyframes)
		for (let i = 0; i < keyframes.length; i++) {
			let keyframe = timeline.keyframes[keyframes[i]]
			for (let j = 0; j < keyframe.actions.length; j++) {
				let action = keyframe.actions[j]
				if (action.target === exports.actors[e.target.actor])
					action.target = e.target.value
				else if (action.id === exports.actors[e.target.actor])
					action.id = e.target.value
			}
		}
		
		if (inspector.target === e.target.actor)
			domInspector.innerText = e.target.value
		
		let puppet = stage.getPuppet(exports.actors[e.target.actor])
		if (puppet) puppet.id = puppet.container.id = e.target.value
		
		exports.actors[e.target.actor] = e.target.value
		timeline.resimulate()
	}
}

function removeActor(e) {
	let actor = e.target.parentNode.actor
	let id = exports.actors[actor]

	stage.removePuppet(id)
	stage.update(0)
	exports.actors[actor] = null

	if (inspector.target == actor) inspector.update(-1)
	domActors.removeChild(document.getElementById("actor " + actor))
	domTimeline.removeChild(document.getElementById("timeline actor " + actor))

	let keyframes = Object.keys(timeline.keyframes)
	for (let i = 0; i < keyframes.length; i++) {
		let keyframe = timeline.keyframes[keyframes[i]]
		for (let j = 0; j < keyframe.actions.length; j++) {
			if (keyframe.actions[j].target == id || keyframe.actions[j].id == id) {
				keyframe.actions.splice(j, 1)
				j--
			}
		}
	}

	timeline.resimulate()
}

function toggleDropdowns(e) {
	for (let i = 0; i < dropdowns.length; i++) {
		if (!e) {
			dropdowns[i].checkbox.checked = false
			dropdowns[i].dropdown.classList.add("collapsed")
			continue
		}

		if (!utility.checkParent(e.target, dropdowns[i].checkbox)) {
			dropdowns[i].checkbox.checked = false
			dropdowns[i].dropdown.classList.add("collapsed")
		} else if (dropdowns[i].checkbox.checked) {
			dropdowns[i].dropdown.classList.remove("collapsed")
			let rect = dropdowns[i].button.getBoundingClientRect()
			dropdowns[i].dropdown.style.top = rect.bottom + "px"
			dropdowns[i].dropdown.style.left = rect.right + "px"
		} else dropdowns[i].dropdown.classList.add("collapsed")
	}
}
