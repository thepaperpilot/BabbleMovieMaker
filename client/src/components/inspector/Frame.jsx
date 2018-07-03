import React from 'react'
import { connect } from 'react-redux'
import Scrollbar from 'react-custom-scroll'
import Action from './Action'
import Header from './Header'
import Framecount from './Framecount'
import FootSelect from './FootSelect'

function mapStateToProps(state) {
    return {
        keyframes: state.timeline.present.keyframes.actions,
        commands: state.project.settings.commands
    }
}

export default connect(mapStateToProps)(props => {
    let actions = []

    for (let i = 0; i < props.frame; i++) {
        if (props.keyframes[i])
            actions = actions.concat(props.keyframes[i].filter(action =>
                !('id' in action || 'target' in action) &&
                props.target <= i + Math.ceil(action.delay * props.fps / 1000)
            ).map((action, index) => (
                <Action
                    action={action}
                    defaultFolded={true}
                    subtitle={props.target === i + Math.ceil(action.delay * props.fps / 1000) ? 'finished' : 'in progress'}
                    start={i}
                    index={props.keyframes[i].indexOf(action)}
                    key={index} />
            )))
    }

    if (props.keyframes[props.target])
        actions = actions.concat(props.keyframes[props.target].filter(action =>
            !('id' in action || 'target' in action)
        ).map((action, index) => (
            <Action
                action={action}
                start={props.target}
                index={props.keyframes[props.target].indexOf(action)}
                key={index} />
        )))

    const commands = props.commands.filter(command => 
        !('id' in command.fields || 'target' in command.fields)
    ).map(command => ({
        value: command.command,
        label: command.title
    }))

    const onChange = value => {
        props.dispatch({
            type: 'ADD_ACTION',
            frame: props.target,
            command: value,
            fields: props.commands[value].fields
        })
    }

    return (
        <div className="inspector">
            <Header targetName={`Frame ${props.target + 1}`} />
            <Framecount/>
            <div className="inspector-content">
                <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                    {actions}
                </Scrollbar>
            </div>
            <FootSelect title="Add Action" options={commands} onChange={onChange} />
        </div>
    )
})
