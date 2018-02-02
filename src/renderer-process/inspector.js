//Imports
const project = require('./project')
const timeline = require('./timeline')
const actors = require('./actors')
const utility = require('./utility')

// Vars
let dropdowns = []

// Used for clicking add command menu
let addActionPanel
let addActionButton

var commandFields = {
	text: function(parent, field, action, key) {
		let titleElement = document.createElement("p")
		titleElement.innerText = field.title
		
		let textbox = document.createElement("input")
		textbox.style.display = 'block'
		textbox.type = "text"
		textbox.action = action
		textbox.key = key
		textbox.value = action[key]
		textbox.addEventListener("change", editText)
		
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
		numberbox.addEventListener("change", editNumber)
		
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
		slider.addEventListener("input", editSlider)

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
		checkbox.addEventListener("change", editCheck)
		
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
		select.addEventListener("change", editText)

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
		select.addEventListener("change", editEmote)

		// populate 
		let puppet = action.name ? project.actors[action.name] : 
			stage.getPuppet(action.target) ? 
			stage.getPuppet(action.target).container.puppet : null
		if (puppet !== null) {
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
		}

		parent.appendChild(titleElement)
		parent.appendChild(select)
	}
}

exports.target = null

exports.init = function() {
	window.addEventListener("resize", () => {toggleDropdowns()})
	document.addEventListener("click", toggleActionPanel)
	document.addEventListener("click", toggleDropdowns)
	addActionButton = document.getElementById("addActionButton")
	addActionPanel = document.getElementById("addActionPanel")
	document.getElementById("actions").addEventListener("wheel", () => {toggleDropdowns()})
	document.getElementById("actionSearch").addEventListener("input", searchCommands)
}

exports.update = function(actor) {
	let newFrame = actor && 'frame' in actor.target ? actor.target.frame : null
	let id = actor ? 'actor' in actor.target ? actor.target.actor : actor.target.id : null

	if (newFrame !== null) timeline.gotoFrame(newFrame)
	// if target is set XOR id is set
	// this means we are transitioning from being on a frame to an actor, or vice versa
	if ((exports.target === null) != (id === null)) {
		let actions = document.getElementById("actionsList")
		actions.innerHTML = ''
		let needsId = (id !== null)
		let commands = Object.keys(project.project.commands)
		for (let i = 0; i < commands.length; i++) {
			let action = project.project.commands[commands[i]]
			if (needsId == ('id' in action.fields || 'target' in action.fields)) {
				let actionElement = document.createElement("div")
				actionElement.innerText = action.title
				actionElement.command = commands[i]
				actionElement.addEventListener("click", addCommand)
				actions.appendChild(actionElement)
			}
		}
	}
	exports.target = id
	let frame = timeline.frame
	let frames = timeline.frames
	let keyframe = timeline.keyframes[frame]
	document.getElementById("inspectorTarget").innerText = id ? id : "Frame " + (frame + 1)
	document.getElementById("framecount").innerText = (frame + 1) + " / " + (frames + 1)

	// Remove actor's currentFrame indicator, but not the frame's currentFrame indicator
	let node = document.body.getElementsByClassName("currentframe")[1]
	while (node) {
		node.classList.remove("currentframe")
		node = document.body.getElementsByClassName("currentframe")[1]
	}
	if (id) document.getElementById("actor " + actors.actors.indexOf(id) + " frame " + frame).classList.add("currentframe")

	let actions = document.getElementById("actions")
	actions.innerHTML = ''
	dropdowns = []

	if (keyframe)
		for (let i = 0; i < keyframe.actions.length; i++) {
			let action = keyframe.actions[i]
			if (id === null && (action.id || action.target) || id !== null && !(action.id === id || action.target === id)) continue
			if (project.project.commands[action.command]) {
				let command  = project.project.commands[action.command]
				let actionElement = document.createElement("div")
				actions.appendChild(actionElement)
				actionElement.classList.add("action")
				addTitle(actionElement, action, i)
				let fields = Object.keys(command.fields)
				for (let j = 0; j < fields.length; j++) {
					let fieldGenerator = commandFields[command.fields[fields[j]].type]
					if (fieldGenerator) 
						fieldGenerator(actionElement, command.fields[fields[j]], action, fields[j], i)
				}
				if (action.error) {
					let error = document.createElement("div")
					error.classList.add("error")
					error.innerText = action.error
					actionElement.appendChild(error)
				}
			}
		}
}

function addCommand(e) {
	let command = e.target.command
	let keyframe = timeline.keyframes[timeline.frame]

	let action = {
		command: command
	}
	let fields = Object.keys(project.project.commands[command].fields)
	for (let i = 0; i < fields.length; i++) {
		let field = project.project.commands[command].fields[fields[i]]
		action[fields[i]] = fields[i] === "id" || fields[i] === "target" ? exports.target : field.default
	}
	if (!keyframe) {
		keyframe = timeline.keyframes[timeline.frame] = { actions: [] }
		document.getElementById("frame " + timeline.frame).classList.add("keyframe")
		let actor = "id" in action ? action.id : 'target' in action ? action.target : null
		if (actor !== null)
			document.getElementById("actor " + actors.actors.indexOf(actor) + " frame " + timeline.frame).classList.add("keyframe")
	}
    keyframe.actions.push(action)

    timeline.simulateFromFrame()
    exports.update({target: {frame: timeline.frame, id: exports.target}})
}

