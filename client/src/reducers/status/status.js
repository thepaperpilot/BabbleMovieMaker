const util = require('./../util')

export const DEFAULTS = []

function log(type) {
    return (state, action) => {
        return state.concat({
            message: action.content,
            type
        })
    }
}

function error(state, action) {
    return state.concat({
        message: action.content,
        error: action.error,
        type: 'error'
    })
}

export default util.createReducer(DEFAULTS, {
    'INFO': log('info'),
    'LOG': log('log'),
    'WARN': log('warn'),
    'ERROR': error
})
