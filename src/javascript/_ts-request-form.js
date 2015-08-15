Ext.define('Rally.technicalservices.RequestForm', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.tsrequestform',
    logger: new Rally.technicalservices.Logger(),

    layout: {
        type: 'vbox',       // Arrange child items vertically
        //    align: 'stretch',    // Each takes up full width
        padding: 10
    },

    config: {
        title: 'This is a title',
        instructions: 'These are instructions for filling out this form',
        model: undefined,
        formConfiguration: undefined,
        thankYouMessage: "Thank you for your submission."
    },

    /**
     * Properties that are populated during the creation of this object
     */
    newRecord: null,

    constructor: function(config){
        this.mergeConfig(config);
        this.logger.log('constructor', config, this.config);
        this.callParent(arguments);
    },
    initComponent: function () {
        this.callParent();
        this.addEvents('save','ready','onwarning','onerror');
        this._build(this.model);
    },

    _build: function (model) {
        this.logger.log('_build', model);
        this.newRecord = this._getNewRecord(model);

        this._addInstructions(this.instructions);

        this._addFields(this.newRecord);

    },
    _addInstructions: function(){
        var title = this.add(Ext.create('Ext.container.Container',{
            tpl: '<tpl>{instructions}</tpl>'
        }));
        title.update(this);
    },

    _addFields: function(newRecord){
        var model = this.model;
        this.logger.log('_addFields', this.formConfiguration);
        if (!_.isEmpty(this.formConfiguration)){
            _.each(this.formConfiguration, function(field_obj, field_name){
                var model_field = model.getField(field_name);
                if (model_field){
                    var item_id = field_name,
                        margin = 10,
                        field_label = model_field.displayName;

                    var item = Rally.technicalservices.DetailEditorFactory.getEditor(model_field,newRecord,item_id, margin, field_label);
                    this.add(item);
                }
            }, this);
            this.doLayout();
            this.fireEvent('ready');
        } else {
            var msg = "No fields were loaded to display.  Please check the configuration settings to verify that fields are configured for this App."
            this.add({
                xtype: 'container',
                html: msg
            });
        }
    },

    _getNewRecord: function(model){
        var newFields = {};
        Ext.each(this.formConfiguration, function(field_obj, field_name){
            if (field_obj.defaultValue){
                newFields[field_name] = field_obj.defaultValue;
            }
        },this);
        this.logger.log('_getNewRecord', newFields);
        var rec = Ext.create(model, newFields);
        return rec;
    },

    _updateNewRecord: function(){
        _.each(this.formConfiguration, function(field_obj, field_name){
            var val = this.down('#' + field_name).getValue() || field_obj.defaultValue || null;
            this.newRecord.set(field_name, val);
        }, this);

    },
    save: function () {
        this._updateNewRecord();
        this.newRecord.save({
            scope: this,
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    this.removeAll();
                    this.add({
                        xtype: 'container',
                        html: this.thankYouMessage
                    });
                    this.fireEvent('save',result);
                } else {
                    var msg = Ext.String.format("Submission could not be saved: {0}", operation.error.errors[0]);
                    this.fireEvent('onerror', {message: msg});
                }
            }
        });
    }
});
