require('./models.js');
var controller=require('./controllers.js');
var mongoose=require('mongoose');
const authorize = require('../../middlewares/auth');

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
controller.get('/get_summary',function(req,res){
	var NotificationMessage=mongoose.model('notification_messages');
	var user=mongoose.Types.ObjectId(req.query.user);


	NotificationMessage.aggregate([
			{
				$match:{
					'to.id':user,
					read:false,	
				}
			},
			{
				$sort:{created_on:1}
			}

		]).exec(function(err,messages){
			res.json(messages);
		});
});