import React, {Component} from 'react'
import { connect } from 'react-redux'
import Foldable from './../ui/Foldable'
import Dropdown from './../ui/Dropdown'
import Checkbox from './fields/Checkbox'
import Emote from './fields/Emote'
import Number from './fields/Number'
import Puppet from './fields/Puppet'
import Select from './fields/Select'
import Slider from './fields/Slider'
import Text from './fields/Text'
import './action.css'

const electron = window.require('electron')


class Action extends Component {
    static createField(name, field, value, action, onChange) {
        const props = {
            key: name,
            title: field.title,
            value
        }
        switch(field.type) {
        case 'checkbox': return <Checkbox {...props} onChange={onChange} />
        case 'emote': return <Emote {...props} action={action} onChange={onChange} />
        case 'number': return <Number {...props} onChange={onChange} />
        case 'puppet': return <Puppet {...props} onChange={onChange} />
        case 'select': return <Select {...props} options={field.options} onChange={onChange} />
        case 'slider': return <Slider {...props} min={field.min} max={field.max} onChange={onChange} />
        case 'text': return <Text {...props} textarea={field.textarea} name={name} command={action.command} onChange={onChange} />
        default: return null
        }
    }

    constructor(props) {
        super(props)

        this.onChange = this.onChange.bind(this)
        this.copyAction = this.copyAction.bind(this)
        this.cutAction = this.cutAction.bind(this)
        this.removeAction = this.removeAction.bind(this)
    }

    onChange(name) {
        return (value => {
            this.props.dispatch({
                type: 'UPDATE_FIELD',
                frame: this.props.start,
                action: this.props.index,
                value,
                name
            })
        })
    }

    copyAction() {
        electron.clipboard.writeText(JSON.stringify([this.props.action]))
    }

    cutAction() {
        this.copyAction()
        this.removeAction()
    }

    removeAction() {
        this.props.dispatch({
            type: 'REMOVE_ACTION',
            frame: this.props.start,
            index: this.props.index
        })
    }

    render() {
        const command = this.props.commands.find(c => c.command === this.props.action.command)

        if (!command) return null

        return (
            <div className="action">
                <Foldable title={command.title} subtitle={this.props.subtitle} defaultFolded={this.props.defaultFolded}>
                    {this.props.action.delay && <div className="info">
                        Start frame: {parseInt(this.props.start, 10) + 1}<br/>
                        End frame: {parseInt(this.props.start, 10) + 1 +
                            Math.ceil(this.props.action.delay * this.props.fps / 1000)}
                    </div>}
                    {Object.keys(command.fields).map(field => 
                        Action.createField(
                            field,
                            command.fields[field],
                            this.props.action[field],
                            this.props.action,
                            this.onChange(field)
                        )
                    )}
                    {this.props.error && <div className="error">
                        {this.props.error}
                    </div>}
                </Foldable>
                <Dropdown items={[
                    { label: 'Copy Action', onClick: this.copyAction },
                    { label: 'Cut Action', onClick: this.cutAction },
                    { label: 'Remove Action', onClick: this.removeAction }
                ]}/>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        commands: state.project.settings.commands,
        frame: state.timeline.present.frame,
        fps: state.project.settings.fps
    }
}

export default connect(mapStateToProps)(Action)
