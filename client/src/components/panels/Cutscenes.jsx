import React from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import ReorderableList from './../ui/ReorderableList'
import * as JsSearch from 'js-search'
import InlineEdit from './../ui/InlineEdit'

class Cutscenes extends ReorderableList {
    constructor(props) {
        super(props)

        this.componentWillReceiveProps(props)

        this.state = {
            filter: ''
        }

        this.onChange = this.onChange.bind(this)
        this.onDoubleClick = this.onDoubleClick.bind(this)
        this.newCutscene = this.newCutscene.bind(this)
        this.renameCutscene = this.renameCutscene.bind(this)
        this.deleteCutscene = this.deleteCutscene.bind(this)
        this.moveCutscenes = this.moveCutscenes.bind(this)
    }

    onChange(e) {
        this.setState({
            filter: e.target.value
        })
    }

    onDoubleClick(script) {
        return () => this.props.dispatch({
            type: 'LOAD_SCRIPT',
            script
        })
    }

    newCutscene() {
        this.props.dispatch({ type: 'NEW_CUTSCENE' })
    }

    renameCutscene(cutscene) {
        return name => {
            if (name && !this.props.scripts.includes(name))
                this.props.dispatch({ type: 'RENAME_CUTSCENE', oldName: cutscene, newName: name })
        }
    }

    deleteCutscene(cutscene) {
        return () => this.props.dispatch({
            type: 'REMOVE_CUTSCENE',
            cutscene
        })
    }

    componentWillReceiveProps(props) {
        if (!props.scripts) return

        this.search = new JsSearch.Search('script')
        this.search.indexStrategy = new JsSearch.AllSubstringsIndexStrategy()
        this.search.searchIndex = new JsSearch.UnorderedSearchIndex()

        this.search.addIndex('script')
        this.search.addDocuments(props.scripts.map(script => ({ script })))
    }

    moveCutscenes(before, after) {
        this.scheduleUpdate({
            type: 'MOVE_CUTSCENE',
            script: before,
            after
        })
    }

    render() {
        const InlineCard = InlineEdit('cutscene')
        const items = (this.state.filter === '' ?
            this.props.scripts :
            this.search.search(this.state.filter).map(script => script.script)
        ).map(script => (
            <InlineCard
                key={script}
                target={script}
                targetType="cutscene"
                className="line-item"
                onDoubleClick={this.onDoubleClick(script)}
                onChange={this.renameCutscene(script)}
                delete={this.deleteCutscene(script)}
                onMove={this.moveCutscenes} />
        ))
        return (
            <div className="panel">
                <div className="bar flex-row">
                    <button onClick={this.newCutscene}>New Cutscene</button>
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
                        {items.length ? items : <div className="empty">No Cutscenes</div>}
                    </Scrollbar>
                </div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        scripts: state.project.scripts.map(s => s.name),
        target: state.inspector.target,
        targetType: state.inspector.targetType
    }
}

export default connect(mapStateToProps)(Cutscenes)
