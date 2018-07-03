import React, {Component} from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import * as JsSearch from 'js-search'
import List from './../ui/List'
import DraggablePuppet from './DraggablePuppet'

class Puppets extends Component {
    constructor(props) {
        super(props)

        this.componentWillReceiveProps(props)

        this.state = {
            size: props.size,
            filter: ''
        }

        this.onChange = this.onChange.bind(this)
        this.changeZoom = this.changeZoom.bind(this)
        this.openPuppet = this.openPuppet.bind(this)
    }

    onChange(e) {
        this.setState({
            filter: e.target.value
        })
    }

    changeZoom(e) {
        this.props.onZoomChange(parseInt(e.target.value, 10))
        this.setState({
            size: parseInt(e.target.value, 10)
        })
    }

    openPuppet(puppet) {
        return () => {
            this.props.dispatch({
                type: 'INSPECT',
                target: puppet,
                targetType: 'puppet'
            })
        }
    }

    componentWillReceiveProps(props) {
        if (!props.puppets) return

        this.search = new JsSearch.Search('name')
        this.search.indexStrategy = new JsSearch.AllSubstringsIndexStrategy()
        this.search.searchIndex = new JsSearch.UnorderedSearchIndex()

        this.search.addIndex('name')
        this.search.addDocuments(Object.values(props.puppets).map(puppet => ({ name: puppet.name })))
    }

    render() {
        const puppets = (this.state.filter === '' ?
            Object.keys(this.props.puppets) :
            this.search.search(this.state.filter).map(puppet => puppet.name)
        ).map(puppet => this.props.puppets[puppet])
        return (
            <div className="panel puppet-selector">
                <div className="bar flex-row">
                    <input
                        type="range"
                        min="60"
                        max="200"
                        value={this.state.size}
                        step="20"
                        onChange={this.changeZoom} />
                    <div className="flex-grow" />
                    <div className="search">
                        <input
                            type="search"
                            placeholder="All"
                            value={this.state.filter}
                            onChange={this.onChange} />
                    </div>
                </div>
                {this.state.size === 60 ?
                    <div className="full-panel">
                        <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                            {puppets.map(puppet => (
                                <DraggablePuppet
                                    key={puppet.name}
                                    small={true}
                                    puppet={puppet.name}
                                    openPuppet={this.openPuppet(puppet.name)} />
                            ))}
                        </Scrollbar>
                    </div> :
                    <List width={`${this.state.size}px`} height={`${this.state.size}px`}>
                        {puppets.map(puppet => (
                            <DraggablePuppet
                                key={puppet.name}
                                small={false}
                                puppet={puppet.name}
                                openPuppet={this.openPuppet(puppet.name)} />
                        ))}
                    </List>
                }            
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        puppets: state.project.puppets
    }
}

export default connect(mapStateToProps)(Puppets)
