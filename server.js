var io = require('socket.io');
var fs = require('fs');
var md5 = require('md5');
var https = require('https');
var config = require('./config');
var Server = function(){
    this.setupWebSocket();
    this.loadUsers();
    this.loadPortals();
};
Server.prototype = {
    default_portals:{
        portals:[],
        children:[
            {
                portals:[],
                children:[],
                user:"shane"
            }
        ],
        user:"lunartiger"
    },
    findPortalRoom:function(username,callback,parent){
        var _this = this;
        parent = parent || this.portals;
        parent.children.every(function(child){
            if(child.user === username){
                callback(child);
                return false;
            }else{
                _this.findPortalRoom(username,callback,child);
            }
        });
    },
    authenticate:function(msg){
        var _this = this;
        return new Promise(function(resolve){
            var user = _this.users.filter(function(user){
                return user.username === msg.username && user.password === md5(msg.username+msg.password+"lunars-boobs");
            });
            if(user.length){
                user = user[0];
                _this.findPortalRoom(user.username,function(room){
                    resolve(room);
                });
            }
        });
    },
    setupWebSocket:function(){
        var _this = this;
        var options = {
            key: fs.readFileSync(config.ssl.key),
            cert: fs.readFileSync(config.ssl.cert)
        };
        var app = https.createServer(options);
        this.socket = io({ origins: '*:*'});
        this.socket.on('connection', function(socket){
            socket.on('portals',function () {
                socket.emit('portals',this.portals);
            });
            socket.on('md5',function (msg) {
                socket.emit('md5',JSON.stringify({username:msg.username,password:md5(msg.username+msg.password+"lunars-boobs")}));
            });
            socket.on('add-portal',function (msg) {
                _this.authenticate(msg)
                    .then(_this.addPortal.bind(_this, msg))
                    .then(function(){
                        socket.broadcast.emit('update-portals',msg.username)
                    });
            });
            socket.on('remove-portal',function (msg) {
                _this.authenticate(msg)
                    .then(_this.removePortal.bind(_this, msg))
                    .then(function(){
                        socket.broadcast.emit('update-portals',msg.username)
                    });
            });
        });
        this.socket.listen(app);
        app.listen(8008);
    },
    loadPortals:function(){
        this.portals = this.loadJSON('layout.json',this.default_portals);
    },
    loadUsers:function(){
        this.users = this.loadJSON('users.json',[]);
    },
    loadJSON:function(file,default_value){
        try{
            return JSON.parse(fs.readFileSync(__dirname+'/'+file,'utf8'));
        }catch(e){
            return default_value;
        }
    },
    addPortal:function(msg,portal_room){
        portal_room.portals.push({
            name:msg.portalName,
            space_id:msg.portalSpaceId,
            image:msg.portalImage
        });
        this.savePortals();
    },
    removePortal:function(msg,portal_room){
        console.log(msg,portal_room);
        portal_room.children.splice(msg.portalNumber,1);
        this.savePortals();
    },
    savePortals:function(){
        fs.writeFileSync(__dirname+'/layout.json',JSON.stringify(this.portals||this.default_portals,null,4));
    }
};
new Server();