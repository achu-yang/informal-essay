function startMove(obj,json,fn){  //  {"width":300,"height":300}
  clearInterval(obj.timer);
  obj.timer = setInterval(function(){
      var flag = true;// 当开关变量的值为 true时，运动结束，可以停止定时器了     
      for(var attr in json){      
          var current = 0;
          if(attr == "opacity"){
              //操作透明度
              debugger;
              current = parseFloat( getStyle( obj,attr ) ) * 100;
              console.log(current);
          }else if( attr == "zIndex" ){
              current = parseInt( getStyle(obj,attr) );//操作空间定位
          }else{
              
              //操作的是带有像素值的样式
              current = parseInt( getStyle(obj,attr) );//获取当前操作对象的实际值
          }
          var speed = (json[attr] - current) > 0 ? 1 : -1;
          //speed = speed>0 ? Math.ceil(speed) : Math.floor(speed);
          if( json[attr] != current ){
              //如果目标值 和 当前操作的样式值不相等，就不能停止定时器 
              flag = false;               
          }
          //上面的条件不满足  继续执行运动
          if(attr == "opacity"){
              //操作透明度
              obj.style.opacity = (current + speed) / 100;
          }else if(attr == "zIndex"){
              
              obj.style.zIndex = current+speed;
              
          }else{
              //操作的是带有像素值的样式
              obj.style[attr] = current + speed + "px";
               
          }       
      }       
      //如果flag为true   就停止定时器      
      if(flag){
          clearInterval(obj.timer);
          //一个动作完成后,进入下一个动作(也就是要调用下一个函数)
          if(fn){ //判断如果有函数传递过来，就调用
              fn();
          }
      }
      
  },10)
}
function getStyle(obj,attr){
  return window.getComputedStyle ? window.getComputedStyle(obj,false)[attr] : obj.currentStyle[attr];
}