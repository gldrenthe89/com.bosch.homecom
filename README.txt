This is an open-source community app. Questions, suggestions, or issues? Please report them on our GitHub page: https://github.com/gldrenthe89/com.bosch.homecom/issues

FEATURES

- Thermostat control (5-30°C)
- Thermostat modes: Off, Heat, Auto
- Hot water modes: Off, Eco+, Eco, Comfort, Auto
- Hot water boost with configurable duration

SENSORS

- Room temperature
- Outdoor temperature
- Supply/return water temperature
- Hot water temperature
- System pressure
- Modulation percentage
- Heat demand indicator
- Operating hours

SETUP (use Google Chrome, Firefox is not supported)

1. Add device in Homey
2. Open the authorization URL in a private browser window
3. Open the Network tab in Developer Tools (F12), then log in with your credentials
4. After the redirect fails (this is expected), find the request containing code= in the Network tab and copy the code value (ends in -1)
5. Paste the code in Homey to complete setup

Source: https://github.com/serbanb11/bosch-homecom-hass?tab=readme-ov-file#step-by-step-instructions
