// Imports
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
	domActor.innerText = exports.actors[i]
	domActors.appendChild(domActor)

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
		domFrame.actor = exports.actors[i]
		domFrame.frame = j
		domFrame.addEventListener("click", inspector.update)
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

function newActor() {
	let name = "actor"
	let i = 1
	while (exports.actors.includes(name))
		name = "actor" + (i++)
	exports.actors.push(name)

	exports.addActor(exports.actors.length - 1)
}

function removeActor(e) {
	console.log(e.target.actor)
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