const {app, dialog, BrowserWindow} = require('electron')

const path = require('path')
const fs = require('fs-extra')

// This should totally be possible using remote, but I keep getting an error
//  and this is how I solved it
exports.selectBabble = function() {
    const browserWindow = BrowserWindow.getFocusedWindow()
    dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
        title: 'Select Babble Buds Project',
        defaultPath: path.join(app.getPath('home'), 'projects'),
        filters: [
            {name: 'Babble Buds Project File', extensions: ['babble']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: [
            'openFile'
        ] 
    }, (filepaths) => {
        if (filepaths) {
            browserWindow.webContents.send('set babble', filepaths[0])
        }
    })
}

exports.selectProject = function() {
    const browserWindow = BrowserWindow.getFocusedWindow()
    dialog.showOpenDialog(browserWindow, {
        title: 'Open Project',
        defaultPath: path.join(app.getPath('home'), 'projects'),
        filters: [
            {name: 'Babble Movie Maker Project File', extensions: ['babblemm']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: [
            'openFile'
        ] 
    }, (filepaths) => {
        if (filepaths) {
            browserWindow.webContents.send('set project', filepaths[0])
        }
    })
}

exports.newProject = function(babble) {
    // Check folder is empty, otherwise stop and alert user
    fs.ensureDirSync(dest, err => {
        console.log(err)
    })
    let dest = `${babble.substr(0, babble.lastIndexOf('.'))}.babblemm`
    if (fs.existsSync(dest)) {
        dialog.showErrorBox('Could not create project', 'There\'s already a Babble Movie Maker project associated with that Babble Buds project.')
        return false
    }

    // Create Project
    fs.writeJsonSync(dest, {
        babble: path.join('..', path.basename(babble))
    })

    // Open new project
    exports.openProject(`${babble.substr(0, babble.lastIndexOf('.'))}.babblemm`)
}

exports.openProject = function(project) {
    console.log(project)
    BrowserWindow.getFocusedWindow().webContents.send('set project', project)
}

exports.slugify = function(string) {
    return string.replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[-\s]+/g, '-')
}
