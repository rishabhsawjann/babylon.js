// fetch('https://api.example.com/data')
// .then(response=>response.json())
// .then(data=>{
//     console.log(data);
//     return fetch('https://api.example.com/data2');   
// })
// {
//     .then(response=>response.json())
//     .then(data2=>console.log(data))
//     .catch(error=>console.error('Error:',error));

// }

/*
Promise Chaining
Promise chaining means:
   "Do step 1, when done, do step 2, when done-> do step 3... and so on"

   Each .then() can return a value or a new promise and the next .then() will receive 
   it 

*/
new Promise((resolve,reject)=>{
    resolve(1);
})
   .then(num=>{
    console.log("Step 1:",num);
    return num+1;
   })
   .then(num=>{
    console.log("Step 2:",num);
    return num+1;
   })
   .then(num=>{
    console.log("Step 3:",num);//Step 3:3
   })
   .catch(error=>console.log("Error,",error));
   