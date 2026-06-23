# Load Test Report

## Test File
`load-tests/builtglory.k6.js`

## Covered Scenarios
- Authentication OTP request
- Property listing
- Buy enquiry creation
- Payment creation

## Thresholds
- `http_req_failed < 5%`
- `p95 http_req_duration < 500ms`

## Execution
The k6 script has been created but was not executed in this environment because the API server, database, Redis, payment provider credentials, and seed data were not running together.

## Run Command

```bash
k6 run -e BASE_URL=http://localhost:3000/api/v1 load-tests/builtglory.k6.js
```

For authenticated enquiry/payment flows:

```bash
k6 run -e BASE_URL=http://localhost:3000/api/v1 -e ACCESS_TOKEN=<token> -e PROPERTY_ID=<id> -e DEAL_ID=<id> load-tests/builtglory.k6.js
```

## Current Performance Score
Load-test assets are present, but performance score remains provisional until the script is run against a production-like environment.
