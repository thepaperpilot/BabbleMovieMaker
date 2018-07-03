import React, { Component } from 'react'
import { connect } from 'react-redux'
import { DragSource } from 'react-dnd'
import SmallThumbnail from './../ui/SmallThumbnail'

class DraggablePuppet extends Component {
    render() {
        return <div>
            {this.props.connectDragSource(this.props.small ?
                <div className="line-item" onClick={this.props.openPuppet}>
                    <SmallThumbnail
                        label={this.props.puppet}
                        image={this.props.puppetThumbnails[this.props.puppet]} />
                </div> :
                <div
                    className="char"
                    onClick={this.props.openPuppet}>
                    <div className="desc">{this.props.puppet}</div>
                    <img alt={this.props.puppet} src={this.props.puppetThumbnails[this.props.puppet]}/>
                </div>)}

        </div>
    }
}

function mapStateToProps(state) {
    return {
        puppetThumbnails: state.project.puppetThumbnails
    }
}

const puppetSource = {
    beginDrag(props) {
        return { puppet: props.puppet }
    }
}

function collect(connect) {
    return {
        connectDragSource: connect.dragSource()
    }
}

export default connect(mapStateToProps)(DragSource('puppet', puppetSource, collect)(DraggablePuppet))
