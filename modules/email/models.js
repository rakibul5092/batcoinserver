var mongoose=require('mongoose');
    var Schema=mongoose.Schema;
    var schema=new Schema({
        to:String,
        from:String,
        body:String,
        user:{type:Schema.Types.ObjectId,ref:'users'},
        request_status:{type:Schema.Types.ObjectId,ref:'users'},

        created_by:{type:Schema.Types.ObjectId,ref:'users'},
        updated_by:{type:Schema.Types.ObjectId,ref:'users'},
        deleted_by:{type:Schema.Types.ObjectId,ref:'users'},

        created_at:Date,
        updated_at:Date,
        deleted_at:Date
    });
schema.pre('save',function(next){
      var currentDate=new Date();
      if(!this.created_at){
        this.created_at=currentDate;
      }else{
        this.updated_at=currentDate;
      }
      next();
    });
mongoose.model('email',schema);
