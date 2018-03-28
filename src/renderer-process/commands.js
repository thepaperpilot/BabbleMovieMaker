// Imports
const project = require('./project')
const inspector = require('./inspector')
const timeline = require('./timeline')
const utility = require('./utility')

// Constants
const FIELD_TYPES = ["text", "puppet", "number", "slider", "checkbox", "select", "emote"]
const RESERVED_NAMES = ["command", "wait", "delay", "error"]

// Vars
let dropdowns = []
let name
let command

// Dom Elements
let domSelectedCommands = document.getElementsByClassName("selected command")
let domCommands = document.getElementById("commandsList")
let domEditor = document.getElementById("editor")
let domRequiresActor = document.getElementById("requiresActor")
let domForceWait = document.getElementById("forceWait")
let domFields = document.getElementById("fieldsList")
let domCommandName = document.getElementById("commandName")
let domCommandDescription = document.getElementById("commandDescription")
let addCommandButton = document.getElementById("addCommand")
let deleteCommandButton = document.getElementById("deleteCommand")
let domFieldSearch = document.getElementById("fieldSearch")
let domAddFieldList = document.getElementById("addFieldsList")
let addFieldButton = document.getElementById("addFieldButton")
let domAddFieldPanel = document.getElementById("addFieldPanel")

exports.init = function() {
	window.addEventListener("resize", () => {toggleDropdowns()})
	document.addEventListener("click", toggleDropdowns)
	document.addEventListener("click", toggleFieldPanel)
	domEditor.addEventListener("wheel", () => {toggleDropdowns()})

	addCommandButton.addEventListener("click", createCommand)
	deleteCommandButton.addEventListener("click", deleteCommand)
	domCommandName.addEventListener("change", changeCommandName)
	domCommandDescription.addEventListener("change", changeCommandDescription)
	domRequiresActor.addEventListener("change", changeRequiresActor)
	domForceWait.addEventListener("change", changeForcesWait)
	domFieldSearch.addEventListener("input", searchFields)

	domAddFieldList.innerHTML = ''
	for (let i = 0; i < FIELD_TYPES.length; i++) {
		let fieldElement = document.createElement("div")
		fieldElement.innerText = FIELD_TYPES[i]
		fieldElement.fieldType = FIELD_TYPES[i]
		fieldElement.addEventListener("click", addNewField)
		domAddFieldList.appendChild(fieldElement)
	}

	let commands = Object.keys(project.project.commands)
	for (let i = 0; i < commands.length; i++) {
		addCommand(commands[i], false)
	}
	openCommand({target: domCommands.children[2]}) // Yay for hardcoding, I'm sure I won't ever forget why this is a 2
}

function createCommand() {
	let command = {
		"title": "New Command",
		"forceWait": false,
		"fields": {}
	}
	let name = "newCommand"
	let i = 1
	while (name in project.project.commands)
		name = "newCommand" + (i++)

	project.project.commands[name] = command
	addCommand(name, command)
}

function addCommand(name, open = true) {
	let domCommand = document.createElement("div")

	domCommand.name = name
	domCommand.innerText = name
	domCommand.classList.add("command")
	domCommand.addEventListener("click", openCommand)

	domCommands.appendChild(domCommand)

	inspector.updateAddActionPanel(inspector.target !== -1)
	if (open) openCommand({target: domCommand})
}

function openCommand(e) {
	while (domSelectedCommands[0])
		domSelectedCommands[0].classList.remove("selected")
	e.target.classList.add("selected")

	name = e.target.name
	command = project.project.commands[name]
	let disabled = name in project.defaults.commands

	domCommandName.value = name
	domCommandName.disabled = disabled
	domCommandDescription.value = command.title
	domCommandDescription.disabled = disabled
	domForceWait.checked = command.forceWait
	domForceWait.disabled = disabled
	deleteCommandButton.disabled = disabled

	domFields.innerHTML = ''
	dropdowns = []
	let fields = Object.keys(command.fields)
	let requiresActor = false
	for (let i = 0; i < fields.length; i++) {
		let field = command.fields[fields[i]]
		if (field.type == "id") {
			requiresActor = true
			continue
		}
		addField(fields[i])
	}

	domRequiresActor.checked = requiresActor
	domRequiresActor.disabled = disabled
}

function deleteCommand() {
	let index = Object.keys(project.project.commands).indexOf(name) + 2
	delete project.project.commands[name]
	domCommands.removeChild(domCommands.children[index])

	forAllActions((action) => {
		if (action.command == name) {
			inspector.removeAction(action)
			return true
		}
	})

	openCommand({target: domCommands.children[domCommands.children.length > index ? index : index - 1]})
	inspector.update()
	inspector.updateAddActionPanel(inspector.target !== -1)
}

