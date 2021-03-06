/**
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {CHANGE_DRAWING_STATUS, SET_CURRENT_STYLE} = require('../actions/draw');

const assign = require('object-assign');

const initialState = {
    drawStatus: null,
    drawOwner: null,
    drawMethod: null,
    features: []
};

function draw(state = initialState, action) {
    switch (action.type) {
        case CHANGE_DRAWING_STATUS:
            return assign({}, state, {
                drawStatus: action.status,
                drawOwner: action.owner,
                drawMethod: action.method,
                features: action.features
            });
        case SET_CURRENT_STYLE:
            return assign({}, state, {
                currentStyle: action.currentStyle
            });
        default:
            return state;
    }
}

module.exports = draw;
