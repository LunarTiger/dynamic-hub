var io = require('socket.io');
var fs = require('fs');
var md5 = require('md5');
var Server = function(){
    this.setupWebSocket();
    this.loadUsers();
    this.loadPortals();
};
Server.prototype = {
    default_portals:{
        portals:[],
        children:[],
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
        return new Promise(function(resolve,reject){
            var user = _this.users.filter(function(user){
                return user.username === msg.username && user.password === md5(msg.username+msg.password+"lunars-boobs");
            });
            if(user.length){
                user = user[0];
                _this.findPortalRoom(user.username,function(room){
                    resolve(room);
                });
            }else{
                reject(new Error('Incorrect login!'));
            }
        });
    },
    reloadSockets:function(socket){
        return Promise.resolve()
            .then(function(){
                socket.broadcast.emit('update-portals',msg.username)
            })
            .catch(function(error){
                socket.emit('error',error);
            })
    },
    setupWebSocket:function(){
        var _this = this;
        this.socket = io();
        this.socket.on('connection', function(socket){
            socket.on('portals',function () {
                socket.emit('portals',this.portals);
            });
            socket.on('add-portal',function (msg) {
                _this.authenticate(msg)
                    .then(_this.addPortal.bind(_this, msg))
                    .then(_this.reloadSockets.bind(_this));
            });
            socket.on('remove-portal',function (msg) {
                _this.authenticate(msg)
                    .then(_this.removePortal.bind(_this, msg))
                    .then(_this.reloadSockets.bind(_this));
            });
        });
        this.socket.listen(8008);
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
        portal_room.children.push({
            name:msg.room.name,
            space_id:msg.room.space_id,
            image:msg.room.image,
            show_name:!!msg.show_name
        });
        this.savePortals();
    },
    removePortal:function(msg,portal_room){
        portal_room.children.splice(msg.index,1);
        this.savePortals();
    },
    savePortals:function(){
        fs.writeFileSync(__dirname+'/layout.json',JSON.stringify(this.portals||this.default_portals,null,4));
    }
};
new Server();