Ext.define('Rally.technicalservices.BooleanFieldComboBox',{
    extend: 'Rally.ui.combobox.FieldComboBox',
    alias: 'widget.tsbooleanfieldcombobox',

    _isNotHidden: function(field) {
        return (!field.hidden && field.attributeDefinition && field.attributeDefinition.AttributeType == 'BOOLEAN');
    }
});

Ext.define('Rally.technicalservices.settings.FormConfiguration',{
    extend: 'Ext.form.field.Base',
    alias: 'widget.tsformconfigsettings',
    config: {
        value: undefined,
        fields: undefined,
        decodedValue: {}
    },
    notAllowedFields: ['ScheduleState','Tags','PredecessorsAndSuccessors','Predecessors','Successors','Project','Milestones','Workspace','Changesets','Parent','PortfolioItem','DisplayColor'],
    fieldSubTpl: '<div id="{id}" class="settings-grid"></div>',
    noDefaultValue: ['Attachments'],

    width: '100%',
    cls: 'column-settings',

    onDestroy: function() {
        if (this._grid) {
            this._grid.destroy();
            delete this._grid;
        }
        this.callParent(arguments);
    },

    onRender: function() {
        var decodedValue = {};
        if (this.value && !_.isEmpty(this.value)){
            decodedValue = Ext.JSON.decode(this.value);
        }
        this.callParent(arguments);

        var data = [];

        _.each(this.fields, function(f){
            if (this._isFieldAllowed(f)){
                var dsp = false,
                    def_value = f.defaultValue || '',
                    req = f.required || false,
                    order = null;

                if (decodedValue[f.name]){
                    dsp = true;
                    def_value = decodedValue[f.name].defaultValue;
                    req = decodedValue[f.name].required;
                    order = order;
                }
                data.push({fieldName: f.name, displayName: f.displayName, display: dsp, defaultValue: def_value, required: req, fieldObj: f})
            }
        }, this);

        data = _.sortBy(data, 'order');
        this._store = Ext.create('Ext.data.Store', {
            fields: ['fieldName', 'displayName','display', 'defaultValue', 'defaultDisplayValue','required','order','fieldObj'],
            data: data
        });

        this._grid = Ext.create('Rally.ui.grid.Grid', {
            autoWidth: true,
            renderTo: this.inputEl,
            columnCfgs: this._getColumnCfgs(),
            showPagingToolbar: false,
            showRowActionsColumn: false,
            store: this._store,
            height: 400,
            width: this.getWidth() * 0.90,
            editingConfig: {
                publishMessages: false
            },
            viewConfig: {
                plugins: {
                    ptype: 'gridviewdragdrop',
                    dragText: 'Drag and drop to reorder'
                }
            }
        });
      //  this.fireEvent('ready');
    },
    _isFieldAllowed: function(field){
        var forbiddenTypes = ['WEB_LINK'];

        if (Ext.Array.contains(this.notAllowedFields, field.name)){
            return false;
        }

        if (field.readOnly === true || field.hidden === true){
            return false;
        }

        if (field && !field.attributeDefinition){
            return false;
        }

        //Not showing Weblinks for now
        if (Ext.Array.contains(forbiddenTypes, field.attributeDefinition.AttributeType)){
            return false;
        }

        return true;
    },
    _getColumnCfgs: function() {
        var me = this;

        var columns = [
            {
                text: 'Field',
                dataIndex: 'displayName',
                flex: 1
            },
            {
                text: 'Show',
                dataIndex: 'display',
                renderer: function (value) {
                    return value === true ? 'Yes' : 'No';
                },
                editor: {
                    xtype: 'rallycombobox',
                    displayField: 'name',
                    valueField: 'value',
                    editable: false,
                    storeType: 'Ext.data.Store',
                    storeConfig: {
                        remoteFilter: false,
                        fields: ['name', 'value'],
                        data: [
                            {'name': 'Yes', 'value': true},
                            {'name': 'No', 'value': false}
                        ]
                    }
                }
            },
            {
                text: 'Required',
                dataIndex: 'required',
                renderer: function (value) {
                    return value === true ? 'Yes' : 'No';
                },
                editor: {
                    xtype: 'rallycombobox',
                    displayField: 'name',
                    valueField: 'value',
                    editable: false,
                    storeType: 'Ext.data.Store',
                    storeConfig: {
                        remoteFilter: false,
                        fields: ['name', 'value'],
                        data: [
                            {'name': 'Yes', 'value': true},
                            {'name': 'No', 'value': false}
                        ]
                    }
                }
            }, {
                text: 'Default Value',
                flex: 3,
                xtype: 'actioncolumn',
                sortable: false,
                menuDisabled: true,
                renderer: function(v,m,r){
                    var val= '<i>Default Values not Supported</i>',
                        color = "gray";
                    if (me._isAllowedDefaultValue(r)) {
                        val = r.get('defaultDisplayValue') || '';
                        color = "black";
                    }
                    return Ext.String.format('<span style="display: inline; font-size: 11px; padding-left:50px;line-height:15px;color:{0};">{1}</span>',color,val);


                },
                items: [{
                    //iconCls: "picto icon-edit",
                    icon: '/slm/images/icon_edit_view.gif',
                    tooltip: 'Edit',
                    handler: function (grid, rowIndex, colIndex) {
                        var rec = grid.getStore().getAt(rowIndex);
                        me.showEditor(rec);
                    },
                    isDisabled: function(grid, row, col, item, record){
                        return !me._isAllowedDefaultValue(record);
                    }
                }, {
                    icon:  '/slm/images/icon_delete.gif',
                    tooltip: 'Delete',
                    handler: function (grid, rowIndex, colIndex) {
                        var rec = grid.getStore().getAt(rowIndex);
                        rec.set('defaultValue', null);
                    },
                    isDisabled: function(grid, row, col, item, record){
                        return !me._isAllowedDefaultValue(record);
                    }
                }]
            }

        ];
        return columns;
    },
    _isAllowedDefaultValue: function(record){

        var noDefaultValue = ['Attachments'];
        if (Ext.Array.contains(noDefaultValue, record.get('fieldName'))){
            return false;
        }
        return true;
    },
    showEditor: function(record){
        Ext.create('Rally.technicalservices.DynamicCellEditor',{
            record: record,
            context: Rally.getApp().getContext()
        });
    },
    /**
     * When a form asks for the data this field represents,
     * give it the name of this field and the ref of the selected project (or an empty string).
     * Used when persisting the value of this field.
     * @return {Object}
     */
    getSubmitData: function() {
        var data = {};
        data[this.name] = Ext.JSON.encode(this._buildSettingValue());
        return data;
    },
    _buildSettingValue: function() {
        var mappings = {},
            order = 1;
        this._store.each(function(record) {
            if (record.get('display') || record.get('required') || record.get('defaultValue')) {
                mappings[record.get('fieldName')] = {
                    required: record.get('required'),
                    defaultValue: record.get('defaultValue'),
                    order: order++,
                    display: record.get('display')
                };
            }
        }, this);
        return mappings;
    },

    getErrors: function() {
        var errors = [];
        if (_.isEmpty(this._buildSettingValue())) {
           errors.push('At least one field must be shown.');
        }
        return errors;
    },
    validate : function() {
        var me = this,
            isValid = me.isValid();
        if (isValid !== me.wasValid) {
            me.wasValid = isValid;
            me.fireEvent('validitychange', me, isValid);
        }
        if (!isValid){
            var html = this.getErrors().join('<br/>');
            Ext.create('Rally.ui.tooltip.ToolTip', {
                target : this.getEl(),
                html: '<div class="tsinvalid">' + html + '</div>',
                autoShow: true,
                anchor: 'bottom',
                destroyAfterHide: true
            });

        }

        return isValid;
    },
    setValue: function(value) {
        this.callParent(arguments);
        this._value = value;
    }
});
