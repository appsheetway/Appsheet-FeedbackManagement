/**
 * Function: processAllQuestionsWithVertexAI
 * 
 * @param {string} form_id - The unique ID of the selected Google Form.
 * 
 * Description:
 * This function is responsible for retrieving all questions from a Google Form, along with the corresponding answers from an Appsheet database. 
 * The combined questions and answers are formatted into custom prompts and sent to Vertex AI for processing. The response from Vertex AI 
 * is then parsed, cleaned, and stored back in the Appsheet database for future reference or further processing.
 * 
 * Notes:
 * - Ensure that the Google Form ID is valid and accessible.
 * - The function assumes that the Appsheet database contains the necessary answers corresponding to the questions in the selected form.
 * - The Vertex AI responses should be formatted correctly to ensure successful storage in Appsheet.
 * 
 * @returns {Promise<object>} - Returns a promise indicating the completion of the process.
 */

function processAllQuestionsWithVertexAI(Form_ID) {
  // Open the spreadsheet by its ID
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  
  if (!spreadsheet) {
    Logger.log("Error: Spreadsheet not found.");
    return;
  }

  // Retrieve specific sheets
  var responsesSheet = spreadsheet.getSheetByName('Form Responses');
  var questionsSheet = spreadsheet.getSheetByName('Form Question');
  var promptsSheet = spreadsheet.getSheetByName('Prompt');

  if (!responsesSheet || !questionsSheet || !promptsSheet) {
    Logger.log("Error: One or more required sheets are missing.");
    return;
  }

  // Retrieve questions
  var questions = questionsSheet.getRange('A2:E' + questionsSheet.getLastRow()).getValues();
  var responses = responsesSheet.getRange('A2:C' + responsesSheet.getLastRow()).getValues();

  for (var q = 0; q < questions.length; q++) {
    var formQuestionID = questions[q][0].trim();
    var questionText = questions[q][1].trim();
    var promptID = questions[q][3];
    var formID = questions[q][2].trim();

    if (formID !== Form_ID || !promptID) {
      continue;
    }

    var promptRow = promptsSheet.getRange('A2:B' + promptsSheet.getLastRow()).getValues().filter(row => row[0] == promptID);
    var promptText = promptRow.length > 0 ? promptRow[0][1] : null;

    if (promptText && promptText.includes('[QUESTION]')) {
      promptText = promptText.replace('[QUESTION]', questionText);
    }

    var userResponses = responses.filter(function(row) {
      return row[1].trim() === formQuestionID && row[0].trim() === Form_ID;
    }).map(function(row) {
      return row[2];
    });

    if (userResponses.length === 0) {
      Logger.log("Error: No user response found for the question: " + questionText);
      continue;
    }

    var aggregatedResponses = userResponses.join('\n');

    const genAI = new GeminiApp({
      region: LOCATION_ID,
      project_id: PROJECT_ID
    });

    const vertexAI = genAI.getGenerativeModel({
      model: MODEL_ID
    });

    var request = {
      contents: [
        { role: 'user', parts: [{ text: promptText + "\n\n" + aggregatedResponses }] }
      ],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        topP: 0.95,
      },
      safetySettings: [
        { 'category': 'HARM_CATEGORY_HATE_SPEECH', 'threshold': 'BLOCK_MEDIUM_AND_ABOVE' },
        { 'category': 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold': 'BLOCK_MEDIUM_AND_ABOVE' },
        { 'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold': 'BLOCK_MEDIUM_AND_ABOVE' },
        { 'category': 'HARM_CATEGORY_HARASSMENT', 'threshold': 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    try {
      var response = vertexAI.generateContent(request);
      var responseText = response.response.candidates[0].content.parts[0].text;

      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      responseText = responseText.replace(/(["'])\s*:\s*["']/g, ':');
      responseText = responseText.replace(/(['"])?([a-zA-Z0-9_&\-\/ ]+)(['"])?:/g, function(match, p1, p2, p3) {
        return '"' + p2.replace(/["'`]/g, '').trim() + '":';
      });

      try {
        var parsedResponse = JSON.parse(responseText);
        var fullResponse = JSON.stringify(parsedResponse);

        var vertexResponseID = generateUniqueID();
        var vertexResponseRow = {
          "ID": vertexResponseID,
          "FormQuestionID": formQuestionID,
          "ResponseJSON": fullResponse
        };
        console.log([vertexResponseRow])
        sendToAppSheetApi("VertexResponses", [vertexResponseRow]);

        var itemsRows = [];
        for (var type in parsedResponse) {
          var categories = parsedResponse[type];
          for (var category in categories) {
            var elements = categories[category];
            if (Array.isArray(elements)) {
              elements.forEach(function(element) {
                var itemRow = {
                  "VertexResponseID": vertexResponseID,
                  "Type": type,
                  "Category": category,
                  "Element": element,
                  "Campaign": Form_ID
                };
                itemsRows.push(itemRow);
              });
            }
          }
        }
        sendToAppSheetApi("Items", itemsRows);

      } catch (parseError) {
        Logger.log('Error during JSON parsing: ' + parseError.toString());
        continue;
      }

    } catch (error) {
      Logger.log('Error during Vertex AI call for the question: ' + questionText + ' - ' + error.toString());
      continue;
    }
  }
}

/**
 * Helper function to generate a unique ID
 * 
 * @returns {string} - A unique identifier.
 */
function generateUniqueID() {
  return Utilities.getUuid();
}

/**
 * Function to send data to the AppSheet API
 * 
 * @param {string} tableName - The name of the table to which data is sent.
 * @param {Array} rows - The data rows to be sent.
 */
function sendToAppSheetApi(tableName, rows) {
  var appsheetApiUrl = "https://api.appsheet.com/api/v2/apps/" + APP_ID + "/tables/" + tableName + "/Action";


  if (tableName === "VertexResponses") {
    rows = rows.map(row => ({
      "ID": row.ID,
      "Form question ID": row.FormQuestionID,
      "Vertex Response": row.ResponseJSON
    }));
  } else if (tableName === "Items") {
    rows = rows.map(row => ({
      "VertexResponseID": row.VertexResponseID,
      "Type": row.Type,
      "Category": row.Category,
      "Element": row.Element,
      "Campaign": row.Campaign
    }));
  } else if(tableName === "Tasks") {
    rows = rows.map(row => ({
    "Task ID": row["Task ID"],
    "Campaign ID": row["Campaign ID"],
    "Task Name": row["Task Name"],
    "Description": row["Description"],
    "Steps": row["Steps"],
    "Assigned To": row["Assigned To"],
    "Status": row["Status"],
    "Priority": row["Priority"],
  }));
  }

  

  var payload = JSON.stringify({
    "Action": "Add",
    "Properties": {
      "Locale": "en-US",
      "Timezone": "Pacific Standard Time"
    },
    "Rows": rows
  });

  

  var options = {
    "method": "POST",
    "contentType": "application/json",
    "headers": {
      "applicationAccessKey": API_KEY
    },
    "payload": payload,
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(appsheetApiUrl, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error("HTTP Error: " + responseCode + " - " + responseText);
    }
    
    if (!responseText || responseText.trim() === "") {
      throw new Error("The API response is empty.");
    }

    var jsonResponse = JSON.parse(responseText);
    
    if (jsonResponse && jsonResponse.status && jsonResponse.status !== 'Success') {
      Logger.log("Error in the AppSheet API response for table " + tableName + " : " + jsonResponse.status + " - " + jsonResponse.message);
    }
    
  } catch (e) {
    Logger.log("Error during the AppSheet API call for table " + tableName + " : " + e.toString());
  }
}