module.exports=function(app){
	require('./models.js');
	var email=require('./controllers.js');
	app.post('/email/generateCode',function(req,res){
		email.generateCode(req,res);
	});
	app.get('/verifyEmail/:code',function(req,res){
		email.verifyCode(req,res);
	});
	return{
		email:email
	};
};