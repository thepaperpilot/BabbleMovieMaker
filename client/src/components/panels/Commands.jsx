import React, {Component} from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import ReorderableList from './../ui/ReorderableList'
import * as JsSearch from 'js-search'
import InlineEdit from './../ui/InlineEdit'

class Commands extends ReorderableList {
    constructor(props) {
        super(props)

        this.componentWillReceiveProps(props)

        this.state = {
            filter: ''
        }

        this.onChange = this.onChange.bind(this)
        this.newCommand = this.newCommand.bind(this)
        this.renameCommand = this.renameCommand.bind(this)
        this.deleteCommand = this.deleteCommand.bind(this)
        this.moveCommand = this.moveCommand.bind(this)
    }

    onChange(e) {
        this.setState({
            filter: e.target.value
        })
    }

    newCommand() {
        this.props.dispatch({ type: 'NEW_COMMAND' })
    }

    renameCommand(index) {
        return name => {
            if (name && !Object.keys(this.props.commands).includes(name))
                this.props.dispatch({ type: 'RENAME_COMMAND', index, command: name })
        }
    }

    deleteCommand(index) {
        return () => this.props.dispatch({
            type: 'REMOVE_COMMAND',
            index
        })
    }

    componentWillReceiveProps(props) {
        if (!props.commands) return

        this.search = new JsSearch.Search('command')
        this.search.indexStrategy = new JsSearch.AllSubstringsIndexStrategy()
        this.search.searchIndex = new JsSearch.UnorderedSearchIndex()

        this.search.addIndex('command')
        this.search.addIndex('title')
        this.search.addDocuments(props.commands.map((command, i) => ({
            command: command.command,
            title: command.title,
            index: i
        })))
    }

    moveCommand(before, after) {
        this.scheduleUpdate({
            type: 'MOVE_COMMAND',
            command: before,
            after
        })
    }

    render() {
        const InlineCard = InlineEdit('command')
        const items = (this.state.filter === '' ?
            this.props.commands :
            this.search.search(this.state.filter)
        ).map(command => (
            <InlineCard
                key={command.command}
                target={command.command}
                targetType="command"
                className="line-item"
                disabled={this.props.defaults.some(c => c.command === command.command)}
                onChange={this.renameCommand(command.index)}
                delete={this.deleteCommand(command.index)}
                onMove={this.moveCommand} />
        ))
        return (
            <div className="panel">
                <div className="bar flex-row">
                    <button onClick={this.newCommand}>New Command</button>
                    <div className="flex-grow" />
                    <div className="search">
                        <input
                            type="search"
                            placeholder="All"
                            value={this.state.filter}
                            onChange={this.onChange} />
                    </div>
                </div>
                <div className="full-panel">
                    <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                        {items.length ? items : <div className="empty">No Commands</div>}
                    </Scrollbar>
                </div>
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

export default connect(mapStateToProps)(Commands)
