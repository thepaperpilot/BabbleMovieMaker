import React, {Component} from 'react'
import { connect } from 'react-redux'

class Checkbox extends Component {
    static uniqueId = 0

    constructor(props) {
        super(props)

        this.state = {
            id: Checkbox.uniqueId++
        }
    }

    render() {
        return (
            <div className="field">                
                <p className="field-title">{this.props.title}</p>
                <input
                    id={`checkbox-${this.state.id}`}
                    type="checkbox"
                    className="checkbox"
                    checked={!!this.props.value}
                    onChange={e => this.props.onChange(e.target.checked)}
                    disabled={this.props.disabled} />
                <label
                    htmlFor={`checkbox-${this.state.id}`}
                    className="checkbox-label">
                </label>
            </div>
        )
    }
}

export default connect()(Checkbox)
