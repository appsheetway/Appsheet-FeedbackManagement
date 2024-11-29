/**
 * Function: sendFormResponsesToAppSheet
 * 
 * @param {string} form_id - The unique ID of the selected Google Form.
 * 
 * Description:
 * This function retrieves responses from a Google Form and stores them in the Appsheet database. Each response is referenced 
 * with a unique ID, allowing the mapping of answers to their respective questions. This enables easy retrieval of all answers 
 * related to a specific question based on its question ID.
 * 
 * Notes:
 * - Ensure that the form ID corresponds to an accessible and valid Google Form.
 * - The function stores the responses in a structured way that maintains the relationship between questions and answers.
 * - This setup facilitates the later retrieval of answers by referencing the question IDs.
 * 
 * @returns <void>
 */

function sendFormResponsesToAppSheet(formId) {
  // Name of the sheet containing the form questions
  var formQuestionsSheetName = "Form Question"; // Replace with the name of your question sheet

  // Name of the sheet containing the form responses
  var formResponsesSheetName = "Form Responses"; // Replace with the name of your response sheet

  // Spreadsheet ID
  var spreadsheetId = SHEET_ID; // Replace with your spreadsheet ID

  // Open the spreadsheet by ID
  var ss = SpreadsheetApp.openById(spreadsheetId);
  
  // Sheet containing the form questions
  var formQuestionsSheet = ss.getSheetByName(formQuestionsSheetName);
  
  // Retrieve questions with their IDs
  var questions = formQuestionsSheet.getRange('A2:D' + formQuestionsSheet.getLastRow()).getValues().map(function(row) {
    return [row[0], row[1].trim().toLowerCase(), row[2]]; // Add the Form ID to avoid conflicts
  });

  // Retrieve form responses
  var form = FormApp.openById(formId);
  var formResponses = form.getResponses();
  
  // API URL for the AppSheet table "Form Responses"
  var apiUrl = "https://api.appsheet.com/api/v2/apps/" + APP_ID + "/tables/Form%20Responses/Action"; // Use the exact name of your table

  // Array to collect rows to add
  var rowsToAdd = [];

  // Loop through each submitted response
  formResponses.forEach(function(response) {
    var itemResponses = response.getItemResponses();
    
    // Loop through each response of a form item
    itemResponses.forEach(function(itemResponse) {
      var questionTitle = itemResponse.getItem().getTitle().trim().toLowerCase(); // Normalize the question title
      var responseValue = itemResponse.getResponse();
      
      // Find the associated question ID by also checking the Form ID
      var questionMatch = questions.filter(function(q) {
        return q[1] === questionTitle && q[2] === formId; // Compare normalized titles and the Form ID
      });
      
      // Check if the question was found
      if (questionMatch.length > 0) {
        var questionID = questionMatch[0][0]; // q[0] corresponds to the "ID" column
        
        // Add the response to the list of rows to add
        rowsToAdd.push({
          "Form ID": formId,
          "Form Question ID": questionID,
          "Response": responseValue
        });
      } else {
        Logger.log("Error: Question not found for title: " + questionTitle + " in form with ID: " + formId);
      }
    });
  });

  // If there are rows to add, send the request to the AppSheet API
  if (rowsToAdd.length > 0) {
    // Create the JSON object for the API call
    var payload = JSON.stringify({
      "Action": "Add",
      "Properties": {
        "Locale": "en-US",
        "Timezone": "Pacific Standard Time"
      },
      "Rows": rowsToAdd
    });
    
    // Make the API call
    var options = {
      "method": "POST",
      "contentType": "application/json",
      "headers": {
        "applicationAccessKey": API_KEY
      },
      "payload": payload,
      "muteHttpExceptions": true
    };
    
    var response = UrlFetchApp.fetch(apiUrl, options);
    
    // Check if the request was successful
    if (response.getResponseCode() !== 200) {
      Logger.log("Error during the AppSheet API call: " + response.getContentText());
    }
  }

 // Disable the form to prevent new responses
  form.setAcceptingResponses(false);
  Logger.log("The form with ID " + formId + " has been disabled.");
}