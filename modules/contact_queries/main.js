var ContactQueries=require('./models.js');
var controller=require('./controllers');
const authorize=require('../../middlewares/auth');
const emitModuleChangeEvent = require("../../middlewares/moduleChange");

emitModuleChangeEvent(controller, 'contact_queries');

controller.request('get', authorize);
controller.request('put', authorize);
controller.request('delete', authorize);
controller.request('delete', function(req, res, next) {
    if (req.params.id) {
        next();
        var user = req.user;
        if (user) {
            req.body.deleted = true;
            req.body.deleted_by = user.user_id;
            req.body.deleted_on = new Date().getTime();
        }
    } else {
        next(new Error("Invalid delete request"));
    }
});