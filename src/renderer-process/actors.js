// Imports
const controller = require('./controller')
const timeline = require('./timeline')
const inspector = require('./inspector')
const utility = require('./utility')

// Vars
let dropdowns = []

exports.actors = []

exports.init = function() {	
	document.getElementById('addActor').addEventListener('click', newActor)
	document.getElementById("timeline").addEventListener("wheel", () => {toggleDropdowns()})
	window.addEventListener("resize", () => {toggleDropdowns()})
	document.addEventListener("click", toggleDropdowns)
}

exports.addActor = function(i) {
	let domActors = document.getElementById("actors")
	let domTimeline = document.getElementById("time-scroll")
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
		let domFrame = document.createElement("div")
		domFrame.id = "actor " + i + " frame " + j
		domFrame.actor = i
		domFrame.frame = j
		domFrame.addEventListener("click", selectActor)
		domFrame.classList.add("frame")
		if (j == timeline.frames)
			domFrame.classList.add("lastFrame")
		domActor.appendChild(domFrame)
		if (timeline.keyframes[j])
			for (let k = 0; k < timeline.keyframes[j].actions.length; k++) {
				if (timeline.keyframes[j].actions[k].target === exports.actors[i] || 
					timeline.keyframes[j].actions[k].id === exports.actors[i])
					domFrame.classList.add("keyframe")
			}
	}
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
			document.getElementById("inspectorTarget").innerText = e.target.value
		
		let puppet = controller.stage.getPuppet(exports.actors[e.target.actor])
		if (puppet) puppet.id = puppet.container.id = e.target.value
		
		exports.actors[e.target.actor] = e.target.value
		timeline.simulateFromFrame()
	}
}

function removeActor(e) {
	let actor = e.target.parentNode.actor
	let id = exports.actors[actor]

	controller.stage.removePuppet(id)
	controller.stage.update(0)
	exports.actors[actor] = null

	if (inspector.target == actor) inspector.update(-1)
	document.getElementById("actors").removeChild(document.getElementById("actor " + actor))
	document.getElementById("time-scroll").removeChild(document.getElementById("timeline actor " + actor))

	let keyframes = Object.keys(timeline.keyframes)
	for (let i = 0; i < keyframes.length; i++) {
		let keyframe = timeline.keyframes[keyframes[i]]
		for (let j = 0; j < keyframe.actions.length; j++) {
			if (keyframe.actions[j].target == id || keyframe.actions[j].id == id) {
				keyframe.actions.splice(j, 1)
				if (keyframe.actions.length === 0) {
					delete timeline.keyframes[keyframes[i]]
					document.getElementById("frame " + keyframes[i]).classList.remove("keyframe")
				}
				j--
			}
		}
	}

	timeline.simulateFromFrame()
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
