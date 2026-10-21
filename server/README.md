# Voice callback endpoint (form se AI agent ka call)

Website quote form bharne par agent khud visitor ko call karta hai.

## Flow

1. Visitor site ka quote form bhar-ta hai (name, WhatsApp number, services).
2. Form `POST` karta hai callback endpoint par (URL index.html mein `CALLBACK_ENDPOINT`).
3. Server visitor ka number E.164 mein normalize karta hai aur ElevenLabs ko
   outbound call request bhejta hai:
   `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call`
   (`agent_id` + `agent_phone_number_id` = hamare Twilio number +1 857 832 7540).
4. ElevenLabs hamare Twilio number se visitor ko call karta hai, aur agent
   website ki request ke hisaab se baat shuru karta hai (first_message override
   + dynamic variables: customer_name, services_requested, project_details).

## Files

- `server/twilio-function.js` - Twilio Functions version (paste-ready, single file).
- `server/standalone.js` - plain Node server (any host / VPS / tunnel).
- `server/.env.example` - environment variable template.

## Enable it on the website

`index.html` mein:

```js
var CALLBACK_ENDPOINT = '';
```

Isko apne endpoint URL se replace karein, jaise:

```js
var CALLBACK_ENDPOINT = 'https://your-service.twil.io/callback';
```

Jab tak ye khali hai, website bilkul aaj jaisa hi chalta hai (sirf email).

## Deploy option A: Twilio Functions (recommended)

Twilio account already hai (trial), aur isi account par hamara number bhi hai.

1. Twilio Console -> Functions -> Create a Function.
2. `server/twilio-function.js` ka poora code paste karein.
3. Environment Variables mein `ELEVENLABS_API_KEY` add karein
   (ElevenLabs -> Profile -> API Keys -> Create API Key).
4. Save + Deploy. Copy kar lein function URL.
5. Wahi URL `index.html` ke `CALLBACK_ENDPOINT` mein daalein.

CLI se (agar Twilio CLI installed ho):

```
twilio serverless deploy --functions server
twilio serverless:deploy --env .env
```

## Deploy option B: koi bhi Node host

```
node server/standalone.js
```

Phir us host ka HTTPS URL `CALLBACK_ENDPOINT` mein daalein.
Local test ke liye `cloudflared tunnel --url http://localhost:8787` bhi chalta hai.

## Test

```bash
curl -X POST https://<your-endpoint>/callback \
  -H "Content-Type: application/json" \
  -H "Origin: https://rehmanai.publ" \
  -d '{"name":"Ali","phone":"+92 300 1234567","email":"ali@example.com","details":"3 AI photos","services":"AI Photo Creation x 3","estimatedTotal":150}'
```

Response: `{"ok":true,"scheduled":true,"conversation_id":"...","call_sid":"..."}`

## Zaroori baatein (limitations)

- **Twilio trial** par outbound calls sirf Verified Caller IDs ko ja sakti hain.
  Asli customers ko call karne ke liye Twilio account ko paid plan par upgrade karna hoga.
  Tab tak sirf wo numbers call ho sakti hain jo Twilio mein verified hain.
- **ElevenLabs** ka free plan limited ConvAI minutes deta hai (10k credits/month).
- Server `ALLOWED_ORIGINS` check karta hai aur per-IP 5 requests/hour limit rakhta hai,
  taake public URL misuse na ho.
- API key sirf server par rehti hai; website ke code mein kabhi nahi jati.
