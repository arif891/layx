async function handleBroadcastChannel(event) {
    const SwReceivedData = event.data;
    if (SwReceivedData.runFunction) {
        const functionName = SwReceivedData.runFunction;
        const functionParams = SwReceivedData.params || [];

        try {
            const result = await self[functionName](...functionParams);

            SwBroadcastChannel.postMessage({ RunSuccess: true, result });
        } catch (error) {
            SwBroadcastChannel.postMessage({ RunSuccess: false, error: error.message });
        }
    } else {
        console.log(SwReceivedData, 'Unable to handle Received Data.')
    }
};

export {handleBroadcastChannel}