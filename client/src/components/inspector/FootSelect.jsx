import React, {Component} from 'react'
import Select from './../ui/SelectPanel'
import Footpanel from './../ui/Footpanel'

class FootSelect extends Component {
    constructor(props) {
        super(props)

        this.select = React.createRef()
        this.footpanel = React.createRef()

        this.onOpen = this.onOpen.bind(this)
        this.onClose = this.onClose.bind(this)
        this.onChange = this.onChange.bind(this)
    }

    onOpen() {
        this.select.current.focus()
    }

    onClose() {
        this.select.current.blur()
    }

    onChange({ value }) {
        this.footpanel.current.toggleOpen()
        this.props.onChange(value)
    }

    render() {
        return (
            <div style={{flexShrink: 0}}>
                <Footpanel
                    ref={this.footpanel}
                    label={this.props.title}
                    onOpen={this.onOpen}
                    onClose={this.onClose}>
                    <Select
                        ref={this.select}
                        options={this.props.options}
                        onChange={this.onChange} />
                </Footpanel>
            </div>
        )
    }
}

export default FootSelect
