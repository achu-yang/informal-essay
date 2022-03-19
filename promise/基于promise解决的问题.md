# 调度器
场景：
浏览器对对同一个服务器的并发数是有限制的，并发很大的时候比如说十个，控制一下一次只发两个请求，某个请求完了，另一个补上。
```js
class Scheduler {
  constructor (limitNumber) {
    this.id = 0;
    this.limitArrLength = limitNumber;
    this.execute = [];
    this.wait = []
  }

  addTask (time,out) {
    if (this.execute < this.limitArrLength) {
      let id = ++this.id;
      this.execute.push(id);
      new Promise(resolve=>{
        setTimeout(() => {
          let index = this.execute.indexOf(id)
          this.execute.splice(index,1)
          console.log(out)
          resolve()
        }, time);
      }).then(()=>{
        if (this.wait.length > 0) {
          let args = this.wait[0]
          this.wait.splice(0,1)
          this.addTask(args[0],args[1])
        }
      })
    } else {
      this.wait.push([...arguments])
    }
  }
}

let scheduler = new Scheduler(2);
addTask = (time,out) => {
  scheduler.addTask(time,out)
}
addTask(1000,"1");
addTask(500,"2");
addTask(300,"3");
addTask(400,"4");
addTask(1000,"5");
addTask(100,"6");
addTask(300,"7");
```

总结：
1. 定义一个类该类有id作为任务的唯一标识，数组长度，正在执行数组，等待数组。
2. 该类定义一个方法，这个方法中先判断正在执行数组是否满了如果没满就往里面加任务id然后new一个promise对象并在该对象then方法上递归。如果满就放在等待数组中缓存，等之前promise对象的then会对这个等待数组进行处理。
3. 将原方法指向该类定义的方法

误区：
正在执行数组并不是存放promise对象，而是存放promise对象的标识id，该id是在添加正在执行数组时产生的，通过闭包获取的。
