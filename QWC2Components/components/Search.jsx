/**
 * Copyright 2016, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');
const {connect} = require('react-redux');
const {Glyphicon} = require('react-bootstrap');
const Spinner = require('react-spinkit');
const {createSelector} = require('reselect');
const classnames = require('classnames');
const Message = require('../../MapStore2Components/components/I18N/Message');
const LocaleUtils = require('../../MapStore2Components/utils/LocaleUtils');
const mapUtils = require('../../MapStore2Components/utils/MapUtils');
const CoordinatesUtils = require('../../MapStore2Components/utils/CoordinatesUtils');
const {addMarker, removeMarker, addLayerFeatures, removeLayer} = require('../actions/layers');
const {zoomToPoint} = require('../actions/map');
const {changeSearch, startSearch, searchMore} = require("../actions/search");
const displayCrsSelector = require('../selectors/displaycrs');
const VectorLayerUtils = require('../utils/VectorLayerUtils');
const UrlParams = require("../utils/UrlParams");
require('./style/Search.css');

class Search extends React.Component {
    static propTypes = {
        searchText: PropTypes.string,
        searchProvider: PropTypes.string, // The active provider key
        pendingProviders: PropTypes.array, // Providers for which results are pending
        searchProviders: PropTypes.object, // All available search providers
        results: PropTypes.array,
        theme: PropTypes.object,
        mapConfig: PropTypes.object,
        displaycrs: PropTypes.string,
        changeSearch: PropTypes.func,
        startSearch: PropTypes.func,
        searchMore: PropTypes.func,
        panToResult: PropTypes.func,
        addMarker: PropTypes.func,
        removeMarker: PropTypes.func,
        addLayerFeatures: PropTypes.func,
        removeLayer: PropTypes.func,
        searchOptions: PropTypes.object
    }
    static contextTypes = {
        messages: PropTypes.object
    }
    state = {
        currentResult: null, showfields: false, showproviderselection: false
    }
    componentDidMount() {
        this.searchTimer = 0;
    }
    componentWillReceiveProps(newProps) {
        // If the theme changed, reset search and select provider
        if(newProps.theme && newProps.theme !== this.props.theme) {
            // Only reset search text if the theme was changed (as opposed to the initial theme loaded)
            let newSearchText = this.props.theme ? "" : newProps.searchText;

            // Ensure search provider references a valid provider
            let newSearchProvider = newProps.searchProvider;
            if(!newProps.searchOptions.showProviderSelection || !newProps.theme.searchProviders || newProps.theme.searchProviders.length === 0) {
                newSearchProvider = null;
            } else if(!newProps.theme.searchProviders.includes(newProps.searchProvider)) {
                newSearchProvider = newProps.theme.searchProviders[0];
            }

            newProps.changeSearch(newSearchText, newSearchProvider);

            // If initial theme loaded and a search text is defined, fire off the search
            if(!this.props.theme) {
                this.search(newProps);
            }
        }
        // If results changed and a unique result is returned, select it automatically
        else if(newProps.results && newProps.results !== this.props.results) {
            if(newProps.results.length === 1 && newProps.results[0].items.length == 1) {
                this.showResult(newProps.results[0].items[0], false);
            }
        }
    }
    killEvent = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    }
    search = (props)  => {
        if(props.searchText) {
            props.startSearch(props.searchText, {displaycrs: props.displaycrs}, this.activeProviers(props));
        }
    }
    resetSearch = () => {
        this.setState({currentResult: null, focused: false, showfields: false});
        this.props.changeSearch("", this.props.searchProvider);
        this.props.removeMarker('searchmarker');
        this.props.removeLayer('searchselection');
    }
    onChange = (ev) => {
        this.props.changeSearch(ev.target.value, this.props.searchProvider);
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.search(this.props), 500);
    }
    checkShowFields = (ev) => {
        if(this.props.searchProvider && this.props.searchProviders[this.props.searchProvider].fields) {
            this.setState({showfields: true, focused: false});
            ev.preventDefault();
        }
    }
    onFocus = () => {
        if(!this.state.showfields && this.props.searchText && !this.props.results) {
            this.search(this.props);
        }
        this.setState({focused: true});
    }
    onKeyDown = (ev) => {
        if(ev.keyCode === 13) {
            this.search(this.props);
        } else if(ev.keyCode === 27) {
            ev.target.blur();
        }
    }
    activeProviers = (props) => {
        let keys = this.props.searchProvider ? [this.props.searchProvider] : props.theme.searchProviders;
        return keys.reduce((result, key) => {
            result[key] = props.searchProviders[key];
            return result;
        }, {});
    }
    render() {
        let placeholder = LocaleUtils.getMessageById(this.context.messages, "search.placeholder");
        if(!this.props.searchText) {
            var addonAfter = (<Glyphicon glyph="search"/>);
        } else if(this.props.searchText && this.state.focused && this.props.pendingProviders && this.props.pendingProviders.length > 0) {
            var addonAfter = (<Spinner name="circle" fadeIn="none" />);
        } else {
            var addonAfter = (<Glyphicon glyph="remove" onClick={this.resetSearch}/>);
        }
        let providerSelection = null;
        if(this.props.searchOptions.showProviderSelection) {
            let providerSelectionMenu = null;
            if(this.state.showproviderselection) {
                providerSelectionMenu = (
                    <ul className="searchbar-provider-selection">
                        {Object.keys(this.props.searchProviders).map(key => {
                            if(this.props.theme && this.props.theme.searchProviders.includes(key)) {
                                return (
                                    <li key={key} onClick={() => this.props.changeSearch(this.props.searchText, key)}>{this.props.searchProviders[key].label}</li>
                                );
                            }
                        })}
                    </ul>
                );
            }
            let addonClasses = classnames({
                'searchbar-addon': true,
                'searchbar-addon-active': this.state.showproviderselection
            });
            providerSelection = (
                <span className={addonClasses} onClick={() => this.setState({showproviderselection: !this.state.showproviderselection})}><Glyphicon glyph="chevron-down" />
                    {providerSelectionMenu}
                </span>
            );
            if(this.props.searchProvider) {
                placeholder += ": " + this.props.searchProviders[this.props.searchProvider].label;
            }
        }
        let searchform = null;
        this.formfields = {};
        if(this.state.showfields) {
            let fields = this.props.searchProviders[UrlParams.getParam("sp")].fields;
            let values = {};
            this.props.searchText.split(/\s*AND\s*/).map(pair => {
                let parts = pair.split(/\s*=\s*/);
                if(parts.length === 2) {
                    values[parts[0]] = parts[1];
                }
            });
            searchform = (
                <div className="search-form">
                    <table>
                        <tbody>
                            {fields.map(field => (
                                <tr key={field.id}>
                                    <td>{field.label}</td>
                                    <td><input ref={el => this.formfields[field.id] = el} type="text" defaultValue={values[field.id] || ""} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="search-form-buttons">
                        <button onClick={this.submitFormSearch}><Glyphicon glyph="search"/> Search</button>
                        <button onClick={() => this.setState({showfields: false}) }><Glyphicon glyph="remove"/> Cancel</button>
                    </div>
                </div>
            );
        }
        return (
            <div id="Search">
                <div className="searchbar-wrapper">
                    <div className="searchbar-container">
                        <input
                            className="searchbar"
                            placeholder={placeholder}
                            type="text"
                            ref={el => this.input = el}
                            value={this.props.searchText}
                            onBlur={() => this.setState({focused: false})}
                            onMouseDown={this.checkShowFields}
                            onFocus={this.onFocus}
                            onKeyDown={this.onKeyDown}
                            onChange={this.onChange} />
                        <span className="searchbar-addon">
                            {addonAfter}
                        </span>
                    </div>
                    {searchform}
                    {this.renderSearchResults()}
                </div>
                {providerSelection}
            </div>
        )
    }
    submitFormSearch = () => {
        let comp = this.props.searchProviders[UrlParams.getParam("sp")].comparator;
        let filters = Object.keys(this.formfields).map(key => {
            return  key + "=" + this.formfields[key].value;
        });
        let searchText = filters.join(" AND ");
        if(searchText !== this.props.searchText || !this.props.results) {
            this.props.changeSearch(searchText, this.props.searchProvider);
            this.props.startSearch(searchText, {displaycrs: this.props.displaycrs}, this.activeProviers(this.props));
        }
        this.input.focus();
        this.setState({showfields: false});
    }
    renderSearchResults = () => {
        if(!this.props.results || this.props.results.length === 0 || !this.state.focused) {
            return null;
        }
        return (
            <ul className="search-results">
                {this.props.results.map(category => this.renderCategory(category))}
            </ul>
        );
    }
    renderCategory = (category) => {
        let title = category.titlemsgid ? (<Message msgId={category.titlemsgid} />) : category.title;
        return (
            <li key={category.id}>
                <span className="search-results-category-title">{title}</span>
                <ul>{category.items.map(item => this.renderItem(item))}</ul>
            </li>
        )
    }
    renderItem = (item) => {
        if(item.more) {
            return (
                <li key={item.id}
                    onMouseDown={this.killEvent}
                    onClick={() => this.props.searchMore(item, this.props.searchText, this.activeProviers(this.props))}>
                    <i><Message msgId="search.more" /></i>
                </li>
            );
        }
        return (
            <li key={item.id} title={item.text}
                onMouseDown={() => this.showResult(item)}
                dangerouslySetInnerHTML={{__html: item.text}}></li>
        );
    }
    showResult = (item, zoom=true) => {
        this.props.removeLayer("searchselection");
        let text = item.label !== undefined ? item.label : item.text;
        if(zoom && this.props.mapConfig !== undefined) {
            // find max zoom level greater than min scale
            let maxZoom = 0;
            const scales = mapUtils.getScales(this.props.mapConfig.projection);
            for (let i in scales) {
                if (scales[i] < this.props.searchOptions.minScale) {
                    break;
                } else {
                    maxZoom = i;
                }
            }

            // zoom to result using max zoom level
            const newZoom = mapUtils.getZoomForExtent(CoordinatesUtils.reprojectBbox(item.bbox, item.crs, this.props.mapConfig.projection), this.props.mapConfig.size, 0, maxZoom, null);
            this.props.panToResult({x: item.x, y: item.y}, newZoom, item.crs);
        }
        if(item.provider && this.props.searchProviders[item.provider].getResultGeometry) {
            this.props.searchProviders[item.provider].getResultGeometry(item, (item, geometry, crs) => { this.showFeatureGeometry(item, geometry, crs, text)});
        }
        else{
            this.props.addMarker('searchmarker', [item.x, item.y], text, item.crs);
        }
        this.setState({currentResult: item});
    }
    showFeatureGeometry = (item, geometry, crs, text) => {
        if(item === this.state.currentResult) {
            let feature = VectorLayerUtils.wktToGeoJSON(geometry);
            feature.geometry = VectorLayerUtils.reprojectGeometry(feature.geometry, crs, this.props.mapConfig.projection);
            let geojson  = new ol.format.GeoJSON().readFeature(feature);
            let center = this.getFeatureCenter(geojson.getGeometry());
            this.props.addMarker('searchmarker', center, text, this.props.mapConfig.projection);
            let layer = {
                id: "searchselection",
                visibility: true,
                queryable: false,
                priority: 3,
                layertreehidden: true
            };
            this.props.addLayerFeatures(layer, [feature], true);
        }
    }
    getFeatureCenter = (geometry) => {
        let type = geometry.getType();
        let center;
        switch (type) {
            case "Polygon":
                center = geometry.getInteriorPoint().getCoordinates();
                break;
            case "MultiPolygon":
                center = geometry.getInteriorPoints().getClosestPoint(ol.extent.getCenter(geometry.getExtent()));
                break;
            case "Point":
                center = geometry.getCoordinates();
                break;
            case "MultiPoint":
                center = geometry.getClosestPoint(ol.extent.getCenter(geometry.getExtent()));
                break;
            case "LineString":
                center = geometry.getCoordinateAt(0.5);
                break;
            case "MultiLineString":
                center = geometry.getClosestPoint(ol.extent.getCenter(geometry.getExtent()));
                break;
            case "Circle":
                center = geometry.getCenter();
                break;
        }
        return center;
    }
};

module.exports = (searchProviders) => connect(createSelector([state => state, displayCrsSelector], (state, displaycrs) => ({
    searchText: state.search ? state.search.text : "",
    searchProvider: state.search ?  state.search.provider : null,
    pendingProviders: state.search ? state.search.pendingProviders : null,
    results: state.search ? state.search.results : null,
    mapConfig: state.map ? state.map : undefined,
    displaycrs: displaycrs,
    theme: state.theme ? state.theme.current : null,
    searchProviders: searchProviders
})), {
    changeSearch: changeSearch,
    startSearch: startSearch,
    searchMore: searchMore,
    panToResult: zoomToPoint,
    addMarker: addMarker,
    removeMarker: removeMarker,
    addLayerFeatures: addLayerFeatures,
    removeLayer: removeLayer
})(Search);
