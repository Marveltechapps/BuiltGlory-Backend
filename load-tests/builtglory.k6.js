import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    smoke: { executor: "constant-vus", vus: 10, duration: "1m" },
    browse: { executor: "ramping-vus", stages: [{ duration: "1m", target: 25 }, { duration: "2m", target: 25 }, { duration: "1m", target: 0 }] }
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<500"]
  }
};

const baseUrl = __ENV.BASE_URL || "http://localhost:3000/api/v1";

export default function () {
  const properties = http.get(`${baseUrl}/properties?page=1&limit=10`);
  check(properties, { "properties status ok": (res) => [200, 401].includes(res.status) });

  const otp = http.post(`${baseUrl}/auth/customer/otp/send`, JSON.stringify({ countryCode: "+91", phone: "9999999999", deviceId: `k6-${__VU}` }), { headers: { "content-type": "application/json" } });
  check(otp, { "otp validates rate or accepted": (res) => [200, 400, 409, 429].includes(res.status) });

  const enquiry = http.post(`${baseUrl}/buy-enquiries`, JSON.stringify({ propertyId: __ENV.PROPERTY_ID || "000000000000000000000000", enquiryType: "buy", preferredContact: "phone" }), { headers: { "content-type": "application/json", authorization: `Bearer ${__ENV.ACCESS_TOKEN || ""}` } });
  check(enquiry, { "enquiry controlled response": (res) => [201, 400, 401, 403, 404, 409, 422].includes(res.status) });

  const payment = http.post(`${baseUrl}/payments/token`, JSON.stringify({ dealId: __ENV.DEAL_ID || "000000000000000000000000", amount: 1000, type: "token", idempotencyKey: `k6-${__VU}-${__ITER}` }), { headers: { "content-type": "application/json", authorization: `Bearer ${__ENV.ACCESS_TOKEN || ""}` } });
  check(payment, { "payment controlled response": (res) => [201, 400, 401, 403, 404, 409, 422].includes(res.status) });

  sleep(1);
}
