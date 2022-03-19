class Dep {
  constructor() {
    this.map = {}
    
  }
  emit (name,data) {
    this.map[name].forEach(fn => {
      fn.apply(this,[data]);
    });
  }
  on (name,fn) {
    if (this.map[name] === undefined) {
      this.map[name] = []
    }
    this.map[name].push(fn)
  }

}
let dep = new Dep();
dep.on('hh',function(name){
  console.log('1' + name)
})
dep.on('hh',function(name){
  console.log('2' + name)
})
dep.emit('hh','my name')