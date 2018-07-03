import React, {Component} from 'react'
import { connect } from 'react-redux'
import Dropdown from './../ui/Dropdown'
import Header from './Header'

class Cutscene extends Component {
    static uniqueId = 0

    constructor(props) {
        super(props)

        this.state = {
            id: Cutscene.uniqueId++
        }

        this.deleteCutscene = this.deleteCutscene.bind(this)
        this.loadScript = this.loadScript.bind(this)
    }

    deleteCutscene() {
        this.props.dispatch({
            type: 'REMOVE_CUTSCENE',
            cutscene: this.props.target
        })
    }

    loadScript() {
        this.props.dispatch({
            type: 'LOAD_SCRIPT',
            script: this.props.target
        })
    }
    
    render() {
        return (
            <div className="inspector">
                <Header targetName={this.props.target} />
                <Dropdown items={[
                    { label: 'Delete Cutscene', onClick: this.deleteCutscene }
                ]}/>
                <button onClick={this.loadScript}>Open</button>
            </div>
        )
    }
}

export default connect()(Cutscene)
