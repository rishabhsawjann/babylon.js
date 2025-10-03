/*
Delayed greeting
*/
async function delayedGreeting(name)
{
    console.log("Messenger entered...");
    await new Promise(resolve=> setTimeout(resolve,2000));
    console.log('Hello,${name}!');
}
delayedGreeting("Alice");
console.log("First Printed Message!");
console.log(delayedGreeting);