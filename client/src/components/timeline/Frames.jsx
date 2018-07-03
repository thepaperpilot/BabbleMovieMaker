import React, {Component} from 'react'
import { connect } from 'react-redux'
import { BUFFER_FRAMES } from './Timeline'
import Frame from './Frame'

class Frames extends Component {
    render() {
        const endFrames = []

        const keyframes = Object.keys(this.props.keyframes).map(i => Math.floor(i / this.props.zoom))

        return (
            <div className="frames">
                {Array.apply(null, { length: this.props.numFrames / this.props.zoom + BUFFER_FRAMES }).map((el, index) => {
                    if (keyframes.includes(index))
                        this.props.keyframes[Object.keys(this.props.keyframes)
                            .find(i => Math.floor(i / this.props.zoom) === index)].forEach(action => {
                            if (this.props.actor == null ?
                                !('id' in action || 'target' in action) :
                                ('id' in action && action.id === this.props.actor) ||
                                    ('target' in action && action.target === this.props.actor)) {
                                endFrames.push(index + Math.ceil(action.delay * this.props.fps / 1000))
                            }
                        })
                    
                    return (
                        <Frame
                            key={index}
                            index={index}
                            isEndFrame={endFrames.find(i => Math.floor(i / this.props.zoom) === index)}
                            zoom={this.props.zoom}
                            currentframeRef={this.props.currentframeRef}
                            updateTimescroll={this.props.updateTimescroll}
                            actor={this.props.actor}
                            keyframe={keyframes.includes(index) ? Object.keys(this.props.keyframes)
                                .find(i => Math.floor(i / this.props.zoom) === index) : null} />
                    )
                })}
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        numFrames: state.timeline.present.numFrames,
        keyframes: state.timeline.present.keyframes.actions,
        fps: state.project.settings.fps
    }
}

export default connect(mapStateToProps)(Frames)
