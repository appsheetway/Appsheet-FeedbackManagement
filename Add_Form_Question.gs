/**
 * Function addFormQuestions
 * 
 * @form_id {string} - ID of the selected Google Form.
 * 
 * Notes:
 * This function retrieves the questions from the Google Form, and stores it in the Appsheet Database.
 * The purpose is to reference each question with an ID, so that we can map it to their respective answers.
 * 
 */

function addFormQuestions(form_id) {
  var form = FormApp.openById(form_id);
  var items = form.getItems();
  
  // Retrieve question data and prepare it for the API call
  var dataToSend = [];
  
  items.forEach(function(item) {
    var itemType = item.getType();
    
    // Check if the item is a question (exclude titles and sections)
    if (itemType == FormApp.ItemType.TEXT ||
        itemType == FormApp.ItemType.MULTIPLE_CHOICE ||
        itemType == FormApp.ItemType.CHECKBOX ||
        itemType == FormApp.ItemType.LIST ||
        itemType == FormApp.ItemType.PARAGRAPH_TEXT ||
        itemType == FormApp.ItemType.SCALE ||
        itemType == FormApp.ItemType.GRID ||
        itemType == FormApp.ItemType.CHECKBOX_GRID ||
        itemType == FormApp.ItemType.TIME ||
        itemType == FormApp.ItemType.DATE) {
      
      var question = item.getTitle().trim(); // Remove leading and trailing spaces from the question

      // Prepare data for the API call with a unique ID
      dataToSend.push({
        "ID": generateUniqueID(), // Generate a unique ID for each row
        "Question": question,
        "Form ID": form_id,
        "Prompt": ''
      });
    }
  });

  // Replace these variables with your own values
  var tableName = 'Form Question'; // Replace with the name of your table
  var apiUrl = "https://api.appsheet.com/api/v2/apps/" + APP_ID + "/tables/" + tableName + "/Action"; // API URL with App ID and table name
 

  var payload = JSON.stringify({
    "Action": "Add",
    "Properties": {
      "Locale": "en-US",
      "Timezone": "Pacific Standard Time"
    },
    "Rows": dataToSend
  });
  
  var options = {
    'method': 'POST',
    'contentType': 'application/json',
    'headers': {
      'ApplicationAccessKey': API_KEY
    },
    'payload': payload,
    'muteHttpExceptions': true // Allows viewing full errors
  };

  // Make the API call
  var response = UrlFetchApp.fetch(apiUrl, options);
  
  // Log the raw response
  Logger.log("HTTP Response Code: " + response.getResponseCode());
  Logger.log("Full API Response: " + response.getContentText());
  
  // Check if the response is empty or not
  if (response.getContentText()) {
    var result = JSON.parse(response.getContentText());
    
    if (result.Status == 'Success') {
      Logger.log("Questions added successfully");
      return "Questions added successfully";
    } else {
      Logger.log("Failed to add questions: " + result.Message);
      return "Failed to add questions: " + result.Message;
    }
  } else {
    Logger.log("API returned an empty response");
    return "API returned an empty response";
  }
}