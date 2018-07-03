import React, {Component} from 'react'
import { connect } from 'react-redux'
import { FIELD_TYPES } from './Command'
import Foldable from './../ui/Foldable'
import Dropdown from './../ui/Dropdown'
import Checkbox from './fields/Checkbox'
import MultiSelect from './fields/MultiSelect'
import Number from './fields/Number'
import Select from './fields/Select'
import Text from './fields/Text'
import Action from './Action'

class Field extends Component {
    constructor(props) {
        super(props)

        this.state = {
            value: this.getField(props.command, props.name).default,
            name: props.name
        }

        this.changeFieldName = this.changeFieldName.bind(this)
        this.fieldNameBlur = this.fieldNameBlur.bind(this)
        this.onChange = this.onChange.bind(this)
        this.onPreviewChange = this.onPreviewChange.bind(this)
        this.removeField = this.removeField.bind(this)
    }

    getField(command, name) {
        return this.props.commands.find(c => c.command === command).fields[name]
    }

    componentWillReceiveProps(props) {
        if (this.getField(this.props.command, this.props.name).default !== this.getField(props.command, props.name).default)
            this.setState({
                value: props.commands[props.command].fields[props.name].default
            })

        if (this.state.name !== props.name)
            this.setState({
                name: props.name
            })
    }

    changeFieldName(value) {
        this.setState({
            name: value
        })
    }

    fieldNameBlur() {
        const name = this.state.name
        // Just in case our new name gets rejected, switch back to the current name while we wait for the potential new props
        this.setState({
            name: this.props.name
        })
        this.props.dispatch({
            type: 'UPDATE_COMMAND_FIELD_NAME',
            index: this.props.commands.findIndex(c => c.command === this.props.command),
            field: this.props.name,
            name: name
        })
    }

    onChange(name) {
        return (value => {
            this.props.dispatch({
                type: 'UPDATE_COMMAND_FIELD',
                index: this.props.commands.findIndex(c => c.command === this.props.command),
                field: this.props.name,
                name,
                value
            })
        })
    }

    onPreviewChange(value) {
        this.setState({
            value
        })
    }

    removeField() {
        this.props.dispatch({
            type: 'REMOVE_FIELD'
        })
    }

    render() {
        const field = this.getField(this.props.command, this.props.name)
        const defaultField = this.props.defaults.find(c => c.command === this.props.command)
        const disabled = this.props.disabled && defaultField && this.props.name in defaultField.fields

        const fields = []

        switch (field.type) {
        case 'text':
            fields.push(<Checkbox
                key="textarea"
                title="Text area"
                value={field.textarea}
                disabled={disabled}
                onChange={this.onChange('textarea')} />)
            fields.push(<Text
                key="default"
                title="Default Value"
                value={field.default}
                disabled={disabled}
                onChange={this.onChange('default')} />)
            break
        case 'number':
            fields.push(<Number
                key="default"
                title="Default Value"
                value={field.default}
                disabled={disabled}
                onChange={this.onChange('default')} />)
            break
        case 'slider':
            fields.push(<Number
                key="min"
                title="Min Value"
                value={field.min}
                disabled={disabled}
                onChange={this.onChange('min')} />)
            fields.push(<Number
                key="max"
                title="Max Value"
                value={field.max}
                disabled={disabled}
                onChange={this.onChange('max')} />)
            fields.push(<Number
                key="default"
                title="Default Value"
                value={field.default}
                disabled={disabled}
                onChange={this.onChange('default')}/>)
            break
        case 'checkbox':
            fields.push(<Checkbox
                key="default"
                title="Default Value"
                value={field.default}
                disabled={disabled}
                onChange={this.onChange('default')} />)
            break
        case 'select':
            fields.push(<MultiSelect
                key="options"
                title="Options"
                value={field.options}
                disabled={disabled}
                onChange={this.onChange('options')} />)
            fields.push(<Select
                key="default"
                title="Default Value"
                value={field.default}
                disabled={disabled}
                options={field.options || []}
                onChange={this.onChange('default')} />)
            break
        case 'emote':
        case 'puppet':
            break
        default: 
            // id or something else we don't know how to handle
            return null
        }

        return (
            <div className="action">
                <Foldable title={field.title} subtitle={disabled ? 'read-only' : null} defaultFolded={disabled}>
                    <Text
                        title="Field Name"
                        value={this.state.name}
                        disabled={disabled}
                        onChange={this.changeFieldName}
                        onBlur={this.fieldNameBlur}
                        onKeyPress={e => {if (e.key === 'Enter') this.fieldNameBlur()}} />
                    <Text
                        title="Field Label"
                        value={field.title}
                        disabled={disabled}
                        onChange={this.onChange('title')} />
                    <Select
                        title="Field Type"
                        value={field.type}
                        disabled={disabled}
                        onChange={this.onChange('type')} options={FIELD_TYPES} />
                    {fields}
                    <p>Preview</p>
                    <div className="preview">
                        {Action.createField(
                            this.props.name,
                            field,
                            this.state.value,
                            // If this is an emote field, set it up to show the emotes of the
                            // first puppet in the project
                            // Otherwise use the actual command, for text autosuggesting
                            field.type === 'emote' ?
                                {
                                    command: 'add',
                                    name: Object.keys(this.props.puppets)[0]
                                } :
                                {
                                    command: this.props.command
                                },
                            this.onPreviewChange
                        )}
                    </div>
                </Foldable>
                <Dropdown items={disabled ? [] : [
                    { label: 'Remove Field', onClick: () => this.props.removeField(this.props.name) }
                ]}/>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        commands: state.project.settings.commands,
        defaults: state.project.defaultCommands,
        puppets: state.project.puppets
    }
}

export default connect(mapStateToProps)(Field)
