/* 
 * Copyright (C) 2014 3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * Spatial Filter component
 * This component adds the functionality of creating a spatial filter: a filter based on a drawn geometry (polygon, rectangle, circle or freeform). All features must
 * be in or partly in the drawn geometry (ie. intersects).
 * @author <a href="mailto:meinetoonen@b3partners.nl">Meine Toonen</a>
 */
Ext.define ("viewer.components.SpatialFilter",{
    extend: "viewer.components.Component",
    layerSelector:null,
    drawingButtonIds:null,
    vectorLayer:null,
    iconPath:null,
    features:null,
    config:{
        title: "",
        iconUrl: "",
        tooltip: "",
        layers:null,
        label: ""
    },
    constructor: function (conf){        
        viewer.components.SpatialFilter.superclass.constructor.call(this, conf);
        this.initConfig(conf);     
        var me = this;
        this.features = new Array();
        this.renderButton({
            handler: function(){
                me.showWindow();
            },
            text: me.title,
            icon: me.iconUrl,
            tooltip: me.tooltip,
            label: me.label
        });
        // Needed to untoggle the buttons when drawing is finished
        this.drawingButtonIds = {
            'polygon': Ext.id(),
            'circle': Ext.id(),
            'box': Ext.id()
        };
        this.iconPath=contextPath+"/viewer-html/components/resources/images/drawing/";
     
        this.loadWindow(); 
        this.viewerController.addListener(viewer.viewercontroller.controller.Event.ON_SELECTEDCONTENT_CHANGE,this.selectedContentChanged,this );
        return this;
    },

    showWindow : function(){
        if(this.vectorLayer === null){
            this.createVectorLayer();
        }
        this.layerSelector.initLayers();
        this.popup.popupWin.setTitle(this.title);
        this.popup.show();
    },
    
    drawGeometry: function(type){
        var appendFilter = Ext.getCmp (this.name + 'AppendFilter')
        if(!appendFilter.getValue()){
            this.vectorLayer.removeAllFeatures();
            this.features = new Array();
        }
        this.vectorLayer.drawFeature(type);
    },
    applyFilter : function(){
        var features = this.features;;
        var multi = "";
        if (features.length > 0) {
            multi += "MULTIPOLYGON (";
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                var coords = feature.replace("POLYGON", "");
                if (i > 0) {
                    multi += ",";
                }
                multi += coords;
            }
            multi += ")";
        }
        this.setFilter(multi);
    },
    setFilter: function(geometry){
        var appLayer = this.layerSelector.getSelectedAppLayer();
        var me = this;          
        if(appLayer.attributes === undefined || appLayer.attributes === null) {   
            this.viewerController.getAppLayerFeatureService(appLayer).loadAttributes(appLayer,function(){
                me.setFilter(geometry);
            },function(e){
                Ext.MessageBox.alert("Error", e);
            });
        }else{
            //var radius = this.getRadius();
            var geomAttr = appLayer.geometryAttribute; 
            if (geomAttr !== undefined){
                //var filter="DWITHIN(\""+geomAttr+"\", POINT("+this.location.x+" "+this.location.y+"), "+radius+", meters)";
                var filter = "";
                if(geometry.length > 0){
                    filter = "INTERSECTS(" + geomAttr + ", " + geometry + ")";
                }
                this.viewerController.setFilter(
                    Ext.create("viewer.components.CQLFilterWrapper",{
                        id: "filter_"+this.getName(),
                        cql: filter,
                        operator : "AND",
                        type: "GEOMETRY"
                    }),appLayer);
            }            
        }
       
    },
    // <editor-fold desc="Event handlers" defaultstate="collapsed">
    layerChanged : function (appLayer,afterLoadAttributes,scope){
        var buttons = Ext.getCmp(this.name +"filterButtons");
        if(appLayer !== null){
            buttons.setDisabled(false);
            this.vectorLayer.removeAllFeatures();
        }else{
            buttons.setDisabled(true);
            this.cancel();
        }
    },
      
    featureAdded : function (obj, feature){
        var applyDirect = Ext.getCmp (this.name + 'ApplyDirect')
        this.features.push(feature.wktgeom);
        if(applyDirect.getValue()){
            this.applyFilter();
        }
        this.toggleAll(false);
    },
    selectedContentChanged : function (){
        if(this.vectorLayer === null){
            this.createVectorLayer();
        }else{
            this.viewerController.mapComponent.getMap().addLayer(this.vectorLayer);
        }
    },
    // </editor-fold>
    // 
    // <editor-fold desc="Initialization methods" defaultstate="collapsed">
    loadWindow : function (){
        var me =this;
        var drawingItems = [
        {
            xtype: 'button',
            id: this.drawingButtonIds.polygon,
            icon: this.iconPath+"shape_polygon_red.png",
            componentCls: 'mobileLarge',
            tooltip: "Teken een polygoon",
            enableToggle: true,
            toggleGroup: 'drawingTools',
            listeners: {
                click:{
                    scope: me,
                    fn: function(){
                        me.drawGeometry("Polygon");
                    }
                }
            }
        },
        {
            xtype: 'button',
            id: this.drawingButtonIds.box,
            icon: this.iconPath+"shape_square_red.png",
            componentCls: 'mobileLarge',
            tooltip: "Teken een vierkant",
            enableToggle: true,
            toggleGroup: 'drawingTools',
            listeners: {
                click:{
                    scope: me,
                    fn: function(){
                        me.drawGeometry("Box");
                    }
                }
            }
        }];
        if(!MobileManager.isMobile()) {
            drawingItems.push({
                xtype: 'button',
                id: this.drawingButtonIds.circle,
                icon: this.iconPath+"shape_circle_red.png",
                componentCls: 'mobileLarge',
                tooltip: "Teken een cirkel",
                enableToggle: true,
                toggleGroup: 'drawingTools',
                listeners: {
                    click:{
                        scope: me,
                        fn: function(){
                            me.drawGeometry("Circle");
                        }
                    }
                }
            });
        }
        drawingItems.push({
            xtype: "checkbox",
            boxLabel: 'Meerdere geometriën als filter',
            name: 'appendFilter',
            inputValue: true,
            checked: false,
            id: this.name + 'AppendFilter'
        },
        {
            xtype: "checkbox",
            boxLabel: 'Filter direct toepassen',
            name: 'applyDirect',
            inputValue: true,
            checked: true,
            id: this.name + 'ApplyDirect'
        });
        this.maincontainer = Ext.create('Ext.container.Container', {
            id: this.name + 'Container',
            width: '100%',
            height: '100%',
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            style: {
                backgroundColor: 'White'
            },
            renderTo: this.getContentDiv(),
            items: [{
                id: this.name + 'LayerSelectorPanel',
                xtype: "container",
                padding: "4px",
                width: '100%',
                height: 36
            },{
                id: this.name + 'filterButtons',
                xtype: "container",
                //disabled:true,
                autoScroll: true,
                width: '100%',
                layout:{
                    type: "vbox"
                },
                flex: 1,
                items: drawingItems
            },{
                id: this.name + 'ClosingPanel',
                xtype: "container",
                width: '100%',
                height: MobileManager.isMobile() ? 45 : 25,
                style: {
                    marginTop: '10px'
                },
                layout: {
                    type:'hbox',
                    pack:'end'
                },
                items: [
                    {xtype: 'button', text: 'Reset', componentCls: 'mobileLarge', handler: function(){
                        me.resetForm();
                    }},
                    {xtype: 'button', text: 'Toepassen', componentCls: 'mobileLarge', handler: function(){
                        me.applyFilter();
                    }},
                    {xtype: 'button', text: 'Sluiten', componentCls: 'mobileLarge', handler: function() {
                        me.resetForm();
                        me.popup.hide();
                    }}
                ]
            }]
        });
        this.createLayerSelector();
    },
    createLayerSelector: function(){
        var config = {
            viewerController : this.viewerController,
            restriction : "filterable",
            id : this.name + "layerSelector",
            layers: this.layers,
            div: this.name + 'LayerSelectorPanel'
        };
        this.layerSelector = Ext.create("viewer.components.LayerSelector",config);
        this.layerSelector.addListener(viewer.viewercontroller.controller.Event.ON_LAYERSELECTOR_CHANGE,this.layerChanged,this);  
    },
    createVectorLayer : function (){
         this.vectorLayer = this.viewerController.mapComponent.createVectorLayer({
            name: this.name + 'VectorLayer',
            geometrytypes:["Circle","Polygon"],
            showmeasures:false,
            viewerController : this.viewerController,
            style: {
                fillcolor: "FF0000",
                fillopacity: 50,
                strokecolor: "FF0000",
                strokeopacity: 50
            }
        });
        this.viewerController.mapComponent.getMap().addLayer(this.vectorLayer);
        
        this.vectorLayer.addListener (viewer.viewercontroller.controller.Event.ON_FEATURE_ADDED,this.featureAdded,this);
    },
    
    //</editor-fold>
   
    // Some helper functions here
    toggleAll : function(state){
        for ( var key in this.drawingButtonIds){
            var el = this.drawingButtonIds[key];
            var button = Ext.getCmp(el);
            button.toggle(state);
        }
    },
    
    resetForm : function (){
        this.features = new Array();
        this.vectorLayer.removeAllFeatures();
        this.applyFilter();
    },
    getExtComponents: function() {
        return [ this.maincontainer.getId() ];
    }
});
