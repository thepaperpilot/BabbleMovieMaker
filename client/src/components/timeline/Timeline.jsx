import React, {Component} from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import Frames from './Frames'
import FrameCount from './FrameCount'
import ReorderableList from './../ui/ReorderableList'
import InlineEdit from './../ui/InlineEdit'
import './timeline.css'

export const BUFFER_FRAMES = 100
// When current frame loses visibility, how far it places the currentframe from the opposite edge
const SCROLL_PADDING = 50

class Timeline extends ReorderableList {
    constructor(props) {
        super(props)

        // Used for scrolling timeline when currentframe indicator goes off screen
        this.timescroll = React.createRef()
        this.currentframe = React.createRef()

        this.state = {
            size: 1,
            offset: 0
        }

        this.updateTimescroll = this.updateTimescroll.bind(this)
        this.changeZoom = this.changeZoom.bind(this)
        this.onScroll = this.onScroll.bind(this)
        this.prevFrame = this.prevFrame.bind(this)
        this.nextFrame = this.nextFrame.bind(this)
        this.addActor = this.addActor.bind(this)
        this.deleteActor = this.deleteActor.bind(this)
        this.moveActor = this.moveActor.bind(this)
    }

    updateTimescroll() {
        const timescroll = this.timescroll.current
        const currentframe = this.currentframe.current

        let timelineRect = timescroll.getBoundingClientRect()
        let rect = currentframe.getBoundingClientRect()
        let width = timelineRect.right - timelineRect.left - SCROLL_PADDING

        // Scroll timeline to currentframe if necessary
        if (rect.left < timelineRect.left) {
            // We need to scroll left
            timescroll.scrollLeft -= timelineRect.left - rect.left + width
        } else if (rect.right > timescroll.clientWidth + timelineRect.left) {
            // We need to scroll right
            timescroll.scrollLeft +=
                rect.right - (timescroll.clientWidth + timelineRect.left) + width
        }
    }

    changeZoom(e) {
        this.setState({
            size: parseInt(e.target.value, 10)
        })
    }

    onScroll(event) {
        this.setState({
            offset: event.target.scrollTop
        })
    }

    prevFrame() {
        this.props.dispatch({ type: 'PREV_FRAME' })
    }

    nextFrame() {
        this.props.dispatch({ type: 'NEXT_FRAME' })
    }

    addActor() {
        this.props.dispatch({ type: 'ADD_ACTOR' })
    }

    renameActor(actor) {
        return name => {
            if (name && !this.props.actors.includes(name))
                this.props.dispatch({ type: 'RENAME_ACTOR', oldName: actor, newName: name })
        }
    }

    deleteActor(actor) {
        return () => this.props.dispatch({ type: 'DELETE_ACTOR', actor })
    }

    moveActor(actor, after) {
        this.scheduleUpdate({ type: 'MOVE_ACTOR', actor, after })
    }

    render() {
        // so getting this to look how I want - with horizontal and vertical scrolling, and
        // things anchored on the top and on the left - is really hard
        // I'd like to consider maybe doing something like excel where instead of scrolling
        // pixel by pixel its cell by cell. That might make things easier
        // Also the scrollbar component I'm using doesn't work horizontally, so the
        // horizontal bar looks trash :/

        // Move fps to bar?
        // I've commented out the zoom slider because I'm not sure how to handle interacting with
        // frames (e.g. in the inspector) when you click on a frame with multiple keyframes in it
        const width = 12 * (this.props.numFrames / this.state.size + BUFFER_FRAMES)

        const InlineCard = InlineEdit('actor')
        return (
            <div className="panel">
                <div className="flex-column full-panel">
                    <div className="bar flex-row" style={{flex: '0 0 auto'}}>
                        <button onClick={this.prevFrame}>«</button>
                        <button onClick={this.props.togglePlaying}>►</button>
                        <button onClick={this.nextFrame}>»</button>
                        <div className="flex-spacer"></div>
                        <button onClick={this.addActor}>Add Actor</button>
                        {/*<input
                            type="range"
                            min="1"
                            max="60"
                            value={this.state.size}
                            onChange={this.changeZoom} />*/}
                        <div className="flex-spacer"></div>
                        <div className="flex-item">FPS: {this.props.fps}</div>
                        <FrameCount />
                        <div className="flex-grow" />
                    </div>
                    <div className="timeline">
                        <div className="script-name">{this.props.script}</div>
                        <div className="actors-container">
                            {this.props.actors.map((actor, index) => (
                                <InlineCard
                                    key={index}
                                    target={actor}
                                    targetType="actor"
                                    className="actor"
                                    style={{top: `${index * 30 - this.state.offset}px`}}
                                    onChange={this.renameActor(actor)}
                                    delete={this.deleteActor(actor)}
                                    onMove={this.moveActor} />
                            ))}
                        </div>
                        <div className="horiz-scroll" ref={this.timescroll} >
                            <div className="sticky-wrapper">
                                <div className="sticky">
                                    <Frames
                                        zoom={this.state.size}
                                        currentframeRef={this.currentframe}
                                        updateTimescroll={this.updateTimescroll} />
                                </div>
                            </div>
                            <div style={{width: `${width}px`, height: '100%'}}>
                                <Scrollbar
                                    allowOuterScroll={true}
                                    heightRelativeToParent="100%"
                                    onScroll={this.onScroll} >
                                    {this.props.actors.map((actor, index) => (
                                        <Frames
                                            key={index}
                                            actor={actor}
                                            zoom={this.state.size} />
                                    ))}
                                </Scrollbar>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        fps: state.project.settings.fps,
        numFrames: state.timeline.present.numFrames,
        actors: state.actors,
        script: state.project.script
    }
}

export default connect(mapStateToProps)(Timeline)
