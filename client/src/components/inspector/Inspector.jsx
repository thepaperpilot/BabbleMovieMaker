import React from 'react'
import { connect } from 'react-redux'
import Actor from './Actor'
import Frame from './Frame'
import Cutscene from './Cutscene'
import Puppet from './Puppet'
import Command from './Command'
import './inspector.css'

function mapStateToProps(state) {
    return {
        target: state.inspector.target,
        targetType: state.inspector.targetType
    }
}

export default connect(mapStateToProps)(props => {
    let content = null

    switch (props.targetType) {
    case 'actor': content = <Actor target={props.target} />; break
    case 'frame': content = <Frame target={props.target} />; break
    case 'cutscene': content = <Cutscene target={props.target} />; break
    case 'puppet': content = <Puppet target={props.target} />; break
    case 'command': content = <Command target={props.target} />; break
    default:
        // TODO render a "not inspecting anything" screen
        break
    }
    return (
        <div className="panel">
            {content}
        </div>
    )
})
