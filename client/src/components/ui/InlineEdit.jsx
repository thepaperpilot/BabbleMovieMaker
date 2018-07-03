import React, {Component} from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { ContextMenu, MenuItem, ContextMenuTrigger } from 'react-contextmenu'
import { DragSource, DropTarget } from 'react-dnd'
import './inline-edit.css'

class InlineEdit extends Component {
    constructor(props) {
        super(props)

        this.input = React.createRef()

        this.state = {
            text: props.target,
            isEditing: false,
            editClick: false
        }

        this.onChange = this.onChange.bind(this)
        this.onBlur = this.onBlur.bind(this)
        this.onClick = this.onClick.bind(this)
        this.onInputClick = this.onInputClick.bind(this)
        this.edit = this.edit.bind(this)
    }

    onChange(e) {
        this.setState({
            text: e.target.value
        })
    }

    onBlur() {
        this.props.onChange(this.state.text)
        this.setState({
            isEditing: false
        })
    }

    onClick(e) {
        const {targetType, selected, target, dispatch, disabled} = this.props

        if (e.detail !== 1) return

        if (selected && !disabled)
            this.edit()
        else {
            dispatch({
                type: 'INSPECT',
                targetType: targetType,
                target: target
            })
        }
    }

    onInputClick(e) {
        if (e.detail === 2 && this.state.editClick && this.props.onDoubleClick) {
            this.props.onDoubleClick(e)
            this.setState({
                isEditing: false
            })
        } else
            this.setState({
                editClick: false
            })
    }

    edit() {
        this.setState({
            isEditing: true,
            text: this.props.target,
            editClick: true
        }, () => {
            this.input.current.focus()
        })
    }

    render() {
        const {className, selected, target, style, disabled} = this.props

        const card = this.state.isEditing ?
            <input
                className={classNames(className, 'inline-edit')}
                style={style}
                value={this.state.text}
                onChange={this.onChange}
                onBlur={this.onBlur}
                onKeyPress={e => {if (e.key === 'Enter') this.onBlur()}}
                onClick={this.onInputClick}
                ref={this.input} /> :
            <div
                className={classNames(className, {
                    selected,
                    disabled
                })}
                style={style}
                onClick={this.onClick}
                onDoubleClick={this.props.onDoubleClick}>
                {target}
            </div>

        const {connectDragSource, connectDropTarget} = this.props

        // TODO for some reason isDragging doesn't return to false right away
        // Or rather, it does but the element's opacity doesn't
        return <div style={{ opacity: this.props.isDragging ? 0 : 1 }}>
            <ContextMenuTrigger id={`contextmenu-${target}`} holdToDisplay={-1}>
                {connectDragSource && connectDropTarget && !this.state.isEditing ?
                    connectDragSource(connectDropTarget(card)) :
                    card}
            </ContextMenuTrigger>
            {disabled || <ContextMenu id={`contextmenu-${target}`}>
                <MenuItem onClick={this.edit}>Rename</MenuItem>
                <MenuItem onClick={this.props.delete}>Delete</MenuItem>
            </ContextMenu>}
        </div>
    }
}

const cardSource = {
    beginDrag(props) {
        return { target: props.target }
    },
    isDragging(props, monitor) {
        return props.target === monitor.getItem().target
    }
}

const cardTarget = {
    hover(props, monitor) {
        const draggedTarget = monitor.getItem().target

        if (draggedTarget !== props.target) {
            props.onMove(draggedTarget, props.target)
        }
    }
}

function collectTarget(connect) {
    return {
        connectDropTarget: connect.dropTarget()
    }
}

function collectSource(connect, monitor) {
    return {
        connectDragSource: connect.dragSource(),
        isDragging: monitor.isDragging()
    }
}

function mapStateToProps(state, props) {
    return {
        selected: props.targetType === state.inspector.targetType &&
            props.target === state.inspector.target
    }
}

export default type => type ?
    connect(mapStateToProps)(
        DropTarget(type, cardTarget, collectTarget)(
            DragSource(type, cardSource, collectSource)(InlineEdit))) :
    connect(mapStateToProps)(InlineEdit)
