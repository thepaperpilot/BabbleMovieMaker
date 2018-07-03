import React, {Component} from 'react'
import { connect } from 'react-redux'
import Foldable from './../ui/Foldable'
import './action.css'

class PuppetState extends Component {
    render() {
        return (
            <div className="action">
                <Foldable title="Current State" defaultFolded={true} subtitle="Advanced">
                    <pre className="info">
                        {JSON.stringify(this.props.puppets.find(puppet =>
                            puppet.id === this.props.actor), null, 4) || 'No puppet on stage'}
                    </pre>
                </Foldable>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        puppets: state.puppets
    }
}

export default connect(mapStateToProps)(PuppetState)
