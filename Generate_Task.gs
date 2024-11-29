/**
 * Function: generateTasksFromVertexResponse
 * 
 * @param {string} form_id - ID of the selected Google Form.
 * 
 * Description:
 * This function processes the raw response received from Vertex AI and generates a list of tasks based on the data. 
 * The function interprets the response, extracting key information to create actionable tasks. The generated tasks 
 * are structured in a format that can be stored or utilized by other components of the system. The tasks are prioritized
 * 
 * Notes:
 * - Ensure that the response from Vertex AI follows the expected format for accurate task generation.
 * - The function is designed to handle errors in case of malformed or incomplete responses.
 * - Generated tasks should be verified for completeness before being forwarded for further processing or storage.
 * 
 * @returns {Array} - Returns an array of task objects, each representing a distinct task derived from the Vertex AI response.
 */

function generateTasksFromVertexResponse(formID) {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  if (!spreadsheet) {
    Logger.log("Spreadsheet not found.");
    return;
  }

  var vertexResponsesSheet = spreadsheet.getSheetByName('VertexResponses');
  var tasksSheet = spreadsheet.getSheetByName('Tasks');
  if (!vertexResponsesSheet || !tasksSheet) {
    Logger.log("Required sheets not found.");
    return;
  }

  // Retrieve all questions related to the form
  var questionsSheet = spreadsheet.getSheetByName('Form Question');
  var questions = questionsSheet.getRange('A2:D' + questionsSheet.getLastRow()).getValues();

  // Filter responses matching the form ID
  var matchingVertexResponses = vertexResponsesSheet.getRange('A2:C' + vertexResponsesSheet.getLastRow()).getValues().filter(function(row) {
    var formQuestionID = row[1];
    var relatedFormID = questions.find(q => q[0].trim() === formQuestionID.trim());
    return relatedFormID && relatedFormID[2].trim() === formID;
  });

  // Map the responses to include the related question text
  var matchingQuestions = matchingVertexResponses.map(function(responseRow) {
    var formQuestionID = responseRow[1];
    var relatedQuestion = questions.find(q => q[0].trim() === formQuestionID.trim());
    return {
      response: responseRow,
      question: relatedQuestion[1]
    };
  });

  var aggregatedResponses = matchingQuestions.map(function(item) {
    var question = item.question;
    var answer = item.response[2];
    return "Question: " + question + ", Answer: " + answer;
  }).join('\n');

  const genAI = new GeminiApp({
    region: LOCATION_ID,
    project_id: PROJECT_ID
  });

  const vertexAI = genAI.getGenerativeModel({
    model: MODEL_ID
  });

  // Improved prompt for Vertex AI
  var promptText = `
  You are a sophisticated task generation and strategic planning assistant. Based on the comprehensive feedback provided, your role is to generate detailed, actionable tasks that will significantly improve the operations, efficiency, and overall outcomes of the campaign. Here are the steps you should follow:

  1. **Understand the Core Issues**:
    - Thoroughly analyze the aggregated feedback to identify the key challenges, opportunities, and areas for improvement within the campaign.
    - Pay close attention to recurring themes, suggestions, and pain points expressed by the participants.

  2. **Generate Specific, Detailed Tasks**:
    - For each identified issue or opportunity, generate a specific task that addresses it.
    - Ensure that each task is clearly described with enough detail to be actionable without requiring further explanation.
    - Break down complex tasks into smaller, more manageable subtasks where necessary.

  3. **Craft Comprehensive Descriptions**:
    - Write a comprehensive description for each task that outlines what needs to be done, why it’s important, and how it aligns with the campaign’s objectives.
    - Include any relevant background information, context, or considerations that could help in executing the task effectively.
    - If applicable, mention any suggested tools, resources, or approaches that could facilitate the completion of the task.

  4. **Generate Actionable Steps**:
    - For each task, generate a list (bullet point) of steps the expert team in charge of solving the task can follow to resolve the task, such as:
      - **Meetings to organize**: Specify any meetings that need to be scheduled with teams, employees, or external parties.
      - **People to contact**: List key individuals or departments who should be involved or consulted to complete the task.
      - **Actions to take**: Outline specific actions, methods, or procedures that the team should follow to execute the task.

  5. **Assign Priority**:
    - Determine the priority level for each task based on its urgency and impact on the campaign. Use 'High', 'Medium', or 'Low' to indicate the priority.
    - Prioritize tasks that address critical issues or offer the most significant potential for improvement.

  6. **Ensure Clarity and Relevance**:
    - Review each task to ensure it is clear, concise, and directly relevant to the feedback provided.
    - Avoid vague or overly broad tasks; every task should be actionable and specific.

  IT IS IMPORTANT that the final output SHOULD BE in the following JSON format:

  {
    "tasks": [
      {
        "Task Name": "Clearly defined task name",
        "Description": "Detailed and comprehensive task description explaining what needs to be done, why it’s important, and how it aligns with the campaign’s objectives. Include any relevant tools, resources, or methods that should be used.",
        "Steps": "String Bullet point steps the expert team in charge of solving the task can follow to resolve the task for example: Meetings to Organize, List any meetings to schedule, People to Contact, Key individuals or departments to involve, Actions to Take, Specific steps or actions to execute the task",
        "Priority": "High/Medium/Low"
      },
      {
        "Task Name": "Another clearly defined task name",
        "Description": "Another detailed and comprehensive task description with all relevant details.",
        "Steps": "Another actionable steps in string format",
        "Priority": "High/Medium/Low"
      }
    ]
  }

  Example of tasks:
 {
  "tasks": [
    {
      "Task Name": "Increase Focus on Research and Development Activities",
      "Description": "Allocate more time to research, POC, and exploratory data analysis to foster innovation and strategic planning, while addressing key developmental areas such as AppSheet, schema modeling, and task specifications.",
      "Steps": "Organize a team meeting to define priorities in research and exploratory activities - Identify key projects that can benefit from additional R&D focus - Allocate dedicated time slots for research activities and limit non-essential meetings - Establish reporting structures for updates on research progress - Engage external experts for workshops and knowledge sharing on new technologies",
      "Priority": "High"
    },
    {
      "Task Name": "Streamline Project Management Processes",
      "Description": "Optimize project management workflows by reducing administrative overheads, focusing on backlog prioritization, developer coordination, and testing to improve overall project efficiency.",
      "Steps": "- Implement an integrated project management tool like Jira or Trello to streamline coordination - Establish a weekly review process to prioritize and manage the backlog effectively - Assign a dedicated team member for testing and quality assurance to reduce bottlenecks - Schedule regular touchpoints with clients to ensure alignment and timely feedback",
      "Priority": "Medium"
    }
  ]
}

  Now that you have the instruction and example, remember that the JSON format needs to stay strictly the same.
  Important: Only output the JSON; do not include your thinking process or intermediate steps. 
  Now take a deep breath and think step by step and generate tasks based on the following aggregated feedback: <<BEGIN FEEDBACK>>"${aggregatedResponses}"<<END FEEDBACK>> 

  Output only the final JSON structure, without any additional reasoning or explanations.`;

Logger.log("Aggregated responses passed to prompt:");
  Logger.log(aggregatedResponses);

  // Prepare the request for Vertex AI
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
    var responseText = response.response.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();

    Logger.log('Cleaned response from Vertex AI: ' + responseText);

    // Retry mechanism for JSON parsing
    var retryCount = 0;
    var maxRetries = 3;
    var parsedResponse = null;

    while (retryCount < maxRetries) {
      try {
        parsedResponse = JSON.parse(responseText);
        break;
      } catch (parseError) {
        retryCount++;
        Logger.log('JSON parsing error, attempt ' + retryCount + ': ' + parseError.toString());
      }
    }

    if (parsedResponse) {
      var tasks = parsedResponse.tasks;
      Logger.log('Parsed task Steps: ' + tasks[0]['Steps']);

      // Prepare tasks data to be sent to AppSheet
      var tasksRows = tasks.map(function(task) {
        return {
          "Task ID": generateUniqueID(),
          "Campaign ID": formID,
          "Task Name": task['Task Name'],
          "Description": task.Description,
          "Steps": task['Steps'],
          "Assigned To": "",
          "Status": "Not Started",
          "Priority": task.Priority,
        };
      });

      sendToAppSheetApi("Tasks", tasksRows);
    }

  } catch (error) {
    Logger.log('Error during Vertex AI call: ' + error.toString());
    return { error: "Error in the call to Vertex AI" };
  }
}

