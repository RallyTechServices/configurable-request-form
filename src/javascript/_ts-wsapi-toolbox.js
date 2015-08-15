Ext.define('Rally.technicalservices.WsapiToolbox',{
    singleton: true,

    fetchModel: function(model_name){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.wsapi.ModelFactory.getModel({
            type: model_name,
            success: function(model) {
                deferred.resolve(model);
            },
            failure: function(){
                deferred.reject('Error loading model: ' + model_name);
            }
        });
        return deferred.promise;
    }
});
