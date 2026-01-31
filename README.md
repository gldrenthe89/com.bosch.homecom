# Bosch HomeCom Easy for Homey

Control your Bosch heating and cooling devices with Homey. This app supports Bosch K30/K40 boilers and heat pumps via
the Bosch HomeCom Easy cloud service.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended (this app was created with v22))
- npm (comes with Node.js)
- [Homey CLI](https://apps.developer.homey.app/cli) - Install globally:
  ```bash
  npm install -g homey
  ```

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd homey-bosch-homecom
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the TypeScript files:
   ```bash
   npm run build
   ```

4. Run the app on your Homey:

   **Development mode** (app runs until you stop it):
   ```bash
   homey app run --remote
   ```

   **Permanent installation** (app persists after restart):
   ```bash
   homey app install
   ```

## Adding a Device

1. In the Homey app, go to **Devices** > **Add Device** (+)
2. Select **Bosch HomeCom Easy**
3. Choose **Boiler / Heat Pump (K30/K40)**
4. Copy the login URL shown and open it in your browser
5. Login with your Bosch HomeCom Easy account
6. After login, you will see a page that cannot load. The URL will look like:
   ```
   com.bosch.tt.dashtt.pointt://app/login?code=XXXXXX-1
   ```
7. Copy the authorization code from the URL (the part after `code=`, ending with `-1`)
8. Paste the code in Homey and click **Continue**
9. Your devices will be discovered - select the device(s) you want to add

## Supported Features

### Device Capabilities

- **Thermostat control** - Set target room temperature (5-30°C)
- **Hot water temperature** - Set target DHW temperature (30-65°C)
- **Thermostat modes** - Off, Heat, Auto
- **Hot water modes** - Off, Eco+, Eco, Comfort, Auto
- **Hot water boost** - Quick boost with configurable duration (15-480 minutes)

### Sensors

- Room temperature
- Outdoor temperature
- Supply/return water temperature
- Hot water temperature
- System pressure
- Modulation percentage
- Heat demand indicator
- Operating hours

### Flow Cards

#### Triggers (WHEN)

**Temperature triggers:**
- Room temperature changed
- Outdoor temperature changed
- Hot water temperature changed
- Supply temperature changed
- Return temperature changed

**Status triggers:**
- Heat demand started
- Heat demand stopped
- Hot water boost started
- Hot water boost stopped
- Thermostat mode changed
- Heating/cooling mode changed
- Hot water mode changed

**System triggers:**
- Modulation changed
- System pressure changed
- System pressure is too low (< 1.0 bar)

#### Conditions (AND)

**Temperature conditions:**
- Room temperature is above/below X°C
- Outdoor temperature is above/below X°C
- Hot water temperature is above/below X°C

**Status conditions:**
- Heat demand is active/inactive
- Hot water boost is active/inactive
- Thermostat mode is... (off/heat/auto)
- Heating/cooling mode is... (heat/cool/off)
- Hot water mode is... (off/eco+/eco/comfort/auto)

**System conditions:**
- Modulation is above/below X%
- System pressure is above/below X bar

#### Actions (THEN)

- Set thermostat mode (off/heat/auto)
- Set room temperature
- Set hot water mode
- Start hot water boost (with duration)
- Stop hot water boost

## Development

Watch for TypeScript changes during development:

```bash
npm run watch
```

## License

See LICENSE file for details.
