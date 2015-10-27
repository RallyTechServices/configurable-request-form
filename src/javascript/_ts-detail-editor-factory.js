(function () {
    var Ext = window.Ext4 || window.Ext;

    var userSearchComboBox = function(field, record, initToContextUser) {
        var project = Rally.data.util.Record.getProject(record);
        var currentUser = record.get(field.name);
        if (_.isObject(currentUser)) {
            currentUser = currentUser._ref;
        }
        if (initToContextUser && record.phantom && !currentUser) {
            currentUser = Rally.environment.getContext().getUser()._ref;
            record.set(field.name, currentUser);
        }

        return Ext.create('Rally.ui.combobox.UserSearchComboBox', {
            project: project,
            name: field.name,
            value: currentUser,
            bubbleEvents: ['select'],
            triggerWrapCls: 'fullwidth',
            plugins: [
                {
                    xclass: 'Rally.ui.detail.plugins.LoadingMonitor'
                }
            ]
        });
    };

    var buildNumberField = function(field, record) {
        var value = Number(record.get(field.name)) || 0;
        return Ext.create('Rally.ui.NumberField', {
            name: field.name,
            displayName: field.displayName,
            value: value,
            labelAlign: 'right',
            height: getDefaultHeight(),
            field: field,
            hideTrigger: true,
            clientMetrics: {
                event: 'blur',
                description: 'field blur'
            }
        });
    };

    var buildPercentDoneBy = function(percentDoneTemplateName, field, record) {
        var tpl = Ext.create(percentDoneTemplateName);
        return Ext.create('Ext.Component', {
            data: record.data,
            tpl: tpl,
            maskOnDisable: false,
            cls: 'percent-done',
            listeners: {
                afterrender: function() {
                    var el = this.getEl();
                    el.on('click', function() {
                        Ext.create('Rally.ui.popover.PercentDonePopover', {
                            target: el,
                            percentDoneData: Ext.applyIf({
                                Notes: "",                                      // Empty string so that NOTES section will not display
                                Release: record.get('Release') || {},           // Avoid fetching release
                                PortfolioItemTypeOrdinal: record.self.ordinal   // Ditto
                            }, record.data),
                            percentDoneName: field.name
                        });
                    });
                }
            }
        });
    };

    var buildDisplayColorField = function (field, record) {
        return Ext.create('Rally.ui.detail.view.DisplayColorField', {
            field: field,
            record: record,
            editable: Rally.ui.detail.DetailHelper.isDetailPageFieldEditable(field, record)
        });
    };

    var buildStateField = function (field, record) {
        return Ext.create('Rally.ui.detail.view.StateField', {
            field: field,
            record: record
        });
    };

    var buildTargetProjectEditor = function(field, record) {
        var project = record.get(field.name);
        if (record.phantom && project === "") {
            project = Rally.environment.getContext().getProject();
        }
        return Ext.create('Rally.ui.detail.view.TargetProjectField', {
            name: field.name,
            milestoneRecord: record,
            value: Rally.util.Ref.getRelativeUri(project),
            editable: Rally.ui.MilestoneTargetProjectPermissionsHelper.canEdit(record)
        });
    };

    var defaultAllowNoEntry = function(field, record) {
        return !field.required || !record.get(field.name);
    };

    function constrainedComboBox(field, record, config) {
        return Ext.widget(Ext.apply({
            xtype: 'rallyfieldvaluecombobox',
            name: field.name,
            value: record.get(field.name),
            field: field,
            labelAlign: 'right',
            labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
            labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
            width: '75%',
            minWidth: 200,
            editable: false,
            allowNoEntry: defaultAllowNoEntry(field, record),
            useNullForNoEntryValue: true,
            plugins: [
                {
                    xclass: 'Rally.ui.detail.plugins.LoadingMonitor'
                }
            ]
        }, config));
    }
    function buildTimeboxFilter(timebox) {
        var filter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'State',
            operator: '!=',
            value: 'Accepted'
        });
        if (timebox && _.isString(timebox._refObjectName)) {
            filter = filter.or(Ext.create('Rally.data.wsapi.Filter', {
                property: 'Name',
                operator: '=',
                value: timebox._refObjectName
            }));
        }
        return filter;
    }
    function milestoneField(field, record, readOnly) {
        return Ext.create('Rally.ui.detail.view.MilestonesField', {
            field: field,
            record: record,
            readOnly: readOnly
        });
    }
    function getDefaultHeight(){
        return 25;
    }

    /**
     * @private
     */
    Ext.define('Rally.technicalservices.DetailEditorFactory', {
        requires: [
            'Rally.data.util.Record',
            'Rally.data.wsapi.Filter',
            'Rally.ui.combobox.FieldValueComboBox',
            'Rally.ui.detail.DetailHelper',
            'Rally.ui.detail.view.DetailWebLinkField',
            'Rally.ui.detail.view.DetailNumberField',
            'Rally.ui.detail.view.StateField',
            'Rally.ui.detail.view.DetailReadOnlyRefreshingField',
            'Rally.ui.detail.view.ReadyButton',
            'Rally.ui.renderer.template.progressbar.PercentDoneByStoryCountTemplate',
            'Rally.ui.renderer.template.progressbar.PercentDoneByStoryPlanEstimateTemplate',
            'Rally.ui.popover.PercentDonePopover',
            'Rally.ui.detail.view.MilestonesField',
            'Rally.util.Ref',
            'Rally.ui.combobox.ProjectComboBox'
        ],

        singleton: true,

        labelWidth: 150,
        labelCls: 'tslabel',
        controlWidth: '90%',
        padding: 0,

        getEditor: function (field, record, item_id, margin, field_label) {
            var editor;
            if (this.fieldEditors[field.name]) {
                editor = this.fieldEditors[field.name](field, record);
            } else if (field.attributeDefinition && this.typeEditors[field.attributeDefinition.AttributeType.toLowerCase()]) {
                editor = this.getEditorByType(field, record);
            } else {
                editor = this.defaultRenderer(field, record);
            }

            editor.addCls('detailFieldEditor');
            editor.itemId = item_id;
            editor.fieldLabel = field_label;
            editor.margin = margin;
            editor.labelAlign = 'right';

            return editor;
        },

        getEditorByType: function (field, record) {
            return this.typeEditors[field.attributeDefinition.AttributeType.toLowerCase()](field, record);
        },

        defaultRenderer: function (field, record) {
            return this.typeEditors['string'](field, record);
        },

        fieldEditors: {

            Attachments: function(field, record){

                return Ext.create('Rally.technicalservices.AttachmentEditor',{
                    record: record,
                    title: field.displayName
                });
            },

            Iteration: function (field, record) {

                var currentIteration = record.get(field.name);

                return Ext.create('Rally.ui.combobox.IterationComboBox', {
                    name: field.name,
                    value: currentIteration,
                    allowNoEntry: defaultAllowNoEntry(field, record),
                    showArrows: false,
                    defaultSelectionToFirst: true,
                    defaultToCurrentTimebox: false,
                    labelAlign: 'right',
                    storeConfig: {
                        remoteFilter: true,
                        filters: [
                            buildTimeboxFilter(currentIteration)
                        ],
                        context: {
                            project: Rally.data.util.Record.getProject(record),
                            projectScopeUp: false,
                            projectScopeDown: false
                        }
                    },
                    plugins: [
                        {
                            xclass: 'Rally.ui.detail.plugins.LoadingMonitor'
                        }
                    ]
                });
            },

            Milestones: function(field, record) {
                var readOnly = !Rally.ui.detail.DetailHelper.isDetailPageFieldEditable(field, record);
                return milestoneField(field, record, readOnly);
            },

            Owner: function(field, record) {
                return userSearchComboBox(field, record, record.isUserStory());
            },

            Release: function (field, record) {
                var currentRelease = record.get(field.name);
                return Ext.create('Rally.ui.combobox.ReleaseComboBox', {
                    name: field.name,
                    value: currentRelease,
                    allowNoEntry: defaultAllowNoEntry(field, record),
                    showArrows: false,
                    defaultSelectionPosition: 'first',
                    defaultToCurrentTimebox: false,
                    labelAlign: 'right',
                    storeConfig: {
                        remoteFilter: true,
                        filters: [
                            buildTimeboxFilter(currentRelease)
                        ],
                        context: {
                            project: Rally.data.util.Record.getProject(record),
                            projectScopeUp: false,
                            projectScopeDown: false
                        }
                    },
                    plugins: [
                        {
                            xclass: 'Rally.ui.detail.plugins.LoadingMonitor'
                        }
                    ]
                });
            },
        },

        typeEditors: {

            'boolean': function (field, record) {
                var choices = Ext.create('Ext.data.Store', {
                    fields: ['value', 'display'],
                    data: [
                        {value: true, display: 'Yes'},
                        {value: false, display: 'No'}
                    ]
                });

                return Ext.create('Rally.ui.combobox.ComboBox', {
                    name: field.displayName,
                    store: choices,
                    queryMode: 'local',
                    displayField: 'display',
                    valueField: 'value',
                    width: '25%',
                    minWidth: 200,
                    labelAlign: 'right',
                    labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                    labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                    value: record.get(field.name),
                    defaultSelectionPosition: 'last'
                });
            },
            date: function (field, record) {

                return Ext.create('Rally.ui.DateField', {
                    format: Rally.util.DateTime.getUserExtDateFormat(),
                    validateOnChange: false,
                    name: field.displayName,
                    value: record.get(field.name),
                    width: '25%',
                    minWidth: 200,
                    labelAlign: 'right',
                    labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                    labelCls: Rally.technicalservices.DetailEditorFactory.labelCls
                });
            },
            'decimal': function (field, record) {
                var value = Number(record.get(field.name)) || 0;
                return Ext.create('Rally.ui.NumberField', {
                    name: field.displayName,
                    displayName: field.displayName,
                    value: value,
                    labelAlign: 'right',
                    height: getDefaultHeight(),
                    field: field,
                    hideTrigger: true,
                    width: '25%',
                    labelSeparator: "",
                    minWidth: 200,
                    labelAlign: 'right',
                    labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                    labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                    padding: Rally.technicalservices.DetailEditorFactory.padding
                });
            },
            'integer': function (field, record) {

                var value = Number(record.get(field.name)) || 0;
                return Ext.create('Rally.ui.NumberField', {
                    name: field.displayName,
                    displayName: field.displayName,
                    value: value,
                    labelAlign: 'right',
                    height: getDefaultHeight(),
                    field: field,
                    hideTrigger: true,
                    width: '25%',
                    labelSeparator: "",
                    minWidth: 200,
                    labelAlign: 'right',
                    labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                    labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                    padding: Rally.technicalservices.DetailEditorFactory.padding
                });

            },
            'object': function (field, record) {
                if (field.attributeDefinition.Constrained) {
                    return Ext.create('Rally.ui.combobox.ComboBox', {
                        name: field.displayName,
                        value: record.get(field.name),
                        editable: false,
                        labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                        labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                        labelAlign: 'right',
                        storeConfig: {
                            autoLoad: true,
                            model: field.attributeDefinition.SchemaType,
                            initialValue: record.get(field.name) ? record.get(field.name)._refObjectName : ''
                        },
                        allowNoEntry: defaultAllowNoEntry(field, record)
                    });

                } else {
                    return Ext.create('Rally.ui.TextField', {
                        name: field.displayName,
                        value: record.get(field.name),
                        labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                        labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                        padding: Rally.technicalservices.DetailEditorFactory.padding,
                        labelAlign: 'right'

                    });
                }
            },
            quantity: function (field, record) {
                var value = Number(record.get(field.name)) || 0;
                return Ext.create('Rally.ui.NumberField', {
                    name: field.displayName,
                    displayName: field.displayName,
                    value: value,
                    labelAlign: 'right',
                    height: getDefaultHeight(),
                    field: field,
                    width: '25%',
                    labelSeparator: "",
                    minWidth: 200,
                    labelAlign: 'right',
                    labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                    labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                    padding: Rally.technicalservices.DetailEditorFactory.padding
                });
            },
            rating: function (field, record) {
                if (field.attributeDefinition.Constrained) {
                    return constrainedComboBox(field, record, {
                        allowNoEntry: !field.required || record.get(field.name) === 'None',
                        ratingNoEntryString: '-- No Entry --',
                        noEntryValue: 'None',
                        labelAlign: 'right',
                        useNullForNoEntryValue: false
                    });
                } else {
                    return Ext.create('Rally.ui.TextField', {
                        name: field.displayName,
                        value: record.get(field.name),
                        width: '25%',
                        minWidth: 200,
                        labelAlign: 'right',
                        labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                        labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                        padding: Rally.technicalservices.DetailEditorFactory.padding
                    });
                }
            },
            string: function (field, record) {
                if (field.attributeDefinition.Constrained) {
                    return constrainedComboBox(field, record);
                } else {
                    return Ext.create('Rally.ui.TextField', {
                        name: field.name,
                        value: record.get(field.name),
                        height: getDefaultHeight(),
                        minWidth: 200,
                        labelSeparator: "",
                        labelWidth: Rally.technicalservices.DetailEditorFactory.labelWidth,
                        labelCls: Rally.technicalservices.DetailEditorFactory.labelCls,
                        width: Rally.technicalservices.DetailEditorFactory.controlWidth,
                        padding: Rally.technicalservices.DetailEditorFactory.padding
                    });
                }
            },
            text: function (field, record) {
                var isEditable = Rally.ui.detail.DetailHelper.isDetailPageFieldEditable(field, record),
                    editor;

                if (isEditable) {
                    editor = Ext.create('Rally.technicalservices.RichTextEditor',{
                        field: field,
                        record: record,
                        labelAlign: 'right',
                        padding: Rally.technicalservices.DetailEditorFactory.padding
                    });
                } else {
                    editor = Ext.create('Rally.ui.richtext.RichTextEditorReadOnly', {
                        html: record.get(field.name)
                    });
                }

                if (Rally.ui.detail.DetailHelper.getController()) {
                    Rally.ui.detail.DetailHelper.getController().on('recordupdate', function(record) {
                        editor.setValue(record.get(field.name));
                    });
                }

                return editor;
            },
            web_link: function (field, record) {
                return Ext.create('Rally.ui.detail.view.DetailWebLinkField', {
                    field: field,
                    record: record
                });
            }
        }
    });

})();