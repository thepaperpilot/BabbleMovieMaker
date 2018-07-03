import React, {Component} from 'react'
import { connect } from 'react-redux'
import { ActionCreators as UndoActionCreators } from 'redux-undo'
import Panels from './../panels/Panels'
import Player from './Player'
import BabbleReloader from './BabbleReloader'
import Clipboard from './Clipboard'

const electron = window.require('electron')

class Project extends Component {
    constructor(props) {
        super(props)

        this.player = React.createRef()

        this.togglePlaying = this.togglePlaying.bind(this)
        this.keyDown = this.keyDown.bind(this)
    }

    componentDidMount() {
        // Print debug info
        this.props.dispatch({
            type: 'INFO',
            content: `Babble Movie Maker version: ${electron.remote.app.getVersion()}`
        })
        this.props.dispatch({
            type: 'INFO',
            content: `Other Versions: ${JSON.stringify(window.process.versions, null, 2)}`
        })

        this.props.dispatch({
            type: 'LOG',
            content: 'Loading Project...'
        })

        window.addEventListener('keydown', this.keyDown)
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.keyDown)
    }

    togglePlaying() {
        this.player.current.getWrappedInstance().togglePlaying()
    }

    keyDown(e) {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA'))
            return

        let handled = true
        switch (e.keyCode) {
        case 37: this.props.dispatch({ type: 'PREV_FRAME' }); break
        case 39: this.props.dispatch({ type: 'NEXT_FRAME' }); break
        case 90: if (e.ctrlKey) this.props.dispatch(UndoActionCreators[e.shiftKey ? 'redo' : 'undo']()); break
        case 89: if (e.ctrlKey) this.props.dispatch(UndoActionCreators.redo()); break
        default: handled = false
        }
        if (handled) e.preventDefault()
    }

    render() {
        return (
            <div>
                <Panels togglePlaying={this.togglePlaying} stage={this.props.stage} />
                <Player ref={this.player} />
                <Clipboard/>
                <BabbleReloader/>
            </div>
        )
    }
}

export default connect()(Project)
