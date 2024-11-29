/**
 * Function: generatePromptFromVertexResponse
 * 
 * @param {string} questionID - The unique identifier of the question.
 * @param {string} question_text - The text of the question to be used in the prompt.
 * 
 * @returns {string} - Returns the formatted prompt ready to be sent to Vertex AI.
 */

function generatePromptFromVertexResponse(questionID, question_text) {
  
  const genAI = new GeminiApp({
    region: LOCATION_ID,
    project_id: PROJECT_ID
  });

  const vertexAI = genAI.getGenerativeModel({
    model: MODEL_ID
  });

  var promptText = `
  Goal:
	You are a prompt engineer specialized in writing chain of thought prompts to guide LLM to EXTRACT, CATEGORIZE, and FORMAT data from survey answers.
Instructions:
	You are provided with an EXAMPLE containing a survey question and a chain of thought prompt adapted to the survey question.
	
Here is the example in between:
<<BEGINNING OF EXAMPLE >>
EXAMPLE survey question: What motivates you the most in your current role?
EXAMPLE chain of thought prompt: ...
<<END OF EXAMPLE >>

Instruction:
Now take a deep breath and think step by step to create the chain of thought prompt adapted to this question: "${question_text}"
  `;

  var request = {
    contents: [
      { role: 'user', parts: [{ text: promptText }] }
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
    console.log("Generated response text: ", responseText);
    
    var prompt_id = generateUniqueID();
    var prompt_to_create = [{
      "ID": `${prompt_id}`,
      "Name": `${question_text}`,
      "FreeFormPrompt": `${responseText}`,
      "useTemplate": "Open prompt"
    }];
    
    console.log("Prompt to create: ", prompt_to_create);
    sendToAppSheetApi_prompt("Prompt", prompt_to_create, "Add");
    return `${prompt_id}`;
  } catch (error) {
    Logger.log('Vertex AI call failed: ' + error.toString());
    return { error: "Error in the call to Vertex AI" };
  }  
}

// Function to send data to the AppSheet API
function sendToAppSheetApi_prompt(tableName, rows, action) {
  var appsheetApiUrl = "https://api.appsheet.com/api/v2/apps/" + APP_ID + "/tables/" + tableName + "/Action";
  
  var payload = JSON.stringify({
    "Action": action,
    "Properties": {
      "Locale": "en-US",
      "Timezone": "Pacific Standard Time"
    },
    "Rows": rows
  });
  
  console.log("Payload for AppSheet API: ", payload);

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
    
    var jsonResponse = JSON.parse(responseText);
    
    if (jsonResponse && jsonResponse.status && jsonResponse.status !== 'Success') {
      Logger.log("AppSheet API returned an error for table " + tableName + ": " + jsonResponse.status + " - " + jsonResponse.message);
    }
    
  } catch (e) {
    Logger.log("Error calling AppSheet API for table " + tableName + ": " + e.toString());
  }
}
