Ext.define('Rally.technicalservices.AttachmentEditor',{
    extend: 'Ext.panel.Panel',
    alias: 'widget.tsattachmenteditor',
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
            fields: ['filename','content','description','contentType'],
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
    addFile: function(e, value, filepath){
        //var formData = new FormData();
        //formData.append('file', e.fileInputEl.dom.files[0]);
        //console.log('formData', formData, 'file', e.fileInputEl.dom.files[0]);
        //
        var me = this;
        var f = e.fileInputEl.dom.files[0];
        var filename = f.name || filepath.split(/\/|\\/).pop(),
            contentType = (f.type && f.type.length > 0) ? f.type : "text/plain";
        var reader = new FileReader();
        console.log('readAsBinaryString', e, f);
        reader.onload = function(fi){
            console.log('f onload', reader.result);
            var content64 = window.btoa(((reader.result)));
            console.log('f onload', content64);
            me._store.add({filename: filename, description: '', content: content64, contentType: contentType});
        }
        reader.readAsBinaryString(f);


    },
    removeFile: function(grid, rowIndex, colIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        this._store.remove(rec);
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
            editor: {
                xtype: 'filefield',
                buttonConfig: {
                    cls: 'rly-small secondary'
                }
            },
            renderer: function(v,m,r){
                if (v == null){
                    return 'Click to Add...'
                }
                return v;
            }
        },{
            dataIndex: 'name',
            text: 'Name'
        },{
            dataIndex: 'description',
            text: 'Description'
        }];
    },
    getValue: function(){
        return this._store.data.items;
    }

});
