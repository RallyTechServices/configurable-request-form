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
        {xtype:'container',itemId:'display_box', flex: 1},
        {xtype:'container',itemId:'button_box', flex: 1}
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

        this.down('#display_box').removeAll();

        this.logger.log('_validateSettings formFieldConfig', config_obj);
        if (_.isEmpty(config_obj)){
            this.down('#display_box').add({
                xtype: 'container',
                html: 'No form configuration has been defined.<br/>Please use the App Settings to configure the form.',
                style: {
                    fontFamily: 'ProximaNovaLight, Helvetica, Arial'
                }
            });
        } else {
            this._buildForm(model, config_obj);
        }
    },
    _buildForm: function(model, form_config){
        this.logger.log('_buildForm');

        this.down('#display_box').add({
            xtype: 'tsrequestform',
            itemId: 'requestform',
            model: model,
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
            width: 75,
            scope: this,
            handler: this._save
        });

    },
    _save: function(){
        var requestForm = this.down('#requestform');
        requestForm.save();
    },
    _onSaved: function(newRecord){
        this.logger.log('_onSaved',newRecord);
        Rally.ui.notify.Notifier.showCreate({artifact: newRecord});
        this.down('#btn-submit').setVisible(false);
        //Rally.nav.Manager.showDetail(newRecord.get('_ref'));
    },
    _onWarning: function(obj){
        Rally.ui.notify.Notifier.showWarning(obj);
    },
    _onError: function(obj){
        Rally.ui.notify.Notifier.showError(obj);
    },
    _onReady: function(obj){
        // Rally.ui.notify.Notifier.show({message: 'Ready!'});
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
                name: 'formFieldConfiguration',
                xtype: 'tsformconfigsettings',
                fieldLabel: 'Form Field Configuration',
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
