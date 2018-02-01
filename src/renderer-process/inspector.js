const remote = require('electron').remote
const controller = require('./controller')

// Vars
let project
let stage
let target

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
		slider.addEventListener("input", editNumber)

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
		let puppet = action.name ? project.actors[action.name] : stage.getPuppet(action.target) ? stage.getPuppet(action.target).container.puppet : null
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

exports.init = function(mainStage) {
	project = remote.getGlobal('project').project
	window.stage = stage = mainStage
	document.addEventListener("click", toggleActionPanel)
	addActionButton = document.getElementById("addActionButton")
	addActionPanel = document.getElementById("addActionPanel")
	document.getElementById("actionSearch").addEventListener("input", searchCommands)
}

exports.update = function(actor) {
	let newFrame = actor && 'frame' in actor.target ? actor.target.frame : null
	let id = actor ? 'actor' in actor.target ? actor.target.actor : actor.target.id : null

	if (newFrame !== null) controller.gotoFrame(newFrame)
	// if target is set XOR id is set
	// this means we are transitioning from being on a frame to an actor, or vice versa
	if ((target === null) != (id === null)) {
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
	target = id
	let frame = controller.getFrame()
	let frames = controller.getFrames()
	let keyframe = controller.getKeyframe(frame)
	document.getElementById("inspectorTarget").innerText = id ? id : "Frame " + (frame + 1)
	document.getElementById("framecount").innerText = (frame + 1) + " / " + (frames + 1)

	let actions = document.getElementById("actions")
	actions.innerHTML = ''

	if (keyframe)
		for (let i = 0; i < keyframe.actions.length; i++) {
			let action = keyframe.actions[i]
			if (id === null && (action.id || action.target) || id !== null && !(action.id === id || action.target === id)) continue
			if (project.project.commands[action.command]) {
				let command  = project.project.commands[action.command]
				let actionElement = document.createElement("div")
				actionElement.classList.add("action")
				addTitle(actionElement, {title: command.title})
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
				actions.appendChild(actionElement)
			}
		}
}

exports.getTarget = function() { return target }

function addTitle(parent, field) {
	let titleElement = document.createElement("h4")
	titleElement.innerText = field.title
	titleElement.addEventListener("click", foldAction)
	
	parent.appendChild(titleElement)
}

function foldAction(e) {
	let classList = e.target.parentNode.classList

	if (classList.contains("folded"))
		classList.remove("folded")
	else classList.add("folded")
}

function editText(e) {
	e.target.action[e.target.key] = e.target.value
	controller.simulateFromFrame()
}

function editNumber(e) {
	e.target.action[e.target.key] = parseInt(e.target.value)
	controller.simulateFromFrame()
}

function editCheck(e) {
	e.target.action[e.target.key] = e.target.checked
	controller.simulateFromFrame()
}

function editEmote(e) {
	e.target.action[e.target.key] = e.target.emotes.findIndex((emote) => emote.name === e.target.value)
	controller.simulateFromFrame()
}

function toggleActionPanel(e) {
	if (!e || !checkParent(e.target, addActionPanel)) {
		let classes = document.getElementById("addActionPanel").classList
		if (!!e && checkParent(e.target, addActionButton)) {
			if (classes.contains("collapsed")) {
				classes.remove("collapsed")
				document.getElementById("actionSearch").focus()
			} else classes.add("collapsed")
		} else classes.add("collapsed")
	}
}

// https://siongui.github.io/2015/02/13/hide-div-when-clicked-outside-it/
function checkParent(t, elm) {
  while(t.parentNode) {
    if( t == elm ) {return true;}
    t = t.parentNode;
  }
  return false;
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

function addCommand(e) {
	controller.addCommand(e.target.command)
	toggleActionPanel()
}
