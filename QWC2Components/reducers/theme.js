/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const assign = require('object-assign');
const UrlParams = require("../utils/UrlParams");
const {SET_CURRENT_THEME, CLEAR_CURRENT_THEME} = require('../actions/theme');

function themeSwitcher(state = {switcherfilter: "", current: null}, action) {
    switch (action.type) {
        case CLEAR_CURRENT_THEME:
            UrlParams.updateParams({t: undefined});
            return assign({}, state, {
                current: null,
                currentlayer: null
            });
        case SET_CURRENT_THEME:
        UrlParams.updateParams({t: action.theme.id});
            return assign({}, state, {
                current: action.theme,
                currentlayer: action.layer
            });
        default:
            return state;
    }
}

module.exports = themeSwitcher;
