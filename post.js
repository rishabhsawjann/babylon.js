/*
so far we have been fetching data from a server using the fetch API and handling the response using promise chaining.
but did you know we can also send the data to the server using the POST method?
let's see how to do that.
*/
fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com"
    })
})
.then(response => response.json())
.then(data => {
    console.log("Created post:", data);
})
.catch(error => {
    console.error("Error:", error);
});