function removeCommand(e) {
	let action = e.target.parentNode.action
	let keyframe = timeline.keyframes[timeline.frame]

	keyframe.actions.splice(keyframe.actions.indexOf(action), 1)
	let actor = "id" in action ? action.id : 'target' in action ? action.target : null
	if (actor !== null) {
		let hasKeyframe = false
		for (let i = 0; i < keyframe.actions.length; i++) {
			let action = keyframe.actions[i]
			let compareActor = "id" in action ? action.id : 'target' in action ? action.target : null
			if (actor == compareActor) {
				hasKeyframe = true
			}
		}
		if (!hasKeyframe) document.getElementById("actor " + actors.actors.indexOf(actor) + " frame " + timeline.frame).classList.remove("keyframe")
	}
	if (keyframe.actions.length === 0) {
		delete timeline.keyframes[timeline.frame]
		document.getElementById("frame " + timeline.frame).classList.remove("keyframe")
	}
	
	timeline.simulateFromFrame()
    exports.update({target: {frame: timeline.frame, id: exports.target}})
}

function addTitle(parent, action, i) {
	let titleElement = document.createElement("h4")
	titleElement.innerText = project.project.commands[action.command].title
	titleElement.style.cursor = "pointer"
	titleElement.addEventListener("click", foldAction)

	let checkbox = document.createElement("input")
	checkbox.id = "action settings " + i
	checkbox.type = "checkbox"
	checkbox.classList.add("dropdown")
	let label = document.createElement("label")
	label.setAttribute('for', "action settings " + i)
	let button = document.createElement("button")
	button.classList.add("dropdown-image")
	button.title = "Action Settings"
	button.style.backgroundImage = 'url("./assets/icons/settings.png")'
	label.appendChild(button)

	let dropdown = document.createElement("ul")
	dropdown.classList.add("dropdown-content")
	dropdown.classList.add("collapsed")
	dropdown.action = action
	let remove = document.createElement("li")
	remove.innerText = "Remove Action"
	remove.addEventListener("click", removeCommand)
	dropdown.appendChild(remove)
	dropdowns.push({checkbox, dropdown, button})
	
	parent.appendChild(titleElement)
	parent.appendChild(checkbox)
	parent.appendChild(label)
	// Get out of the action overflow, but stay in actionsList so we get removed automatically
	parent.parentNode.appendChild(dropdown)
}

function foldAction(e) {
	let classList = e.target.parentNode.classList

	if (classList.contains("folded"))
		classList.remove("folded")
	else classList.add("folded")
}

function editText(e) {
	e.target.action[e.target.key] = e.target.value
	timeline.simulateFromFrame()
	exports.update({target: {id: exports.target}})
}

function editNumber(e) {
	e.target.action[e.target.key] = parseInt(e.target.value)
	timeline.simulateFromFrame()
	exports.update({target: {id: exports.target}})
}

function editSlider(e) {
	e.target.action[e.target.key] = parseInt(e.target.value)
	timeline.simulateFromFrame()
}

function editCheck(e) {
	e.target.action[e.target.key] = e.target.checked
	timeline.simulateFromFrame()
	exports.update({target: {id: exports.target}})
}

function editEmote(e) {
	e.target.action[e.target.key] = e.target.emotes.findIndex((emote) => emote.name === e.target.value)
	timeline.simulateFromFrame()
	exports.update({target: {id: exports.target}})
}

function toggleActionPanel(e) {
	let classes = document.getElementById("addActionPanel").classList
	if (!!e && utility.checkParent(e.target, addActionButton)) {
		if (classes.contains("collapsed")) {
			classes.remove("collapsed")
			document.getElementById("actionSearch").focus()
		} else classes.add("collapsed")
	} else classes.add("collapsed")
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

function updateDropdownPositions() {
	let content = document.body.querySelector('.dropdown-content:not(.collapsed)')
	if (content) {
		let dropdown = dropdowns.filter(dd => dd.dropdown == content)[0]
		let rect = dropdown.button.getBoundingClientRect()
		content.style.top = rect.bottom + "px"
		content.style.left = rect.right + "px"
	}
}

function searchCommands(e) {
	let actions = document.getElementById('actionsList')
    if (e.target.value === '') {
        for (let i = 0; i < actions.children.length; i++)
            actions.children[i].style.display = 'block'
    } else {
        for (let i = 0; i < actions.children.length; i++)
            actions.children[i].style.display = 'none'
        let commands = Array.from(actions.children).filter(el => el.textContent.toLowerCase().includes(e.target.value.toLowerCase()))
        for (let i = 0; i < commands.length; i++) {
            commands[i].style.display = 'block'
        }
	}
}
