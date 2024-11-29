/**
 * Function: getFormIds
 * 
 * @param {string} formId - The unique ID of the Google Form.
 * 
 * Description:
 * This function takes the Google Form ID and constructs the complete URL of the form. The resulting URL can be used 
 * for accessing the form directly or for sharing purposes.
 * 
 * Notes:
 * - Ensure that the form ID provided is valid and corresponds to an existing Google Form.
 * - The function formats the form ID into a standard Google Forms URL structure.
 * 
 * @returns {string} - Returns the complete URL of the Google Form based on the given form ID.
 */

function getFormIds(formId) {
  var form = FormApp.openById(formId);
  var responseUrl = form.getPublishedUrl();
  var formIdForResponse = responseUrl.match(/e\/(.*)\/viewform/)[1];
  var completeResponseUrl = "https://docs.google.com/forms/d/e/" + formIdForResponse + "/viewform";

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Campaign'); 
  var formIdColumn = 1; 
  var formIdRow = findRowByFormId(sheet, formId, formIdColumn);

  if (formIdRow == -1) {
    return "Form ID not found in the spreadsheet";
  }
  
  // Return the complete URL of the response form
  return completeResponseUrl;
}

function findRowByFormId(sheet, formId, formIdColumn) {
  var data = sheet.getDataRange().getValues();
  
  for (var i = 0; i < data.length; i++) {
    if (data[i][formIdColumn - 1] == formId) {
      return i + 1; // Return the row number (1-indexed)
    }
  }
  return -1; // Return -1 if the Form ID is not found
}
