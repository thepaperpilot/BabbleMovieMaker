const {Menu, shell} = require('electron')
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
    // cut, copy, and paste don't work for some reason
    // I got around this by just checking for the keys
    // inside of the editor's keyDown function
    // Untested on macOS
    label: 'Edit',
    submenu: [
      {
        label: 'Cut',
        accelerator: 'CommandOrControl+X',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('cut')
        }
      },
      {
        label: 'Copy',
        accelerator: 'CommandOrControl+C',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('copy')
        }
      },
      {
        label: 'Paste',
        accelerator: 'CommandOrControl+V',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('paste')
        }
      },
      {
        label: 'Delete',
        accelerator: 'Delete',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('delete')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Undo',
        accelerator: 'CommandOrControl+Z',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('undo')
        }
      },
      {
        label: 'Redo',
        accelerator: 'CommandOrControl+Y',
        click (item, focusedWindow) {
          focusedWindow.webContents.send('redo')
        }
      }
    ]
  },
  {
    label: 'Project',
    submenu: [
      {
        label: 'Open Project Folder',
        accelerator: 'F10',
        click () {
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
        click () {
          shell.openExternal("https://github.com/thepaperpilot/BabbleMovieMaker")
        }
      },
      {
        label: 'Changelog',
        click () {
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
  for (let i = 1; i <= 3; i++) {
    for (let j = 0; j < menu.items[i].submenu.items.length; j++) {
      menu.items[i].submenu.items[j].enabled = enabled
    }
  }
  // Y u no work?
  // menu.items[2].enabled = enabled
  // menu.items[3].enabled = enabled
}
