Ext.define('Rally.technicalservices.RequestForm', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.tsrequestform',
    logger: new Rally.technicalservices.Logger(),

    layout: {
        type: 'vbox',       // Arrange child items vertically
        //type: 'table',
        //columns: 1,
        //padding: 10,
        //tableAttrs: {"class": "tstbl"},
        //trAttrs: {"class": "tstbl"}
    },

    config: {
        title: '',
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
            tpl: '<tpl><div class="tsinstructions">{instructions}</div></tpl>'
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
                    item.labelCls = "tslabel";
                    if (field_obj.required){
                        item.validator = function(value) {
                            if (Ext.isEmpty(value) || value == null || value == ''){
                                return Ext.String.format('{0} is required.', field_name);
                            }
                            return true;
                        }
                    }
                    item.msgTarget = 'side';
                    item.on('boxready', this._resize, this);
                    this.add(item);
                }
            }, this);
            this.doLayout();
            this.fireEvent('ready', this);
        } else {
            var msg = "No fields were loaded to display.  Please check the configuration settings to verify that fields are configured for this App."
            this.add({
                xtype: 'container',
                html: msg
            });
        }
    },
    _resize: function(cmp){
        this.logger.log('_resize');
        this.doLayout();
    },
    _getNewRecord: function(model){
        var newFields = {};
        Ext.each(this.formConfiguration, function(field_obj, field_name){
            this.logger.log(field_name, field_obj);
            if (field_obj.defaultValue){
                newFields[field_name].setValue(field_obj.defaultValue);
            }
        },this);
        this.logger.log('_getNewRecord', newFields);
        var rec = Ext.create(model, newFields);
        return rec;
    },

    _updateNewRecord: function(){
        var exceptionFields = ["Attachments"],
            valid = true;
        _.each(this.formConfiguration, function(field_obj, field_name){
            if (!Ext.Array.contains(exceptionFields, field_name)) {
                this.logger.log('_updateNewRecord', field_name, this.down('#' + field_name));

                var val = this.down('#' + field_name).getValue() || field_obj.defaultValue || null;
                valid = this.down('#' + field_name).validate();
                if (!valid) {
                    return false;
                }
                this.newRecord.set(field_name, val);

            }
        }, this);
        return valid;
    },
    save: function () {
        if (!this._updateNewRecord()){
            return false;
        };
        var attachments = null;
        if (this.down('#Attachments')){
            attachments = this.down('#Attachments').getValue() || null;
        }

        this.newRecord.save({
            scope: this,
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {
                    if (attachments) {
                        this._updateAttachments(result, 'Attachments', attachments).then({
                            scope: this,
                            success: function(){
                                this.fireEvent('save', result);
                            },
                            failure: function(msg){

                            }
                        });
                    } else {
                        this.fireEvent('save',result);
                    }
                } else {
                    var msg = Ext.String.format("Submission could not be saved: {0}", operation.error.errors[0]);
                    this.fireEvent('onerror', {message: msg});
                }
            }
        });
    },
    _updateAttachments: function(record, field_name, val){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('_updateAttachments', record, field_name, val);
        deferred.resolve();
        //Rally.data.ModelFactory.getModel({
        //    type: 'Attachment',
        //    success: function(model) {
        //        _.each(val, function(a){
        //            var att = Ext.create(model, {});
        //        });
        //
        //    }
        //});
        //
        //
        //var record = Ext.create(model, {
        //    Name: 'Server crash',
        //    State: 'Open',
        //    Description: 'Worst defect ever'
        //});
        //The record can then be persisted to Rally using its save method:
        //
        //    record.save({
        //        callback: function(result, operation) {
        //            if(operation.wasSuccessful()) {
        //                //Get the new defect's objectId
        //                var objectId = result.get('ObjectID');
        //            }
        //        }
        //    });
        return deferred;
    }
});
