jwt = require("jsonwebtoken");


const emitModuleChange = (req, res, module, action = 'post') => {
    if(res.statusCode === 200 || res.statusCode === 201){
        const payload = jwt.decode(req.headers.authorization.replace("Bearer ", ""), {complete: true}).payload;
        process.emit('moduleChange', { module: module, user_id: payload.user_id, action, _id: req.body._id || req.params.id });
    }
};


const emitModuleChangeEvent = (controller, module) => {
    controller.request('post', function(req, res, next) {
        res.on("finish",  () => emitModuleChange(req, res, module, 'post'));
        next();
    });

    controller.request('put', function(req, res, next) {
        res.on("finish",  () => emitModuleChange(req,res, module, 'put'));
        next();
    });

    controller.request('delete', function(req, res, next) {
        res.on("finish",  () => emitModuleChange(req, res, module, 'delete'));
        next();
    });
};

module.exports = emitModuleChangeEvent;