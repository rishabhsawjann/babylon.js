/*
Promise as I have already studied is a a asychronous process
which either get completed or failed,it does not store any values 
it is in the pending state in the beginning 
*/
const apromise= new Promise((resolve, reject)=>{
    resolve("It worked");
});
apromise.then(result=>{
    console.log(result)
});