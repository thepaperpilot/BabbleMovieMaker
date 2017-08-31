const {BrowserWindow, Menu, app, dialog, shell} = require('electron')
const settings = require('../settings')
const util = require('../util')

// Create menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open Project',
        accelerator: 'CommandOrControl+O',
        click () {
          util.selectProject()
        }
      },
      {
        label: 'Close Project',
        accelerator: 'CommandOrControl+W',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('close')
        }
      },
      {
        label: 'Save Project',
        accelerator: 'CommandOrControl+S',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('save')
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ],
  },
  {
    label: 'Project',
    submenu: [
      {
        label: 'Open Project Folder',
        accelerator: 'F10',
        click (item, focusedWindow) {
          shell.showItemInFolder(settings.settings.openProject)
        }
      }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Instructions',
        accelerator: 'CommandOrControl+H',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('toggleInstructions')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Github Page',
        click (item, focusedWindow) {
          shell.openExternal("https://github.com/thepaperpilot/BabbleMovieMaker")
        }
      },
      {
        label: 'Changelog',
        click (item, focusedWindow) {
          shell.openExternal("https://github.com/thepaperpilot/BabbleMovieMaker/releases")
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'About Babble Buds Movie Maker',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('toggleAbout')
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

exports.updateMenu = function() {
  let enabled = settings.settings.openProject !== ""
  menu.items[0].submenu.items[1].enabled = enabled
  menu.items[0].submenu.items[2].enabled = enabled
  for (let i = 1; i <= 2; i++) {
    for (let j = 0; j < menu.items[i].submenu.items.length; j++) {
      menu.items[i].submenu.items[j].enabled = enabled
    }
  }
  // Y u no work?
  // menu.items[2].enabled = enabled
  // menu.items[3].enabled = enabled
}
