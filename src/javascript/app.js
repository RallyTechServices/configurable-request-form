Ext.define("configurable-request-form", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    config: {
        defaultSettings: {
            formFieldConfiguration: {},
            formModelName: 'HierarchicalRequirement'
        }
    },
    formModel: undefined,

    items: [

    ],
    
    launch: function() {
        Rally.technicalservices.WsapiToolbox.fetchModel(this.getSetting('formModelName')).then({
           scope: this,
           success: function(model){
               this.formModel = model;
               this._validateSettings(this.getSettings(), model);
           },
           failure: function(msg){
                Rally.ui.notify.Notifier.showError({message: msg});
           }
       });
    },
    _validateSettings: function(settings, model){
        this.logger.log('_validateSettings settings', settings);
        var config_obj = settings.formFieldConfiguration;
        if (!Ext.isObject(config_obj)){
            config_obj = Ext.JSON.decode(settings.formFieldConfiguration);
        }

        this.logger.log('_validateSettings formFieldConfig', config_obj);
        if (_.isEmpty(config_obj)){
            this.add({
                xtype: 'container',
                itemId: 'display_box',
                flex: 1,
                html: 'No form configuration has been defined.<br/>Please use the App Settings to configure the form.',
                style: {
                    fontFamily: 'ProximaNovaLight, Helvetica, Arial'
                }
            });
        } else {
            this.formConfiguration = config_obj;
            this.model = model;
            this._showGrid(model);
        }
    },
    _buildForm: function(model, form_config){
        this.logger.log('_buildForm');

        this._clearWindow();

        this.add({xtype:'container',itemId:'display_box', flex: 1});
        this.add({xtype:'container',itemId:'button_box', flex: 1, layout: {type: 'hbox', pack: 'center'}});

        this.down('#display_box').add({
            xtype: 'tsrequestform',
            itemId: 'requestform',
            model: model,
            instructions: this.getSetting('formInstructions'),
            formConfiguration: form_config,
            listeners: {
                scope: this,
                save: this._onSaved,
                onwarning: this._onWarning,
                onerror: this._onError,
                ready: this._onReady
            }
        });
        this.down('#button_box').add({
            xtype:'rallybutton',
            text: 'Submit',
            itemId: 'btn-submit',
            style: {
                textAlign: 'center'
            },
            width: 75,
            scope: this,
            handler: this._save
        });
        this.down('#button_box').add({
            xtype:'rallybutton',
            text: 'Cancel',
            itemId: 'btn-cancel',
            style: {
                textAlign: 'center'
            },
            width: 75,
            scope: this,
            handler: this._cancel
        });

    },
    _save: function(){
        var requestForm = this.down('#requestform');
        requestForm.save();
    },
    _onSaved: function(newRecord){
        this.logger.log('_onSaved',newRecord);
        Rally.ui.notify.Notifier.showCreate({artifact: newRecord});
        this._showGrid(this.model);
    },
    _cancel: function(){
        this._showGrid(this.model);
    },
    _onWarning: function(obj){
        Rally.ui.notify.Notifier.showWarning(obj);
    },
    _onError: function(obj){
        Rally.ui.notify.Notifier.showError(obj);
    },
    _onReady: function(form){
        this.logger.log('_onReady', form);

        form.doLayout();
        form.setWidth('95%')
        this.down('#display_box').doLayout();
    },

    _clearWindow: function(){
        if (this.down('#story-grid')){
            this.down('#story-grid').destroy();
        }
        if (this.down('#display_box')){
            this.down('#display_box').destroy();
        }
        if (this.down('#button_box')){
            this.down('#button_box').destroy();
        }
    },
    _showGrid: function(model) {
        this._clearWindow();

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [model],
            autoLoad: true,
            enableHierarchy: true,
            sorters: [
                {
                    property: 'CreationDate',
                    direction: 'DESC'
                }
            ]
        }).then({
            scope: this,
            success: function(store){
                var modelNames = [model],
                    context = this.getContext();
                var gb = this.add({
                    xtype: 'rallygridboard',
                    context: context,
                    itemId: 'story-grid',
                    modelNames: modelNames,
                    toggleState: 'grid',
                    stateful: false,
                    plugins: [{
                            ptype: 'rallygridboardfieldpicker',
                            headerPosition: 'right',
                            modelNames: modelNames,
                            stateful: true,
                            stateId: context.getScopedStateId('columns-example')
                        }
                    ],
                    gridConfig: {
                        store: store,
                        columnCfgs: ['Name','ScheduleState']
                    },
                    height: this.getHeight()
                });
                var btn = gb.getHeader().getLeft().add({
                    xtype: 'rallybutton',
                    text: 'New Request',
                    margin: 5
                });
                btn.on({
                    click: this._onNewRequest,
                    scope: this
                });
            },
            scope: this
        });
    },

    _onNewRequest: function() {
        this.logger.log('_onNewRequest');
        this._buildForm(this.model, this.formConfiguration)
    },

    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    getSettingsFields: function() {
        var formModel = this.formModel;
        var fields = [];
        if (formModel){
            fields = formModel.getFields();
        }

        return [{
            name: 'formInstructions',
            xtype: 'textareafield',
            fieldLabel: 'Form Instructions',
            labelAlign: 'top',
            autoShow: true,
            width: '100%',
            margin: 15,
            height: 100
        },{
                name: 'formFieldConfiguration',
                xtype: 'tsformconfigsettings',
                fieldLabel: 'Form Field Configuration - Drag rows to specify order on the form',
                margin: 15,
                labelAlign: 'top',
                fields: fields
            }];
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this._validateSettings(settings, this.formModel);
    }
});
