import React, {Component} from 'react'
import ReactResizeDetector from 'react-resize-detector'
import { connect } from 'react-redux'
import { ActionCreators as UndoActionCreators } from 'redux-undo'
import { BUFFER_FRAMES } from './../timeline/Timeline'

const path = require('path')
const babble = require('babble.js')

const puppetKeys = ['id', 'name', 'babbling', 'position', 'target', 'emote', 'facingLeft', 'movingAnim', 'direction']

// TODO find a way to simulate cutscene without this tab being visible?
// temporary 'solution' is to make it so that the stage panel can't be
// closed, and prevent the tab strip from being dragged or dropped into
// Ideal solution would be to separate the logic code and rendering code
// in babble.js, so we can shove the script simulations in a web worker
class Stage extends Component {
    constructor(props) {
        super(props)

        this.scriptRead = false

        this.gotoFrame = this.gotoFrame.bind(this)
        this.readScript = this.readScript.bind(this)
        this.resimulate = this.resimulate.bind(this)
        this.onChangeFrame = this.onChangeFrame.bind(this)
        this.onResize = this.onResize.bind(this)
        this.onLoad = this.onLoad.bind(this)
        this.getPuppetStates = this.getPuppetStates.bind(this)
        this.uploadTexture = this.uploadTexture.bind(this)
    }

    componentDidMount() {
        this.stage = new babble.Stage('screen',
            this.props.settings,
            this.props.assets,
            this.props.assetsPath,
            this.onLoad, null, false)

        this.cutsceneSimulator = new babble.Cutscene(this.stage, null, this.props.puppets)
        this.cutsceneSimulator.parseNextAction = () => {}
        this.cutsceneSimulator.actions.delay = (callback, action) => {
            if (action.parent) action.parent.delay = action.delay
            if (this.currentFrame !== null) {
                let endFrame = this.currentFrame + Math.ceil(action.delay * this.props.settings.fps / 1000)
                if (endFrame > this.props.numFrames) this.props.dispatch({
                    type: 'SET_FRAMES',
                    frames: endFrame
                })
            }
        }
    }

    componentWillReceiveProps(newProps) {
        // Handle changing settings
        if (this.props.settings !== newProps.settings) {
            this.stage.project = newProps.settings
            this.stage.resize()
        }

        // Handle changing assets
        if ((this.props.assets !== newProps.assets &&
            JSON.stringify(this.props.assets) !== JSON.stringify(newProps.assets)) ||
            this.props.assetsPath !== newProps.assetsPath) {
            this.stage.assets = newProps.assets
            this.stage.assetsPath = newProps.assetsPath
            this.stage.reloadAssets()
        }

        // Handle changing puppets
        if (this.props.puppets !== newProps.puppets &&
            JSON.stringify(this.props.puppets) !== JSON.stringify(newProps.puppets)) {
            this.cutsceneSimulator.actors = newProps.puppets
            this.gotoFrame(newProps, newProps.frame, true)
        }

        // Handle changing scripts
        // TODO or opening new project
        if (this.props.script !== newProps.script) {
            this.readScript(newProps)
        }

        // Resimulate frames
        if (this.props.keyframes.actions !== newProps.keyframes.actions) {
            this.resimulate(this.props, newProps)
        }

        // Handle changing frame (unless already handled by resimulating)
        else if (this.props.frame !== newProps.frame) {
            if (this.props.frame === newProps.frame - 1) {
                // Next frame
                this.stage.update(1000 / newProps.settings.fps)

                if (newProps.keyframes.actions[newProps.frame]) {
                    newProps.keyframes.actions[newProps.frame].forEach(action => {
                        try {
                            this.cutsceneSimulator.actions[action.command].call(this.cutsceneSimulator, () => {}, action)
                        } catch (e) {
                            // ignore
                        }
                    })
                    this.stage.update(0)
                }
            } else {
                // Goto frame
                this.gotoFrame(newProps)
            }

            this.onChangeFrame()
        }

        // We just resimulated
        else if (this.props.keyframes.puppets[this.props.frame] !== newProps.keyframes.puppets[newProps.frame]) {
            this.gotoFrame(newProps)
        }
    }

