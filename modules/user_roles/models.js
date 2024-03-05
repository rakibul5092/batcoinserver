var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    name: String,
    description: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'users' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'users' },
    deleted_by: { type: Schema.Types.ObjectId, ref: 'users' },
    active: Boolean,
    created_at: Date,
    updated_at: Date
});
schema.pre('save', function(next) {
    var currentDate = new Date();
    if (!this.created_at) {
        this.created_at = currentDate;
    } else {
        this.updated_at = currentDate;
    }
    next();
});
module.exports=mongoose.model('user_roles', schema);
