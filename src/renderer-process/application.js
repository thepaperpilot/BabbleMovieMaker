// This file is required by the application.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// Imports
const electron = require('electron')
const remote = electron.remote
const modal = new (require('vanilla-modal').default)()
const JSONEditor = require('jsoneditor')
const status = require('./status.js')
const controller = require('./controller.js')
const path = require('path')
const fs = require('fs-extra')

let project
let editor
let playing

exports.init = function() {
	project = electron.remote.getGlobal('project').project

	// Window events
	window.onkeydown = keyDown
	//window.onkeyup = keyUp
	window.onbeforeunload = beforeUnload
	window.addEventListener("resize", controller.resize)

	// DOM listeners
	document.getElementById('greenscreen').addEventListener('click', controller.toggleGreenscreen)
	document.getElementById('settings').addEventListener('click', toggleSettings)
	document.getElementById('script').addEventListener('click', openEditor)
	document.getElementById('export').addEventListener('click', controller.export)
	document.getElementById('colorpicker').addEventListener('change', colorpickerChange)
	document.getElementById('fps').addEventListener('change', fpsChange)
	document.getElementById('puppetscale').addEventListener('change', puppetscaleChange)
	document.getElementById('numslots').addEventListener('change', numslotsChange)
	document.getElementById('resolutions').addEventListener('change', resolutionChange)
	document.getElementById('exportscript').addEventListener('click', exportScript)
	document.getElementById('cancelscript').addEventListener('click', toggleEditor)
	document.getElementById('savescript').addEventListener('click', saveScript)

	// Handle input events from popout
	electron.ipcRenderer.on('save', () => {
		project.saveProject()
	})
	electron.ipcRenderer.on('close', () => {
		project.closeProject()
	})
	electron.ipcRenderer.on('toggleInstructions', () => {
		toggleModal("#instructions")
	})
	electron.ipcRenderer.on('toggleAbout', () => {
		toggleModal("#about")
	})

	// Load settings values
	document.getElementById('colorpicker').value = project.project.greenScreen
	document.getElementById('fps').value = project.project.fps
	document.getElementById('puppetscale').value = project.project.puppetScale
	document.getElementById('numslots').value = project.project.numCharacters
	document.getElementById('resolutions').value = project.project.resolution

	// setup json editor
	let options = {
		templates: [
		//{
		//	text: 'Run',
		//	title: 'Run a sub script',
		//	field: 'RunTemplate',
		//	value: {
		//		'command': 'run',
		//		'script': {}
		//	}
		//},
		{
			text: 'Add',
			title: 'Add a puppet to the stage',
			field: 'AddTemplate',
			value: {
				'command': 'add',
				'name': '',
				'id': '',
				'position': '',
				'facingLeft': '',
				'emote': ''
			}
		},
		{
			text: 'Set',
			title: 'Changes a puppet into a new one',
			field: 'SetTemplate',
			value: {
				'command': 'set',
				'target': '',
				'name': ''
			}
		},
		{
			text: 'Remove',
			title: 'Removes a puppet from the stage',
			field: 'RemoveTemplate',
			value: {
				'command': 'remove',
				'target': ''
			}
		},
		{
			text: 'Delay',
			title: 'Adds a delay to the script',
			field: 'DelayTemplate',
			value: {
				'command': 'delay',
				'delay': ''
			}
		},
		{
			text: 'Move',
			title: 'Makes a puppet walk to a new location',
			field: 'MoveTemplate',
			value: {
				'command': 'move',
				'target': '',
				'position': ''
			}
		},
		{
			text: 'FacingLeft',
			title: 'Changes direction of a puppet',
			field: 'FacingLeftTemplate',
			value: {
				'command': 'facingLeft',
				'target': '',
				'facingLeft': ''
			}
		},
		{
			text: 'Babble',
			title: 'Changes whether a puppet is babbling',
			field: 'BabbleTemplate',
			value: {
				'command': 'babble',
				'target': '',
				'action': ''
			}
		},
		{
			text: 'Emote',
			title: 'Changes a puppet\'s emote',
			field: 'EmoteTemplate',
			value: {
				'command': 'emote',
				'target': '',
				'emote': ''
			}
		},
		{
			text: 'Jiggle',
			title: 'Causes a puppet to jiggle',
			field: 'JiggleTemplate',
			value: {
				'command': 'jiggle',
				'target': ''
			}
		}
		],
		schema: {
		  "$schema": "http://json-schema.org/draft-06/schema#",
		  "description": "A representation of a Babble Buds cutscene script",
		  "type": "array",
		  "items": {
		    "type": "object",
		    "properties": {
		      "command": {
		        "type": "string",
		        "enum": [
		          //"run",
		          "add",
		          "set",
		          "remove",
		          "delay",
		          "move",
		          "facingLeft",
		          "babble",
		          "emote",
		          "jiggle"
		        ]
		      }
		    },
		    "required": [
		      "command"
		    ],
		    "switch": [
		      {
		        "if": {
		          "properties": {
		            "command": "run"
		          }
		        },
		        "then": {
		          "properties": {
		            "script": {
		              "$ref": "#"
		            }
		          },
		          "required": [
		            "script"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "add"
		          }
		        },
		        "then": {
		          "properties": {
		            "name": {
		              "type": "string"
		            },
		            "id": {
		              "type": "string"
		            },
		            "position": {
		              "type": "number"
		            },
		            "facingLeft": {
		              "type": "boolean"
		            },
		            "emote": {
		              "type": "number"
		            }
		          },
		          "required": [
		            "name",
		            "id"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "set"
		          }
		        },
		        "then": {
		          "properties": {
		            "target": {
		              "type": "string"
		            },
		            "name": {
		              "type": "string"
		            }
		          },
		          "required": [
		            "target",
		            "name"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "remove"
		          }
		        },
		        "then": {
		          "properties": {
		            "target": {
		              "type": "string"
		            }
		          },
		          "required": [
		            "target"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "delay"
		          }
		        },
		        "then": {
		          "properties": {
		            "delay": {
		              "type": "number"
		            }
		          },
		          "required": [
		            "delay"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "move"
		          }
		        },
		        "then": {
		          "properties": {
		            "target": {
		              "type": "string"
		            },
		            "position": {
		              "type": "number"
		            }
		          },
		          "required": [
		            "target",
		            "position"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "facingLeft"
		          }
		        },
		        "then": {
		          "properties": {
		            "target": {
		              "type": "string"
		            },
		            "facingLeft": {
		              "type": "boolean",
		              "default": true
		            }
		          },
		          "required": [
		            "target"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "babble"
		          }
		        },
		        "then": {
		          "properties": {
		            "target": {
		              "type": "string"
		            },
		            "action": {
		              "type": "string",
		              "enum": [
		                "start",
		                "stop",
		                "toggle"
		              ],
		              "default": "toggle"
		            }
		          },
		          "required": [
		            "target"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "emote"
		          }
		        },
		        "then": {
		          "properties": {
		            "target": {
		              "type": "string"
		            },
		            "emote": {
		              "type": "number",
		              "default": 0
		            }
		          },
		          "required": [
		            "target"
		          ]
		        }
		      },
		      {
		        "if": {
		          "properties": {
		            "command": "jiggle"
		          }
		        },
		        "then": {
		          "properties": {
		            "target": {
		              "type": "string"
		            }
		          },
		          "required": [
		            "jiggle"
		          ]
		        }
		      }
		    ]
		  }
		},
		autocomplete: {
			getOptions: function () {
				return Object.keys(project.actors)
			}
		}
	}
	editor = new JSONEditor(document.getElementById('editorscript'), options)
}

