import React, {Component} from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import Action from './Action'
import Header from './Header'
import Framecount from './Framecount'
import FootSelect from './FootSelect'
import PuppetState from './PuppetState'

class Actor extends Component {
    constructor(props) {
        super(props)

        this.onChange = this.onChange.bind(this)
    }

    onChange(value) {
        this.props.dispatch({
            type: 'ADD_ACTION',
            actor: this.props.target,
            frame: this.props.frame,
            command: value.command,
            fields: value.fields
        })
    }

    render() {
        const actor = this.props.target

        let actions = []

        for (let i = 0; i < this.props.frame; i++) {
            if (this.props.keyframes[i])
                actions = actions.concat(this.props.keyframes[i].filter(action =>
                    (action.id === actor || action.target === actor) &&
                    this.props.frame <= i + Math.ceil(action.delay * this.props.fps / 1000)
                ).map(action => {
                    const index = this.props.keyframes[i].indexOf(action)
                    return (
                        <Action
                            action={action}
                            defaultFolded={true}
                            subtitle={this.props.frame === i + Math.ceil(action.delay * this.props.fps / 1000) ? 'finished' : 'in progress'}
                            start={i}
                            index={index}
                            error={this.props.errors[i][index]}
                            key={index} />
                    )
                }))
        }

        if (this.props.keyframes[this.props.frame])
            actions = actions.concat(this.props.keyframes[this.props.frame].filter(action =>
                action.id === actor || action.target === actor
            ).map(action => {
                const index = this.props.keyframes[this.props.frame].indexOf(action)
                return (<Action
                    action={action}
                    start={this.props.frame}
                    index={index}
                    error={this.props.errors[this.props.frame][index]}
                    key={index} />
                )
            }))

        const commands = this.props.commands.filter(command => {
            const fields = command.fields
            return 'id' in fields || 'target' in fields
        }).map(command => ({
            value: command,
            label: command.title
        }))

        return (
            <div className="inspector">
                <Header targetName={actor} />
                <Framecount/>
                <div className="inspector-content">
                    <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                        <PuppetState actor={actor} />
                        {actions}
                    </Scrollbar>
                </div>
                <FootSelect title="Add Action" options={commands} onChange={this.onChange} />
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        fps: state.project.settings.fps,
        actors: state.actors,
        frame: state.timeline.present.frame,
        keyframes: state.timeline.present.keyframes.actions,
        errors: state.timeline.present.keyframes.errors,
        commands: state.project.settings.commands
    }
}

export default connect(mapStateToProps)(Actor)
