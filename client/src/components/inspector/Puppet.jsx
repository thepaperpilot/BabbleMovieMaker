import React, {Component} from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import Header from './Header'
import Checkbox from './fields/Checkbox'
import Number from './fields/Number'

class Puppet extends Component {
    render() {
        const puppet = this.props.puppets[this.props.target]
        const thumbnails = this.props.puppetThumbnails[this.props.target].slice(0, -4)

        return (
            <div className="inspector">
                <Header targetName={this.props.target} />
                <div className="inspector-content">
                    <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                        <pre className="info">
                            Edit this puppet in Babble Buds. When you save the project the puppet will automatically update here. 
                        </pre>
                        <div className="action">
                            <Checkbox title="Bobble head while talking" value={puppet.deadbonesStyle} disabled={true} />
                            <Number title="Eyes Duration (while babbling)" value={puppet.eyeBabbleDuration || 2000} disabled={true} />
                            <Number title="Mouth Duration (while babbling)" value={puppet.mouthBabbleDuration || 270} disabled={true} />
                        </div>
                        <div className="list">
                            {Object.keys(puppet.emotes).filter(e => puppet.emotes[e].enabled).map(e => {
                                const emote = puppet.emotes[e]
                                return (
                                    <div className="list-item" style={{height: '120px', width: '120px'}}>
                                        <div className="char" key={emote.name}>
                                            <div className="desc">{emote.name}</div>
                                            <img alt={emote.name} src={`${thumbnails}/${e}.png`}/>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Scrollbar>
                </div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        puppets: state.project.puppets,
        puppetThumbnails: state.project.puppetThumbnails
    }
}

export default connect(mapStateToProps)(Puppet)
