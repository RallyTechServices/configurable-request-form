Ext.define('Rally.technicalservices.RichTextEditor', {
    extend: 'Ext.Container',
    layout: {type: 'hbox'},
    width: Rally.technicalservices.DetailEditorFactory.controlWidth,
    alias: 'widget.tsrichtexteditor',
    height: 200,

    constructor: function (config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
    },

    initComponent: function(){
        this.callParent(arguments);

        var record = this.record,
            field = this.field;

        this.add({
            xtype: 'container',
            html: Ext.String.format('<div class="tslabel">{0}</div>',field.name),
            width: Rally.technicalservices.DetailEditorFactory.labelWidth,
            padding: 5
        });
        var editor = Ext.create('Rally.ui.richtext.RichTextEditor', {
                field: field,
                record: record,
                title: field.name,
                itemId: 'rt-editor',
                margin: 5,
                name: field.name,
                value: record.get(field.name),
                growToFitContent: true,
                allowImageUpload: true,
                renderTpl: '<div class="richTextToolbar"></div><div class="richTextContent"></div>',
                EDITOR_MIN_HEIGHT: 110,
                toolbarAlwaysEnabled: false,
                showUndoButton: true,
                disableUndoButtonWithToolbar: false,
                indicatorFoldUnder: true,
                useLinkBubble: true,
                flex: 1,
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

        editor.on('boxready', this._resize, this);
        if (Rally.ui.detail.DetailHelper.getController()) {
            Rally.ui.detail.DetailHelper.getController().on('recordupdate', function(record) {
                editor.setValue(record.get(field.name));
            });
        }
        this.add(editor);
    },
    _resize: function(){
        this.down('#rt-editor').setHeight(this.height);
    },
    getValue: function(){
        return this.down('#rt-editor').getValue();
    },
    validator: function(value){
        return true;
    },
    validate: function(){
        var validation = this.validator(this.down('#rt-editor').getValue());
        if (validation === true){
            return true;
        }
        Ext.create('Rally.ui.tooltip.ToolTip', {
            target : this.down('#rt-editor').getEl(),
            html: '<div class="tsinvalid">' + validation + '</div>',
            autoShow: true,
            destroyAfterHide: true
        });
        return false;
    }
});
