import React, {Component} from 'react'
import Scrollbar from 'react-custom-scroll'
import './list.css'

class List extends Component {
    render() {
        return (
            <Scrollbar allowOuterScroll={true} heightRelativeToParent="100%">
                <div className="list">
                    {Object.keys(this.props.children).map(child => (
                        <div
                            className="list-item"
                            key={child}
                            style={{width: this.props.width, height: this.props.height}}>
                            {this.props.children[child]}
                        </div>
                    ))}
                    {Object.keys(this.props.children).map(child => (
                        <div className="list-pad" key={`${child}-pad`} style={{width: this.props.width}}></div>
                    ))}
                </div>
            </Scrollbar>
        )
    }
}

export default List
