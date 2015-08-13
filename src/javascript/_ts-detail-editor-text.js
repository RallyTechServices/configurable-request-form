Ext.define('Rally.technicalservices.SimpleTextDetailField', {
    extend: 'Ext.Component',
    alias: 'widget.tssimpletextdetailfield',

    cls: 'simpleTextDetailField',

    autoEl: 'span',

    renderTpl: '{label}<input class="simpleTextDetailField" value="{value:htmlEncode}" placeholder="{placeholder}"/>',
    renderSelectors: {
        inputField: '.simpleTextDetailField'
    },

    mixins: {
        field: 'Ext.form.field.Field'
    },

    initComponent: function(){
        this.callParent(arguments);

        this.mixins.field.initField.call(this);

        this.renderData = {
            value: this.value,
            placeholder: this.placeholder,
            label: 'xyz'
        };

        this.on('afterrender', this._afterRender, this);
    },

    _afterRender: function(){
        this.relayEvents(this.inputField, ['blur', 'change']);
    },

    getSubmitData: function() {
        var submitData = {};
        submitData[this.getName()] = this.getValue();

        return submitData;
    },

    getValue: function(){
        if(this.inputField) {
            return this.inputField.getValue();
        }
        return null;
    }

});