/**
 * Function to send data to the AppSheet API
 * 
 * @param {string} tableName - The name of the table to which data is sent.
 * @param {Array} rows - The data rows to be sent.
 */
function sendToAppSheetApi(tableName, rows) {
  var appsheetApiUrl = "https://api.appsheet.com/api/v2/apps/" + APP_ID + "/tables/" + tableName + "/Action";

  var mappedRows = rows.map(row => ({
    "Task ID": row["Task ID"],
    "Campaign ID": row["Campaign ID"],
    "Task Name": row["Task Name"],
    "Description": row["Description"],
    "Assigned To": row["Assigned To"],
    "Status": row["Status"],
    "Priority": row["Priority"],
  }));

  var payload = JSON.stringify({
    "Action": "Add",
    "Properties": {
      "Locale": "en-US",
      "Timezone": "Pacific Standard Time"
    },
    "Rows": mappedRows
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

    var jsonResponse = JSON.parse(responseText);

    if (jsonResponse && jsonResponse.status && jsonResponse.status !== 'Success') {
      Logger.log("Error in AppSheet API response for table " + tableName + ": " + jsonResponse.status + " - " + jsonResponse.message);
    }

  } catch (e) {
    Logger.log("Error calling AppSheet API for table " + tableName + ": " + e.toString());
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