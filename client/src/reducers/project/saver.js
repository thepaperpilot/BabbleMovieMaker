const util = require('./../util')

// Note: This state is the whole state, not just the project's state
// This is so we can access the timeline's keyframes
export default state => {
    const script = []
    const keyframes = state.timeline.present.keyframes.actions
    const keys = Object.keys(keyframes)

    keys.forEach((frame, i) => {
        if (i > 0) {
            script.push({
                command: 'delay',
                delay: (keys[i] - keys[i - 1]) * (1000 / state.project.settings.fps),
                wait: true
            })
        }
        script.push(...keyframes[frame].map(action => {
            action = JSON.parse(JSON.stringify(action))
            delete action.error
            delete action.delay
            action.wait = state.project.settings.commands
                .find(c => c.command === action.command).forceWait

            return action
        }))
    })
    if(script.length > 0) script[script.length - 1].wait = true

    const scripts = state.project.scripts.slice()
    const scriptIndex = scripts.findIndex(s => s.name === state.project.script)
    scripts.splice(scriptIndex, 1, util.updateObject(scripts.find(s => s.name === state.project.script), { script }))

    const project = util.updateObject(state.project, { scripts })
    return util.updateObject(state, { project })
}
