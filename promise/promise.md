# 了解Promise

谈到Promise离不开Javascript单线程的原因。Javascript单线程是因为运行Javascript实际上是为了页面交互，页面交互离不开DOM操作，DOM操作必然是单线程，不然会出现线程冲突(一个修改DOM，一个删除DOM,浏览器就很难受了)。单线程虽好，但问题出现了，如果某个任务耗时严重，那么必然会阻塞后面的代码，导致后面代码迟迟不能运行。所以最终要考虑异步的问题。


## Promise是什么？

异步编程的解决方案。
异步就是为了不去等待当前这个任务执行结束再开始下一个任务，可以避免阻塞现象。比如说某些耗时的工作。

## Promise源码阅读

源码给出的定义
Promise对象表示异步操作的最终结果。 与promise交互的主要方式是通过它的“then”方法，该方法注册回调函数来接收promise的最终值或promise不能被实现的原因。  
Promise也可以说是解决了一个value。 如果这个值也是一个Promise，那么原始Promise的稳定状态将与value的稳定状态相匹配。 所以一
个reject的Promise将会被拒绝，而一个resolve的Promise将会实现。  

基本术语
- thenable 是一个定义了' then '方法的对象或函数。  
- value 是任何合法的JavaScript值(包括undefined, thenable，或承诺)。  
- exception 是一个使用throw语句抛出的值。  
- reason 是一个值，表示承诺被拒绝的原因。  
- settled Promise的最终状态：已完成/已拒绝

### 源码入口
Promise定义的事情
1. 创建构造函数
2. 为构造函数的原型对象上绑定catch、finally方法
``` let a = new Promise```这个过程完成的事情
1. 为实例绑定PromiseID属性、result结果、状态、注册回调数组
2. 判断是否有new关键字 promise传入了函数没有

```js
var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];
    // 这里是为了限制不是 let child = new this.constructor(noop)这样子
    // 在Promise源文件中一般会let child = new this.constructor(noop)这样子调用
    // 实际上就是限制外部调用Promise的规范
    if (noop !== resolver) {
      // 这里表明Promise()需要new关键字创建且要传入参数，该参数是一个函数否则就会抛出错误。
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;
    // return a,b 表示的是先执行a然后再return b
    if (isFunction(callback)) {
      return promise.then(function (value) {
        return constructor.resolve(callback()).then(function () {
          return value;
        });
      }, function (reason) {
        return constructor.resolve(callback()).then(function () {
          throw reason;
        });
      });
    }
    return promise.then(callback, callback);
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;
```
### then方法实际做的事情

类似于这样子```Promise(fn1).then(fn2)```就要看then方法了。

1. 判断前一个Promise的状态
2. 如果状态时pending则将then的参数存放到上一个Promise的回调数组中。(订阅) subscribe方法
3. 如果状态时已完成/已拒绝则执行then参数方法。invokeCallback方法

```js
function then(onFulfillment, onRejection) {
  // 因为调用时promise.then()
  // 这里的this指向前一个promise是一个实例
  var parent = this;
  // 创建一个promise
  // 实例会自动获取构造函数原型对象上的constructor属性，该属性指向构造函数
  // 该Promise对象是用来保存该promise的参数比如状态，result
  var child = new this.constructor(noop);
  // 这种是给直接调用Promise.then(fn)这种情况处理的
  // 1、给promise的PROMISE_ID属性一个id
  // 绑定属性，如_state=undefined,_result=undefined,_subscribe=[]
  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }
  // 拿到前一个promise的状态
  var _state = parent._state;

  // 判断promise状态 pending: _state = undefined、fulfilled:_state = 1;、reject:_state = 2;
  if (_state) {
    // 如果状态已完成或已拒绝，无需订阅，直接执行回调返回结果，印证了一旦promise有了结果无法再次改变
    // 这里的arguments指向实参本质上就是拿到已完成的回调或者已拒绝的回调
    var callback = arguments[_state - 1];
    // 在执行asap前先判断
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    // 这种情况出现在前一个Promise的resolve/reject在异步事件如settimeout当中
    // 这时候当前一个Promise调用then方法时还没遇到resolve/reject所以此时的前一个Promise状态应该是pending
    // 状态为pending 先注册等待结果再回调
    subscribe(parent, child, onFulfillment, onRejection);
  }
  //then reuturn的新promise
  return child;
}
```
invokeCallback就是then参数方法的执行
```js
function invokeCallback(settled, promise, callback, detail) {
  // 检查callback是否function
  // 上述已知callback本质上是then方法的onFulfillment, onRejection主要看settled也就是state的状态
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = true;

  if (hasCallback) {
    // 这里才执行then的参数方法
    // 尝试onFulfillment(detail)/onRejection(detail)
    try {
      value = callback(detail);
    } catch (e) {
      succeeded = false;
      error = e;
    }
    // 如果返回值是promise的话做判断
    // 这里表明then方法的回调return要return 一个new Promise()
    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    // 上一个Promise的result
    value = detail;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    //value 可能为thenable，继续处理，抽丝剥茧
    // 也就是说给then(value=>{
    //  return new Promise(...)
    // },fn)这样子的形式处理的
    resolve(promise, value);
  } else if (succeeded === false) {
    // 回调失败
    reject(promise, error);
  } else if (settled === FULFILLED) {
    // 已完成
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    // 已拒绝
    reject(promise, value);
  }
  // 到此实际上解决完一个then的所有东西了
}

```
subscribe就是then参数存放
```js
function subscribe(parent, child, onFulfillment, onRejection) {
  // 拿到前一个Promise对象的注册回调数组
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;
  // 由于数组是传址所以直接改变_subscribers就可以直接改变parent的回调数组
  // 将下一个promise加入到parent._subscribers
  // 从这里可以看出_subscribers的排序是 [promise,resolve,reject,promise,resolve,reject,...]
  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;
  
  // 1、如果之前有订阅且状态是pending， 订阅就好了，等待resolve完成时的发布通知执行就好
  // 2、如果之前有订阅且状态不是pending，继续加入订阅就好，length=0时已经准备调度发布了，pulish执行时会清空
  // 3、如果之前无订阅且状态是pending，订阅就好了，等待resolve完成时的发布通知执行就好
  // 4、如下，赶紧调度执行获取结果
  if (length === 0 && parent._state) {
    // 到时候执行实际上就是publish(parent)
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}
```