function changeRequiresActor(e) {
	if (e.target.checked) {
		command.fields.target = { "type": "id" }
	} else {
		delete command.fields.target
	}

	forAllActions((action) => {
		if (action.command == name) {
			inspector.removeAction(action)
			return true
		}
	})

	inspector.update()
	inspector.updateAddActionPanel(inspector.target !== -1)
}

function changeForcesWait(e) {
	command.forceWait = e.target.checked
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

function changeCommandName(e) {
	if (e.target.value !== "" && !project.project.commands[e.target.value]) {
		let index = Object.keys(project.project.commands).indexOf(name) + 2
		project.project.commands[e.target.value] = command
		delete project.project.commands[name]
		domCommands.children[index].innerText = domCommands.children[index].name = e.target.value

		forAllActions((action) => { if (action.command == name) action.command = e.target.value })

		name = e.target.value
		inspector.updateAddActionPanel(inspector.target !== -1)
	} else {
		e.target.value = name
	}
}

function changeCommandDescription(e) {
	command.title = e.target.value
	inspector.updateAddActionPanel(inspector.target !== -1)
}

function addNewField(e) {
	let field = {
		"title": "New Field",
		"type": e.target.fieldType
	}
	switch (e.target.fieldType) {
		case "text": case "puppet": case "select":
			field.default = ""
			field.textarea = false
			break
		case "slider":
			field.min = 1
			field.max = 10
			field.default = 1
			break
		case "number":
			field.default = 0
			break
		case "checkbox":
			field.default = false
			break
	}
	let name = "newField"
	let i = 1
	while (name in command.fields)
		name = "newField" + (i++)

	command.fields[name] = field
	addField(name)

	inspector.update()
}

function addField(fieldName, addToDom = true) {
	let field = command.fields[fieldName]
	let disabled = name in project.defaults.commands && fieldName in project.defaults.commands[name].fields

	let domField = document.createElement("div")
	domField.classList.add("field")
	domField.fieldName = fieldName

	let domFieldName = document.createElement("input")
	domFieldName.type = "text"
	domFieldName.value = fieldName
	domFieldName.disabled = disabled
	domFieldName.addEventListener("change", changeFieldName)
	domField.appendChild(domFieldName)

	let checkbox = document.createElement("input")
	checkbox.id = "command settings " + domFields.children.length
	checkbox.type = "checkbox"
	checkbox.classList.add("dropdown")
	let label = document.createElement("label")
	label.setAttribute('for', "command settings " + domFields.children.length)
	let button = document.createElement("button")
	button.classList.add("dropdown-image")
	button.title = "Action Settings"
	button.style.backgroundImage = 'url("./assets/icons/settings.png")'
	label.appendChild(button)
	domField.appendChild(checkbox)
	domField.appendChild(label)

	let dropdown = document.createElement("ul")
	dropdown.classList.add("dropdown-content")
	dropdown.classList.add("collapsed")
	if (!disabled) {
		let remove = document.createElement("li")
		remove.innerText = "Remove Field"
		remove.addEventListener("click", removeField)
		dropdown.appendChild(remove)
	}
	dropdowns.push({checkbox, dropdown, button})

	let domFieldTitleTitle = document.createElement("p")
	domFieldTitleTitle.innerText = "Field Description"
	let domFieldTitle = document.createElement("input")
	domFieldTitle.type = "text"
	domFieldTitle.value = field.title
	domFieldTitle.disabled = disabled
	domFieldTitle.addEventListener("change", changeFieldTitle)
	domField.appendChild(domFieldTitleTitle)
	domField.appendChild(domFieldTitle)

	let domFieldTypeTitle = document.createElement("p")
	domFieldTypeTitle.innerText = "Field Type"
	let domFieldType = document.createElement("select")
	domFieldType.addEventListener("change", changeFieldType)
	for (let i = 0; i < FIELD_TYPES.length; i++) {
		let option = document.createElement("option")
		option.text = FIELD_TYPES[i]
		domFieldType.appendChild(option)
	}
	domFieldType.value = field.type
	domFieldType.disabled = disabled
	domField.appendChild(domFieldTypeTitle)
	domField.appendChild(domFieldType)

	let domFieldDefaultTitle
	let domFieldDefault
	switch (field.type) {
		case "text": 
			domFieldDefaultTitle = document.createElement("p")
			domFieldDefaultTitle.innerText = "Default Value"
			domFieldDefault = document.createElement("input")
			domFieldDefault.type = "text"
			domFieldDefault.key = "default"
			domFieldDefault.value = field.default
			domFieldDefault.addEventListener("change", editText)
			domFieldDefault.disabled = disabled
			let domFieldTextarea = document.createElement("input")
			domFieldTextarea.id = "checkbox label " + domFields.children.length
			domFieldTextarea.type = "checkbox"
			domFieldTextarea.classList.add("checkbox")
			domFieldTextarea.key = "textarea"
			domFieldTextarea.value = field.textarea
			domFieldTextarea.addEventListener("change", editCheck)
			domFieldTextarea.disabled = disabled
			let domFieldTextareaLabel = document.createElement("label")
			domFieldTextareaLabel.classList.add("checkbox-label")
			domFieldTextareaLabel.setAttribute("for", "checkbox label " + domFields.children.length)
			domFieldTextareaLabel.innerText = "Text Area"
			domField.appendChild(domFieldDefaultTitle)
			domField.appendChild(domFieldDefault)
			domField.appendChild(domFieldTextarea)
			domField.appendChild(domFieldTextareaLabel)
			break
		case "slider":
			let domFieldMinTitle = document.createElement("p")
			domFieldMinTitle.innerText = "Min Value"
			let domFieldMin = document.createElement("input")
			domFieldMin.type = "number"
			domFieldMin.key = "min"
			domFieldMin.value = field.min
			domFieldMin.addEventListener("change", editNumber)
			domFieldMin.disabled = disabled
			let domFieldMaxTitle = document.createElement("p")
			domFieldMaxTitle.innerText = "Max Value"
			let domFieldMax = document.createElement("input")
			domFieldMax.type = "number"
			domFieldMax.key = "min"
			domFieldMax.value = field.max
			domFieldMax.addEventListener("change", editNumber)
			domFieldMax.disabled = disabled
			domField.appendChild(domFieldMinTitle)
			domField.appendChild(domFieldMin)
			domField.appendChild(domFieldMaxTitle)
			domField.appendChild(domFieldMax)

			// boo I can't have another case without a break
			// I was hoping to just not break, and seamlessly 
			// add all the "number" fields to "slider"
			domFieldDefaultTitle = document.createElement("p")
			domFieldDefaultTitle.innerText = "Default Value"
			domFieldDefault = document.createElement("input")
			domFieldDefault.type = "number"
			domFieldDefault.key = "default"
			domFieldDefault.value = field.default
			domFieldDefault.addEventListener("change", editNumber)
			domFieldDefault.disabled = disabled
			domField.appendChild(domFieldDefaultTitle)
			domField.appendChild(domFieldDefault)
			break
		case "number":
			domFieldDefaultTitle = document.createElement("p")
			domFieldDefaultTitle.innerText = "Default Value"
			domFieldDefault = document.createElement("input")
			domFieldDefault.type = "number"
			domFieldDefault.key = "default"
			domFieldDefault.value = field.default
			domFieldDefault.addEventListener("change", editNumber)
			domFieldDefault.disabled = disabled
			domField.appendChild(domFieldDefaultTitle)
			domField.appendChild(domFieldDefault)
			break
		case "checkbox":
			domFieldDefault = document.createElement("input")
			domFieldDefault.id = "checkbox label " + domFields.children.length
			domFieldDefault.type = "checkbox"
			domFieldDefault.classList.add("checkbox")
			domFieldDefault.key = "default"
			domFieldDefault.checked = field.default
			domFieldDefault.addEventListener("change", editCheck)
			domFieldDefault.disabled = disabled
			let domFieldDefaultLabel = document.createElement("label")
			domFieldDefaultLabel.classList.add("checkbox-label")
			domFieldDefaultLabel.setAttribute("for", "checkbox label " + domFields.children.length)
			domFieldDefaultLabel.innerText = "Default Value"
			domField.appendChild(domFieldDefault)
			domField.appendChild(domFieldDefaultLabel)
			break
		case "select":
			let domFieldAddOptionTitle = document.createElement("p")
			domFieldAddOptionTitle.innerText = "Options"
			let domFieldAddOption = document.createElement("input")
			domFieldAddOption.type = "text"
			domFieldAddOption.placeholder = "Add Option..."
			domFieldAddOption.addEventListener("change", addOption)
			domFieldAddOption.disabled = disabled
			let domFieldOptions = document.createElement("div")
			domFieldOptions.classList.add("optionsList")
			if (!field.options) field.options = []
			for (let i = 0; i < field.options.length; i++) {
				let domFieldOption = document.createElement("div")
				domFieldOption.classList.add("option")
				domFieldOption.innerText = field.options[i]
				let domFieldRemoveOption = document.createElement("button")
				domFieldRemoveOption.innerText = "X"
				domFieldRemoveOption.disabled = disabled
				domFieldRemoveOption.addEventListener("click", removeOption)
				domFieldOption.appendChild(domFieldRemoveOption)
				domFieldOptions.appendChild(domFieldOption)
			}
			domFieldAddOption.optionsList = domFieldOptions
			domFieldDefaultTitle = document.createElement("p")
			domFieldDefaultTitle.innerText = "Default Value"
			domFieldDefault = document.createElement("input")
			domFieldDefault.type = "text"
			domFieldDefault.key = "default"
			domFieldDefault.value = field.default
			domFieldDefault.addEventListener("change", editText)
			domFieldDefault.disabled = disabled
			domField.appendChild(domFieldAddOptionTitle)
			domField.appendChild(domFieldAddOption)
			domField.appendChild(domFieldOptions)
			domField.appendChild(domFieldDefaultTitle)
			domField.appendChild(domFieldDefault)
			break
	}

	if (addToDom) {
		domFields.appendChild(domField)
	}
	domFields.appendChild(dropdown)

	return domField
}

function changeFieldName(e) {
	if (e.target.value === "" || RESERVED_NAMES.indexOf(e.target.value) > -1 || Object.keys(command.fields).indexOf(e.target.value) > -1) {
		e.target.value = e.target.parentNode.fieldName
		return
	}
	let oldKey = e.target.parentNode.fieldName
	let newKey = e.target.value
	e.target.parentNode.fieldName = newKey

	command.fields[newKey] = command.fields[oldKey]
	delete command.fields[oldKey]

	forAllActions((action) => {
		if (oldKey in action) {
			action[newKey] = action[oldKey]
			delete action[oldKey]
		}
	})

	inspector.update()
}

function changeFieldTitle(e) {
	command.fields[e.target.parentNode.fieldName].title = e.target.value
	inspector.update()
}

function changeFieldType(e) {
	command.fields[e.target.parentNode.fieldName].type = e.target.value
	domFields.replaceChild(addField(e.target.parentNode.fieldName, false), e.target.parentNode)
	inspector.update()
}

function editText(e) {
	command.fields[e.target.parentNode.fieldName][e.target.key] = e.target.value
	inspector.update()
}

function editNumber(e) {
	command.fields[e.target.parentNode.fieldName][e.target.key] = parseInt(e.target.value)
	inspector.update()
}

function editCheck(e) {
	command.fields[e.target.parentNode.fieldName][e.target.key] = e.target.checked
	inspector.update()
}

function addOption(e) {
	let field = command.fields[e.target.parentNode.fieldName]
	field.options.push(e.target.value)
	let domFieldOption = document.createElement("div")
	domFieldOption.classList.add("option")
	domFieldOption.innerText = e.target.value
	let domFieldRemoveOption = document.createElement("button")
	domFieldRemoveOption.innerText = "X"
	domFieldRemoveOption.addEventListener("click", removeOption)
	domFieldOption.appendChild(domFieldRemoveOption)
	e.target.optionsList.appendChild(domFieldOption)	
	e.target.value = ""

	inspector.update()
}

function removeOption(e) {
	let field = command.fields[e.target.parentNode.parentNode.parentNode.fieldName]
	field.options.splice(field.options.indexOf(e.target.innerText), 1)
	e.target.parentNode.parentNode.removeChild(e.target.parentNode)

	inspector.update()
}

function removeField(e) {
	let dropdown = dropdowns.filter(dropdown => dropdown.dropdown == e.target.parentNode)[0]
	let fieldName = dropdown.checkbox.parentNode.fieldName

	domFields.removeChild(dropdown.checkbox.parentNode)
	domFields.removeChild(dropdown.dropdown)
	dropdowns.splice(dropdowns.indexOf(dropdown), 1)

	forAllActions((action) => { delete action[fieldName] })

	delete command.fields[fieldName]

	inspector.update()
}

function toggleFieldPanel(e) {
	let classes = domAddFieldPanel.classList
	if (!!e && utility.checkParent(e.target, addFieldButton)) {
		if (classes.contains("collapsed")) {
			classes.remove("collapsed")
			domFieldSearch.focus()
		} else classes.add("collapsed")
	} else classes.add("collapsed")
}

function searchFields(e) {
    if (e.target.value === '') {
        for (let i = 0; i < domAddFieldList.children.length; i++)
            domAddFieldList.children[i].style.display = 'block'
    } else {
        for (let i = 0; i < domAddFieldList.children.length; i++)
            domAddFieldList.children[i].style.display = 'none'
        let fields = Array.from(domAddFieldList.children).filter(el => el.textContent.toLowerCase().includes(e.target.value.toLowerCase()))
        for (let i = 0; i < fields.length; i++) {
            fields[i].style.display = 'block'
        }
	}
}

// Callback is passed the action and the frame the action is on
// Callback should return true if the action was deleted
function forAllActions(callback) {
	let keys = Object.keys(timeline.keyframes)
	for (let i = 0; i < keys.length; i++) {
		let keyframe = timeline.keyframes[keys[i]]
		for (let j = 0; keyframe && j < keyframe.actions.length; j++) {
			let action = keyframe.actions[j]
			
			if (callback(action, keys[i]))
				j--
		}
	}
}
