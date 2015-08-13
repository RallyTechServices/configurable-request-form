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
        return Ext.create('Rally.ui.NumberField', {
            name: field.name,
            displayName: field.displayName,
            value: record.get(field.name),
            labelAlign: 'right',
            height: 30,
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

    function milestoneField(field, record, readOnly) {
        return Ext.create('Rally.ui.detail.view.MilestonesField', {
            field: field,
            record: record,
            readOnly: readOnly
        });
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

        getEditor: function (field, record, item_id, margin, field_label) {
            var editor;

            if (this.fieldEditors[field.name]) {
                editor = this.fieldEditors[field.name](field, record);
            } else if (field.attributeDefinition && this.typeEditors[field.attributeDefinition.AttributeType.toLowerCase()]) {
                editor = this.getEditorByType(field, record);
            } else {
                editor = this.defaultRenderer(field, record);
            }

            editor.disabledCls += " readonly";
            if (!Rally.ui.detail.DetailHelper.isDetailPageFieldEditable(field, record)) {
                editor.editable = false;
                editor.setDisabled(true);
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
            return Ext.create('Rally.ui.TextField', {
                name: field.name,
                value: record.get(field.name)
            });
        },

        fieldEditors: {
            Actuals: buildNumberField,

            DisplayColor: buildDisplayColorField,

            Estimate: buildNumberField,

            //Name: function (field, record) {
            //    return Rally.ui.detail.DetailHelper.isDetailPageFieldEditable(field, record) ?
            //        buildNameEditor(field, record) : buildNameRenderer(field, record);
            //},

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

            PlanEstimate: buildNumberField,

            PreliminaryEstimate: function (field, record) {
                return constrainedComboBox(field, record);
            },

            Project: function (field, record) {
                var project = record.get(field.name);

                var onlyShowEditableProjects = true;
                // We want all projects in the list if the page is not editable. Otherwise the current project value will
                // not be displayed for read only stories.
                if (!Rally.ui.detail.DetailHelper.isDetailPageFieldEditable(field, record)) {
                    onlyShowEditableProjects = false;
                }

                return Ext.create('Rally.ui.combobox.ProjectComboBox', {
                    name: field.name,
                    value: Rally.util.Ref.getRefUri(project),
                    onlyShowEditableProjects: onlyShowEditableProjects
                });
            },

            Rank: buildNumberField,

            Ready: function(field, record) {
                return Ext.create('Rally.ui.detail.view.ReadyButton', {
                    itemId: 'readyButton',
                    pressed: record.get('Ready')
                });
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

            ScheduleState: buildStateField,

            State: function (field, record) {
                if (record.self.isPortfolioItem()) {
                    return constrainedComboBox(field, record);
                } else if (record.isDefect()) {
                    return constrainedComboBox(field, record);
                } else if (record.isTask()) {
                    return buildStateField(field, record);
                } else {
                    return Rally.ui.detail.view.DetailEditorFactory.getEditorByType(field, record);
                }
            },

            SubmittedBy:  function(field, record) {
                return userSearchComboBox(field, record, true);
            },

            TargetProject: buildTargetProjectEditor,

            ToDo: buildNumberField
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
                    name: field.name,
                    store: choices,
                    queryMode: 'local',
                    displayField: 'display',
                    valueField: 'value',
                    labelAlign: 'right',
                    value: record.get(field.name),
                    defaultSelectionPosition: 'last'
                });
            },
            date: function (field, record) {
                var plugins = [];
                if (_.contains(['CreationDate', 'OpenedDate', 'ClosedDate'], field.name)) {
                    plugins.push('rallydetailreadonlyrefreshingfield');
                }
                return Ext.create('Rally.ui.DateField', {
                    format: Rally.util.DateTime.getUserExtDateFormat(),
                    validateOnChange: false,
                    name: field.name,
                    value: record.get(field.name),
                    labelAlign: 'right',
                    clientMetrics: {
                        event: 'select',
                        description: 'field select'
                    },
                    plugins: plugins
                });
            },
            'decimal': function (field, record) {
                return Ext.create('Rally.ui.detail.view.DetailNumberField', {
                    name: field.name,
                    value: record.get(field.name),
                    field: field,
                    keyNavEnabled: false,
                    mouseWheelEnabled: false,
                    fieldStyle: 'border-right-width: 1px; background-color: light-green;',
                    clientMetrics: {
                        event: 'blur',
                        description: 'field blur'
                    }
                });
            },
            'integer': function (field, record) {
                return Ext.create('Rally.ui.detail.view.DetailNumberField', {
                    name: field.name,
                    value: record.get(field.name),
                    field: field,
                    clientMetrics: {
                        event: 'blur',
                        description: 'field blur'
                    }
                });
            },
            'object': function (field, record) {
                if (field.attributeDefinition.Constrained) {
                    return Ext.create('Rally.ui.combobox.ComboBox', {
                        name: field.name,
                        value: record.get(field.name),
                        editable: false,
                        storeConfig: {
                            autoLoad: true,
                            model: field.attributeDefinition.SchemaType,
                            initialValue: record.get(field.name) ? record.get(field.name)._refObjectName : ''
                        },
                        allowNoEntry: defaultAllowNoEntry(field, record)
                    });

                } else {
                    return Ext.create('Rally.ui.TextField', {
                        name: field.name,
                        value: record.get(field.name),
                        clientMetrics: {
                            event: 'blur',
                            description: 'field blur'
                        }
                    });
                }
            },
            quantity: function (field, record) {
                return Ext.create('Rally.ui.detail.view.DetailNumberField', {
                    name: field.name,
                    value: record.get(field.name),
                    field: field,
                    hideTrigger: true,
                    keyNavEnabled: false,
                    mouseWheelEnabled: false,
                    fieldStyle: 'border-right-width: 1px; background-color: light-blue;',
                    clientMetrics: {
                        event: 'blur',
                        description: 'field blur'
                    }
                });
            },
            rating: function (field, record) {
                if (field.attributeDefinition.Constrained) {
                    return constrainedComboBox(field, record, {
                        allowNoEntry: !field.required || record.get(field.name) === 'None',
                        ratingNoEntryString: '-- No Entry --',
                        noEntryValue: 'None',
                        useNullForNoEntryValue: false
                    });
                } else {
                    return Ext.create('Rally.ui.TextField', {
                        name: field.name,
                        value: record.get(field.name),
                        clientMetrics: {
                            event: 'blur',
                            description: 'field blur'
                        }
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
                        height: 30,
                        width: '100%',
                        labelAlign: 'right',
                        clientMetrics: {
                            event: 'blur',
                            description: 'field blur'
                        }
                    });
                }
            },
            text: function (field, record) {
                var isEditable = Rally.ui.detail.DetailHelper.isDetailPageFieldEditable(field, record),
                    editor;

                if (isEditable) {
                    editor = Ext.create('Rally.ui.richtext.RichTextEditor', {
                        field: field,
                        record: record,
                        title: field.name,
                        name: field.name,
                        value: record.get(field.name),
                        growToFitContent: true,
                        width: '100%',
                        allowImageUpload: true,
                        toolbarAlwaysEnabled: false,
                        showUndoButton: true,
                        disableUndoButtonWithToolbar: false,
                        indicatorFoldUnder: true,
                        clientMetrics: {
                            event: 'blur',
                            description: 'field blur'
                        },
                        useLinkBubble: true,
                        listeners: {
                            focus: function () {
                                var focusedField = Ext.ComponentQuery.query('rallydetailfieldcontaineredpcomplete[focused=true]')[0];

                                if (focusedField) {
                                    var editor = focusedField.editor;
                                    if (editor !== this) {
                                        focusedField.clearSelection();
                                        editor.hasFocus = false;
                                        editor.fireEvent('blur');
                                        if (editor.collapse) {
                                            editor.collapse();
                                        }
                                    }
                                }
                            },
                            blur: function () {
                                var fields = Ext.ComponentQuery.query('rallydetailfieldcontaineredpcomplete');
                                var previouslyFocusedField = _.find(fields, function (field) {
                                    if (field.editor) {
                                        return field.editor.hasFocus;
                                    }
                                }, this);
                                if (previouslyFocusedField) {
                                    previouslyFocusedField.focusField();
                                }
                            },
                            imageuploaded: function(imageInfo) {
                                var controller = Rally.ui.detail.DetailHelper.getController();
                                if(controller) {
                                    controller._handleImageUpload(imageInfo);
                                }
                            }
                        }
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

    function buildNameEditor(field, record, defaultValue) {
        var placeholder = defaultValue;
        return Ext.create('Rally.ui.detail.SimpleTextDetailField', {
            name: field.name,
            value: record.get(field.name),
            placeholder: placeholder,
            indicatorFoldUnder: true,
            clientMetrics: {
                event: 'blur',
                description: 'field blur'
            }
        });
    }

    function buildNameRenderer(field, record) {
        return Ext.create('Ext.form.field.Display', {
            name: field.name,
            value: record.get(field.name),
            cls: 'edp-name-renderer'
        });
    }
})();