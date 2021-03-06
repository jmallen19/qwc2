/**
* Copyright 2017, Sourcepole AG.
* All rights reserved.
*
* This source code is licensed under the BSD-style license found in the
* LICENSE file in the root directory of this source tree.
*/

const React = require('react');
const PropTypes = require('prop-types');
const {Glyphicon} = require('react-bootstrap');
const classnames = require('classnames');
require('./style/ToggleSwitch.css');

class ToggleSwitch extends React.Component {
    static PropTypes = {
        active: PropTypes.bool.isRequired,
        onChange: PropTypes.func.isRequired
    }
    render() {
        let classNames = classnames({
            "ToggleSwitch": true,
            "toggle-switch-active": this.props.active,
            "toggle-switch-inactive": !this.props.active
        });
        return (
            <div className={classNames} onClick={() => this.props.onChange(!this.props.active)}>
                <span className="toggle-switch-yes"><Glyphicon glyph="ok" /></span>
                <span className="toggle-switch-slider"><Glyphicon glyph="menu-hamburger" /></span>
                <span className="toggle-switch-no"><Glyphicon glyph="remove" /></span>
            </div>
        );
    }
};

module.exports = ToggleSwitch;
