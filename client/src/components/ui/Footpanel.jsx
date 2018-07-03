import React, {Component} from 'react'
import './footpanel.css'

class Footpanel extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false
        }

        this.toggleOpen = this.toggleOpen.bind(this)
    }

    toggleOpen() {
        const cb = this.props[this.state.open ? 'onClose' : 'onOpen']
        if (cb) cb()
        this.setState({
            open: !this.state.open
        })
    }

    render() {
        return (
            <button className="footbutton" onClick={this.toggleOpen}>
                {this.props.label}
                <div
                    className={`footpanel${this.state.open ? '' : ' collapsed'}`}
                    onClick={e => e.stopPropagation()}>
                    {this.props.children}
                </div>
                {this.state.open &&
                    <div className="backdrop-close" onClick={this.toggleOpen}></div>}
            </button>
        )
    }
}

export default Footpanel
