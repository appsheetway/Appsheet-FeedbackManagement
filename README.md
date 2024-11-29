# Appsheet Feedback Management using Gemini and Google Forms

Repository containing AppScripts of the AppSheet Feedback Management application from the Idun Group's Google Summit Berlin 2024 presentation. You will need to copy the AppScripts to your own AppScripts project.

## Setup Instructions

Before using this application, you need to set up these necessary steps:

### Prerequisites

1. **Appsheet Account**: Ensure you have an Appsheet account and the necessary permissions to access the app.
2. **Google Cloud Account**: You need a Google Cloud account to use the Gemini API.


### Required AppScript Properties

1. Create an AppScript property named `API_KEY` and set it to your Appsheet API key.


### Required Values

Make sure to add the following properties to your `Const.gs` file:

- `APP_ID`: The ID of your Appsheet app
- `SHEET_ID`: The ID of your Google Spreadsheet
- `PROJECT_ID`: The ID of your Google Cloud project
- `LOCATION_ID`: The region of your Google Cloud project
- `MODEL_ID`: The ID of the Gemini model to use

### Link to your AppSheet Application 
Save the script as a standalone Apps Script project in your Google Drive. Then, open your AppSheet application, go to the "Bot" section, and select the script from your Drive.

## Usage

After setting up the `Const.gs` file with the required properties, you can proceed to use the AppSheet Feedback Management application as demonstrated in our presentation.
If you want to rewatch.

Please do not change the name of the table or the order of the columns in the data sources. If you need to add more columns for your own usage, ensure that they are placed at the end of the table.

For more detailed instructions on how to use the application, please refer to the presentation materials or contact the Idun Group support team.
