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

**Actions:**

- Start hot water boost (with duration)
- Stop hot water boost
- Set hot water mode

**Conditions:**

- Hot water mode is...

## Development

Watch for TypeScript changes during development:

```bash
npm run watch
```

## License

See LICENSE file for details.
