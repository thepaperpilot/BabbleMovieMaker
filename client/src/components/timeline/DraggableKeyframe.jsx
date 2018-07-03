import React, {Component} from 'react'
import { DragSource } from 'react-dnd'

class DraggableKeyframe extends Component {
    render() {
        return this.props.connectDragSource(
            <div
                className="keyframe"
                data-frame={this.props.frame}>
            </div>
        )
    }
}

const frameSource = {
    beginDrag(props) {
        return {
            index: props.frame,
            actor: props.actor
        }
    }
}

function collect(connect) {
    return {
        connectDragSource: connect.dragSource()
    }
}

export default DragSource('frame', frameSource, collect)(DraggableKeyframe)
