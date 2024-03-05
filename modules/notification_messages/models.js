
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  to: { type: Schema.Types.ObjectId, refPath: 'user' },
  type: String,
  message: String,
  read: { type: Boolean, default: false },
  system: { type: Boolean, default: false },
  created_at: Date,
  updated_at: Date,
  order: { type: Schema.Types.ObjectId, ref: 'orders' },
  contact_query: { type: Schema.Types.ObjectId, ref: 'contact_queries' },
  created_by: { type: Schema.Types.ObjectId, ref: 'users' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'users' },
  deleted_by: { type: Schema.Types.ObjectId, ref: 'users' },
  is_viewed:{type:Schema.Types.Boolean,default:false},
  isDeleted: { type: Boolean, default: false },
});
schema.pre('save', function (next) {
  var currentDate = new Date();
  if (!this.created_at) {
    this.created_at = currentDate;
  } else {
    this.updated_at = currentDate;
  }
  next();
});

schema.pre('remove', function (next) {
    if (this.isDeleted) {
        this.delete().catch(e => {
            console.log("permanently removed the product");
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

module.exports = mongoose.model('notification_messages', schema);