function keyDown(e) {
	let key = e.keyCode ? e.keyCode : e.which

	if (e.target && (e.target.type === 'number' || e.target.type === 'text' || e.target.type === 'search' || e.target.type === 'select-one' || e.target.type === 'password'))
		return

	let handled = true
	if (key == 32) {
		if (playing) {
			clearInterval(playing)
			playing = 0
		} else playing = setInterval(playCutscene, 1000 / project.project.fps);
	} else if (key == 37) controller.prevFrame()
	else if (key == 39) controller.nextFrame()
	else handled = false

	if (handled) e.preventDefault()
}

function beforeUnload() {
	if (!project.checkChanges())
		return false
}

function toggleSettings() {
	if (document.getElementById('settings-panel').style.display == 'none') {
		document.getElementById('settings-panel').style.display = 'block'
		document.getElementById('timeline').style.display = 'none'

		document.getElementById('settings').classList.add('open-tab')
	} else {
		document.getElementById('settings-panel').style.display = 'none'
		document.getElementById('timeline').style.display = 'block'

		document.getElementById('settings').classList.remove('open-tab')
	}
}

function openEditor() {
	editor.set(project.scripts[0])
	toggleEditor()
}

function colorpickerChange(e) {
	project.project.greenScreen = e.target.value
	controller.toggleGreenscreen()
	controller.toggleGreenscreen()
}

function fpsChange(e) {
	project.project.fps = parseFloat(e.target.value)
	controller.resize()
}

function puppetscaleChange(e) {
	project.project.puppetScale = parseFloat(e.target.value)
	controller.resize()
}

function numslotsChange(e) {
	project.project.numCharacters = parseInt(e.target.value)
	controller.resize()
}

function resolutionChange(e) {
	project.project.resolution = e.target.value
	controller.resize()
}

function exportScript() {
	remote.dialog.showSaveDialog(remote.BrowserWindow.getFocusedWindow(), {
		title: 'Save script',
		defaultPath: remote.app.getPath('home'),
		filters: [
		{name: 'Text', extensions: ['txt']}
		]
	}, (file) => {
		if (file) fs.outputFile(file, JSON.stringify(editor.get()), null, 2)
	})
}

function saveScript() {
	project.scripts[0] = editor.get()
	toggleEditor()
}

function toggleModal(string) {
	if (modal.isOpen)
		modal.close()
	else
		modal.open(string)
}

function toggleEditor() {
	if (document.getElementById('editor').classList.contains('hidden')) {
		document.getElementById('editor').classList.remove('hidden')
	} else {
		document.getElementById('editor').classList.add('hidden')
	}
}

function playCutscene() {
	if (controller.nextFrame()) {
		clearInterval(playing)
		playing = 0
	}
}
