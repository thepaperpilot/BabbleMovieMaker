import React from 'react'
import { connect } from 'react-redux'
import './framecount.css'

function mapStateToProps(state) {
    return {
        frame: state.timeline.present.frame,
        numFrames: state.timeline.present.numFrames
    }
}

export default connect(mapStateToProps)(props => (
    <div className="framecount">
        {`Frame ${props.frame + 1} / ${props.numFrames + 1}`}
    </div>
))
