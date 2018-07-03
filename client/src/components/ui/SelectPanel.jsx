import React, {Component} from 'react'
import Scrollbar from 'react-custom-scroll'
import Select from 'react-select'
import createFilterOptions from 'react-select-fast-filter-options'
import './select.css'
import './react-select.css'

class SelectPanel extends Component {
    constructor(props) {
        super(props)

        this.select = React.createRef()

        this.state = {
            inputValue: ''
        }

        this.focus = this.focus.bind(this)
        this.blur = this.blur.bind(this)
        this.onInputChange = this.onInputChange.bind(this)
    }

    focus() {
        this.select.current.focus()
    }

    blur() {
        this.select.current.blur()
    }

    onInputChange(inputValue, { action }) {
        if (this.props.onInputChange)
            this.props.onInputChange(inputValue, { action })
        switch (action) {
        case 'input-change':
            this.setState({ inputValue })
            break
        default:
            break
        }
    }

    render() {
        // TODO only recreate this when this.props.options changes?
        const filterOptions = createFilterOptions({ options: this.props.options })
        // TODO once react-virtualized-select gets updated for react-select 2.0, use it
        // (we need v2 so we can can control the element more - such as setting menuIsOpen)
        return (
            <Select
                ref={this.select}
                onInputChange={this.onInputChange}
                onChange={this.props.onChange}
                inputValue={this.state.inputValue}
                menuIsOpen={true}
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="All"
                options={this.props.options}
                closeMenuOnSelect={false}
                value={null}
                components={{
                    MenuList: props => (
                        <Scrollbar allowOuterScroll={true} heightRelativeToParent="362px">
                            {props.children}
                        </Scrollbar>
                    )
                }}
                filterOptions={filterOptions} />
        )
    }
}

export default SelectPanel
