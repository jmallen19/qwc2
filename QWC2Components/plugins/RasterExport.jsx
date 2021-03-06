/**
 * Copyright 2017, Sourcepole AG.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');
const {connect} = require('react-redux');
const Message = require('../../MapStore2Components/components/I18N/Message');
const CoordinatesUtils = require('../../MapStore2Components/utils/CoordinatesUtils');
const ProxyUtils = require("../../MapStore2Components/utils/ProxyUtils");
const {setCurrentTask} = require('../actions/task');
const {TaskBar} = require('../components/TaskBar');
const PrintFrame = require('../components/PrintFrame');
const VectorLayerUtils = require('../utils/VectorLayerUtils');
require('./style/RasterExport.css');

class RasterExport extends React.Component {
    static propTypes = {
        theme: PropTypes.object,
        map: PropTypes.object,
        themeLayerId: PropTypes.string,
        layers: PropTypes.array,
        setCurrentTask: PropTypes.func,
        visible: PropTypes.bool,
        dpis: PropTypes.array
    }
    state = {
        selectedFormat: null,
        visible: false,
        dpi: null
    }
    formatChanged = (ev) => {
        this.setState({selectedFormat: ev.target.value})
    }
    dpiChanged = (ev) => {
        this.setState({dpi: ev.target.value});
    }
    renderBody = () => {
        if(!this.props.theme) {
            return null;
        }
        const formatMap = {
            "image/jpeg" : "JPEG",
            "image/png": "PNG 24bit",
            "image/png; mode=16bit": "PNG 16bit",
            "image/png; mode=8bit" : "PNG 8bit",
            "image/png; mode=1bit" : "PNG 1bit",
            "image/geotiff" : "GeoTIFF"
        };

        let themeLayer = this.props.layers.find(layer => layer.id === this.props.themeLayerId);
        let availableFormats = this.props.theme.availableFormats;
        let defaultFormat = availableFormats.includes('image/geotiff') ? 'image/geotiff' : availableFormats[0];
        let selectedFormat = this.state.selectedFormat || defaultFormat;
        let filename = this.props.theme.name + "." + selectedFormat.split(";")[0].split("/").pop();
        let action = ProxyUtils.addProxyIfNeeded(this.props.theme.url, "&filename=" + encodeURIComponent(filename));
        let exportLayers = themeLayer ? themeLayer.params.LAYERS : "";
        let exportOpacities = themeLayer ? themeLayer.params.OPACITIES : "";
        let backgroundLayer = this.props.layers.find(layer => layer.group === 'background' && layer.visibility === true);
        let themeBackgroundLayer = backgroundLayer ? this.props.theme.backgroundLayers.find(entry => entry.name === backgroundLayer.name) : null;
        let exportBackgroundLayer = themeBackgroundLayer ? themeBackgroundLayer.printLayer : null;
        if(exportBackgroundLayer) {
            exportLayers = exportBackgroundLayer + "," + exportLayers;
            exportOpacities = "255," + exportOpacities;
        }
        let dpiSelector = null;
        if(this.props.dpis) {
            dpiSelector = (
                <span>
                    <Message msgId="rasterexport.resolution" />&nbsp;
                    <select name="DPI" defaultValue={this.state.dpi || this.props.dpis[0]} onChange={this.dpiChanged}>
                        {this.props.dpis.map(dpi => {
                            return (<option key={dpi+"dpi"} value={dpi}>{dpi+" dpi"}</option>);
                        })}
                    </select>
                </span>
            );
        }

        // Local vector layer features
        let mapCrs = this.props.map.projection;
        let highlightParams = VectorLayerUtils.createPrintHighlighParams(this.props.layers, mapCrs, parseInt(this.state.dpi));

        return (
            <span role="body">
                <form ref={form => this.form = form} action={action} method="POST" target="_blank" >
                <div className="help-text"><Message msgId="rasterexport.selectinfo" /></div>
                <div className="raster-export-settings">
                    <span>
                        <Message msgId="rasterexport.format" />&nbsp;
                        <select name="FORMAT" defaultValue={defaultFormat} onChange={this.formatChanged}>
                            {availableFormats.map(format => {
                                if(format.startsWith('image/')) {
                                    return (<option key={format} value={format}>{formatMap[format] || format}</option>);
                                } else {
                                    return null;
                                }
                            })}
                        </select>
                    </span>
                    {dpiSelector}
                </div>
                <input type="hidden" name="SERVICE" value="WMS" readOnly="true" />
                <input type="hidden" name="VERSION" value={themeLayer.params.VERSION || "1.3.0"} readOnly="true" />
                <input type="hidden" name="REQUEST" value="GetMap" readOnly="true" />
                <input type="hidden" name="FORMAT" value="image/png" readOnly="true" />
                <input type="hidden" name="LAYERS" value={exportLayers} readOnly="true" />
                <input type="hidden" name="OPACITIES" value={exportOpacities} readOnly="true" />
                <input type="hidden" name="TRANSPARENT" value="true" readOnly="true" />
                <input type="hidden" name="TILED" value="false" readOnly="true" />
                <input type="hidden" name="STYLES" value="" readOnly="true" />
                <input type="hidden" name="CRS" value={this.props.map.projection} readOnly="true" />
                <input type="hidden" name="FILENAME" value={filename} readOnly="true" />
                <input ref={input => this.extentInput = input} type="hidden" name="BBOX" value="" readOnly="true" />
                <input ref={input => this.widthInput = input} type="hidden" name="WIDTH" value="" readOnly="true" />
                <input ref={input => this.heightInput = input} type="hidden" name="HEIGHT" value="" readOnly="true" />
                {Object.keys(this.props.theme.watermark || {}).map(key => {
                    return (<input key={key} type="hidden" name={"WATERMARK_" + key.toUpperCase()} value={this.props.theme.watermark[key]} readOnly="true" />)
                })}
                <input readOnly="true" name={"HIGHLIGHT_GEOM"} type="hidden" value={highlightParams.geoms.join(";")} />
                <input readOnly="true" name={"HIGHLIGHT_SYMBOL"} type="hidden" value={highlightParams.styles.join(";")} />
                <input readOnly="true" name={"HIGHLIGHT_LABELSTRING"} type="hidden" value={highlightParams.labels.join(";")} />
                <input readOnly="true" name={"HIGHLIGHT_LABELCOLOR"} type="hidden" value={highlightParams.labelFillColors.join(";")} />
                <input readOnly="true" name={"HIGHLIGHT_LABELBUFFERCOLOR"} type="hidden" value={highlightParams.labelOultineColors.join(";")} />
                <input readOnly="true" name={"HIGHLIGHT_LABELBUFFERSIZE"} type="hidden" value={highlightParams.labelOutlineSizes.join(";")} />
                <input readOnly="true" name={"HIGHLIGHT_LABELSIZE"} type="hidden" value={highlightParams.labelSizes.join(";")} />
                </form>
            </span>
        );
    }
    render() {
        if(!this.props.visible) {
            return null;
        }
        return (
            <TaskBar task="RasterExport">
                {this.renderBody()}
                <PrintFrame role="extra" map={this.props.map} bboxSelected={this.bboxSelected} />
            </TaskBar>
        );
    }
    bboxSelected = (bbox, pixelsize) => {
        let extent = "";
        if(this.props.map.projection == "EPSG:4326") {
            extent = bbox.miny + "," + bbox.minx + "," + bbox.maxy + "," + bbox.maxx;
        } else {
            extent = bbox.minx + "," + bbox.miny + "," + bbox.maxx + "," + bbox.maxy;
        }
        this.extentInput.value = extent;
        this.widthInput.value = Math.round(pixelsize[0] * parseInt(this.state.dpi || 96) / 96.);
        this.heightInput.value = Math.round(pixelsize[1] * parseInt(this.state.dpi || 96) / 96.);
        this.form.submit();
        this.props.setCurrentTask(null);
    }
};

const selector = (state) => ({
    visible: state.task ? state.task.current === 'RasterExport': false,
    theme: state.theme ? state.theme.current : null,
    map: state.map ? state.map : null,
    themeLayerId: state.theme ? state.theme.currentlayer : "",
    layers: state.layers ? state.layers.flat : []
});

module.exports = {
    RasterExportPlugin: connect(selector, {
        setCurrentTask: setCurrentTask
    })(RasterExport)
}
