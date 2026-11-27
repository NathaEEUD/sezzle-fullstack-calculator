# The service owns error copy; the app shows `message` verbatim

Every error body is `{"error":{"code","message"}}`. The app never switches on `code`: it chooses only between "maths error" and "service unavailable" from the HTTP status (422 versus anything else) and shows the service's `message` as is. A 422 message goes in the display, and any other envelope message goes in the service alert. That makes message text part of the API contract. The 422 messages are short, fixed strings sized for the display ("Cannot divide by zero", "Not a real number", "Result too large"), and the tests assert them exactly. 4xx and 5xx messages are specific and aimed at developers. `code` is still stable SCREAMING_SNAKE_CASE, but it's there for API clients and logs, not for this app.

We chose this so there's one source of truth for what each failure says, which means a new error case needs no app change. The cost is that copy changes ship with the service, and localisation would have to live in the service, for example through `Accept-Language`.

## Considered Options

- **App maps `code` to its own text**: the conventional split, but every new code needs a matching app release, and the two lists can drift.
