// function fakeFetch(data, delay) {
//   return new Promise((resolve) => {
//     setTimeout(() => resolve(data), delay);
//   });
// }

// fakeFetch("Order received",1000)
//   .then(result=>{
//     cno

//   }


/* what is async and await
  async before a function- that function always return 
  a promise.
  await inside an async funtion-pause the function
  until the promise is done.
  Meanwhile, the rest of your program continues running (non-blocking).
  */

  function fakeFetch(data,delay)
  {
    return new Promise((resolve)=>
    {
      setTimeout(()=>resolve(data),delay);
    });
  }


  //Our async function
  // Our async function
async function orderFood() {
  console.log("📱 Placing order...");

  const order = await fakeFetch("🍔 Order confirmed!", 2000);
  console.log(order);

  const cooking = await fakeFetch("👨‍🍳 Cooking your food...", 2000);
  console.log(cooking);

  const delivery = await fakeFetch("🚚 Out for delivery!", 2000);
  console.log(delivery);

  const delivered = await fakeFetch("🍕 Food delivered!", 2000);
  console.log(delivered);

  console.log("✅ Enjoy your meal!");
}

// Call the async function
orderFood();

console.log("⌛ Meanwhile, you can chat with friends...");