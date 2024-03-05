const Notification = require('./models.js');
const controller=require('./controllers.js');
const authorize = require('../../middlewares/auth');

controller.request(authorize);
controller.methods('put delete get', false);

controller.request('post', async function(req, res, next) {
    const user = req.user;
    if (user) {
        req.body.created_by = user.user_id;
    }
    
    return next();
});
