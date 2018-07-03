import React, {Component} from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import Header from './Header'
import Checkbox from './fields/Checkbox'
import Text from './fields/Text'
import Field from './Field'
import FootSelect from './FootSelect'
import Dropdown from './../ui/Dropdown'
import './action.css'

export const FIELD_TYPES = [
    'text',
    'puppet',
    'number',
    'slider',
    'checkbox',
    'select',
    'emote'
]

class Command extends Component {
    constructor(props) {
        super(props)

        this.deleteCommand = this.deleteCommand.bind(this)
        this.addField = this.addField.bind(this)
        this.removeField = this.removeField.bind(this)
        this.changeTitle = this.changeTitle.bind(this)
        this.toggleRequiresActor = this.toggleRequiresActor.bind(this)
        this.toggleForceWait = this.toggleForceWait.bind(this)
    }

    deleteCommand() {
        this.props.dispatch({
            type: 'REMOVE_COMMAND',
            index: this.props.target
        })
    }

    addField(fieldType) {
        this.props.dispatch({
            type: 'ADD_COMMAND_FIELD',
            index: this.props.target,
            fieldType
        })
    }

    removeField(field) {
        this.props.dispatch({
            type: 'REMOVE_COMMAND_FIELD',
            index: this.props.target,
            field
        })
    }

    changeTitle(value) {
        this.props.dispatch({
            type: 'UPDATE_COMMAND_TITLE',
            index: this.props.target,
            title: value
        })
    }

    toggleRequiresActor() {
        if (this.props.commands[this.props.target].fields.target) {
            this.removeField('target')
        } else {
            this.addField('id')
        }
    }

    toggleForceWait(value) {
        this.props.dispatch({
            type: 'UPDATE_COMMAND_WAIT',
            index: this.props.target,
            wait: value
        })
    }

    render() {
        const command = this.props.commands.find(c => c.command === this.props.target)


        const disabled = !!this.props.defaults.find(c => c.command === this.props.target)
        const requiresActor = Object.values(command.fields).some(field => field.type === 'id')

        const fields = Object.keys(command.fields).map(field => (
            <Field
                key={field}
                command={this.props.target}
                name={field}
                disabled={disabled}
                removeField={this.removeField} />
        ))

        const options = FIELD_TYPES.map(type => ({
            value: type,
            label: type
        }))

        return (
            <div className="inspector">
                <Header targetName={this.props.target} />
                {disabled || 
                    <Dropdown items={[
                        { label: 'Delete Command', onClick: this.deleteCommand }
                    ]}/>}
                <div className="inspector-content">
                    <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                        <div className="action">
                            <Text title="Label" value={command.title} onChange={this.changeTitle} disabled={disabled} />
                            <Checkbox title="Requires actor" value={requiresActor} onChange={this.toggleRequiresActor} disabled={disabled} />
                            <Checkbox title="Pauses timeline until complete" value={command.forceWait} onChange={this.toggleForceWait} disabled={disabled} />
                        </div>
                        {fields}
                    </Scrollbar>
                </div>
                <FootSelect title="Add Field" options={options} onChange={this.addField} />
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        commands: state.project.settings.commands,
        defaults: state.project.defaultCommands
    }
}

export default connect(mapStateToProps)(Command)
