function explainError(status) {
    switch (status) {
        case 401:
            return {
                explanation: "User is not authenticated",
                fix: "Login with valid credentials"
            };

        case 404:
            return {
                explanation: "Requested resource not found",
                fix: "Check the URL or endpoint"
            };

        case 500:
            return {
                explanation: "Server failed while processing request",
                fix: "Check backend logic or database connection"
            };

        default:
            return {
                explanation: "Unknown error occurred",
                fix: "Check logs for more details"
            };
    }
}

module.exports = explainError;