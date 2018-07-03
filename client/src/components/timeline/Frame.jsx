import React, {Component} from 'react'
import { connect } from 'react-redux'
import { DropTarget } from 'react-dnd'
import classNames from 'classnames'
import DraggableKeyframe from './DraggableKeyframe'

function checkUpdate(oldProps, newProps, fields) { return fields.some(field => oldProps[field] !== newProps[field]) }

class Frame extends Component {
    constructor(props) {
        super(props)

        const [isKeyframe, error] = this.calculateKeyframe(props)

        this.state = {
            time: this.calculateTime(props),
            frame: this.calculateFrame(props),
            offset: this.calculateOffset(props),
            className: {
                frame: true,
                lastframe: props.lastframe,
                currentframe: props.currentframe,
                selected: props.selected,
                error,
                [this.calculateCanDrop(props)]: true
            },
            isKeyframe
        }

        this.calculateTime = this.calculateTime.bind(this)
        this.onClick = this.onClick.bind(this)
    }

    calculateTime(props) {
        const {index, zoom, fps} = props

        const minutes = Math.floor(zoom * index / fps / 60)
        const seconds = (zoom * index - minutes * 60 * fps) / fps
        return index > 0 && index % fps === 0 ? `${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}` : null
    }
    calculateFrame(props) { return Math.floor(props.index / props.zoom) }
    calculateOffset(props) { return 5 + 13 * props.index }
    calculateKeyframe(props) {
        if (!props.keyframe) return [false, false]
        let isKeyframe = false
        if (props.keyframe.some((action, i) => {
            if (props.actor == null ?
                !('id' in action || 'target' in action) :
                ('id' in action && action.id === props.actor) ||
                    ('target' in action && action.target === props.actor)) {
                
                if (props.errors && props.errors[i] !== null)
                    return true
                else isKeyframe = true
            }
        }))
            // there was an error
            return [true, true]
        return [isKeyframe, false]
    }
    calculateCanDrop(props) { return props.canDrop ? props.isOver ? 'droppable-hover' : 'droppable' : '' }

    onClick(e) {
        this.props.dispatch({
            type: 'GOTO_INSPECT',
            frame: parseInt(e.target.dataset.frame, 10) || 0,
            actor: this.props.actor
        })
    }

    // We have a lot of frames, so I decided to do this instead of recalculating everything every time any props has an update
    componentWillReceiveProps(props) {
        const state = {}
        state.className = Object.assign({}, this.state.className)

        // Timing of this frame
        if (checkUpdate(this.props, props, ['index', 'zoom', 'fps'])) {
            state.time = this.calculateTime(props)
            // What frame this is
            if (checkUpdate(this.props, props, ['index', 'zoom'])) {
                state.frame = this.calculateFrame(props)
                if (checkUpdate(this.props, props, ['index']))
                    state.offset = this.calculateOffset(props)
            }
        }
        // Whether this is the last frame
        if (checkUpdate(this.props, props, ['lastframe'])) {
            state.className.lastframe = props.lastframe
        }
        // Whether this is the selected frame
        if (checkUpdate(this.props, props, ['selected'])) {
            state.className.selected = props.selected
        }
        // Whether this is the current frame
        if (checkUpdate(this.props, props, ['currentframe'])) {
            state.className.currentframe = props.currentframe
        }
        // Whether this frame is a keyframe or has an error
        if (checkUpdate(this.props, props, ['keyframes', 'zoom', 'index', 'errors', 'actor'])) {
            const [isKeyframe, error] = this.calculateKeyframe(props)
            state.className.error = error
            state.isKeyframe = isKeyframe
        }
        // Whether whether we can drop this frame has changed
        if (checkUpdate(this.props, props, ['canDrop', 'isOver'])) {
            delete state.className['droppable-hover']
            delete state.className['droppable']
            state.className[this.calculateCanDrop(props)] = true
        }

        this.setState(state)
    }

    componentDidUpdate(prevProps) {
        if (this.state.className.currentframe && !prevProps.currentframe && this.props.currentframe)
            this.props.updateTimescroll()
    }

    render() {
        const {time, frame, offset, className, isKeyframe} = this.state
        const {connectDropTarget, isEndframe, currentframeRef, actor} = this.props

        return connectDropTarget(
            <div
                className={classNames(className)}
                data-time={time}
                data-frame={frame}
                style={{'--time': `${offset}px`}}
                onClick={this.onClick} >
                {isEndframe && <div
                    className="endframe">
                </div>}
                {isKeyframe && <DraggableKeyframe
                    frame={frame}
                    actor={actor} />}
                {className.currentframe && <div ref={currentframeRef}></div>}
            </div>
        )
    }
}

function mapStateToProps(state, props) {
    const currentframe = props.index === Math.floor(state.timeline.present.frame / props.zoom)
    return {
        keyframe: state.timeline.present.keyframes.actions[props.keyframe],
        errors: state.timeline.present.keyframes.errors[props.keyframe],
        fps: state.project.settings.fps,
        currentframe: currentframe && props.actor == null,
        selected: currentframe &&
            ((state.inspector.targetType === 'frame' && props.actor == null) || (state.inspector.targetType === 'actor' && props.actor === state.inspector.target)),
        lastframe: props.index === Math.floor(state.timeline.present.numFrames / props.zoom)
    }
}

const frameTarget = {
    drop(props, monitor) {
        const {index, actor} = monitor.getItem()
        props.dispatch({
            type: 'MOVE_KEYFRAME',
            source: index,
            target: props.index,
            sourceActor: actor,
            targetActor: props.actor
        })
    },
    canDrop(props, monitor) {
        return (monitor.getItem().actor == null) === (props.actor == null)
    }
}

function collect(connect, monitor) {
    return {
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
    }
}

export default connect(mapStateToProps)(DropTarget(['frame'], frameTarget, collect)(Frame))