    gotoFrame(props, frame, forceReload) {
        frame = frame == null ? props.frame : frame
        // Find nearest keyframe
        let nearestKeyframe = frame
        while (!props.keyframes.actions[nearestKeyframe] && nearestKeyframe > 0)
            nearestKeyframe--
        const puppets =
            (props.keyframes.puppets[nearestKeyframe] && props.keyframes.puppets[nearestKeyframe]) || []

        // Handle puppets that need to be updated or removed
        this.stage.puppets.forEach(stagePuppet => {
            const puppet = puppets.find(puppet => puppet.id === stagePuppet.id)
            if (puppet) {
                if (puppet.name !== stagePuppet.name || forceReload)
                    stagePuppet = this.stage.setPuppet(puppet.id, this.stage.createPuppet(props.puppets[puppet.name]))
                Object.assign(stagePuppet, puppet)
                stagePuppet.update()
            } else this.stage.removePuppet(stagePuppet.id)

        })

        // Add any new puppets
        puppets.filter(puppet =>
            !this.stage.puppets.some(stagePuppet => stagePuppet.id === puppet.id)
        ).forEach(puppet => {
            const stagePuppet = this.stage.addPuppet(props.puppets[puppet.name], puppet.id)
            Object.assign(stagePuppet, puppet)
            stagePuppet.update()
        })

        // Simulate to current frame
        if (nearestKeyframe === frame) this.stage.update(0)
        else for (let i = 0; i < frame - nearestKeyframe; i++)
            this.stage.update(1000 / props.settings.fps)
    }

    readScript(props) {
        // TODO Create a stage that doesn't do any rendering - just the logic
        // Then remove the "scriptRead" flag and replace it with the following:
        // timeline reducer gets functions to create a web worker with one of
        // these purely logical stages on it
        // READ_SCRIPT event clears the keyframes, and starts a web worker to
        // build the keyframes. 
        // Other actions like ADD_ACTION or UPDATE_FIELD will start a web worker
        // to resimulate, using the logic currently in this file
        // The reducer could also mark frames as dirty, and if the player goes
        // to a dirty frame it could render a 'simulating...' message in lieue
        // of the stage (and also add a bottom bar with a progress bar)

        // TODO render a 'reading script...' message
        this.scriptRead = true
        this.stage.clearPuppets()
        let frame = 0, frames = 0
        const timer = {}
        const actors = []
        const keyframes = {
            actions: {},
            puppets: {},
            errors: {}
        }
        let cutscene = new babble.Cutscene(this.stage,
            props.scripts.find(s => s.name === props.script).script,
            props.puppets,
            () => { if (frame > frames + 1) frames = frame + 1})
        cutscene.actions.delay = function(callback, action) {
            if (action.delay <= 0) requestAnimationFrame(callback)
            else {
                if (action.parent) action.parent.delay = action.delay
                let endFrame = parseInt(frame, 10) +
                    Math.floor(action.delay * props.settings.fps / 1000)
                if (frame === endFrame) endFrame++
                if (endFrame > frames) frames = endFrame

                if (!timer[endFrame]) timer[endFrame] = []
                timer[endFrame].push(callback)
            }
        }
        cutscene.parseNextAction = function(script, callback) {
            // Check if script is complete
            if (script.length === 0) {
                // Cutscene finished successully
                if (callback) callback()
                return
            }

            // Parse current line of script
            let action = script[0]

            // Check for actors
            let actor = 'id' in action ? action.id : 'target' in action ? action.target : null
            if (actor !== null && !actors.includes(actor))
                actors.push(actor)

            // Add to keyframe
            if (props.settings.commands.find(c => c.command === action.command)) {
                if (!keyframes.actions[frame]) {
                    keyframes.actions[frame] = []
                    keyframes.errors[frame] = []
                }
                keyframes.actions[frame].push(action)
                keyframes.errors[frame].push(null)
            }

            // Confirm command exists
            if (!this.actions.hasOwnProperty(action.command)) {
                // Invalid command, skip it
                this.parseNextAction(script.slice(1), callback)
                return
            }

            // Run action
            if (action.wait) {
                // Complete this action before proceeding
                let newCallback = function() {
                    this.parseNextAction(script.slice(1), callback)
                }.bind(this)
                try {
                    this.actions[action.command].call(this, newCallback, action)
                } catch (e) {
                    keyframes.errors[frame].pop()
                    keyframes.errors[frame].push(e.message)
                    newCallback()
                }
            } else {
                // Perform this action and immediately continue
                try {
                    this.actions[action.command].call(this, this.empty, action)
                } catch (e) {
                    keyframes.errors[frame].pop()
                    keyframes.errors[frame].push(e.message)
                }
                this.parseNextAction(script.slice(1), callback)
            }
        }
        cutscene.start()
        while (frame < frames + BUFFER_FRAMES) {
            if (keyframes.actions[frame])
                keyframes.puppets[frame] = this.getPuppetStates()

            frame++
            this.stage.update(1000 / props.settings.fps)
            if (timer[frame]) timer[frame].forEach(cb => cb())
        }

        props.dispatch({
            type: 'FINISHED_READING_SCRIPT',
            numFrames: frames,
            keyframes,
            actors,
            puppets: this.getPuppetStates()
        })
        props.dispatch(UndoActionCreators.clearHistory())
    }

