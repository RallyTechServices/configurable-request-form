Ext.define('Rally.technicalservices.DynamicCellEditor', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.tsdynamiceditor',
    autoShow: true,
    draggable: true,
    closable: true,
    modal: true,
    title: 'Dialog Example',
    items: [],

    cls: 'bulk-edit-dialog',

    width: 300,

    config: {
        /**
         * @cfg {[Rally.data.Model]} records (required)
         * The records to bulk edit
         */
        record: null
    },

    initComponent: function() {
        this.callParent(arguments);

        this.addEvents(
            /**
             * @param Rally.ui.dialog.BulkEditDialog the dialog
             * @param Rally.data.wsapi.Field field the field being edited
             * @param {String|Number} the new value
             */
            'edit'
        );
        //console.log('initcomponent', this.record);

        var editor = this._getEditor(this.record);
        if (this.record.get('defaultValue') && this.record.get('defaultValue').length > 0){
            editor.value = this.record.get('defaultValue') || null;
        }
        //console.log('editor',editor, this.record);
        this.add(editor);

        this.addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    itemId: 'applyButton',
                    text: 'Apply',
                    cls: 'primary rly-small',
                   // disabled: true,
                    handler:  this._onApplyClicked,
                    scope: this
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    cls: 'secondary rly-small',
                    handler: function() {
                        this.close();
                    },
                    scope: this
                }
            ]
        });
    },
    _getEditor: function(record){

        var fieldName = record.get('fieldName');

        this.title = 'Default Value for ' + record.get('displayName');


        var field = record.get('fieldObj');
        var config = {
            xtype: 'textarea',
            itemId: 'default',
            style: {
                width: '95%',
                float: 'center'
            }
        };
        if (field && field.attributeDefinition){
            if (field.attributeDefinition.AttributeType === 'STRING' && field.attributeDefinition.Constrained === true ){
                config.xtype = 'rallyfieldvaluecombobox';
                config.model = 'HierarchicalRequirement';
                config.field = fieldName;
            }
            if (field.attributeDefinition.AttributeType === 'BOOLEAN'){
                var editor = field.editor;
                editor.itemId = 'default';
                return editor
            }
            if (field.attributeDefinition.AttributeType === 'QUANTITY'){
                config.xtype = 'rallynumberfield';
                config.minValue = 0;
            }
            if (field.attributeDefinition.AttributeType === 'OBJECT'){
               config.xtype = field.editor.field.xtype;
            }
        }

        return config;

    },
    _onApplyClicked: function() {
        var valueField = this.down('#default');
     //   console.log('_onApplyClicked', valueField, valueField.getValue());
        if (this.record.get('defaultValue') !== valueField.getValue()){
            this.record.set('defaultValue', valueField.getValue());
            if (valueField.displayField && valueField.getRecord()){
                this.record.set('defaultDisplayValue', valueField.getRecord().get(valueField.displayField) || valueField.getValue());
            } else {
                this.record.set('defaultDisplayValue', valueField.getValue());
            }
        }

        this.close();
    }
});