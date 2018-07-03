import React, {Component} from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import Header from './../inspector/Header'
import Foldable from './../ui/Foldable'
import Checkbox from '../inspector/fields/Checkbox'
import Color from '../inspector/fields/Color'
import Number from '../inspector/fields/Number'

class ProjectSettings extends Component {
    constructor(props) {
        super(props)

        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(name) {
        return value => this.props.dispatch({
            type: 'UPDATE_SETTING',
            name,
            value
        })
    }

    render() {
        return (
            <div className="panel">
                <div className="inspector">   
                    <Header targetName="Project Settings" />
                    <div className="inspector-content">
                        <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                            <div className="action">
                                <Foldable title="Green Screen">
                                    <Color title="Green Screen Color" value={this.props.greenScreen} onChange={this.handleChange('greenScreen')} />
                                    <Checkbox title="Green Screen Enabled" value={this.props.greenScreenEnabled} onChange={this.handleChange('greenScreenEnabled')} />
                                </Foldable>
                            </div>
                            <div className="action">
                                <Foldable title="Stage Settings">
                                    <Number title="Puppet Scale" value={this.props.puppetScale} onChange={this.handleChange('puppetScale')} float={true} step="0.1" />
                                    <Number title="Number of Slots" value={this.props.numCharacters} onChange={this.handleChange('numCharacters')} />
                                </Foldable>
                            </div>
                            <div className="action">
                                <Foldable title="Movie Settings">
                                    <Number title="Frames Per Second" value={this.props.fps} onChange={this.handleChange('fps')} />
                                </Foldable>
                            </div>
                        </Scrollbar>
                    </div>
                </div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        greenScreen: state.project.settings.greenScreen,
        greenScreenEnabled: state.project.settings.greenScreenEnabled,
        puppetScale: state.project.settings.puppetScale,
        numCharacters: state.project.settings.numCharacters,
        fps: state.project.settings.fps
        // ignoring resolution for now
    }
}

export default connect(mapStateToProps)(ProjectSettings)