    // Assumes the stage is currently at props.frame
    // Returns with the stage at newProps.frame
    resimulate(props, newProps) {
        if (this.scriptRead) {
            this.scriptRead = false
            this.gotoFrame(newProps)
            return
        }

        let frames = [...new Set([
            ...Object.keys(props.keyframes.actions),
            ...Object.keys(newProps.keyframes.actions)])]
            .map(frame => parseInt(frame, 10)).sort((a, b) => a - b)

        const puppets = Object.assign({}, props.keyframes.puppets)
        const errors = Object.assign({}, props.keyframes.errors)

        const simulateActions = frame => {
            if (newProps.keyframes.actions[frame]) {
                errors[frame] = []
                newProps.keyframes.actions[frame].forEach(action => {
                    try {
                        if (action.command in this.cutsceneSimulator.actions)
                            this.cutsceneSimulator.actions[action.command]
                                .call(this.cutsceneSimulator, () => {}, action)
                        errors[frame].push(null)
                    } catch (e) {
                        errors[frame].push(e.message)
                    }
                })
                this.stage.update(0)
                puppets[frame] = this.getPuppetStates()

            } else
                delete puppets[frame]
        }

        let stageFrame = props.frame
        for (let i = 0; i < frames.length; i++) {
            let frame = frames[i]
            if (props.keyframes.actions[frame] !== newProps.keyframes.actions[frame]) {
                // Find most recent keyframe
                let nearestKeyframe = frame - 1
                while (!newProps.keyframes.actions[nearestKeyframe] && nearestKeyframe > 0)
                    nearestKeyframe--

                // Ensure stage is at most recent keyframe
                if (nearestKeyframe === -1)
                    this.stage.clearPuppets()
                else if (nearestKeyframe !== stageFrame)
                    this.gotoFrame(newProps, nearestKeyframe)

                // Simulate back to this frame
                for (let j = 0; j < frame - nearestKeyframe; j++)
                    this.stage.update(1000 / props.settings.fps)
                stageFrame = frame
                simulateActions(frame)

                // Continue simulating keyframes until we reach one
                // that is unaffected by this frame's changes
                while (++i < frames.length) {
                    frame = frames[i]
                    for (let j = 0; j < frame - stageFrame; j++)
                        this.stage.update(1000 / props.settings.fps)
                    stageFrame = frame
                    simulateActions(frame)

                    if (props.keyframes.actions[frame] === newProps.keyframes.actions[frame] &&
                        props.keyframes.puppets[frame] === puppets[frame])
                        break
                }
            }
        }

        this.props.dispatch({
            type: 'RESIMULATE',
            puppets,
            errors
        })

        if (stageFrame !== newProps.frame)
            this.gotoFrame(newProps)

        this.onChangeFrame()
        // TODO generate script
    }

    onChangeFrame() {
        this.props.dispatch({
            type: 'SET_PUPPET_STATES',
            puppets: this.getPuppetStates()
        })
    }

    onResize() {
        this.stage.resize()
        this.stage.update(0)
    }

    onLoad(stage) {
        stage.registerPuppetListener('mousedown', (e) => {
            this.props.dispatch({
                type: 'INSPECT',
                targetType: 'actor',
                target: e.target.id
            })
        })

        // start pre-uploading textures to GPU
        setTimeout(this.uploadTexture, 1000)
        this.readScript(this.props)
    }

    getPuppetStates() {
        let puppets = []
        for (let i = 0; i < this.stage.puppets.length; i++) {
            let puppet = {}
            for (let j = 0; j < puppetKeys.length; j++) {
                puppet[puppetKeys[j]] = this.stage.puppets[i][puppetKeys[j]]
            }
            puppets.push(puppet)
        }
        return puppets
    }

    uploadTexture() {
        const texture = path.join(this.props.assetsPath,
            this.props.assets[Object.keys(this.props.assets)[(this.uploadedTextures || 0)]].location)
        this.stage.renderer.plugins.prepare.upload(window.PIXI.utils.BaseTextureCache[texture])
        this.uploadedTextures++
        if (this.props.assets[Object.keys(this.props.assets)[this.uploadedTextures]]) {
            setTimeout(this.uploadTexture, 10)
        } else this.onResize()
    }

    render() {
        const backgroundImage = this.props.settings.greenScreenEnabled ?
            '' : `url(${this.props.background})`
        const backgroundColor = this.props.settings.greenScreenEnabled ?
            this.props.settings.greenScreen : ''

        return (
            <div id='screen' style={{
                width: '100%',
                height: '100%',
                backgroundSize: 'cover',
                backgroundImage,
                backgroundColor
            }}>
                <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} />
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        actors: state.actors,
        script: state.project.script,
        settings: state.project.settings,
        scripts: state.project.scripts,
        puppets: state.project.puppets,
        assets: state.project.assets,
        assetsPath: state.project.assetsPath,
        frame: state.timeline.present.frame,
        keyframes: state.timeline.present.keyframes,
        numFrames: state.timeline.present.numFrames
    }
}

export default connect(mapStateToProps)(Stage)
