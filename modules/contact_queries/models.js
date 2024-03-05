var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoose_delete = require('mongoose-delete');

var schema = new Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    isDeleted: {type:Boolean, default: false},
    created_at: Date,
    updated_at: Date
});

schema.plugin(mongoose_delete, { deleted_at : true });

schema.pre('save', function(next) {
    var currentDate = new Date();
    if (!this.created_at) {
        this.created_at = currentDate;
    } else {
        this.updated_at = currentDate;
    }
    var notification = JSON.parse(JSON.stringify(this));
    notification.message = "New Contact Query";
    notification.type = "notification";
    notification.contact_query = this._id;
    process.emit('notification', notification);
    next();
});

schema.pre('remove', function(next) {
    if (this.isDeleted) {
        this.delete().catch(e => {
            console.log("permanently removed the contact query");
        });
    } else {
        setDocumentIsDeleted(this);
    }
    next();
});

const setDocumentIsDeleted = (doc) => {
    doc.isDeleted = true;
    doc.deleted_at = new Date();
    doc.$isDeleted(true);
    doc.save();
};

module.exports = mongoose.model('contact_queries', schema);