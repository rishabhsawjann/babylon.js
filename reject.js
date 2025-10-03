const failPromise=new Promise((resolve, reject)=>{
    reject("It failed");
});
failPromise.then(result=>console.log(result))
.catch(error=>console.log(error));
