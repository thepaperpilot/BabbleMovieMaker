import React, {Component} from 'react'
import { connect } from 'react-redux'

const remote = window.require('electron').remote

class BabbleReloader extends Component {
    constructor(props) {
        super(props)

        this.onFocus = this.onFocus.bind(this)
    }

    componentDidMount() {
        remote.getCurrentWindow().on('focus', this.onFocus)
    }

    componentWillUnmount() {
        remote.getCurrentWindow().removeListener('focus', this.onFocus)
    }

    onFocus() {
        this.props.dispatch({ type: 'RELOAD_BABBLE' })
    }

    render() {
        return null
    }
}

export default connect()(BabbleReloader)
