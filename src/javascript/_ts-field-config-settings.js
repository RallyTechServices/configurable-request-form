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
                data.push({fieldName: f.name, displayName: f.displayName, display: dsp, defaultValue: def_value, required: req})
            }
        }, this);

        data = _.sortBy(data, 'order');
        this._store = Ext.create('Ext.data.Store', {
            fields: ['fieldName', 'displayName','display', 'defaultValue', 'required','order'],
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
            },
            {
                text: 'Default Value',
                dataIndex: 'defaultValue',
                emptyCellText: '',
                flex: 3,
                editor: {
                    xtype: 'rallytextfield'
                }
            }
        ];
        return columns;
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
            if (record.get('display')) {
                mappings[record.get('fieldName')] = {
                    required: record.get('required'),
                    defaultValue: record.get('defaultValue'),
                    order: order++
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
