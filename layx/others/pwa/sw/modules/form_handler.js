async function handleFormSubmission(request) {
    // Clone the request to read its body
    const formData = await request.formData();

    // Process the form data
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }

    // Forward the request to the network
    return fetch(request);
}

export {handleFormSubmission}