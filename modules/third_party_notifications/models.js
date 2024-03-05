
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const config = require("../../config");

var schema = new Schema({
  type: {type: String, default: 'whatsapp'},
  to: {type: String, required: true},
  content: {type: String, required: true},
  status: {type: String, default: 'pending'},
  created_by: { type: Schema.Types.ObjectId, refPath: 'user', default: null },
  created_at: Date,
  updated_at: Date,
});

schema.pre('save', function (next) {
  const currentDate = new Date();
  if (!this.created_at) {
    this.created_at = currentDate;
  } else {
    this.updated_at = currentDate;
  }
  next();
});

schema.post('save', function() {
  if(this.status === 'pending' && this.type === 'whatsapp') {
    const whatsappConfig = config[process.env.MODE].whatsapp;
    const _config = whatsappConfig[whatsappConfig.enabled_method];
    if(whatsappConfig.enabled_method === 'ultramsg') {
      const ultramsg = require('ultramsg-whatsapp-api');
      const instance_id= _config.instanceId;
      const ultramsg_token= _config.token;
      const api = new ultramsg(instance_id, ultramsg_token);
      const to = this.to;
      const body = this.content; 
      api.sendChatMessage(to, body).then(response => {
        if(response.sent === 'true') {
          this.status ='sent';
        } else {
          this.status = 'failed';
        }
        this.save();
      });
    }
  }
});
module.exports = mongoose.model('third_party_notifications', schema);
