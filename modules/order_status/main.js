require('./models.js');
var controller=require('./controllers.js');
const authorize = require('../../middlewares/auth');
const emitModuleChangeEvent = require("../../middlewares/moduleChange");

emitModuleChangeEvent(controller, 'order_status');

controller.request(authorize);
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
