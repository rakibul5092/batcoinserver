var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoose_delete = require('mongoose-delete');
var mongoose_autopopulate = require('mongoose-autopopulate');

var schema = new Schema({
    first_name: { type: String, default: null, required: true },
    last_name: { type: String, default: null },
    email: { type: String, unique: true, required: true },
    password: { type: String },
    token: { type: String },
    role: { type: Schema.Types.ObjectId, ref: 'user_roles', autopopulate: true },
    email_verification: {
        code: String,
        expiration_timestamp: Number
    },
    reset_password: {
        code: String,
        time_stamp: Date
    },
    is_email_verified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    payment_id: String,
    created_at: Date,
    updated_at: Date,
    otp: {
        isMFASet: {type: Boolean, default: true},
        otpVerified: {type: Boolean, default: false},
        code: {type: String, default: ''},
        expiration_timestamp: {type: Number, default: 0}
    }
});

schema.plugin(mongoose_autopopulate);
schema.plugin(mongoose_delete, { deleted_at : true });

schema.pre('save', function(next) {
    var currentDate = new Date();
    if (!this.created_at) {
        this.created_at = currentDate;
    } else {
        this.updated_at = currentDate;
    }

    next();
});

schema.pre('remove', function(next) {
    if (this.isDeleted) {
        this.delete().catch(e => {
            console.log("permanently removed the user");
        });
    } else {
        setDocumentIsDeleted(this);
    }
    next();
});
schema.pre(/^find/, function(next) {
 this.populate({path:'role'})
    next();
});
const setDocumentIsDeleted = (doc) => {
    doc.isDeleted = true;
    doc.deleted_at = new Date();
    doc.$isDeleted(true);
    doc.save();
};

module.exports = mongoose.model('user', schema);
