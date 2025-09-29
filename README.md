# Elementor AI Content Assistant - Chrome Extension

## Install (developer mode)
1. Save the folder `elementor-ai-assistant` locally.
2. Open Chrome → Extensions → Developer mode → Load unpacked → select the folder.
3. Open Options (right-click extension → Options) and paste your OpenAI API key (`sk-...`) and desired model.
   - For model, try `gpt-4o-mini` or any available chat model from your OpenAI account.

## How to use
- Focus a text area (Elementor inline editor / textarea / input). A small `AI` floating button appears. Click it to open the assistant panel.
- Or right-click inside an editable field → **Generate AI content for selection / field**.
- Choose operation (generate / rewrite / shorten / expand), set the domain context once (company summary), and click **Generate**.
- Click **Insert into field** to replace the current editing area content.

## Where to put token
- Open the extension Options page (right-click extension icon → Options) and paste your OpenAI API key into the "OpenAI API Key" field, then Save.

## Notes
- This is an MVP. For production or team use, **do not store production keys in client-side storage** — instead use a secure proxy server that injects the API key and enforces rate limits and logging.
