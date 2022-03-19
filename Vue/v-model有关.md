# v-model作用

本质上是语法糖用于表单元素创建双向数据绑定

# v-model实现原理
1. v-bind绑定数据
2. 触发oninput事件传递数据
```js
<input v-model='sth'>
// 等价于
<input :value='sth' @input='sth = $event.target.value'>
// $event.target指代当前触发事件对象的dom
```