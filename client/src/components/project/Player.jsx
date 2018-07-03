import React, {Component} from 'react'
import { connect } from 'react-redux'

class Player extends Component {
    constructor(props) {
        super(props)

        this.togglePlaying = this.togglePlaying.bind(this)
        this.keyDown = this.keyDown.bind(this)
    }

    togglePlaying() {
        if (this.playing) {
            clearInterval(this.playing)
            this.playing = 0
        } else {
            this.props.dispatch({ type: 'NEXT_FRAME' })
            this.playing = setInterval(() => {
                if (this.props.frame === this.props.numFrames) {
                    clearInterval(this.playing)
                    this.playing = 0
                } else this.props.dispatch({ type: 'NEXT_FRAME' })
            }, 1000 / this.props.fps)
        }
    }

    componentDidMount() {
        window.addEventListener('keydown', this.keyDown)
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.keyDown)
    }

    keyDown(e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA'))
            return

        if (e.keyCode === 32) {
            this.togglePlaying()
            e.preventDefault()
        }
    }

    render() {
        return null
    }
}

function mapStateToProps(state) {
    return {
        fps: state.project.settings.fps,
        frame: state.timeline.present.frame,
        numFrames: state.timeline.present.numFrames
    }
}

export default connect(mapStateToProps, null, null, { withRef: true })(Player)
