Ext.define('Rally.technicalservices.AttachmentEditor',{
    extend: 'Ext.panel.Panel',
    alias: 'widget.tsattachmentgrid',
    height: 200,
    width: '100%',
    record: undefined,

    constructor: function (config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
    },
    initComponent: function(){
        this.callParent(arguments);

        this._store = Ext.create('Ext.data.Store',{
            fields: ['filename'],
            data: []
        });

        this.add({
            xtype: 'rallygrid',
            columnCfgs: this._getColumnCfgs(),
            showPagingToolbar: false,
            showRowActionsColumn: false,
            store: this._store,
            emptyText: 'No Attachments',
            hideHeaders: true
        });

        this.add({
            xtype: 'filebutton',
            text: 'Upload',
            margin: 10,
            cls: 'secondary rly-small',
            listeners: {
                change: this.addFile,
                scope: this

            }
        });


    },
    addFile: function(button, e, value){
        this._store.add({filename: value});
    },
    removeFile: function(grid, rowIndex, colIndex) {
        // var rec = grid.getStore().getAt(rowIndex);
        alert("Delete ");
    },
    _getColumnCfgs: function(){
        var me = this;
        return [{
            xtype:'actioncolumn',
            width:40,
            items: [{
                icon: '/slm/js-lib/rui/builds/rui/resources/css/images/trash-icon.png',
                tooltip: 'Remove file',
                scope: me,
                handler: me.removeFile
            }]
        },{
            dataIndex: 'filename',
            text: 'File',
            flex: 1,
            renderer: function(v,m,r){
                return v;
            }
        }];
    }

});
