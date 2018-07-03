import React, {Component} from 'react'
import { connect } from 'react-redux'
import Textarea from 'react-autosize-textarea'
import Autosuggest from './../../ui/Autosuggest'

class Text extends Component {
    render() {
        if (this.props.textarea) {
            return (<div className="field text">
                <p className="field-title">{this.props.title}</p>
                <Textarea value={this.props.value} onChange={e => this.props.onChange(e.target.value)} />
            </div>)
        } else {
            let options = []
            if (this.props.name && this.props.command) {
                this.props.scripts.forEach(script => script.forEach(action => {
                    const value = action[this.props.name]
                    if (value && action.command === this.props.command && !options.includes(value))
                        options.push(value)
                }))
            }

            // Do this so our fast filter will understand our options
            options = options.map(option => ({
                label: option,
                value: option
            }))

            const {title, ...props} = this.props

            return (
                <div className="field text">
                    <p className="field-title">{title}</p>
                    <Autosuggest
                        options={options}
                        placeholder="Text"
                        {...props} />
                </div>
            )
        }
    }
}

function mapStateToProps(state) {
    return {
        scripts: Object.values(state.project.scripts).map(s => s.script)
    }
}

export default connect(mapStateToProps)(Text)