### resolve方法做的事情

1. 创建promise对象存放状态和结果
2. 对传入resolve的参数做判断处理
3. 处理完后更改原promise的状态和结果

```js
function resolve$1(object) {
  // 这里是给resolve(new Promise(...))这种情况的
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }
  // 实际上这里开始
  // 这个promise是用来装载状态和结果的
  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}
function resolve(promise, value) {
  if (promise === value) {
    // 实际上在resolve$1中已经做处理了暂时不管他
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    // 这里是解决resolve传入了一个普通对象或者方法或Promise对象
    var then$$1 = void 0;
    try {
      // 不知道这里会报什么错，比较value是对象/方法/Promise对象
      // value.then最差也是undefined这种情况
      then$$1 = value.then;
    } catch (error) {
      reject(promise, error);
      return;
    }
    // 解决这个value毕竟这个vaule有可能是promise对象
    handleMaybeThenable(promise, value, then$$1);
  } else {
    // 一般是直接到这里，毕竟通常resolve()传的是字符串/数字
    fulfill(promise, value);
  }
}
function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._result = value;
  promise._state = FULFILLED;
  // 如果该promise含有回调数组
  // 直接publish(promise)
  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

// *********************这些是resolve的补充大概看一下**************************
function handleOwnThenable(promise, thenable) {
  // 判断state的状态
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    // 解决promise对象
    handleOwnThenable(promise, maybeThenable);
  } else {
    // 非promise对象
    if (then$$1 === undefined) {
      // 更改promise的状态为fulfill、结果为maybeThenable
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}
```

### reject方法做的事情
```js
function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}
function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

```

## 手写一个简单的Promise
1. 确保状态唯一
执行resolve/reject时先判断status的状态
2. 能够回调
最后return new Promise()
3. 顺序不能乱
setTimeout包裹

```js
class Promise{
  constructor(excutorCallBack){
    this.status = 'pending';
    this.value = undefined;
    this.fulfillAry = [];
    this.rejectedAry = [];
    let timer;
    let resolveFn = result => {
      if(this.status !== 'pending') return;
      timer || (timer = setTimeout(() => {
        this.status = 'fulfilled';
        this.value = result;
        this.fulfillAry.forEach(item => item(this.value));
      }, 0));
    };
    let rejectFn = reason => {
      if(this.status !== 'pending')return;
      timer = setTimeout(() => {
        this.status = 'rejected';
        this.value = reason;
        this.rejectedAry.forEach(item => item(this.value))
      })
    };
    try{
      excutorCallBack(resolveFn, rejectFn);
    } catch(err) {
      //=>有异常信息按照rejected状态处理
      rejectFn(err);
    }
  }
  then(fulfilledCallBack, rejectedCallBack) {
    // 该this指向原来promise实例并不是指向这个新建的Promise
    return new Promise((resolve, reject) => {
      this.fulfillAry.push(() => {
        try {
          let x = fulfilledCallBack(this.value);
          x instanceof Promise ? x.then(resolve, reject ):resolve(x);
        }catch(err){
          reject(err)
        }
      });
      this.rejectedAry.push(() => {
        try {
          let x = rejectedCallBack(this.value);
          x instanceof Promise ? x.then(resolve, reject):resolve(x);
        }catch(err){
          reject(err)
        }
      })
    }) ;
  }
  catch(rejectedCallBack) {
    return this.then(null, rejectedCallBack);
  }
  static all(promiseAry = []) {
    let index = 0, 
        result = [];
    return new Promise((resolve, reject) => {
      for(let i = 0; i < promiseAry.length; i++){
        promiseAry[i].then(val => {
          index++;
          result[i] = val;
          if( index === promiseAry.length){
            resolve(result)
          }
        }, reject);
      }
    })
  }
  static race(promiseAry) {
    return new Promise((resolve, reject) => {
      if (promiseAry.length === 0) {
        return;
      }
      for (let i = 0; i < promiseAry.length; i++) {
        promiseAry[i].then(val => {
          resolve(val);
          return;
        }, reject);
      }     
    })
  }
  static resolve (value) {
      if (value instanceof Promise) return value
      return new Promise(resolve => resolve(value))
  }
  static reject (value) {
      return new Promise((resolve, reject) => reject(value))
  }
}
```



