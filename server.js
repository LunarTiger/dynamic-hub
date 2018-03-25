var io = require('socket.io');
var fs = require('fs');
var Server = function(){
    this.setupWebSocket();
    this.loadPortals();
};
Server.prototype = {
    default_portals:{
        portals:[],
        children:[],
        user:"lunartiger"
    },
    setupWebSocket:function(){
        var _this = this;
        this.socket = io();
        this.socket.on('connection', function(socket){
            socket.on('portals',function () {
                socket.emit('portals',this.portals);
            });
            socket.on('add-portal',function (msg) {
                _this.addPortal(msg);
            });
        });
        this.socket.listen(80085);
    },
    loadPortals:function(){
        try{
            this.portals = fs.readFileSync(__dirname+'/layout.json','utf8');
        }catch(e){
            this.portals = this.default_portals;
        }
    },
    addPortal:function(){
        this.savePortals();
    },
    savePortals:function(){
        fs.writeFileSync(__dirname+'/layout.json',JSON.stringify(this.portals||this.default_portals,null,4));
    }
};
new Server();