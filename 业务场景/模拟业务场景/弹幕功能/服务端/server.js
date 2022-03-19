var ws = require("nodejs-websocket");
// var fs = require('fs'),
//     path = require('path');
//     fs.readFile(path.join(__dirname, 'bulletScreen.json'), 'utf8',function (err,data1) {
//       if (err) throw err;
//       data1 = JSON.parse(data1)
//       console.log
//       console.log(typeof data1);
//   });

console.log("开始建立连接...")
 
var timer = null;
var server = ws.createServer(function(conn){
    conn.on("text", function (str) {
        console.log("收到的信息为:"+str)
        let getBulletScreen = /getBulletScreen/.test(str)
        console.log('收到自定义',getBulletScreen)
        if (getBulletScreen){
          let msg = ['哈哈哈','好呀','这节课讲的真好','确实如此','老师讲的也太好了吧',
            '真棒','好呀','这节课讲的真好','确实如此','老师讲的也太好了吧',
            '哈哈哈','好呀','这老师讲的一般吧','神仙老师','老师讲的也太好了吧',
            '哈哈哈','好呀','有这么好么','确实如此','老师讲的也太好了吧',
          ]
          timer = setInterval(() => {
            let randomStart = parseInt(Math.random() * 10)
            let randomEnd = parseInt(Math.random() * 100)
            conn.sendText(msg.slice(randomStart,randomEnd).toString());
          }, 1000);
          
        }
    })
    conn.on("close", function (code, reason) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        console.log("关闭连接")
    });
    conn.on("error", function (code, reason) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        console.log("异常关闭")
    });
}).listen(5000)

console.log("WebSocket建立完毕")