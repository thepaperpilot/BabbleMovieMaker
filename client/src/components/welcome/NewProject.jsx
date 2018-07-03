import React, { Component } from 'react'

const electron = window.require('electron')
const remote = electron.remote
const util = remote.require('./main-process/util')

function browse(event) {
    event.preventDefault()
    util.selectBabble()
}

class NewProject extends Component {
    constructor(props) {
        super(props)

        this.state = {
            babble: ''
        }

        this.handleChange = this.handleChange.bind(this)
        this.handleSubmit = this.handleSubmit.bind(this)
    }

    componentDidMount() {
        electron.ipcRenderer.on('set directory', (event, babble) => {
            this.setState({
                babble
            })
        })
    }

    handleChange(event) {
        this.setState({
            [event.target.name]: event.target.value
        })
    }

    handleSubmit(event) {
        event.preventDefault()
        util.newProject(this.state.babble)
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                Babble Buds Project:<br/>
                <input
                    type="text"
                    style={{width: 'calc( 100% - 115px )'}}
                    name="babble"
                    value={this.state.location}
                    onChange={this.handleChange} />
                <button type='button' onClick={browse}>Browse</button><br/>
                <button type='submit'>Create</button>
            </form>
        )
    }
}

export default NewProject
