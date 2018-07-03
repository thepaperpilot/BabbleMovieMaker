import React from 'react'
import { connect } from 'react-redux'

function mapStateToProps(state) {
    return {
        frame: state.timeline.present.frame
    }
}

export default connect(mapStateToProps)(props => {
    return (<div className="flex-item">Frame: {props.frame + 1}</div>)
})
